// Minimal App Store Connect API client. Credentials come from the environment, never the repo:
//   ASC_KEY_ID, ASC_ISSUER_ID, optional ASC_KEY_PATH (default ~/.appstoreconnect/private_keys/AuthKey_<id>.p8)
const KEY_ID = process.env.ASC_KEY_ID!
const ISSUER = process.env.ASC_ISSUER_ID!
if (!KEY_ID || !ISSUER) throw new Error('Set ASC_KEY_ID and ASC_ISSUER_ID')
const keyPath = process.env.ASC_KEY_PATH ?? `${process.env.HOME}/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`
const pem = await Bun.file(keyPath).text()
const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0))
const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
const b64u = (b: Uint8Array | string) => Buffer.from(b).toString('base64url')

async function token() {
  const now = Math.floor(Date.now() / 1000)
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))
  const body = b64u(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' }))
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${body}`)))
  return `${head}.${body}.${b64u(sig)}`
}

export async function api<T = any>(method: string, path: string, json?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' },
    body: json ? JSON.stringify(json) : undefined,
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

export async function must<T = any>(method: string, path: string, json?: unknown): Promise<T> {
  const r = await api<T>(method, path, json)
  if (r.status >= 300) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(r.data).slice(0, 600)}`)
  return r.data
}

if (import.meta.main) {
  const [method, path, json] = process.argv.slice(2)
  const r = await api(method, path, json ? JSON.parse(json) : undefined)
  console.log(r.status, JSON.stringify(r.data, null, 1))
}
