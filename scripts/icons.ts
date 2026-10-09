// Generates Capacitor asset sources from resources/logo.svg, then native icons + splash.
// Requires rsvg-convert (brew install librsvg).
import { $ } from 'bun'

const svg = await Bun.file('resources/logo.svg').text()
const body = svg.replace(/^[\s\S]*?<\/defs>/, '').replace(/<\/svg>\s*$/, '')
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)![0]
const glyph = body.replace(/<rect[^>]*rx="232"[^>]*\/>/g, '')

const wrap = (inner: string, size = 1024, bg = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${defs}${bg}${inner}</svg>`

const files: Record<string, string> = {
  // iOS masks corners itself: full-bleed square.
  'icon-only': wrap(`<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>${glyph}`),
  // Android adaptive: glyph kept inside the 66% safe zone.
  'icon-foreground': wrap(`<g transform="translate(512 512) scale(0.62) translate(-512 -512)">${glyph}</g>`),
  'icon-background': wrap(`<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`),
  splash: wrap(`<g transform="translate(1366 1366) scale(0.5) translate(-512 -512)">${body}</g>`, 2732, '<rect width="2732" height="2732" fill="#14051f"/>'),
}
files['splash-dark'] = files.splash

for (const [name, content] of Object.entries(files)) {
  const tmp = `/tmp/jevit-${name}.svg`
  await Bun.write(tmp, content)
  const size = name.startsWith('splash') ? 2732 : 1024
  await $`rsvg-convert -w ${size} -h ${size} ${tmp} -o resources/${name}.png`
}

await $`bunx @capacitor/assets generate --iconBackgroundColor '#B026FF' --iconBackgroundColorDark '#B026FF' --splashBackgroundColor '#14051f' --splashBackgroundColorDark '#14051f' --ios --android`
