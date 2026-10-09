// Public pages are written in English only. For other browser languages (Accept-Language, or ?lang=fr),
// every text node and a few attributes are translated by jevit-i18n, and the result is cached per page version.

type Translator = { translate(lang: string, texts: string[]): Promise<{ translations: string[]; complete?: boolean }> };

const SKIP = "script, style, svg, [translate=no]";
const ATTRS: [string, string][] = [
  ["img", "alt"],
  ['meta[name="description"]', "content"],
  ['meta[property="og:title"]', "content"],
  ['meta[property="og:description"]', "content"],
];

/** Target language for this request, or null for English. */
export function pageLang(request: Request): string | null {
  const raw = new URL(request.url).searchParams.get("lang") ?? (request.headers.get("accept-language") ?? "").split(",")[0].split(";")[0].trim();
  if (!raw || raw === "*") return null;
  try {
    const loc = new Intl.Locale(Intl.getCanonicalLocales(raw.replace(/_/g, "-"))[0]);
    if (loc.language === "en" || !/^[a-z]{2,3}$/.test(loc.language)) return null;
    if (loc.language === "zh") return loc.script === "Hant" || ["TW", "HK", "MO"].includes(loc.region ?? "") ? "zh-Hant" : "zh-Hans";
    if (loc.language === "pt") return loc.region === "PT" ? "pt-PT" : "pt-BR";
    return loc.language;
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" || e[1] === "X" ? 2 : 1), e[1] === "x" || e[1] === "X" ? 16 : 10)) : (ENTITIES[e] ?? m),
  );
const split = (t: string) => {
  const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return { lead: m[1], core: m[2], trail: m[3] };
};
const wanted = (core: string) => /\p{L}/u.test(core);

// Walks text nodes (outside SKIP) and the translatable attributes; `onText` decides what each becomes.
function rewriter(onText: (text: string) => string | null, onAttr: (value: string) => string | null, lang?: string) {
  let skip = 0;
  let buf = "";
  let rw = new HTMLRewriter()
    .on(SKIP, {
      element(el) {
        skip++;
        el.onEndTag(() => void skip--);
      },
    })
    .onDocument({
      text(t) {
        if (skip) return;
        buf += t.text;
        if (!t.lastInTextNode) return void (lang && t.remove());
        const full = decode(buf);
        buf = "";
        const out = onText(full);
        if (out != null) t.replace(out, { html: false });
      },
    });
  for (const [selector, attr] of ATTRS)
    rw = rw.on(selector, {
      element(el) {
        const v = el.getAttribute(attr);
        const out = v && onAttr(decode(v));
        if (out != null) el.setAttribute(attr, out);
      },
    });
  if (lang) rw = rw.on("html", { element: (el) => void el.setAttribute("lang", lang) });
  return rw;
}

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function localize(page: Response, lang: string, i18n: Translator, ctx: ExecutionContext): Promise<Response> {
  if (page.status !== 200 || !(page.headers.get("content-type") ?? "").includes("text/html")) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set("vary", "accept-language");
  headers.set("content-language", lang);
  const key = new Request(`https://jevit.fun/__i18n/${lang}/${await sha256(html)}`);
  const hit = await caches.default.match(key);
  if (hit) return new Response(hit.body, { status: 200, headers });

  // 1. Collect every string once.
  const texts = new Set<string>();
  const add = (s: string) => {
    const { core } = split(s);
    if (wanted(core)) texts.add(core);
    return null;
  };
  await rewriter(add, add).transform(new Response(html)).text();
  const list = [...texts];

  // 2. Translate (cached per string by jevit-i18n).
  const dict = new Map<string, string>();
  let complete = true;
  try {
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200);
      const res = await i18n.translate(lang, chunk);
      if (res.complete === false) complete = false;
      chunk.forEach((c, k) => dict.set(c, res.translations[k] ?? c));
    }
  } catch (err) {
    console.warn("page translation failed", lang, err);
    return new Response(html, { status: 200, headers });
  }

  // 3. Rewrite.
  const swap = (s: string) => {
    const { lead, core, trail } = split(s);
    return lead + (dict.get(core) ?? core) + trail;
  };
  const out = await rewriter(swap, swap, lang).transform(new Response(html)).text();
  if (complete) ctx.waitUntil(caches.default.put(key, new Response(out, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=86400" } })));
  return new Response(out, { status: 200, headers });
}
