// Renders iPhone Duo store screenshots (outer 1398×2034, inner 2853×2007) from store/frame-duo.html.
// Needs the mock dev server: VITE_MOCK=1 bunx vite --port 5173   then: bun store/shots-duo.ts
import { $ } from 'bun'
import { mkdirSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = `${process.env.APP_URL ?? 'http://localhost:5173'}/store/frame-duo.html`
const DIR = 'store/screenshots/ios-duo'

// App Store Connect takes up to 10 screenshots per set: 5 per display.
const OUTER = [
  { id: '01-home', demo: 'home', t: 'Your chats.<br><em>Judged.</em>', s: 'AI chat analyzer: red flags, crushes, who’s right.' },
  { id: '02-ask', demo: 'ask', t: 'Ask a <em>question</em>', s: 'Is he into me? Is he cheating? Who’s right?' },
  { id: '03-verdict', demo: 'green', t: 'Get the <em>answer.</em>', s: 'Is he into me? Who’s right? See how sure it is.' },
  { id: '04-report', demo: 'report', t: 'Red flags.<br><em>Green flags.</em>', s: 'How toxic it is, their interest, and effort.' },
  { id: '05-share', demo: 'share', t: 'Share it with<br><em>friends</em>', s: 'One tap to share it with your friends.' },
]
const INNER = [
  { id: '06-inner-home', demo: 'home', t: 'Your chats. <em>Judged.</em>', s: 'AI chat analyzer: red flags, crushes, who’s right.' },
  { id: '07-inner-upload', demo: 'slots', t: 'Upload the <em>chat</em>', s: 'Any chat screenshot or pasted messages.' },
  { id: '08-inner-judging', demo: 'judging', t: 'The AI reads <em>every</em> message', s: 'Red flags, green flags and interest, in seconds.' },
  { id: '09-inner-verdict', demo: 'green', t: 'Get the <em>answer.</em>', s: 'Is he into me? Who’s right? See how sure it is.' },
  { id: '10-inner-report', demo: 'report', t: 'Red flags. <em>Green flags.</em>', s: 'How toxic it is, their interest, and effort.' },
]

mkdirSync(DIR, { recursive: true })
const chrome = Bun.spawn([CHROME, '--headless=new', '--user-data-dir=/tmp/jevit-duo-shots', '--remote-debugging-port=9433', '--hide-scrollbars', 'about:blank'], { stderr: 'ignore' })
let target: { webSocketDebuggerUrl: string } | undefined
for (let i = 0; i < 50 && !target; i++) {
  await Bun.sleep(200)
  target = await fetch('http://127.0.0.1:9433/json/list').then((r) => r.json()).then((l: any[]) => l.find((t) => t.type === 'page')).catch(() => undefined)
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
await cdp('Page.enable')

for (const [display, [w, h], shots] of [['outer', [1398, 2034], OUTER], ['inner', [2853, 2007], INNER]] as const) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  for (const shot of shots) {
    const url = `${BASE}?display=${display}&demo=${shot.demo}&t=${encodeURIComponent(shot.t)}&s=${encodeURIComponent(shot.s)}`
    await cdp('Page.navigate', { url })
    await Bun.sleep(shot.demo === 'share' ? 9000 : 6000) // the share card is drawn on a canvas
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
    const out = `${DIR}/${shot.id}.png`
    await Bun.write(out, Buffer.from(data, 'base64'))
    await $`magick ${out} -background ${'#14051f'} -alpha remove -alpha off ${out}`.quiet() // App Store rejects alpha
    console.log('✓', out)
  }
}
ws.close()
chrome.kill()
process.exit(0)
