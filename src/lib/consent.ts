// App Store guideline 5.1.2(i): ask before any chat content is sent to a third-party AI, and let people take it back.
// Bump VERSION when the providers or what we send change, so everyone is asked again.
const KEY = 'jevit.ai-consent'
const VERSION = '1'

export const hasAIConsent = () => localStorage.getItem(KEY) === VERSION

export function setAIConsent(on: boolean) {
  if (on) localStorage.setItem(KEY, VERSION)
  else localStorage.removeItem(KEY)
}
