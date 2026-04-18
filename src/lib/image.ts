// Firestore docs are capped at ~1 MiB. We leave headroom for the rest of the
// game record (ELO maps, names, timestamps) and bail out if compression can't
// get the encoded string under this limit.
export const MAX_PHOTO_BYTES = 700_000
export const MAX_INPUT_BYTES = 15 * 1024 * 1024

// Draws the file onto a canvas (downscaled so the longest edge is at most
// `maxDimension`) and encodes as JPEG with progressively lower quality until
// the resulting data URL fits inside MAX_PHOTO_BYTES. JPEG (not WebP) because
// iOS Safari < 17 silently falls back to PNG when asked to encode WebP from a
// canvas, which blows the size budget.
export async function fileToCompressedDataUrl(
  file: File,
  maxDimension = 1280,
): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Photo file is too large (max 15 MB input)')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }

  const sourceUrl = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = sourceUrl
    await img.decode()

    const longest = Math.max(img.width, img.height)
    const ratio = longest > maxDimension ? maxDimension / longest : 1
    const w = Math.max(1, Math.round(img.width * ratio))
    const h = Math.max(1, Math.round(img.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(img, 0, 0, w, h)

    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const url = canvas.toDataURL('image/jpeg', quality)
      if (url.length <= MAX_PHOTO_BYTES) return url
    }
    throw new Error(
      'Photo is too detailed to embed. Try a smaller or simpler image.',
    )
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
