// External links (Capgo, X, GitHub) always open in the real browser, never in another app or the WebView.
// capgo.app is a universal link / Android App Link for the Capgo app, which would otherwise catch it.
import { Capacitor, registerPlugin } from '@capacitor/core'

const ExternalBrowser = registerPlugin<{ open(o: { url: string }): Promise<void> }>('ExternalBrowser')

function iosMajor(): number {
  const m = navigator.userAgent.match(/OS (\d+)_/)
  return m ? Number(m[1]) : 0
}

export async function openExternal(url: string): Promise<void> {
  const platform = Capacitor.getPlatform()
  // Android: a small native plugin opens the default browser package directly (newer native builds).
  if (platform === 'android' && Capacitor.isPluginAvailable('ExternalBrowser')) {
    try {
      return await ExternalBrowser.open({ url })
    } catch {
      /* fall back below */
    }
  }
  // iOS 17+: the x-safari scheme always opens Safari, skipping universal links.
  const target = platform === 'ios' && iosMajor() >= 17 ? `x-safari-${url}` : url
  const a = document.createElement('a')
  a.href = target
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.dataset.external = 'opened' // our own click: let Capacitor handle it
  a.click()
}

export function setupExternalLinks() {
  if (!Capacitor.isNativePlatform()) return
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.dataset.external || !/^https?:/.test(a.href) || new URL(a.href).host === location.host) return
      e.preventDefault()
      void openExternal(a.href)
    },
    true,
  )
}
