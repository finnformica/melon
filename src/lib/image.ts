// Firestore docs are capped at ~1 MiB. We leave headroom for the rest of the
// game record (ELO maps, names, timestamps) and bail out if compression can't
// get the encoded string under this limit.
export const MAX_PHOTO_BYTES = 700_000
export const MAX_INPUT_BYTES = 15 * 1024 * 1024

// iOS Safari < 17 silently falls back to PNG when asked to encode WebP, so we
// have to probe with a 1×1 canvas before committing to a MIME type.
let webpEncodeSupported: boolean | null = null
function supportsWebpEncode(): boolean {
  if (webpEncodeSupported !== null) return webpEncodeSupported
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  webpEncodeSupported = probe
    .toDataURL('image/webp')
    .startsWith('data:image/webp')
  return webpEncodeSupported
}

// Draws the file onto a canvas (downscaled so the longest edge is at most
// `maxDimension`) and encodes with progressively lower quality until the
// resulting data URL is small enough. Prefers WebP; falls back to JPEG on
// browsers that don't support WebP canvas encoding.
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

    const mime = supportsWebpEncode() ? 'image/webp' : 'image/jpeg'
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const url = canvas.toDataURL(mime, quality)
      if (url.length <= MAX_PHOTO_BYTES) return url
    }
    throw new Error(
      'Photo is too detailed to embed. Try a smaller or simpler image.',
    )
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
