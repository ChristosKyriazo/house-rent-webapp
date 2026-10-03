import { afterEach, describe, expect, it } from 'vitest'
import { randomBytes } from 'crypto'
import { decryptNote, encryptNote, meetingNotesConfigured, MeetingNotesKeyError } from '@/lib/crypto/meeting-notes'

const k = () => randomBytes(32).toString('base64')
const ORIGINAL = process.env.MEETING_NOTES_KEYS

afterEach(() => { process.env.MEETING_NOTES_KEYS = ORIGINAL })

describe('meeting-notes encryption', () => {
  it('round-trips text, including Greek', () => {
    process.env.MEETING_NOTES_KEYS = `1:${k()}`
    const text = 'Ο κ. Παπαδόπουλος ήρθε με τη σύζυγο — interested, wants to move in November.'
    const { ciphertext, keyVersion } = encryptNote(text, 42)
    expect(decryptNote(ciphertext, keyVersion, 42)).toBe(text)
  })

  it('never stores clear text, and the same text encrypts differently each time', () => {
    process.env.MEETING_NOTES_KEYS = `1:${k()}`
    const a = encryptNote('visitor phone 6912345678', 1)
    const b = encryptNote('visitor phone 6912345678', 1)
    expect(Buffer.from(a.ciphertext, 'base64').toString('utf8')).not.toContain('6912345678')
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('a ciphertext moved to another booking does not decrypt', () => {
    process.env.MEETING_NOTES_KEYS = `1:${k()}`
    const { ciphertext, keyVersion } = encryptNote('secret', 7)
    expect(() => decryptNote(ciphertext, keyVersion, 8)).toThrow()
  })

  it('any altered byte is detected', () => {
    process.env.MEETING_NOTES_KEYS = `1:${k()}`
    const { ciphertext, keyVersion } = encryptNote('secret', 7)
    const raw = Buffer.from(ciphertext, 'base64')
    raw[raw.length - 1] ^= 0x01
    expect(() => decryptNote(raw.toString('base64'), keyVersion, 7)).toThrow()
  })

  it('without the key, the database alone is useless', () => {
    process.env.MEETING_NOTES_KEYS = `1:${k()}`
    const { ciphertext, keyVersion } = encryptNote('secret', 7)
    process.env.MEETING_NOTES_KEYS = `1:${k()}` // a different key — as if only the DB leaked
    expect(() => decryptNote(ciphertext, keyVersion, 7)).toThrow()
  })

  it('rotates: new notes use the newest key, old notes still decrypt', () => {
    const v1 = k()
    process.env.MEETING_NOTES_KEYS = `1:${v1}`
    const old = encryptNote('old note', 3)
    process.env.MEETING_NOTES_KEYS = `1:${v1},2:${k()}`
    const fresh = encryptNote('new note', 3)
    expect(old.keyVersion).toBe(1)
    expect(fresh.keyVersion).toBe(2)
    expect(decryptNote(old.ciphertext, old.keyVersion, 3)).toBe('old note')
    expect(decryptNote(fresh.ciphertext, fresh.keyVersion, 3)).toBe('new note')
  })

  it('stays off when no key is configured, and rejects malformed keys', () => {
    process.env.MEETING_NOTES_KEYS = ''
    expect(meetingNotesConfigured()).toBe(false)
    expect(() => encryptNote('x', 1)).toThrow(MeetingNotesKeyError)
    process.env.MEETING_NOTES_KEYS = '1:tooshort'
    expect(meetingNotesConfigured()).toBe(false)
  })
})
