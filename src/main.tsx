import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initTransitions } from '@capgo/capacitor-transitions/react'
import '@capgo/capacitor-transitions'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'
import App from './App'
import { getSession, warmUpAuth } from './lib/auth'
import { setupDemo } from './lib/demo'
import { setupChrome } from './lib/chrome'

async function nativeBoot() {
  if (!Capacitor.isNativePlatform()) return
  // Tell Capgo this bundle booted fine, otherwise it rolls back to the previous one.
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater')
  await CapacitorUpdater.notifyAppReady()
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
}
void nativeBoot().catch(() => undefined)

initTransitions({ platform: 'auto' })
await setupChrome().catch(() => undefined)
warmUpAuth()
void getSession()

await setupDemo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
