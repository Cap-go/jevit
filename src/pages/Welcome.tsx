import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setNavigation } from '@capgo/capacitor-transitions/react'
import Page from '../components/Page'
import { LogoMark, Gavel } from '../components/Logo'
import { getSession } from '../lib/auth'
import { tap, thud } from '../lib/haptics'

export const ONBOARDED_KEY = 'jevit.onboarded'
export const isOnboarded = () => localStorage.getItem(ONBOARDED_KEY) === '1'

const STAMPS = ['YES 💅', 'RED FLAG 🚩', 'YOU WIN 🏆', 'NOPE', 'KEEPER 💚']

function SlideHello() {
  return (
    <>
      <div className="logo-float">
        <LogoMark size={120} />
      </div>
      <h1 className="wordmark small">jevit</h1>
      <h2>Who’s right?</h2>
      <p className="muted">Upload a chat, ask a question, get an answer in seconds.</p>
    </>
  )
}

function SlideReceipts() {
  return (
    <>
      <div className="demo-chat">
        <p className="bubble them">hey</p>
        <p className="bubble me">hiii how was your day?? 🥰</p>
        <p className="bubble them">k</p>
        <p className="bubble me">…k?</p>
      </div>
      <h2>Upload the chat 📸</h2>
      <p className="muted">Screenshots, photos of a chat, or paste the messages. Up to 4 per case.</p>
    </>
  )
}

function SlideAsk() {
  return (
    <>
      <div className="demo-questions">
        <span className="chip">Is he cheating?</span>
        <span className="chip">Am I wrong here?</span>
        <span className="chip active">Is she into me?</span>
        <span className="chip">How toxic is this?</span>
      </div>
      <h2>Ask a question ❓</h2>
      <p className="muted">Like “Is he into me?”, “Who’s right?” or “How toxic is this?”</p>
    </>
  )
}

function SlideVerdict({ active }: { active: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setI((x) => (x + 1) % STAMPS.length), 1400)
    return () => clearInterval(t)
  }, [active])
  return (
    <>
      <div className="demo-verdict">
        <Gavel className="demo-gavel" />
        <div key={i} className={`stamp mini vibe-${i % 2 ? 'red' : 'green'}`}>
          {STAMPS[i]}
        </div>
      </div>
      <h2>Get the answer ✅</h2>
      <p className="muted">The answer, how sure it is, red & green flags, and advice. Then share it with friends.</p>
    </>
  )
}

export default function Welcome() {
  const navigate = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const [slide, setSlide] = useState(0)
  const count = 4
  const last = slide === count - 1

  const onScroll = () => {
    const el = track.current
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth))
  }

  const goTo = (n: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }

  const finish = async () => {
    void thud()
    localStorage.setItem(ONBOARDED_KEY, '1')
    setNavigation('root', 'forward')
    navigate((await getSession()) ? '/' : '/login?next=/', { replace: true })
  }

  return (
    <Page
      className="welcome"
      footer={
        <div className="welcome-footer">
          <div className="pager">
            {Array.from({ length: count }, (_, n) => (
              <button key={n} className={`dot ${n === slide ? 'on' : ''}`} aria-label={`Slide ${n + 1}`} onClick={() => goTo(n)} />
            ))}
          </div>
          <button
            className="cta"
            onClick={() => {
              void tap()
              if (last) void finish()
              else goTo(slide + 1)
            }}
          >
            {last ? 'Let’s get judged ⚖️' : 'Next'}
          </button>
          <button className={`link-btn skip ${last ? 'hidden' : ''}`} onClick={finish}>
            Skip
          </button>
        </div>
      }
    >
      <div className="slides" ref={track} onScroll={onScroll}>
        <section className={`slide ${slide === 0 ? 'active' : ''}`}>
          <SlideHello />
        </section>
        <section className={`slide ${slide === 1 ? 'active' : ''}`}>
          <SlideReceipts />
        </section>
        <section className={`slide ${slide === 2 ? 'active' : ''}`}>
          <SlideAsk />
        </section>
        <section className={`slide ${slide === 3 ? 'active' : ''}`}>
          <SlideVerdict active={last} />
        </section>
      </div>
    </Page>
  )
}
