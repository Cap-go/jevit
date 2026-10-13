import { caseFile } from './store'
import { fitForClef } from './images'
import { currentToken, getSession, signOut, type Quota, type SessionData } from './auth'
import type { RemoteCheck, Verdict } from './types'
import { lang, prime } from './i18n'
import { hasAIConsent } from './consent'

const JUDGE_URL = import.meta.env.VITE_JUDGE_URL ?? 'http://localhost:8787'
const MOCK = import.meta.env.VITE_MOCK === '1'

export class JudgeFailure extends Error {}
/** No valid session: send the user to /login. */
export class AuthRequired extends JudgeFailure {}
/** Daily verdicts used up. */
/** The user hasn't agreed (or took back) sending chats to the AI. */
export class ConsentRequired extends JudgeFailure {}
const requireConsent = () => {
  if (!hasAIConsent()) throw new ConsentRequired('Allow AI data sharing to get an answer')
}

export class QuotaExceeded extends JudgeFailure {
  constructor(message: string, readonly quota: Quota) {
    super(message)
  }
}

// Last known quota, shown on the Ask screen.
export let lastQuota: Quota | null = null
export const setQuota = (q: Quota | null) => {
  lastQuota = q
}

async function call<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  await getSession()
  const token = currentToken()
  if (!token) throw new AuthRequired('Sign in to continue')
  let res: Response
  try {
    res = await fetch(`${JUDGE_URL}${path}`, {
      method,
      signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new JudgeFailure("No internet connection. Try again.")
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string; quota?: Quota }
  if (json.quota) setQuota(json.quota)
  if (res.status === 401 || json.code === 'banned') {
    await signOut()
    throw new AuthRequired(json.error ?? 'Sign in to continue')
  }
  if (json.code === 'quota' && json.quota) throw new QuotaExceeded(json.error ?? 'No more answers today', json.quota)
  if (!res.ok) throw new JudgeFailure(json.error ?? 'Something went wrong. Try again.')
  return json
}

export async function fetchMe(): Promise<{ user: SessionData['user']; quota: Quota }> {
  if (MOCK) return { user: { provider: 'apple', name: 'Mock' }, quota: lastQuota ?? { used: 2, limit: 15, remaining: 13, resetAt: Date.now() + 36e5 } }
  return call('GET', '/v1/me')
}

export async function deleteAccount(): Promise<void> {
  if (!MOCK) await call('DELETE', '/v1/me')
  await signOut()
}

// Clef-flash classifies the question as the user types.
export async function checkQuestionRemote(question: string, signal?: AbortSignal): Promise<RemoteCheck> {
  requireConsent()
  if (MOCK) return (await import('./mock')).mockCheck(question)
  return (await call<{ check: RemoteCheck }>('POST', '/v1/check', { question, lang }, signal)).check
}

export async function requestVerdict(question: string, signal?: AbortSignal): Promise<Verdict> {
  requireConsent()
  if (MOCK) {
    const verdict = await (await import('./mock')).mockVerdict(question)
    await prime(textsOf(verdict))
    return verdict
  }
  const images = await fitForClef(
    caseFile.evidence.flatMap((e) => (e.kind === 'image' ? [{ mediaType: e.mediaType, data: e.data }] : [])),
  )
  const texts = caseFile.evidence.flatMap((e) => (e.kind === 'text' ? [e.text] : []))
  const context = caseFile.context.trim() || undefined
  const { verdict } = await call<{ verdict?: Verdict }>('POST', '/v1/judge', { question, context, images, texts, lang }, signal)
  if (!verdict) throw new JudgeFailure('Something went wrong. Try again.')
  await prime(textsOf(verdict))
  return verdict
}

// Every human-readable string in a verdict, so it can be translated before the reveal.
function textsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(textsOf)
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => (['id', 'emoji', 'vibe', 'kind'].includes(k) ? [] : textsOf(v)))
  return []
}
