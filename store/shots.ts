// Renders store screenshots from store/frame.html with headless Chrome.
// Needs the mock dev server: VITE_MOCK=1 bunx vite --port 5173   then: bun store/shots.ts
import { $ } from 'bun'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = 'http://localhost:5173/store/frame.html'

export const SHOTS = [
  { id: '01-home', demo: 'home', t: 'Your chats.<br><em>Judged.</em>', s: 'Upload a chat, ask a question, get the answer.' },
  { id: '02-ask', demo: 'ask', t: 'Upload the <em>chat</em>', s: 'Screenshots or pasted messages.' },
  { id: '03-judging', demo: 'judging', t: 'The AI reads<br><em>every</em> message', s: '20 checks on every chat, in seconds.' },
  { id: '04-verdict', demo: 'green', t: 'Get the <em>answer.</em>', s: 'A clear answer, and how sure it is.' },
  { id: '05-report', demo: 'report', t: 'Red flags.<br><em>Green flags.</em>', s: 'Interest, toxicity, and effort.' },
  { id: '06-share', demo: 'share', t: 'Share it with<br><em>friends</em>', s: 'One tap to share your answer.' },
]

const SIZES = [
  { dir: 'store/screenshots/ios-6.9', w: 1320, h: 2868 },
  { dir: 'store/screenshots/android', w: 1080, h: 1920 },
]

for (const size of SIZES) {
  await $`mkdir -p ${size.dir}`
  for (const shot of SHOTS) {
    const url = `${BASE}?demo=${shot.demo}&t=${encodeURIComponent(shot.t)}&s=${encodeURIComponent(shot.s)}`
    const out = `${size.dir}/${shot.id}.png`
    await $`${CHROME} --headless=new --user-data-dir=/tmp/jevit-shots-chrome --no-first-run --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=${size.w},${size.h} --timeout=15000 --screenshot=${out} ${url}`.quiet()
    console.log('✓', out)
  }
}
