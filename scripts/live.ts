// Ship the current web app as a Capgo live update: bump patch version, build, upload to `production`.
// Always a delta upload: phones only download the files that changed (Vite hashes each chunk).
// Usage: bun run release:live "what changed" [--accept-incompatible]
//   --accept-incompatible: only when the JS feature-detects any new native plugin (older native builds also get this bundle).
import { $ } from 'bun'

const args = process.argv.slice(2)
const accept = args.includes('--accept-incompatible')
const comment = args.filter((a) => !a.startsWith('--')).join(' ') || 'Live update'

const pkg = await Bun.file('package.json').json()
const [major, minor, patch] = String(pkg.version).split('.').map(Number)
pkg.version = `${major}.${minor}.${patch + 1}`
await Bun.write('package.json', `${JSON.stringify(pkg, null, 2)}\n`)

await $`bun run build`
await $`bunx @capgo/cli@latest bundle upload ee.forgr.jevit --path dist --bundle ${pkg.version} --channel production --delta --comment ${comment} ${accept ? ['--accept-incompatible'] : []}`
console.log(`\n✓ Live update ${pkg.version} on production: "${comment}"`)
