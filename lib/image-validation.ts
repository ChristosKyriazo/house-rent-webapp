// Validates uploaded images by magic bytes (file content), not client-supplied MIME type.
// Returns the safe extension to use, or null if the buffer is not a recognised image format.

const SIGNATURES: Array<{
  mime: string
  ext: string
  check: (b: Buffer) => boolean
}> = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    check: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    // RIFF....WEBP
    ext: 'webp',
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
]

export function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  for (const sig of SIGNATURES) {
    if (buffer.length >= 12 && sig.check(buffer)) {
      return { mime: sig.mime, ext: sig.ext }
    }
  }
  return null
}
