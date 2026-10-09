// Pre-translates every app screen into the most common languages, so the first user in a language
// doesn't wait for the model. Collects English text from the mock app, then fills the jevit-i18n cache.
// Needs the mock dev server: VITE_MOCK=1 bunx vite --port 5173   then: bun scripts/warm-i18n.ts [fr de …]

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP = process.env.APP_URL ?? 'http://localhost:5173'
const I18N = process.env.VITE_I18N_URL ?? 'https://i18n.jevit.fun'
const PAGES = ['welcome', 'home', 'receipts', 'slots', 'ask', 'context', 'judging', 'verdict', 'green', 'report', 'share', '/how', '/login', '/account']
const LANGS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['es', 'pt-BR', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'id', 'vi', 'th', 'ja', 'ko', 'zh-Hans', 'zh-Hant', 'fil', 'sv', 'ro', 'cs', 'el', 'hu']
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt']
const CHUNK = 150
const GAP_MS = 2_500 // the worker allows 30 model requests per minute per IP

async function textsOf(html: string): Promise<string[]> {
  const out: string[] = []
  let skip = 0
  let buf = ''
  const rw = new HTMLRewriter()
    .on('script, style, svg, textarea, [translate="no"]', {
      element(el) {
        skip++
        el.onEndTag(() => void skip--)
      },
    })
    .on('*', {
      element(el) {
        if (!skip) for (const a of ATTRS) if (el.getAttribute(a)) out.push(el.getAttribute(a)!)
      },
      text(t) {
        if (skip) return
        buf += t.text
        if (t.lastInTextNode) {
          out.push(buf)
          buf = ''
        }
      },
    })
  await rw.transform(new Response(html)).text()
  const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  return out.map((s) => decode(s).trim()).filter((s) => /\p{L}/u.test(s) && s.length <= 2000)
}

// Headless Chrome over DevTools: open each screen, let React render, read the DOM.
const chrome = Bun.spawn([CHROME, '--headless=new', '--user-data-dir=/tmp/jevit-warm-chrome', '--disable-gpu', '--remote-debugging-port=9411', 'about:blank'], { stderr: 'ignore' })
let target: { webSocketDebuggerUrl: string } | undefined
for (let i = 0; i < 50 && !target; i++) {
  await Bun.sleep(200)
  target = await fetch('http://127.0.0.1:9411/json/list').then((r) => r.json()).then((l: any[]) => l.find((t) => t.type === 'page')).catch(() => undefined)
}
const ws = new WebSocket(target!.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let seq = 0
const pending = new Map<number, (v: any) => void>()
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data))
  pending.get(m.id)?.(m.result)
}
const cdp = (method: string, params = {}) => new Promise<any>((r) => (pending.set(++seq, r), ws.send(JSON.stringify({ id: seq, method, params }))))

const all = new Set<string>()
for (const page of PAGES) {
  await cdp('Page.navigate', { url: `${APP}/?demo=${encodeURIComponent(page)}&lang=en` })
  await Bun.sleep(6_000)
  const html = (await cdp('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true })).result.value as string
  const found = await textsOf(html)
  found.forEach((t) => all.add(t))
  console.log(`${page}: ${found.length} strings`)
}
ws.close()
chrome.kill()
const texts = [...all]
console.log(`${texts.length} unique strings → ${LANGS.length} languages`)

for (const lang of LANGS) {
  let done = 0
  for (let i = 0; i < texts.length; i += CHUNK) {
    const res = await fetch(`${I18N}/v1/translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, texts: texts.slice(i, i + CHUNK) }),
    })
    const body = (await res.json()) as { complete?: boolean; error?: string }
    if (!res.ok || !body.complete) console.log(`  ${lang}: ${res.status} ${body.error ?? 'incomplete, run again later'}`)
    done += Math.min(CHUNK, texts.length - i)
    await Bun.sleep(GAP_MS)
  }
  console.log(`✓ ${lang} (${done})`)
}
