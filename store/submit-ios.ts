// Wait for App Store screenshots to finish processing, then submit version 1.0 for App Review.
// Usage: ASC_KEY_ID=… ASC_ISSUER_ID=… bun store/submit-ios.ts
import { createHash } from 'node:crypto'
import { api, must } from './asc'

const APP = '6820318157'
const DIR = 'store/screenshots/ios-6.9'
const STUCK_MS = 15 * 60_000
const DEADLINE = Date.now() + 45 * 60_000

const version = (await must('GET', `/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS`)).data[0]
const loc = (await must('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data[0]
const set = (await must('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`)).data.find(
  (s: any) => s.attributes.screenshotDisplayType === 'APP_IPHONE_67',
)

async function shots() {
  return (await must('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`)).data as any[]
}

async function reupload(fileName: string) {
  const bytes = new Uint8Array(await Bun.file(`${DIR}/${fileName}`).arrayBuffer())
  const shot = (
    await must('POST', '/v1/appScreenshots', {
      data: { type: 'appScreenshots', attributes: { fileName, fileSize: bytes.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } },
    })
  ).data
  for (const op of shot.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h: any) => [h.name, h.value]))
    await fetch(op.url, { method: op.method, headers, body: bytes.slice(op.offset, op.offset + op.length) })
  }
  const md5 = createHash('md5').update(bytes).digest('hex')
  await must('PATCH', `/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } })
}

let since = Date.now()
while (true) {
  const list = await shots()
  const pending = list.filter((s) => s.attributes.assetDeliveryState?.state !== 'COMPLETE')
  console.log(new Date().toISOString().slice(11, 19), list.map((s) => `${s.attributes.fileName}:${s.attributes.assetDeliveryState?.state}`).join(' '))
  if (pending.length === 0) break
  if (Date.now() > DEADLINE) throw new Error('Screenshots still processing after 45 min')
  if (Date.now() - since > STUCK_MS) {
    // Replace stuck ones, then restore the original order by file name.
    for (const s of pending) {
      await must('DELETE', `/v1/appScreenshots/${s.id}`)
      await reupload(s.attributes.fileName)
      console.log('↻ re-uploaded', s.attributes.fileName)
    }
    const ordered = (await shots()).sort((a, b) => a.attributes.fileName.localeCompare(b.attributes.fileName))
    await must('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, {
      data: ordered.map((s) => ({ type: 'appScreenshots', id: s.id })),
    })
    since = Date.now()
  }
  await Bun.sleep(30_000)
}
console.log('✓ all screenshots processed')

// Reuse an open submission or create one, add the version, submit.
const open = (await must('GET', `/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW`)).data[0]
const sub =
  open ??
  (await must('POST', '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } } } })).data
const items = (await must('GET', `/v1/reviewSubmissions/${sub.id}/items`)).data
if (items.length === 0) {
  const item = await api('POST', '/v1/reviewSubmissionItems', {
    data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } },
  })
  if (item.status >= 300) {
    for (const e of item.data?.errors ?? []) {
      console.log('✗', e.detail)
      for (const v of Object.values(e.meta?.associatedErrors ?? {}) as any[][]) for (const x of v) console.log('   -', x.code, x.detail)
    }
    process.exit(1)
  }
}
const done = await must('PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } })
console.log('✓ submitted for App Review:', done.data.attributes.state)
