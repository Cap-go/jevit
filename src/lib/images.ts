// Downscale to a size Clef reads well (long edge <= 1568px) and re-encode as JPEG.
const MAX_EDGE = 1568

export async function toEvidenceImage(src: string): Promise<{ mediaType: string; data: string; preview: string }> {
  const blob = await (await fetch(src)).blob()
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { mediaType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl }
}

// Clef's pre-flight token estimate scales with total image pixels (64k-token window): 4 full-size
// screenshots fail, 4 at ~250k px pass. Share ~1 MP across all images of a case at send time.
const CLEF_PIXEL_BUDGET = 1_000_000

export async function fitForClef(images: { mediaType: string; data: string }[]): Promise<{ mediaType: string; data: string }[]> {
  if (images.length === 0) return images
  const perImage = CLEF_PIXEL_BUDGET / images.length
  return Promise.all(
    images.map(async (img) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:${img.mediaType};base64,${img.data}`)).blob())
      const scale = Math.min(1, Math.sqrt(perImage / (bitmap.width * bitmap.height)))
      if (scale >= 1) {
        bitmap.close()
        return img
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const url = canvas.toDataURL('image/jpeg', 0.9)
      return { mediaType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) }
    }),
  )
}
