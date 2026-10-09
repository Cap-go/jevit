// jevit-i18n: translates Jevit's English text into the user's language with Workers AI, cached forever in KV.
//   HTTP (the app):        POST /v1/translate {lang, texts: string[]} → {lang, translations: string[], complete}
//   RPC (jevit-judge):     env.I18N.translate(lang, texts) → same result
// Only English is stored in the app. Every string is translated once per language, then served from KV.
import { WorkerEntrypoint } from "cloudflare:workers";

export interface Env {
  AI: Ai;
  CACHE: KVNamespace;
  MODEL: string;
  CACHE_VERSION: string;
  MISS_LIMITER?: RateLimit;
}

export type TranslateResult = { lang: string; translations: string[]; complete: boolean };

const MAX_TEXTS = 200;
const MAX_TEXT_CHARS = 2_000;
const MAX_TOTAL_CHARS = 40_000;
const BATCH_ITEMS = 30;
const BATCH_CHARS = 3_000;
const PARALLEL_BATCHES = 4;
// Names that must stay as they are in every language (longest first so "Workers AI" wins over "AI").
const KEEP = ["Workers AI", "jevit.fun", "Cloudflare", "Capacitor", "Google", "Capgo", "Apple", "Jevit", "jevit", "Clef"];

export class BadRequest extends Error {}

/** BCP 47 tag → the language key we translate and cache by ("fr", "pt-BR", "zh-Hant"…). null for English or junk. */
export function normalizeLang(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 35) return null;
  let loc: Intl.Locale;
  try {
    loc = new Intl.Locale(Intl.getCanonicalLocales(raw.replace(/_/g, "-"))[0]);
  } catch {
    return null;
  }
  const lang = loc.language;
  if (!/^[a-z]{2,3}$/.test(lang)) return null;
  if (lang === "zh") return loc.script === "Hant" || ["TW", "HK", "MO"].includes(loc.region ?? "") ? "zh-Hant" : "zh-Hans";
  if (lang === "pt") return loc.region === "PT" ? "pt-PT" : "pt-BR";
  return lang;
}

function languageName(lang: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang;
  } catch {
    return lang;
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Brand names become ⟦0⟧, ⟦1⟧… so the model can't translate them, then come back after.
function protect(text: string): { text: string; kept: string[] } {
  const kept: string[] = [];
  let out = text;
  for (const word of KEEP) {
    out = out.split(word).join(`\u0000${kept.length}\u0000`);
    if (out.includes(`\u0000${kept.length}\u0000`)) kept.push(word);
  }
  return { text: out.replace(/\u0000(\d+)\u0000/g, "⟦$1⟧"), kept };
}

function restore(translated: string, kept: string[]): string | null {
  let out = translated;
  for (let i = 0; i < kept.length; i++) {
    if (!out.includes(`⟦${i}⟧`)) return null;
    out = out.split(`⟦${i}⟧`).join(kept[i]);
  }
  return /⟦\d+⟧/.test(out) ? null : out;
}

function systemPrompt(lang: string): string {
  const name = languageName(lang);
  return [
    `You translate text for Jevit, a fun app where an AI judges chat screenshots ("Is he into me?", "Who's right?").`,
    `Translate every item into ${name} (${lang}). The source is usually English but can be any language.`,
    `Write like a native speaker in their twenties: short, casual, natural, informal "you", in the standard written form of the language (no regional slang or dialect). Keep the meaning and the tone (jokes stay jokes).`,
    `Items are buttons, titles, hints and short messages of the app. Use the words a local app would use (e.g. French "Envoie", not "Upload"); keep English only for words people really say in that language (like "red flag").`,
    `Keep emojis, numbers, %, quotes, ellipses and markers like ⟦0⟧ exactly as they are. Do not add explanations.`,
    `If an item is already in ${name}, return it unchanged.`,
    `Answer with JSON {"translations": [...]}: exactly one string per item, same order.`,
  ].join("\n");
}

async function runModel(env: Env, lang: string, items: string[]): Promise<(string | null)[]> {
  const n = items.length;
  const res = (await env.AI.run(env.MODEL as keyof AiModels, {
    messages: [
      { role: "system", content: systemPrompt(lang) },
      { role: "user", content: JSON.stringify({ items }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "object",
        properties: { translations: { type: "array", items: { type: "string" }, minItems: n, maxItems: n } },
        required: ["translations"],
      },
    },
    temperature: 0.1,
    max_tokens: 8_000,
    chat_template_kwargs: { enable_thinking: false },
  } as never)) as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  let body = res.response ?? res.choices?.[0]?.message?.content;
  if (typeof body === "string") body = JSON.parse(body);
  const list = (body as { translations?: unknown })?.translations;
  if (!Array.isArray(list) || list.length !== n) throw new Error(`model returned ${Array.isArray(list) ? list.length : "no"} items for ${n}`);
  return list.map((t, i) => (typeof t === "string" && t.trim() && t.length <= items[i].length * 4 + 40 ? t.trim() : null));
}

/** Translates protected items; batches that fail are retried one item at a time. */
async function translateItems(env: Env, lang: string, items: string[]): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(items.length).fill(null);
  const batches: number[][] = [];
  let current: number[] = [];
  let chars = 0;
  items.forEach((item, i) => {
    if (current.length && (current.length >= BATCH_ITEMS || chars + item.length > BATCH_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(i);
    chars += item.length;
  });
  if (current.length) batches.push(current);

  const run = async (batch: number[]) => {
    try {
      const got = await runModel(env, lang, batch.map((i) => items[i]));
      batch.forEach((i, k) => (out[i] = got[k]));
    } catch (err) {
      if (batch.length === 1) return console.warn("translate failed", lang, String(err));
      await Promise.all(batch.map((i) => run([i])));
    }
  };
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) await Promise.all(batches.slice(i, i + PARALLEL_BATCHES).map(run));
  return out;
}

export async function translate(
  env: Env,
  rawLang: unknown,
  texts: unknown,
  opts: { limiterKey?: string; waitUntil?: (p: Promise<unknown>) => void } = {},
): Promise<TranslateResult> {
  if (!Array.isArray(texts) || texts.length > MAX_TEXTS || !texts.every((t) => typeof t === "string" && t.length <= MAX_TEXT_CHARS))
    throw new BadRequest(`texts must be up to ${MAX_TEXTS} strings of up to ${MAX_TEXT_CHARS} characters`);
  if (texts.reduce((n, t) => n + t.length, 0) > MAX_TOTAL_CHARS) throw new BadRequest("Too much text in one request");
  const lang = rawLang === "en" ? "en" : normalizeLang(rawLang);
  if (!lang) throw new BadRequest("Unknown language");

  // Split off surrounding whitespace; strings without letters (numbers, emoji) never need the model.
  const parts = (texts as string[]).map((t) => {
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    return { lead: m[1], core: m[2], trail: m[3] };
  });
  const result = parts.map((p) => p.core);
  const todo = [...new Set(parts.map((p) => p.core).filter((c) => /\p{L}/u.test(c)))];
  const done = new Map<string, string>();

  // 1. KV (bulk reads of up to 100 keys).
  const keys = new Map<string, string>();
  for (const core of todo) keys.set(core, `${env.CACHE_VERSION}:${lang}:${await sha256(core)}`);
  for (let i = 0; i < todo.length; i += 100) {
    const chunk = todo.slice(i, i + 100);
    const hits = await env.CACHE.get(chunk.map((c) => keys.get(c)!), "text");
    for (const c of chunk) {
      const hit = hits.get(keys.get(c)!);
      if (hit != null) done.set(c, hit);
    }
  }

  // 2. The model, for what's left (rate limited per caller).
  let misses = todo.filter((c) => !done.has(c));
  let complete = true;
  if (misses.length && opts.limiterKey && env.MISS_LIMITER && !(await env.MISS_LIMITER.limit({ key: opts.limiterKey })).success) {
    complete = false;
    misses = [];
  }
  if (misses.length) {
    const protectedItems = misses.map(protect);
    const got = await translateItems(env, lang, protectedItems.map((p) => p.text));
    const writes: Promise<void>[] = [];
    misses.forEach((core, i) => {
      const text = got[i] == null ? null : restore(got[i]!, protectedItems[i].kept);
      if (text == null) return void (complete = false);
      done.set(core, text);
      writes.push(env.CACHE.put(keys.get(core)!, text));
    });
    const all = Promise.all(writes);
    if (opts.waitUntil) opts.waitUntil(all);
    else await all;
  }

  parts.forEach((p, i) => (result[i] = p.lead + (done.get(p.core) ?? p.core) + p.trail));
  return { lang, translations: result, complete };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

export default class extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, model: this.env.MODEL });
    if (request.method !== "POST" || url.pathname !== "/v1/translate") return json({ error: "Not found" }, 404);
    try {
      const body = (await request.json()) as { lang?: unknown; texts?: unknown };
      const ip = request.headers.get("cf-connecting-ip") ?? "anon";
      return json(await translate(this.env, body.lang, body.texts, { limiterKey: ip, waitUntil: (p) => this.ctx.waitUntil(p) }));
    } catch (err) {
      if (err instanceof BadRequest || err instanceof SyntaxError) return json({ error: err.message }, 400);
      console.error("translate error", err);
      return json({ error: "Translation failed" }, 502);
    }
  }

  /** RPC for jevit-judge (service binding): no rate limit, waits for cache writes. */
  async translate(lang: string, texts: string[]): Promise<TranslateResult> {
    return translate(this.env, lang, texts, { waitUntil: (p) => this.ctx.waitUntil(p) });
  }
}
