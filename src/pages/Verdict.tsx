import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setNavigation } from '@capgo/capacitor-transitions/react'
import confetti from 'canvas-confetti'
import Page from '../components/Page'
import Deliberation from '../components/Deliberation'
import Stamp from '../components/Stamp'
import ShareSheet from '../components/ShareSheet'
import { requestVerdict, JudgeFailure, AuthRequired, QuotaExceeded } from '../lib/api'
import { resetsIn } from '../lib/time'
import { demo } from '../lib/demo'
import { caseFile } from '../lib/store'
import { buzz, tap, thud } from '../lib/haptics'
import type { Verdict } from '../lib/types'
import { tr } from '../lib/i18n'

const MIN_SUSPENSE_MS = demo ? 0 : 4200
const SLAM_MS = demo ? 0 : 650

type Phase =
  | { name: 'judging' }
  | { name: 'slam'; verdict: Verdict }
  | { name: 'reveal'; verdict: Verdict }
  | { name: 'error'; message: string }
  | { name: 'closed'; resetAt: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function celebrate(v: Verdict) {
  if (v.safety_concern || !v.question_ok || demo) return
  const emoji = v.vibe === 'green' ? '💚' : v.vibe === 'red' ? '🚩' : '🤔'
  const shape = confetti.shapeFromText({ text: emoji, scalar: 3 })
  // flat: no 3D tumble, otherwise the emoji flip edge-on like spinning coins.
  confetti({ particleCount: 28, spread: 90, startVelocity: 40, origin: { y: 0.3 }, shapes: [shape], scalar: 3, ticks: 200, flat: true })
  if (v.vibe === 'green') {
    confetti({ particleCount: 140, spread: 120, origin: { y: 0.35 }, colors: ['#D7FF3A', '#FF3D8B', '#B026FF', '#ffffff'] })
  }
}

export default function VerdictPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [question, setQuestion] = useState(caseFile.question)
  const [run, setRun] = useState(0)
  const [phase, setPhase] = useState<Phase>({ name: 'judging' })
  const [sharing, setSharing] = useState(demo === 'share')

  useEffect(() => {
    const ctrl = new AbortController()
    setPhase({ name: 'judging' })
    ;(async () => {
      try {
        const [verdict] = await Promise.all([requestVerdict(question, ctrl.signal), sleep(MIN_SUSPENSE_MS)])
        if (ctrl.signal.aborted) return
        setPhase({ name: 'slam', verdict })
        void thud()
        await sleep(SLAM_MS)
        if (ctrl.signal.aborted) return
        setPhase({ name: 'reveal', verdict })
        void buzz(verdict.vibe === 'green')
        celebrate(verdict)
      } catch (err) {
        if (ctrl.signal.aborted) return
        if (err instanceof AuthRequired) {
          setNavigation('root', 'forward')
          navigate('/login?next=/case/receipts', { replace: true })
          return
        }
        if (err instanceof QuotaExceeded) {
          setPhase({ name: 'closed', resetAt: err.quota.resetAt })
          return
        }
        setPhase({ name: 'error', message: err instanceof JudgeFailure ? err.message : 'Something went wrong. Try again.' })
      }
    })()
    return () => ctrl.abort()
  }, [question, run, location.key])

  const rejudge = (q: string) => {
    void tap()
    caseFile.question = tr(q)
    setQuestion(tr(q))
    setRun((r) => r + 1)
  }

  const newCase = () => {
    void tap()
    caseFile.question = ''
    caseFile.evidence = []
    setNavigation('root', 'forward')
    navigate('/case/receipts', { replace: true })
  }

  const verdict = phase.name === 'reveal' ? phase.verdict : null

  return (
    <Page
      title={phase.name === 'reveal' ? 'The verdict' : 'Judging…'}
      back="/case/context"
      className={`verdict-page fill ${phase.name === 'slam' ? 'shake' : ''}`}
      footer={
        verdict ? (
          <div className="row">
            {verdict.question_ok && (
              <button className="btn ghost grow" onClick={() => (tap(), setSharing(true))}>
                Share 📤
              </button>
            )}
            <button className="btn grow" onClick={newCase}>
              New chat ⚖️
            </button>
          </div>
        ) : undefined
      }
    >
      {(phase.name === 'judging' || phase.name === 'slam') && (
        <Deliberation question={question} evidence={caseFile.evidence} slamming={phase.name === 'slam'} />
      )}
      {phase.name === 'slam' && <div className="flash" />}

      {phase.name === 'error' && (
        <div className="error-state pop-in">
          <div className="error-emoji">🫠</div>
          <h2>Mistrial</h2>
          <p className="muted">{phase.message}</p>
          <button className="cta" onClick={() => setRun((r) => r + 1)}>
            Try again
          </button>
        </div>
      )}

      {phase.name === 'closed' && (
        <div className="error-state pop-in">
          <div className="error-emoji">🌙</div>
          <h2>No more answers today</h2>
          <p className="muted">{`You used all your free answers (${resetsIn(phase.resetAt)}).`}</p>
          <button className="cta" onClick={() => navigate('/', { replace: true })}>
            Back home
          </button>
        </div>
      )}

      {verdict && !verdict.question_ok && <Objection verdict={verdict} onPick={rejudge} />}
      {verdict && verdict.question_ok && <Ruling verdict={verdict} question={question} />}
      {verdict && sharing && <ShareSheet verdict={verdict} question={question} onClose={() => setSharing(false)} />}
    </Page>
  )
}

function Objection({ verdict, onPick }: { verdict: Verdict; onPick: (q: string) => void }) {
  return (
    <div className="ruling">
      <Stamp label="OBJECTION!" vibe="yellow" />
      <p className="headline reveal-1">Jevit can’t answer that one.</p>
      <p className="reasoning reveal-2">{verdict.question_feedback}</p>
      {verdict.suggested_questions.length > 0 && (
        <div className="reveal-3">
          <p className="section-label">Try one of these instead</p>
          <div className="chips wrap">
            {verdict.suggested_questions.map((q) => (
              <button key={q} className="chip big" onClick={() => onPick(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function useCountUp(target: number, ms = 1100) {
  const [n, setN] = useState(demo ? target : 0)
  useEffect(() => {
    if (demo) return
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return n
}

function Ruling({ verdict, question }: { verdict: Verdict; question: string }) {
  const pct = useCountUp(verdict.confidence)
  const track = useRef<HTMLDivElement>(null)
  const [card, setCard] = useState(0)

  const cards: { id: string; title: string; body: ReactNode }[] = [
    {
      id: 'why',
      title: '🧠 Why',
      body: (
        <>
          <p>{verdict.reasoning}</p>
          <p className="card-note">
            {`Jevit checked ${verdict.checks} things. It’s just for fun, not real advice.`}
          </p>
        </>
      ),
    },
    ...(verdict.breakdown.length
      ? [
          {
            id: 'scores',
            title: '🎲 Scores',
            body: verdict.breakdown.map((b) => (
              <div key={b.label} className="bar-row">
                <span>{b.label}</span>
                <div className="bar">
                  <div className={`bar-fill vibe-fill-${verdict.vibe}`} style={{ width: `${Math.round(b.p * 100)}%` }} />
                </div>
                <b>{Math.round(b.p * 100)}%</b>
              </div>
            )),
          },
        ]
      : []),
    ...(verdict.meters.length
      ? [
          {
            id: 'vibe',
            title: '📊 Vibe report',
            body: verdict.meters.map((m) => (
              <div key={m.id} className="vibe-meter">
                <div className="vibe-meter-row">
                  <span>
                    {m.emoji} {m.label}
                  </span>
                  <b>{m.caption}</b>
                </div>
                <div className={`gauge gauge-${m.id}`}>
                  <div className="gauge-dot" style={{ left: `${m.value}%` }} />
                </div>
              </div>
            )),
          },
        ]
      : []),
    ...(verdict.red_flags.length || verdict.green_flags.length
      ? [
          {
            id: 'flags',
            title: '🚩💚 Flags',
            body: (
              <div className="flag-chips">
                {verdict.red_flags.map((f) => (
                  <span key={f.id} className="flag-chip red">
                    {f.emoji} {f.label} <b>{Math.round(f.p * 100)}%</b>
                  </span>
                ))}
                {verdict.green_flags.map((f) => (
                  <span key={f.id} className="flag-chip green">
                    {f.emoji} {f.label} <b>{Math.round(f.p * 100)}%</b>
                  </span>
                ))}
              </div>
            ),
          },
        ]
      : []),
    ...(verdict.advice ? [{ id: 'advice', title: '🫶 Advice', body: <p>{verdict.advice}</p> }] : []),
  ]

  const goTo = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  // Store screenshot of the vibe report.
  useEffect(() => {
    if (demo !== 'report') return
    const t = setTimeout(() => {
      const el = track.current
      const i = cards.findIndex((c) => c.id === 'vibe')
      if (el && i > 0) el.scrollLeft = i * el.clientWidth
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`ruling fill vibe-bg-${verdict.vibe}`}>
      {verdict.safety_concern && (
        <div className="card safety pop-in">
          <h3>💜 Hey, this one matters</h3>
          <p>{verdict.safety_note}</p>
        </div>
      )}

      <p className="asked" translate="no">“{question}”</p>
      <Stamp label={verdict.verdict_label} vibe={verdict.vibe} max={58} />

      <div className="confidence reveal-1">
        <div className="confidence-row">
          <span>How sure</span>
          <b>{pct}%</b>
        </div>
        <div className="meter">
          <div className={`meter-fill vibe-fill-${verdict.vibe}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="headline reveal-2">{verdict.headline}</p>

      <div
        className="report-track reveal-3"
        ref={track}
        onScroll={(e) => setCard(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {cards.map((c) => (
          <section key={c.id} className="report-card">
            <h3>{c.title}</h3>
            {c.body}
          </section>
        ))}
      </div>
      <div className="pager report-pager">
        {cards.map((c, i) => (
          <button key={c.id} className={`dot ${i === card ? 'on' : ''}`} aria-label={c.title} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  )
}
