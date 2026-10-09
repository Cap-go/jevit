// Wire Google Sign-In client ids into the app + worker.
// Usage: bun store/set-google-ids.ts <WEB_CLIENT_ID> <IOS_CLIENT_ID>
const [web, ios] = process.argv.slice(2)
if (!web?.endsWith('.apps.googleusercontent.com') || !ios?.endsWith('.apps.googleusercontent.com')) {
  throw new Error('Usage: bun store/set-google-ids.ts <WEB_CLIENT_ID> <IOS_CLIENT_ID>')
}
const reversed = `com.googleusercontent.apps.${ios.replace('.apps.googleusercontent.com', '')}`

// App build env
const envPath = '.env.production'
let env = await Bun.file(envPath).text()
for (const [k, v] of [
  ['VITE_GOOGLE_WEB_CLIENT_ID', web],
  ['VITE_GOOGLE_IOS_CLIENT_ID', ios],
]) {
  env = env.match(new RegExp(`^${k}=`, 'm')) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : `${env.trimEnd()}\n${k}=${v}\n`
}
await Bun.write(envPath, env)

// Worker: accepted `aud` values (Android tokens carry the web client id)
const wranglerPath = 'worker/wrangler.jsonc'
const wrangler = await Bun.file(wranglerPath).text()
await Bun.write(wranglerPath, wrangler.replace(/"GOOGLE_CLIENT_IDS": "[^"]*"/, `"GOOGLE_CLIENT_IDS": "${web},${ios}"`))

// iOS URL scheme for the Google callback
const plistPath = 'ios/App/App/Info.plist'
const plist = await Bun.file(plistPath).text()
await Bun.write(plistPath, plist.replace(/com\.googleusercontent\.apps\.[A-Za-z0-9_-]+/, reversed))

console.log('✓ .env.production, worker/wrangler.jsonc, Info.plist updated. Next: deploy worker, rebuild apps.')
