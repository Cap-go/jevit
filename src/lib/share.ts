import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'
import type { Verdict } from './types'
import { prime, tr, tx } from './i18n'

// Story-sized verdict card (1080x1920) drawn on a canvas, then handed to the native share sheet.

const W = 1080
const H = 1920
const FONT = "'Bricolage Grotesque Variable', -apple-system, system-ui, sans-serif"
const VIBE: Record<Verdict['vibe'], string> = { green: '#3dffa2', yellow: '#ffd23d', red: '#ff4d5e' }

const JUDGE_URL = import.meta.env.VITE_JUDGE_URL ?? 'http://localhost:8787'
export const SHARE_URL: string = import.meta.env.VITE_SHARE_URL ?? `${JUDGE_URL}/get`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  // Languages written without spaces (Chinese, Japanese, Thai…) wrap per character.
  const spaced = /\s/.test(text.trim()) || ctx.measureText(text).width <= maxWidth
  const words = spaced ? text.split(/\s+/) : [...text]
  const sep = spaced ? ' ' : ''
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line}${sep}${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    } else line = test
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && words.join(sep) !== lines.join(sep)) {
    lines[maxLines - 1] = spaced ? lines[maxLines - 1].replace(/\s*\S*$/, '…') : `${lines[maxLines - 1].slice(0, -1)}…`
  }
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

const CARD_TEXT = ['Jevit says', 'How sure', 'Think you’re right? Get judged ⚖️ jevit.fun', 'I asked Jevit:', 'Verdict:']

export async function renderVerdictCard(v: Verdict, question: string): Promise<Blob> {
  const flagLabels = [...v.red_flags, ...v.green_flags].map((f) => f.label)
  await Promise.all([document.fonts.ready, prime([...CARD_TEXT, v.verdict_label, v.headline, ...flagLabels])])
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const color = VIBE[v.vibe]

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#2c0b47')
  bg.addColorStop(0.55, '#14051f')
  bg.addColorStop(1, '#1a0b3d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 760, 50, W / 2, 760, 700)
  glow.addColorStop(0, `${color}55`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Header: logo + wordmark
  const logo = await loadImage('/logo.svg').catch(() => null)
  if (logo) ctx.drawImage(logo, 90, 110, 120, 120)
  ctx.fillStyle = '#fff'
  ctx.font = `800 84px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('jevit', 236, 170)
  ctx.fillStyle = '#d7ff3a'
  ctx.font = `750 36px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(tr('Jevit says'), W - 90, 172)
  ctx.textAlign = 'center'

  // Question
  ctx.fillStyle = 'rgba(255,246,251,0.75)'
  ctx.font = `650 48px ${FONT}`
  wrap(ctx, `“${question}”`, W - 180, 2).forEach((l, i) => ctx.fillText(l, W / 2, 380 + i * 62))

  // Stamp
  ctx.save()
  ctx.translate(W / 2, 760)
  ctx.rotate((-7 * Math.PI) / 180)
  let size = 190
  ctx.font = `800 ${size}px ${FONT}`
  while (ctx.measureText(v.verdict_label).width > W - 300 && size > 80) {
    size -= 6
    ctx.font = `800 ${size}px ${FONT}`
  }
  const tw = ctx.measureText(v.verdict_label).width
  const padX = size * 0.36
  const boxH = size * 1.35
  ctx.shadowColor = color
  ctx.shadowBlur = 60
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(10, size * 0.09)
  roundRect(ctx, -tw / 2 - padX, -boxH / 2, tw + padX * 2, boxH, size * 0.3)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(tr(v.verdict_label), 0, size * 0.04)
  ctx.restore()

  // Confidence meter
  const my = 1060
  ctx.font = `700 40px ${FONT}`
  ctx.fillStyle = 'rgba(255,246,251,0.7)'
  ctx.textAlign = 'left'
  ctx.fillText(tr('How sure'), 140, my)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#fff'
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(`${v.confidence}%`, W - 140, my)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, 140, my + 46, W - 280, 26, 13)
  ctx.fill()
  ctx.fillStyle = color
  roundRect(ctx, 140, my + 46, ((W - 280) * v.confidence) / 100, 26, 13)
  ctx.fill()

  // Headline
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = `800 62px ${FONT}`
  wrap(ctx, tr(v.headline), W - 180, 3).forEach((l, i) => ctx.fillText(l, W / 2, 1250 + i * 78))

  // Top flags
  const flags = [...v.red_flags.map((f) => ({ ...f, c: '#ff4d5e' })), ...v.green_flags.map((f) => ({ ...f, c: '#3dffa2' }))]
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
  ctx.font = `700 40px ${FONT}`
  let fy = 1520
  for (const f of flags) {
    const label = `${f.emoji} ${tr(f.label)} ${Math.round(f.p * 100)}%`
    const w = ctx.measureText(label).width + 64
    ctx.fillStyle = `${f.c}22`
    roundRect(ctx, (W - w) / 2, fy - 38, w, 76, 38)
    ctx.fill()
    ctx.strokeStyle = `${f.c}88`
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.fillText(label, W / 2, fy + 2)
    fy += 96
  }

  // Footer CTA
  ctx.fillStyle = 'rgba(255,246,251,0.55)'
  ctx.font = `650 36px ${FONT}`
  ctx.fillText(tr('Think you’re right? Get judged ⚖️ jevit.fun'), W / 2, H - 90)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('render failed'))), 'image/png'))
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })

export function verdictText(v: Verdict, question: string): string {
  return `⚖️ ${tr('I asked Jevit:')} “${question}”\n${tr('Verdict:')} ${tr(v.verdict_label)} (${tr('How sure')}: ${v.confidence}%)\n“${tr(v.headline)}”\n→ ${SHARE_URL}`
}

/** Share the verdict card image + caption. Returns false if the user cancelled. */
export async function shareVerdict(v: Verdict, question: string, card: Blob): Promise<boolean> {
  const text = verdictText(v, question)
  try {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.writeFile({
        path: `jevit-verdict-${Date.now()}.png`,
        data: await blobToBase64(card),
        directory: Directory.Cache,
      })
      await Share.share({ text, files: [uri], dialogTitle: await tx('Share the verdict') })
      return true
    }
    const file = new File([card], 'jevit-verdict.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text })
      return true
    }
    // Desktop browser fallback: download the image, copy the caption.
    const a = document.createElement('a')
    a.href = URL.createObjectURL(card)
    a.download = 'jevit-verdict.png'
    a.click()
    await navigator.clipboard?.writeText(text).catch(() => {})
    return true
  } catch {
    return false
  }
}

export async function shareApp(): Promise<void> {
  const [text, dialogTitle] = await Promise.all([
    tx('Jevit judges your chats: is he cheating, am I wrong, is she into me? Get judged ⚖️'),
    tx('Invite friends'),
  ])
  try {
    await Share.share({ title: 'Jevit', text, url: SHARE_URL, dialogTitle })
  } catch {
    await navigator.clipboard?.writeText(`${text} ${SHARE_URL}`).catch(() => {})
  }
}
