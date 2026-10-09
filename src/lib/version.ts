import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

declare const __APP_VERSION__: string

export const APP_VERSION = __APP_VERSION__

// Live Capgo bundle, when it differs from the version this JS was built as (same as BeWise).
export function useLiveBundle(): string {
  const [bundle, setBundle] = useState('')
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void import('@capgo/capacitor-updater')
      .then(({ CapacitorUpdater }) => CapacitorUpdater.current())
      .then(({ bundle: current }) => setBundle(['builtin', APP_VERSION].includes(current.version) ? '' : current.version))
      .catch(() => {})
  }, [])
  return bundle
}
