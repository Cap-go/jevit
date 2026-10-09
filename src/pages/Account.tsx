import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setNavigation } from '@capgo/capacitor-transitions/react'
import Page from '../components/Page'
import { AuthRequired, deleteAccount, fetchMe } from '../lib/api'
import { signOut, type Quota, type SessionData } from '../lib/auth'
import { tap } from '../lib/haptics'
import { resetsIn } from '../lib/time'
import { shareApp } from '../lib/share'
import AppCredits from '../components/AppCredits'

export default function Account() {
  const navigate = useNavigate()
  const [me, setMe] = useState<{ user: SessionData['user']; quota: Quota } | null>(null)
  const [error, setError] = useState('')

  const leave = useCallback(() => {
    setNavigation('root', 'forward')
    navigate('/', { replace: true })
  }, [navigate])

  const load = useCallback(() => {
    fetchMe()
      .then(setMe)
      .catch((err) => (err instanceof AuthRequired ? leave() : setError(err.message)))
  }, [leave])

  useEffect(load, [load])

  const logout = async () => {
    void tap()
    await signOut()
    leave()
  }

  const remove = async () => {
    void tap()
    if (!window.confirm('Delete your Jevit account? You can sign in again later, but your history is gone.')) return
    try {
      await deleteAccount()
      leave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account')
    }
  }

  const q = me?.quota
  return (
    <Page title="Your account" back="/">
      <div className="card account-card pop-in">
        <div className="account-avatar">🧑‍⚖️</div>
        <div>
          <h3>{me?.user.name ? `Hey ${me.user.name}` : 'Signed in'}</h3>
          <p className="muted">via {me?.user.provider === 'google' ? 'Google' : me?.user.provider === 'demo' ? 'email' : 'Apple'}</p>
        </div>
      </div>

      {q && (
        <div className="card">
          <h3>⚖️ Today’s verdicts</h3>
          <div className="quota-row">
            <b>
              {q.remaining} of {q.limit} left
            </b>
            <span>{resetsIn(q.resetAt)}</span>
          </div>
          <div className="meter">
            <div className="meter-fill vibe-fill-green" style={{ width: `${(q.remaining / q.limit) * 100}%` }} />
          </div>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      <button className="btn wide" onClick={() => (tap(), shareApp())}>
        Invite friends 💌
      </button>
      <button className="btn ghost wide tight" onClick={logout}>
        Sign out
      </button>
      <button className="link-btn danger" onClick={remove}>
        Delete account
      </button>
      <AppCredits />
    </Page>
  )
}
