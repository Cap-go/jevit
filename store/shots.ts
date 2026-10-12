// Renders store screenshots from store/frame.html with headless Chrome (DevTools, so every screen fully renders).
// Needs the mock dev server: VITE_MOCK=1 bunx vite --port 5173   then: bun store/shots.ts
// Captions are indexed by the App Store: keep search words (red flags, chat analyzer, who’s right…) in them.
import { $ } from 'bun'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = `${process.env.APP_URL ?? 'http://localhost:5173'}/store/frame.html`

export const SHOTS = [
  { id: '01-home', demo: 'home', t: 'Your chats.<br><em>Judged.</em>', s: 'AI chat analyzer: red flags, crushes, who’s right.' },
  { id: '02-upload', demo: 'slots', t: 'Upload the <em>chat</em>', s: 'Any chat screenshot or pasted messages.' },
  { id: '03-ask', demo: 'ask', t: 'Ask a <em>question</em>', s: 'Is he into me? Is he cheating? Who’s right?' },
  { id: '04-judging', demo: 'judging', t: 'The AI reads<br><em>every</em> message', s: 'Red flags, green flags and interest, in seconds.' },
  { id: '05-verdict', demo: 'green', t: 'Get the <em>answer.</em>', s: 'A clear answer, and how sure it is.' },
  { id: '06-report', demo: 'report', t: 'Red flags.<br><em>Green flags.</em>', s: 'How toxic it is, their interest, and effort.' },
  { id: '07-share', demo: 'share', t: 'Share it with<br><em>friends</em>', s: 'One tap to share it with your friends.' },
]

const SIZES = [
  { dir: 'store/screenshots/ios-6.9', w: 1320, h: 2868 },
  { dir: 'store/screenshots/android', w: 1080, h: 1920 },
]

if (import.meta.main) {
  const chrome = Bun.spawn([CHROME, '--headless=new', '--user-data-dir=/tmp/jevit-shots-chrome', '--remote-debugging-port=9432', '--hide-scrollbars', 'about:blank'], { stderr: 'ignore' })
  let target: { webSocketDebuggerUrl: string } | undefined
  for (let i = 0; i < 50 && !target; i++) {
    await Bun.sleep(200)
    target = await fetch('http://127.0.0.1:9432/json/list').then((r) => r.json()).then((l: any[]) => l.find((t) => t.type === 'page')).catch(() => undefined)
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

  for (const size of SIZES) {
    // Start clean so renamed shots don't leave stale files behind.
    rmSync(size.dir, { recursive: true, force: true })
    mkdirSync(size.dir, { recursive: true })
    await cdp('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: false })
    for (const shot of SHOTS) {
      await cdp('Page.navigate', { url: `${BASE}?demo=${shot.demo}&t=${encodeURIComponent(shot.t)}&s=${encodeURIComponent(shot.s)}` })
      await Bun.sleep(shot.demo === 'share' ? 9000 : 6000) // the share card is drawn on a canvas
      const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
      const out = `${size.dir}/${shot.id}.png`
      await Bun.write(out, Buffer.from(data, 'base64'))
      await $`magick ${out} -background ${'#14051f'} -alpha remove -alpha off ${out}`.quiet() // App Store rejects alpha
      console.log('✓', out)
    }
  }
  ws.close()
  chrome.kill()
  console.log(readdirSync(SIZES[0].dir).length, 'shots per size')
  process.exit(0)
}
