import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setNavigation } from '@capgo/capacitor-transitions/react'
import Page from '../components/Page'
import { LogoMark } from '../components/Logo'
import { availableProviders, signIn, signInWithEmail, AuthFailure, type Provider } from '../lib/auth'
import Sheet from '../components/Sheet'
import { setQuota } from '../lib/api'
import { buzz, tap } from '../lib/haptics'

const LABEL: Record<Provider, string> = { apple: 'Continue with Apple', google: 'Continue with Google' }

function ProviderIcon({ provider }: { provider: Provider }) {
  return provider === 'apple' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.47-.03-.01-2.3-.88-2.32-3.5zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.5 2.56-1.23z" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.9a5.04 5.04 0 0 1-2.19 3.3v2.75h3.54c2.08-1.91 3.25-4.73 3.25-8.06z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.06-3.74 1.06-2.87 0-5.3-1.94-6.17-4.55H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.83 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.65-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.65 2.84C6.7 7.32 9.13 5.38 12 5.38z" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/case/receipts'
  const [busy, setBusy] = useState<Provider | null>(null)
  const [error, setError] = useState('')
  const providers = availableProviders()
  const [emailSheet, setEmailSheet] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const done = (quota: Parameters<typeof setQuota>[0]) => {
    setQuota(quota)
    void buzz(true)
    setNavigation('root', 'forward')
    navigate(next, { replace: true })
  }

  const goEmail = async () => {
    void tap()
    setBusy('apple')
    setError('')
    try {
      const { quota } = await signInWithEmail(email, password)
      setEmailSheet(false)
      done(quota)
    } catch (err) {
      setError(err instanceof AuthFailure ? err.message : 'Sign-in failed')
    } finally {
      setBusy(null)
    }
  }

  const go = async (provider: Provider) => {
    void tap()
    setBusy(provider)
    setError('')
    try {
      const { quota } = await signIn(provider)
      done(quota)
    } catch (err) {
      setError(err instanceof AuthFailure ? err.message : 'Sign-in was cancelled')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page title=" " back="/" className="login">
      <div className="login-hero">
        <div className="logo-float">
          <LogoMark size={96} />
        </div>
        <h2>Sign in 🪪</h2>
        <p className="muted">
          Sign in to get your free answers every day. It also keeps bots out.
        </p>
      </div>

      <div className="login-buttons">
        {providers.map((p) => (
          <button key={p} className={`social-btn ${p}`} disabled={busy !== null} onClick={() => go(p)}>
            <ProviderIcon provider={p} />
            {busy === p ? 'Checking ID…' : LABEL[p]}
          </button>
        ))}
        {providers.length === 0 && <p className="error-text">Sign-in isn’t configured for this build.</p>}
        {error && !emailSheet && <p className="error-text">{error}</p>}
        <button className="link-btn muted-link" onClick={() => (tap(), setError(''), setEmailSheet(true))}>
          Reviewer or tester? Sign in with email
        </button>
      </div>

      {emailSheet && (
        <Sheet title="Sign in with email" onClose={() => setEmailSheet(false)}>
          <input
            className="text-field"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="text-field"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goEmail()}
          />
          {error && <p className="error-text">{error}</p>}
          <button className="cta" disabled={!email.trim() || !password || busy !== null} onClick={goEmail}>
            {busy ? 'Checking ID…' : 'Sign in'}
          </button>
        </Sheet>
      )}

      <p className="fineprint">
        We only use your account to stop abuse and count your daily verdicts. No posts, no contacts, no selling data. Your
        screenshots are never stored.
      </p>
    </Page>
  )
}
