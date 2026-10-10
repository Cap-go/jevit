import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { CapacitorPersistentAccount as PersistentAccount } from '@capgo/capacitor-persistent-account'

// Social sign-in: native Apple/Google login gives us a provider ID token, the worker verifies it
// and returns a Jevit session. The session lives in Keychain (iOS) / AccountManager (Android).

export type Provider = 'apple' | 'google'
export type Quota = { used: number; limit: number; remaining: number; resetAt: number }
export type SessionData = { token: string; user: { provider: Provider | 'demo'; name?: string } }

const JUDGE_URL = import.meta.env.VITE_JUDGE_URL ?? 'http://localhost:8787'
const MOCK = import.meta.env.VITE_MOCK === '1'
const env = {
  googleWeb: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined,
  googleIos: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined,
  appleServiceId: import.meta.env.VITE_APPLE_SERVICE_ID as string | undefined,
  appleRedirect: import.meta.env.VITE_APPLE_REDIRECT_URL as string | undefined,
}

let session: SessionData | null = null
let loaded: Promise<SessionData | null> | null = null
let initialized: Promise<void> | null = null

export class AuthFailure extends Error {}

/** Which buttons to show. Apple is required on iOS whenever Google is offered (App Store 4.8). */
export function availableProviders(): Provider[] {
  if (MOCK) return ['apple', 'google']
  const platform = Capacitor.getPlatform()
  const list: Provider[] = []
  if (platform === 'ios' || env.appleServiceId) list.push('apple')
  if ((platform === 'ios' && env.googleIos) || (platform !== 'ios' && env.googleWeb)) list.push('google')
  return list
}

function init(): Promise<void> {
  initialized ??= SocialLogin.initialize({
    apple: { clientId: env.appleServiceId ?? 'ee.forgr.jevit', redirectUrl: env.appleRedirect },
    google: env.googleWeb || env.googleIos
      ? { webClientId: env.googleWeb, iOSClientId: env.googleIos, iOSServerClientId: env.googleWeb, mode: 'online' }
      : undefined,
  })
  return initialized
}

// Start loading Google's web SDK early (it needs time before login on web).
export function warmUpAuth() {
  if (!MOCK) void init().catch(() => {})
}

export function getSession(): Promise<SessionData | null> {
  loaded ??= PersistentAccount.readAccount()
    .then(({ data }) => {
      // Web shim wraps the payload one level deeper than native.
      let d = data as (SessionData & { data?: SessionData }) | null
      if (d && !d.token && d.data) d = d.data
      session = d?.token ? d : null
      return session
    })
    .catch(() => null)
  return loaded as Promise<SessionData | null>
}

export function currentToken(): string | null {
  return session?.token ?? null
}

async function save(data: SessionData | null) {
  session = data
  loaded = Promise.resolve(data)
  await PersistentAccount.saveAccount({ data }).catch(() => {})
}

/** Mock builds only (demo screens): a signed-in session that survives a missing keychain. */
export const mockSession = (name: string) => save({ token: 'mock', user: { provider: 'apple', name } })

export async function signIn(provider: Provider): Promise<{ session: SessionData; quota: Quota }> {
  if (MOCK) {
    const s: SessionData = { token: 'mock', user: { provider, name: 'Mock' } }
    await save(s)
    return { session: s, quota: { used: 0, limit: 15, remaining: 15, resetAt: Date.now() + 864e5 } }
  }
  await init()
  let idToken: string | null = null
  let name: string | undefined
  if (provider === 'apple') {
    const { result } = await SocialLogin.login({ provider: 'apple', options: { scopes: ['name'] } })
    idToken = result.idToken
    name = result.profile.givenName ?? undefined
  } else {
    const { result } = await SocialLogin.login({ provider: 'google', options: { scopes: ['profile'] } })
    if (result.responseType === 'online') {
      idToken = result.idToken
      name = result.profile.givenName ?? undefined
    }
  }
  if (!idToken) throw new AuthFailure('Sign-in was cancelled')

  const res = await fetch(`${JUDGE_URL}/v1/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider, idToken, name }),
  }).catch(() => {
    throw new AuthFailure("No internet connection. Try again.")
  })
  const body = (await res.json().catch(() => ({}))) as {
    token?: string
    user?: SessionData['user']
    quota?: Quota
    error?: string
  }
  if (!res.ok || !body.token || !body.user || !body.quota) throw new AuthFailure(body.error ?? 'Sign-in failed')
  const s = { token: body.token, user: body.user }
  await save(s)
  return { session: s, quota: body.quota }
}

// Store reviewers / testers: email + password account issued by us (no social login).
export async function signInWithEmail(email: string, password: string): Promise<{ session: SessionData; quota: Quota }> {
  const res = await fetch(`${JUDGE_URL}/v1/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'demo', email: email.trim(), password }),
  }).catch(() => {
    throw new AuthFailure("No internet connection. Try again.")
  })
  const body = (await res.json().catch(() => ({}))) as { token?: string; user?: SessionData['user']; quota?: Quota; error?: string }
  if (!res.ok || !body.token || !body.user || !body.quota) throw new AuthFailure(body.error ?? 'Sign-in failed')
  const s = { token: body.token, user: body.user }
  await save(s)
  return { session: s, quota: body.quota }
}

export async function signOut() {
  const provider = session?.user.provider
  await save(null)
  if (provider && provider !== 'demo' && !MOCK) await SocialLogin.logout({ provider }).catch(() => {})
}
