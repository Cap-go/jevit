// Put a newer build on the iOS version that is waiting for review, then resubmit it.
// With --metadata, also re-pushes store/metadata.json + screenshots (store/apple.ts) while the version is editable.
// Usage: ASC_KEY_ID=… ASC_ISSUER_ID=… bun store/swap-ios-build.ts <buildNumber> [--metadata]
import { $ } from 'bun'
import { api, must } from './asc'

const APP = '6820318157'
const BUILD = process.argv[2]
if (!BUILD) throw new Error('Usage: bun store/swap-ios-build.ts <buildNumber>')
const DEADLINE = Date.now() + 60 * 60_000

// 1. Wait for App Store Connect to finish processing the build.
let build: any
while (true) {
  build = (await must('GET', `/v1/builds?filter[app]=${APP}&filter[version]=${BUILD}&fields[builds]=version,processingState`)).data[0]
  const state = build?.attributes.processingState ?? 'NOT_UPLOADED'
  console.log(new Date().toISOString().slice(11, 19), `build ${BUILD}: ${state}`)
  if (state === 'VALID') break
  if (state === 'FAILED' || state === 'INVALID') throw new Error(`Build ${BUILD} is ${state}`)
  if (Date.now() > DEADLINE) throw new Error('Build still processing after 60 min')
  await Bun.sleep(30_000)
}

const version = (await must('GET', `/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS`)).data[0]
console.log(`version ${version.attributes.versionString}: ${version.attributes.appStoreState}`)

// 2. A version in review can't change build: pull the pending submission first.
for (const state of ['WAITING_FOR_REVIEW', 'READY_FOR_REVIEW', 'UNRESOLVED_ISSUES']) {
  const subs = (await must('GET', `/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&filter[state]=${state}`)).data
  for (const s of subs) {
    if (state === 'READY_FOR_REVIEW') continue
    await must('PATCH', `/v1/reviewSubmissions/${s.id}`, { data: { type: 'reviewSubmissions', id: s.id, attributes: { canceled: true } } })
    console.log('↩ canceled submission', s.id, `(${state})`)
  }
}
while (true) {
  const v = (await must('GET', `/v1/appStoreVersions/${version.id}`)).data
  const s = v.attributes.appStoreState
  if (!['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(s)) break
  if (Date.now() > DEADLINE) throw new Error(`Version still ${s}`)
  await Bun.sleep(10_000)
}

if (process.argv.includes('--metadata')) await $`bun store/apple.ts`

// 3. Attach the new build.
await must('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: build.id } })
console.log(`✓ version ${version.attributes.versionString} now uses build ${BUILD}`)

// 4. Resubmit. Canceled submissions can take a moment to settle, so retry a few times.
for (let attempt = 1; ; attempt++) {
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
      const msg = (item.data?.errors ?? []).map((e: any) => e.detail).join('; ')
      if (attempt < 10) {
        console.log(`… not ready to resubmit yet (${msg})`)
        await Bun.sleep(20_000)
        continue
      }
      throw new Error(msg)
    }
  }
  const done = await must('PATCH', `/v1/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } })
  console.log('✓ resubmitted for App Review:', done.data.attributes.state)
  break
}
