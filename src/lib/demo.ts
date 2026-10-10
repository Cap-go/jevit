// Store-screenshot demo states. Only active in mock builds: /?demo=home|ask|judging|verdict|green|report|share|welcome, or a path (/?demo=/how)
import { caseFile, newId } from './store'
import { toEvidenceImage } from './images'
import { mockSession } from './auth'

export const demo: string | null =
  import.meta.env.VITE_MOCK === '1' ? new URLSearchParams(location.search).get('demo') : null
// &video=1 (promo recordings): real timing and animations. Otherwise screenshots: everything frozen at its end state.
export const still = demo !== null && !new URLSearchParams(location.search).has('video')

const ROUTES: Record<string, string> = {
  welcome: '/welcome',
  home: '/',
  ask: '/case/question',
  receipts: '/case/receipts',
  slots: '/case/receipts',
  context: '/case/context',
  judging: '/verdict',
  verdict: '/verdict',
  green: '/verdict',
  report: '/verdict',
  share: '/verdict',
}

export async function setupDemo(): Promise<void> {
  if (!demo) return
  // Headless screenshots freeze time: render every animation at its final state.
  if (still) document.documentElement.classList.add('demo')
  if (demo === 'welcome') localStorage.removeItem('jevit.onboarded')
  else localStorage.setItem('jevit.onboarded', '1')
  await mockSession('Sam')
  if (demo !== 'home' && demo !== 'welcome' && demo !== 'receipts') {
    const img = await toEvidenceImage('/store/demo-chat.png')
    caseFile.evidence = [{ id: newId(), kind: 'image', ...img }]
    caseFile.question = demo === 'green' || demo === 'share' ? 'Who’s right, me or him?' : 'Is he cheating?'
  }
  history.replaceState({}, '', ROUTES[demo] ?? (demo.startsWith('/') ? demo : '/'))
}
