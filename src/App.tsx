import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { setupRouterOutlet } from '@capgo/capacitor-transitions/react'
import Home from './pages/Home'
import Receipts from './pages/case/Receipts'
import Question from './pages/case/Question'
import Context from './pages/case/Context'
import VerdictPage from './pages/Verdict'
import HowItWorks from './pages/HowItWorks'
import Login from './pages/Login'
import Account from './pages/Account'
import Welcome, { isOnboarded } from './pages/Welcome'

export default function App() {
  const location = useLocation()
  const outletRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  // First launch: onboarding before anything else.
  useEffect(() => {
    if (!isOnboarded() && location.pathname !== '/welcome') navigate('/welcome', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (outletRef.current) setupRouterOutlet(outletRef.current, { platform: 'auto', swipeGesture: 'auto' })
  }, [])

  return (
    <cap-router-outlet ref={outletRef}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/case/receipts" element={<Receipts />} />
        <Route path="/case/question" element={<Question />} />
        <Route path="/case/context" element={<Context />} />
        <Route path="/ask" element={<Receipts />} />
        <Route path="/verdict" element={<VerdictPage />} />
        <Route path="/how" element={<HowItWorks />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </cap-router-outlet>
  )
}
