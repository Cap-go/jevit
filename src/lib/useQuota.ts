import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setDirection } from '@capgo/capacitor-transitions/react'
import { AuthRequired, fetchMe, lastQuota } from './api'
import type { Quota } from './auth'

// Daily verdict quota for the case screens; bounces to sign-in when the session is gone.
export function useQuota(next: string) {
  const navigate = useNavigate()
  const [quota, setQuota] = useState<Quota | null>(lastQuota)

  const toLogin = () => {
    setDirection('forward')
    navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
  }

  useEffect(() => {
    fetchMe()
      .then((me) => setQuota(me.quota))
      .catch((err) => err instanceof AuthRequired && toLogin())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { quota, toLogin, outOfVerdicts: quota !== null && quota.remaining <= 0 }
}
