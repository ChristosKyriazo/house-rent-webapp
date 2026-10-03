/**
 * Encryption for meeting notes — GDPR-sensitive text owners/brokers write about viewings.
 *
 * AES-256-GCM with a key that exists only in the server's environment (`MEETING_NOTES_KEYS`),
 * never in the database or its backups. Anyone holding only the database — a dump, a backup,
 * the 5433 tunnel, a DB admin — sees ciphertext. Decrypting needs both the database and the
 * server secrets.
 *
 * - **Bound to its meeting.** The booking id is authenticated data (AAD), so a ciphertext
 *   copied onto another row fails to decrypt instead of showing up under the wrong meeting.
 *   The author is deliberately *not* bound: notes move to a team's main broker when a member
 *   leaves, and that must not make them unreadable.
 * - **Tamper-evident.** GCM's auth tag makes any modified byte a decryption failure.
 * - **Rotatable.** `MEETING_NOTES_KEYS="1:<base64>,2:<base64>"`: the highest version encrypts,
 *   every listed version decrypts. Remove an old key only after re-encrypting its rows.
 *
 * Generate a key with: `openssl rand -base64 32`. Losing every key loses every note — keep a
 * copy in a password manager, separate from the database backups.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

export class MeetingNotesKeyError extends Error {}

function parseKeys(raw: string | undefined): Map<number, Buffer> {
  const keys = new Map<number, Buffer>()
  if (!raw || !raw.trim()) return keys
  for (const entry of raw.split(',')) {
    const [version, b64] = entry.trim().split(':')
    const v = Number(version)
    const key = Buffer.from(b64 ?? '', 'base64')
    if (!Number.isInteger(v) || v < 1 || key.length !== 32) {
      throw new MeetingNotesKeyError('MEETING_NOTES_KEYS is malformed — expected "1:<base64 of 32 bytes>[,2:…]"')
    }
    keys.set(v, key)
  }
  return keys
}

function keys(): Map<number, Buffer> {
  return parseKeys(process.env.MEETING_NOTES_KEYS)
}

/** False when no key is configured — the feature then stays off rather than storing clear text. */
export function meetingNotesConfigured(): boolean {
  try {
    return keys().size > 0
  } catch {
    return false
  }
}

function aad(bookingId: number): Buffer {
  return Buffer.from(`meeting-note:v1:booking:${bookingId}`, 'utf8')
}

export function encryptNote(plaintext: string, bookingId: number): { ciphertext: string; keyVersion: number } {
  const all = keys()
  if (all.size === 0) throw new MeetingNotesKeyError('MEETING_NOTES_KEYS is not set')
  const keyVersion = Math.max(...all.keys())
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, all.get(keyVersion)!, iv, { authTagLength: TAG_BYTES })
  cipher.setAAD(aad(bookingId))
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext: Buffer.concat([iv, tag, body]).toString('base64'), keyVersion }
}

/** Throws if the key version is unknown, the data was altered, or it belongs to another booking. */
export function decryptNote(ciphertext: string, keyVersion: number, bookingId: number): string {
  const key = keys().get(keyVersion)
  if (!key) throw new MeetingNotesKeyError(`No key for meeting-notes key version ${keyVersion}`)
  const raw = Buffer.from(ciphertext, 'base64')
  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error('Meeting note ciphertext is truncated')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const body = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
  decipher.setAAD(aad(bookingId))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}
