import { describe, expect, it } from 'vitest'
import { detectImageType } from '@/lib/image-validation'

// JPEG magic bytes: FF D8 FF
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
// WebP: RIFF????WEBP
const webpBytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])

describe('detectImageType', () => {
  it('detects JPEG by magic bytes', () => {
    const result = detectImageType(jpegBytes)
    expect(result).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
  })

  it('detects PNG by magic bytes', () => {
    const result = detectImageType(pngBytes)
    expect(result).toEqual({ mime: 'image/png', ext: 'png' })
  })

  it('detects WebP by RIFF header', () => {
    const result = detectImageType(webpBytes)
    expect(result).toEqual({ mime: 'image/webp', ext: 'webp' })
  })

  it('returns null for empty buffer', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })

  it('returns null for buffer shorter than 12 bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull()
  })

  it('returns null for unknown file type (fake bytes)', () => {
    const fake = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b])
    expect(detectImageType(fake)).toBeNull()
  })

  it('rejects a file with wrong JPEG byte 3 (spoofed)', () => {
    const fake = Buffer.from([0xff, 0xd8, 0xee, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    expect(detectImageType(fake)).toBeNull()
  })

  it('rejects an HTML file regardless of content', () => {
    const html = Buffer.from('<html><body>evil</body></html>'.padEnd(12, ' '))
    expect(detectImageType(html)).toBeNull()
  })
})
