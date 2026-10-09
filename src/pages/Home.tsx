import { useNavigate } from 'react-router-dom'
import { setDirection } from '@capgo/capacitor-transitions/react'
import Page from '../components/Page'
import { LogoMark } from '../components/Logo'
import { STARTER_QUESTIONS } from '../lib/questionCheck'
import { caseFile } from '../lib/store'
import { tap } from '../lib/haptics'
import { getSession } from '../lib/auth'
import { shareApp } from '../lib/share'

const STAMPS = [
  { t: 'YES 💅', c: 'green' },
  { t: 'RED FLAG 🚩', c: 'red' },
  { t: 'YOU WIN 🏆', c: 'green' },
  { t: 'NOPE', c: 'red' },
  { t: 'KEEPER 💚', c: 'green' },
  { t: 'BOTH WRONG', c: 'yellow' },
  { t: 'MAYBE 🤔', c: 'yellow' },
  { t: 'RUN 🏃', c: 'red' },
]

export default function Home() {
  const navigate = useNavigate()

  const start = async (question?: string) => {
    void tap()
    if (question) caseFile.question = question
    setDirection('forward')
    navigate((await getSession()) ? '/case/receipts' : '/login?next=/case/receipts')
  }

  const account = async () => {
    void tap()
    setDirection('forward')
    navigate((await getSession()) ? '/account' : '/login?next=/account')
  }

  const how = () => {
    void tap()
    setDirection('forward')
    navigate('/how')
  }

  return (
    <Page
      className="home fill"
      footer={
        <div className="home-footer">
          <button className="cta" onClick={() => start()}>
            Start a case ⚖️
          </button>
          <button className="link-btn muted-link" onClick={() => (tap(), shareApp())}>
            Invite a friend to get judged 💌
          </button>
        </div>
      }
    >
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="home-top">
        <button className="round-btn" onClick={how} aria-label="How it works">
          ?
        </button>
        <button className="round-btn" onClick={account} aria-label="Account">
          🧑‍⚖️
        </button>
      </div>

      <div className="home-hero">
        <div className="logo-float">
          <LogoMark size={92} />
        </div>
        <h1 className="wordmark">jevit</h1>
        <p className="tagline">get judged.</p>
        <p className="sub">
          Upload a chat. Ask a question. <b>Get the answer.</b>
        </p>
      </div>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...STAMPS, ...STAMPS].map((s, i) => (
            <span key={i} className={`mini-stamp vibe-${s.c}`}>
              {s.t}
            </span>
          ))}
        </div>
      </div>

      <div className="quick">
        <p className="section-label">Quick case</p>
        <div className="quick-grid">
          {STARTER_QUESTIONS.slice(0, 4).map((q) => (
            <button key={q} className="chip" onClick={() => start(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </Page>
  )
}
