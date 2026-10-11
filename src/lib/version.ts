import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

declare const __APP_VERSION__: string

/** Version of this web bundle (package.json at build time). */
export const APP_VERSION = __APP_VERSION__

/** "1.0 · 1.0.15": store (native) version, then the Capgo live bundle actually running. */
export function useVersionLabel(): string {
  const [label, setLabel] = useState(APP_VERSION)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void Promise.all([
      import('@capacitor/app').then(({ App }) => App.getInfo()).then((i) => i.version).catch(() => ''),
      import('@capgo/capacitor-updater')
        .then(({ CapacitorUpdater }) => CapacitorUpdater.current())
        .then(({ bundle }) => (bundle.version === 'builtin' ? APP_VERSION : bundle.version))
        .catch(() => APP_VERSION),
    ]).then(([native, bundle]) => setLabel(native ? `${native} · ${bundle}` : bundle))
  }, [])
  return label
}
