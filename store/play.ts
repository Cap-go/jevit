// Fills the Google Play listing for ee.forgr.jevit and uploads the AAB to the internal track (draft).
// Auth: a Play-linked service account active in gcloud. Usage: bun store/play.ts [--no-bundle]
import { $ } from 'bun'
import { readdirSync } from 'node:fs'

const meta = await Bun.file('store/metadata.json').json()
const PKG = meta.appId as string
const LANG = meta.locale as string
const AAB = 'android/app/build/outputs/bundle/release/app-release.aab'
const withBundle = !process.argv.includes('--no-bundle')

const token = (await $`gcloud auth print-access-token --scopes=https://www.googleapis.com/auth/androidpublisher`.text()).trim()
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`

async function call(method: string, url: string, body?: unknown, contentType = 'application/json') {
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
    body: body === undefined ? undefined : contentType === 'application/json' ? JSON.stringify(body) : (body as BodyInit),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${method} ${url.replace(API, '').replace(UPLOAD, '')} → ${res.status} ${data?.error?.message ?? text}`)
  return data
}

const edit = await call('POST', `${API}/edits`, {})
const E = `${API}/edits/${edit.id}`
const EU = `${UPLOAD}/edits/${edit.id}`
console.log('edit', edit.id)

await call('PATCH', `${E}/details`, {
  defaultLanguage: LANG,
  contactEmail: 'support@capgo.app',
  contactWebsite: meta.urls.marketing,
})
await call('PUT', `${E}/listings/${LANG}`, {
  language: LANG,
  title: meta.android.title,
  shortDescription: meta.android.shortDescription,
  fullDescription: meta.description,
})
console.log('✓ listing text')

async function images(type: string, files: string[]) {
  await call('DELETE', `${E}/listings/${LANG}/${type}`)
  for (const f of files) {
    await call('POST', `${EU}/listings/${LANG}/${type}?uploadType=media`, Bun.file(f), 'image/png')
    console.log('✓', type, f.split('/').pop())
  }
}
await images('icon', ['store/graphics/play-icon-512.png'])
await images('featureGraphic', ['store/graphics/play-feature-1024x500.png'])
const shots = readdirSync('store/screenshots/android').filter((f) => f.endsWith('.png')).sort()
await images('phoneScreenshots', shots.map((f) => `store/screenshots/android/${f}`))

if (withBundle) {
  const bundle = await call('POST', `${EU}/bundles?uploadType=media`, Bun.file(AAB), 'application/octet-stream')
  console.log('✓ bundle versionCode', bundle.versionCode)
  // New apps only accept draft releases until the first review.
  await call('PUT', `${E}/tracks/internal`, {
    track: 'internal',
    releases: [{ name: `${bundle.versionCode} (1.0)`, versionCodes: [String(bundle.versionCode)], status: 'draft' }],
  })
  console.log('✓ internal track draft release')
}

await call('POST', `${E}:commit`)
console.log('✓ committed. Still manual in Play Console: app content forms (privacy, data safety, content rating, target audience, ads), then roll out.')
