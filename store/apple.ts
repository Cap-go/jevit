// Fills the App Store listing for ee.forgr.jevit from store/metadata.json + store/screenshots/{ios-6.9,ios-duo}.
// Idempotent: safe to re-run. Usage: ASC_KEY_ID=… ASC_ISSUER_ID=… bun store/apple.ts [--contact-phone +33…]
import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { api, must } from './asc'

const meta = await Bun.file('store/metadata.json').json()
const LOCALE = meta.locale as string
const phoneArg = process.argv.indexOf('--contact-phone')
const contactPhone = phoneArg > 0 ? process.argv[phoneArg + 1] : undefined

const apps = await must(`GET`, `/v1/apps?filter[bundleId]=${meta.appId}`)
const app = apps.data[0]
if (!app) throw new Error(`No App Store Connect app for ${meta.appId}. Create it in App Store Connect first.`)
console.log('app', app.id, app.attributes.name)

// --- App info: categories, name, subtitle, privacy URL ---
const appInfo = (await must('GET', `/v1/apps/${app.id}/appInfos`)).data.find(
  (i: any) => !['READY_FOR_SALE', 'REPLACED_WITH_NEW_INFO'].includes(i.attributes.appStoreState ?? i.attributes.state),
)
await must('PATCH', `/v1/appInfos/${appInfo.id}`, {
  data: {
    type: 'appInfos',
    id: appInfo.id,
    relationships: {
      primaryCategory: { data: { type: 'appCategories', id: meta.ios.primaryCategory } },
      secondaryCategory: { data: { type: 'appCategories', id: meta.ios.secondaryCategory } },
    },
  },
})
const infoLocs = (await must('GET', `/v1/appInfos/${appInfo.id}/appInfoLocalizations`)).data
const infoLoc = infoLocs.find((l: any) => l.attributes.locale === LOCALE)
const infoAttrs = { name: meta.ios.name, subtitle: meta.ios.subtitle, privacyPolicyUrl: meta.urls.privacy }
if (infoLoc) await must('PATCH', `/v1/appInfoLocalizations/${infoLoc.id}`, { data: { type: 'appInfoLocalizations', id: infoLoc.id, attributes: infoAttrs } })
console.log('✓ app info + categories')

// --- Age rating: mild mature themes / crude humor (relationship drama), no other sensitive content ---
const age = (await api('GET', `/v1/appInfos/${appInfo.id}/ageRatingDeclaration`)).data?.data
if (age) {
  const wanted: Record<string, unknown> = {
    alcoholTobaccoOrDrugUseOrReferences: 'NONE',
    contests: 'NONE',
    gamblingSimulated: 'NONE',
    horrorOrFearThemes: 'NONE',
    matureOrSuggestiveThemes: 'INFREQUENT_OR_MILD',
    medicalOrTreatmentInformation: 'NONE',
    profanityOrCrudeHumor: 'INFREQUENT_OR_MILD',
    sexualContentGraphicAndNudity: 'NONE',
    sexualContentOrNudity: 'NONE',
    violenceCartoonOrFantasy: 'NONE',
    violenceRealistic: 'NONE',
    violenceRealisticProlongedGraphicOrSadistic: 'NONE',
    gunsOrOtherWeapons: 'NONE',
    gambling: false,
    unrestrictedWebAccess: false,
    lootBox: false,
    messagingAndChat: false,
    userGeneratedContent: false,
    advertising: false,
    ageAssurance: false,
    healthOrWellnessTopics: false,
    parentalControls: false,
  }
  // Only send fields this API version knows about.
  const attributes = Object.fromEntries(Object.entries(wanted).filter(([k]) => k in age.attributes))
  const r = await api('PATCH', `/v1/ageRatingDeclarations/${age.id}`, { data: { type: 'ageRatingDeclarations', id: age.id, attributes } })
  console.log(r.status < 300 ? '✓ age rating' : `! age rating ${r.status} ${JSON.stringify(r.data?.errors?.[0]?.detail)}`)
}

// --- Version 1.0 localization ---
const versions = (await must('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS`)).data
const version = versions.find((v: any) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(v.attributes.appStoreState ?? v.attributes.appVersionState))
if (!version) throw new Error('No editable App Store version')
await must('PATCH', `/v1/appStoreVersions/${version.id}`, {
  data: { type: 'appStoreVersions', id: version.id, attributes: { copyright: meta.ios.copyright } },
})
const vLocs = (await must('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data
let vLoc = vLocs.find((l: any) => l.attributes.locale === LOCALE)
const vAttrs = {
  description: meta.description,
  keywords: meta.ios.keywords,
  promotionalText: meta.ios.promotionalText,
  supportUrl: meta.urls.support,
  marketingUrl: meta.urls.marketing,
}
if (vLoc) await must('PATCH', `/v1/appStoreVersionLocalizations/${vLoc.id}`, { data: { type: 'appStoreVersionLocalizations', id: vLoc.id, attributes: vAttrs } })
else
  vLoc = (
    await must('POST', '/v1/appStoreVersionLocalizations', {
      data: { type: 'appStoreVersionLocalizations', attributes: { locale: LOCALE, ...vAttrs }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } },
    })
  ).data
console.log('✓ version', version.attributes.versionString, 'description/keywords/urls')

// --- Screenshots ---
// 6.9" set (Apple scales it for smaller iPhones) and the iPhone Duo set (outer 1398×2034 + inner 2853×2007 in one set).
const SCREENSHOT_SETS = [
  ['APP_IPHONE_67', 'store/screenshots/ios-6.9'],
  ['APP_IPHONE_DUO', 'store/screenshots/ios-duo'],
] as const
const sets = (await must('GET', `/v1/appStoreVersionLocalizations/${vLoc.id}/appScreenshotSets`)).data
for (const [DISPLAY, dir] of SCREENSHOT_SETS) {
  let set = sets.find((s: any) => s.attributes.screenshotDisplayType === DISPLAY)
  if (set) {
    // Replace existing shots so re-runs stay in sync with the files.
    const old = (await must('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`)).data
    for (const s of old) await must('DELETE', `/v1/appScreenshots/${s.id}`)
  } else {
    set = (
      await must('POST', '/v1/appScreenshotSets', {
        data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: DISPLAY }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: vLoc.id } } } },
      })
    ).data
  }
  for (const fileName of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
    const bytes = new Uint8Array(await Bun.file(`${dir}/${fileName}`).arrayBuffer())
    const shot = (
      await must('POST', '/v1/appScreenshots', {
        data: { type: 'appScreenshots', attributes: { fileName, fileSize: bytes.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } },
      })
    ).data
    for (const op of shot.attributes.uploadOperations) {
      const headers = Object.fromEntries(op.requestHeaders.map((h: any) => [h.name, h.value]))
      const res = await fetch(op.url, { method: op.method, headers, body: bytes.slice(op.offset, op.offset + op.length) })
      if (!res.ok) throw new Error(`upload ${fileName} part failed ${res.status}`)
    }
    const md5 = createHash('md5').update(bytes).digest('hex')
    await must('PATCH', `/v1/appScreenshots/${shot.id}`, { data: { type: 'appScreenshots', id: shot.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } })
    console.log(`✓ screenshot ${DISPLAY}`, fileName)
  }
}

// --- App Review details ---
const review = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data?.data
// Demo account for App Review, read from outside the repo (email=… / password=… lines).
const demoFile = Bun.file(`${process.env.HOME}/.jevit/review-account`)
const demo = Object.fromEntries(
  ((await demoFile.exists()) ? await demoFile.text() : '').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const reviewAttrs: Record<string, unknown> = {
  contactFirstName: 'Martin',
  contactLastName: 'Donadieu',
  contactEmail: 'support@capgo.app',
  ...(demo.email && demo.password
    ? { demoAccountRequired: true, demoAccountName: demo.email, demoAccountPassword: demo.password }
    : { demoAccountRequired: false }),
  notes: meta.ios.reviewNotes,
  ...(contactPhone ? { contactPhone } : {}),
}
if (review) await must('PATCH', `/v1/appStoreReviewDetails/${review.id}`, { data: { type: 'appStoreReviewDetails', id: review.id, attributes: reviewAttrs } })
else {
  const r = await api('POST', '/v1/appStoreReviewDetails', {
    data: { type: 'appStoreReviewDetails', attributes: reviewAttrs, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } },
  })
  if (r.status >= 300) console.log('! review details', r.status, JSON.stringify(r.data?.errors?.[0]?.detail))
}
console.log('✓ review notes', contactPhone ? '' : '(add --contact-phone before submitting)')

// --- Price: free ---
const points = await api('GET', `/v1/apps/${app.id}/appPricePoints?filter[territory]=USA&limit=1`)
const free = points.data?.data?.[0]
if (free && free.attributes.customerPrice === '0.0') {
  const r = await api('POST', '/v1/appPriceSchedules', {
    data: {
      type: 'appPriceSchedules',
      relationships: {
        app: { data: { type: 'apps', id: app.id } },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
        manualPrices: { data: [{ type: 'appPrices', id: '${price}' }] },
      },
    },
    included: [{ type: 'appPrices', id: '${price}', attributes: { startDate: null }, relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } }],
  })
  console.log(r.status < 300 ? '✓ price: free' : `! price ${r.status} ${JSON.stringify(r.data?.errors?.[0]?.detail)}`)
}

console.log('\nDone. Still manual in App Store Connect: App Privacy answers, then attach the build and submit.')
