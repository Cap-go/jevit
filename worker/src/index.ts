import { AuthError, issueSession, readSession, verifyDemoLogin, verifyProviderToken, type Provider, type Session } from "./auth";
import { MAX_CLEF_IMAGES, type ClefImage } from "./clef";
import { invalid, judge } from "./judge";
import { checkQuestion, type QuestionKind } from "./questionCheck";
import type { Quota, QuotaStatus } from "./quota";
import { publicPage } from "./pages";

export { Quota } from "./quota";

export interface Env {
  AI: Ai;
  QUOTA: DurableObjectNamespace<Quota>;
  SESSION_SECRET: string;
  DEMO_EMAIL?: string;
  DEMO_PASSWORD?: string;
  ADMIN_TOKEN?: string;
  GOOGLE_CLIENT_IDS: string;
  APPLE_CLIENT_IDS: string;
  DAILY_VERDICTS: string;
  AI_GATEWAY_ID?: string;
  APP_STORE_URL?: string;
  PLAY_STORE_URL?: string;
  AUTH_LIMITER?: RateLimit;
  JUDGE_LIMITER?: RateLimit;
  CHECK_LIMITER?: RateLimit;
  // jevit-i18n (service binding, RPC)
  I18N?: { translate(lang: string, texts: string[]): Promise<{ translations: string[] }> };
}

type ImageInput = { mediaType: string; data: string };
type JudgeRequest = { question: string; context?: string; texts: string[]; images: ImageInput[]; lang?: unknown };

const MAX_IMAGE_B64 = 5_500_000; // Clef limit: 4 MiB decoded per image
const MAX_TOTAL_B64 = 10_900_000; // Clef limit: 8 MiB decoded total
const MAX_TEXT_CHARS = 20_000;
const MAX_QUESTION_CHARS = 300;
const MAX_CONTEXT_CHARS = 500;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:5173",
]);

function cors(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "capacitor://localhost",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors(origin) },
  });
}

function validateQuestion(question: unknown): string {
  if (typeof question !== "string" || !question.trim()) return "Ask a question first";
  if (question.length > MAX_QUESTION_CHARS) return "Question is too long";
  return "";
}

function validate(body: unknown): JudgeRequest | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const { question, context, texts = [], images = [] } = body as JudgeRequest;
  const qErr = validateQuestion(question);
  if (qErr) return qErr;
  if (context !== undefined && (typeof context !== "string" || context.length > MAX_CONTEXT_CHARS)) return "Context is too long";
  if (!Array.isArray(texts) || !Array.isArray(images)) return "Invalid evidence";
  if (texts.length === 0 && images.length === 0) return "Add a screenshot or paste the conversation";
  if (images.length > MAX_CLEF_IMAGES) return `Max ${MAX_CLEF_IMAGES} screenshots`;
  if (texts.some((t) => typeof t !== "string") || texts.join("").length > MAX_TEXT_CHARS) return "Text is too long";
  let total = 0;
  for (const img of images) {
    if (!img || !IMAGE_TYPES.has(img.mediaType) || typeof img.data !== "string") return "Unsupported image";
    if (img.data.length > MAX_IMAGE_B64) return "Image is too large";
    total += img.data.length;
  }
  if (total > MAX_TOTAL_B64) return "Screenshots are too large together";
  return { question: question.trim(), context: context?.trim() || undefined, texts, images, lang: (body as JudgeRequest).lang };
}

// Clef reads English best: a question or context typed in another language is translated first (cached by jevit-i18n).
async function toEnglish(env: Env, lang: unknown, texts: string[]): Promise<string[]> {
  if (!env.I18N || typeof lang !== "string" || /^en\b/i.test(lang) || texts.length === 0) return texts;
  try {
    return (await env.I18N.translate("en", texts)).translations;
  } catch (err) {
    console.warn("toEnglish failed", err);
    return texts;
  }
}

async function limited(limiter: RateLimit | undefined, key: string): Promise<boolean> {
  if (!limiter) return false;
  const { success } = await limiter.limit({ key });
  return !success;
}

// Durable Object name: salted hash so quota storage never holds the raw provider account id.
async function quotaKey(env: Env, sub: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.SESSION_SECRET}:${sub}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function quotaFor(env: Env, sub: string) {
  const key = await quotaKey(env, sub);
  return { key, stub: env.QUOTA.get(env.QUOTA.idFromName(key)) };
}

const dailyLimit = (env: Env) => Number(env.DAILY_VERDICTS) || 15;
const publicQuota = (q: QuotaStatus) => ({ used: q.used, limit: q.limit, remaining: q.remaining, resetAt: q.resetAt });

async function handleAuth(request: Request, env: Env, origin: string | null): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") ?? "anon";
  if (await limited(env.AUTH_LIMITER, ip)) return json({ error: "Too many sign-in attempts. Wait a minute." }, 429, origin);

  const body = (await request.json().catch(() => null)) as
    | { provider?: Provider | "demo"; idToken?: string; name?: string; email?: string; password?: string }
    | null;

  // Store reviewers / testers: email + password account (no social login needed).
  if (body?.provider === "demo") {
    if (!(await verifyDemoLogin(body.email, body.password, env.DEMO_EMAIL, env.DEMO_PASSWORD))) {
      return json({ error: "Wrong email or password" }, 401, origin);
    }
    const session: Session = { sub: "demo:reviewer", provider: "demo", name: "Reviewer" };
    const token = await issueSession(env.SESSION_SECRET, session);
    const quota = await (await quotaFor(env, session.sub)).stub.status(dailyLimit(env) * 4);
    return json({ token, user: { provider: "demo", name: "Reviewer" }, quota: publicQuota(quota) }, 200, origin);
  }

  if (!body || (body.provider !== "apple" && body.provider !== "google") || typeof body.idToken !== "string") {
    return json({ error: "Invalid sign-in" }, 400, origin);
  }
  const audiences = body.provider === "google" ? env.GOOGLE_CLIENT_IDS : env.APPLE_CLIENT_IDS;
  try {
    const identity = await verifyProviderToken(body.provider, body.idToken, audiences);
    const name = typeof body.name === "string" ? body.name.slice(0, 60) : undefined;
    const session: Session = { sub: `${body.provider}:${identity.sub}`, provider: body.provider, name };
    const token = await issueSession(env.SESSION_SECRET, session);
    const { stub } = await quotaFor(env, session.sub);
    const quota = await stub.status(dailyLimit(env));
    if (quota.banned) return json({ error: "This account is suspended." }, 403, origin);
    return json({ token, user: { provider: session.provider, name }, quota: publicQuota(quota) }, 200, origin);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, 401, origin);
    throw err;
  }
}

async function handleAdmin(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (!env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: "Not found" }, 404, origin);
  }
  // Ban by quota key (logged on every verdict as `user=<key>`).
  const body = (await request.json().catch(() => null)) as { key?: string; banned?: boolean } | null;
  if (!body?.key || !/^[a-f0-9]{64}$/.test(body.key)) return json({ error: "key required" }, 400, origin);
  await env.QUOTA.get(env.QUOTA.idFromName(body.key)).setBanned(body.banned !== false);
  return json({ ok: true }, 200, origin);
}

// Admin-only: run the real check + judge path through the AI binding and report the raw error, if any.
async function handleSelftest(request: Request, env: Env, origin: string | null): Promise<Response> {
  if (!env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: "Not found" }, 404, origin);
  }
  const body = (await request.json().catch(() => ({}))) as Partial<JudgeRequest>;
  const question = body.question ?? "Am I wrong here?";
  const steps: Record<string, unknown> = {};
  try {
    let t = Date.now();
    const check = await checkQuestion(env.AI, question, env.AI_GATEWAY_ID || undefined);
    steps.check = check;
    steps.checkMs = Date.now() - t;
    t = Date.now();
    const images: ClefImage[] = (body.images ?? []).map((i) => ({ content_type: i.mediaType, base64: i.data }));
    const verdict = await judge(
      env.AI,
      { ...check, kind: check.ok ? (check.kind as QuestionKind) : "yes_no" },
      question,
      body.context,
      body.texts ?? ["Me: you said 7pm\nHim: stop nagging me"],
      images,
      env.AI_GATEWAY_ID || undefined,
    );
    steps.verdict = { label: verdict.verdict_label, confidence: verdict.confidence };
    steps.judgeMs = Date.now() - t;
    return json({ ok: true, steps }, 200, origin);
  } catch (err) {
    return json({ ok: false, steps, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) }, 200, origin);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    const route = `${request.method} ${url.pathname}`;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === "GET") {
      const page = publicPage(request, env);
      if (page) return page;
    }
    if (route === "GET /health") return json({ ok: true, judge: "JEV-1", engine: "clef" }, 200, origin);

    try {
      if (route === "POST /v1/auth") return await handleAuth(request, env, origin);
      if (route === "POST /v1/admin/ban") return await handleAdmin(request, env, origin);
      if (route === "POST /v1/admin/selftest") return await handleSelftest(request, env, origin);

      // Everything below needs a signed-in account.
      const session = await readSession(env.SESSION_SECRET, request);
      if (!session) return json({ error: "Sign in to continue", code: "auth" }, 401, origin);
      const { key, stub } = await quotaFor(env, session.sub);
      // Reviewers test a lot in one sitting: 4x the normal daily cap.
      const limit = session.provider === "demo" ? dailyLimit(env) * 4 : dailyLimit(env);

      if (route === "GET /v1/me") {
        const quota = await stub.status(limit);
        if (quota.banned) return json({ error: "This account is suspended.", code: "banned" }, 403, origin);
        return json({ user: { provider: session.provider, name: session.name }, quota: publicQuota(quota) }, 200, origin);
      }
      if (route === "DELETE /v1/me") {
        await stub.forget();
        return json({ ok: true }, 200, origin);
      }

      if (route === "POST /v1/check") {
        if (await limited(env.CHECK_LIMITER, key)) return json({ error: "Slow down" }, 429, origin);
        if ((await stub.status(limit)).banned) return json({ error: "This account is suspended.", code: "banned" }, 403, origin);
        const body = (await request.json().catch(() => null)) as { question?: unknown; lang?: unknown } | null;
        const err = validateQuestion(body?.question);
        if (err) return json({ error: err }, 400, origin);
        const gateway = env.AI_GATEWAY_ID || undefined;
        const [question] = await toEnglish(env, body?.lang, [(body!.question as string).trim()]);
        return json({ check: await checkQuestion(env.AI, question, gateway) }, 200, origin);
      }

      if (route === "POST /v1/judge") {
        if (await limited(env.JUDGE_LIMITER, key)) {
          return json({ error: "Too many tries. Wait a minute." }, 429, origin);
        }
        const parsed = validate(await request.json().catch(() => null));
        if (typeof parsed === "string") return json({ error: parsed }, 400, origin);

        const quota = await stub.consume(limit);
        if (quota.banned) return json({ error: "This account is suspended.", code: "banned" }, 403, origin);
        if (!quota.ok) {
          return json(
            { error: "No more free answers today. Come back tomorrow.", code: "quota", quota: publicQuota(quota) },
            429,
            origin,
          );
        }
        console.log(`judge user=${key} used=${quota.used}/${limit}`);

        const gateway = env.AI_GATEWAY_ID || undefined;
        try {
          const [question, context] = await toEnglish(env, parsed.lang, [parsed.question, ...(parsed.context ? [parsed.context] : [])]);
          parsed.question = question;
          parsed.context = context;
          const check = await checkQuestion(env.AI, parsed.question, gateway);
          if (!check.ok) {
            await stub.refund(); // a rejected question doesn't cost a verdict
            const refunded = await stub.status(limit);
            const verdict = invalid(check.kind, check.hint, check.suggestions);
            return json({ verdict, check, quota: publicQuota(refunded) }, 200, origin);
          }
          const images: ClefImage[] = parsed.images.map((i) => ({ content_type: i.mediaType, base64: i.data }));
          const verdict = await judge(
            env.AI,
            check as typeof check & { kind: QuestionKind },
            parsed.question,
            parsed.context,
            parsed.texts,
            images,
            gateway,
          );
          return json({ verdict, check, quota: publicQuota(quota) }, 200, origin);
        } catch (err) {
          await stub.refund();
          // Clef 5021: too many input tokens (usually too many/too large screenshots).
          if (err instanceof Error && /5021|context window/i.test(err.message)) {
            console.error("clef context overflow", err.message);
            return json({ error: "Those screenshots are too big. Try fewer.", code: "too_large" }, 413, origin);
          }
          throw err;
        }
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      console.error("worker error", err);
      return json({ error: "Something went wrong. Try again." }, 502, origin);
    }
  },
} satisfies ExportedHandler<Env>;
