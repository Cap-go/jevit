// Records store/promo.html (real app footage in mock mode) into an MP4 with headless Chrome + ffmpeg.
// Needs the mock dev server: VITE_MOCK=1 bunx vite --port 5173
// Usage: bun scripts/promo-video.ts web|store [--audio music.m4a]
//   web   → 1080×1920, with the chat intro (website, socials)
//   store → 886×1920, app footage only (App Store app preview, 6.9" iPhone)
import { $ } from 'bun'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP = process.env.APP_URL ?? 'http://localhost:5173'
const kind = process.argv[2] === 'store' ? 'store' : 'web'
const audioArg = process.argv.indexOf('--audio')
const audio = audioArg > 0 ? process.argv[audioArg + 1] : undefined
const [W, H] = kind === 'store' ? [886, 1920] : [1080, 1920]
const OUT_DIR = 'store/video'
const FRAMES = `/tmp/jevit-promo-${kind}`
rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const port = 9420 + (kind === 'store' ? 1 : 0)
const chrome = Bun.spawn(
  [CHROME, '--headless=new', `--user-data-dir=/tmp/jevit-promo-chrome-${kind}`, `--remote-debugging-port=${port}`, `--window-size=${W},${H}`,
    '--force-device-scale-factor=1', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
  { stderr: 'ignore' },
)
let target: { webSocketDebuggerUrl: string } | undefined
for (let i = 0; i < 50 && !target; i++) {
  await Bun.sleep(200)
  target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l: any[]) => l.find((t) => t.type === 'page')).catch(() => undefined)
}
const ws = new WebSocket(target!.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let seq = 0
const pending = new Map<number, (v: any) => void>()
const frames: { file: string; ts: number }[] = []
let writes: Promise<unknown>[] = []
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data))
  if (m.id) return pending.get(m.id)?.(m.result)
  if (m.method === 'Page.screencastFrame') {
    const { data, metadata, sessionId } = m.params
    const file = `${FRAMES}/${String(frames.length).padStart(6, '0')}.jpg`
    frames.push({ file, ts: metadata.timestamp })
    writes.push(Bun.write(file, Buffer.from(data, 'base64')))
    ws.send(JSON.stringify({ id: ++seq, method: 'Page.screencastFrameAck', params: { sessionId } }))
  }
}
const cdp = (method: string, params = {}) => new Promise<any>((r) => (pending.set(++seq, r), ws.send(JSON.stringify({ id: seq, method, params }))))
const evaluate = async (expression: string) => (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value

await cdp('Page.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await cdp('Page.navigate', { url: `${APP}/store/promo.html${kind === 'store' ? '?store=1' : ''}` })
while (!(await evaluate('!!window.__ready'))) await Bun.sleep(200)
await Bun.sleep(500)

await cdp('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
await Bun.sleep(300)
await evaluate('void window.__play()')
while (!(await evaluate('!!window.__done'))) await Bun.sleep(100)
await cdp('Page.stopScreencast')
const t0 = (await evaluate('performance.timeOrigin + window.__t0')) / 1000
const marks = (await evaluate('window.__marks')) as { name: string; t: number }[]
const end = t0 + marks.find((m) => m.name === 'end')!.t / 1000 + 3.2
await Promise.all(writes)
ws.close()
chrome.kill()

// Frames arrive only when the screen changes: hold each one until the next, starting at play().
const kept = frames.filter((f, i) => f.ts >= t0 || frames[i + 1]?.ts > t0)
const list = kept
  .map((f, i) => {
    const start = Math.max(f.ts, t0)
    const next = Math.min(kept[i + 1]?.ts ?? end, end)
    return `file '${f.file}'\nduration ${Math.max(0.001, next - start).toFixed(4)}`
  })
  .join('\n')
await Bun.write(`${FRAMES}/list.txt`, `${list}\nfile '${kept.at(-1)!.file}'\n`)
await Bun.write(`${OUT_DIR}/promo-${kind}-marks.json`, JSON.stringify(marks, null, 2))
console.log(`${kept.length} frames over ${(end - t0).toFixed(1)}s (${(kept.length / (end - t0)).toFixed(0)} fps captured)`)

const silent = `${FRAMES}/video.mp4`
await $`ffmpeg -y -loglevel error -f concat -safe 0 -i ${FRAMES}/list.txt -vf fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p -c:v libx264 -preset slow -crf 16 -profile:v high -movflags +faststart ${silent}`
const out = `${OUT_DIR}/jevit-promo-${kind}.mp4`
if (audio) {
  const dur = end - t0
  await $`ffmpeg -y -loglevel error -i ${silent} -i ${audio} -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ac 2 -ar 48000 -af afade=t=out:st=${(dur - 1.5).toFixed(2)}:d=1.5 -t ${dur.toFixed(2)} ${out}`
} else {
  // App Store previews need an audio track: add silence.
  await $`ffmpeg -y -loglevel error -i ${silent} -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest ${out}`
}
console.log('✓', out)
