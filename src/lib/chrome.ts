import { Capacitor } from '@capacitor/core'
import { NativeNavigation } from '@capgo/capacitor-native-navigation'

// Native chrome: on builds that ship @capgo/capacitor-native-navigation the top bar is a real
// UIKit / Android Toolbar and the plugin writes safe-area insets as CSS variables (fixes Android
// edge-to-edge). Older native builds that get this bundle as a live update keep the web header.
export const nativeChrome = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeNavigation')
const isAndroid = Capacitor.getPlatform() === 'android'

const BG = '#14051f'
const TINT = '#ff3d8b'
const BACK_ITEM = {
  id: 'back',
  title: 'Back',
  icon: {
    ios: { sfSymbol: 'chevron.backward' },
    android: { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' },
  },
}

export type Chrome = { owner: symbol; title?: string; subtitle?: string; onBack?: () => void }

let current: Chrome | null = null

export async function setupChrome() {
  if (!nativeChrome) return
  document.documentElement.classList.add('native-chrome')
  await NativeNavigation.configure({ contentInsetMode: 'css', animationDuration: 320, colors: { tint: TINT, foreground: '#ffffff' } })
  await NativeNavigation.addListener('navbarBack', () => current?.onBack?.())
  await NativeNavigation.addListener('navbarItemTap', ({ id }) => {
    if (id === 'back') current?.onBack?.()
  })
  // Android hardware back: same as the bar's back button; on a root screen, leave the app.
  const { App } = await import('@capacitor/app')
  await App.addListener('backButton', () => {
    if (current?.onBack) current.onBack()
    else void App.minimizeApp()
  })
}

/** Called by the page that is (about to be) on screen. */
export function showChrome(chrome: Chrome) {
  current = chrome
  if (!nativeChrome) return
  const hasBar = chrome.title !== undefined || chrome.onBack !== undefined
  void NativeNavigation.setNavbar({
    hidden: !hasBar,
    title: chrome.title?.trim() ?? '',
    subtitle: chrome.subtitle,
    transparent: true,
    // Android has a native back arrow; iOS gets a chevron item (the text back button would be empty).
    backButton: { visible: isAndroid && !!chrome.onBack },
    leftItems: !isAndroid && chrome.onBack ? [BACK_ITEM] : [],
    colors: { tint: TINT, foreground: '#ffffff', ...(isAndroid ? { background: BG } : {}) },
  }).catch(() => {})
}

/** Update the bar only if this page still owns it (cached pages re-render off screen). */
export function updateChrome(chrome: Chrome) {
  if (current?.owner === chrome.owner) showChrome(chrome)
}
