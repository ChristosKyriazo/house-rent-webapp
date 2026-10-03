import { NextRequest, NextResponse } from 'next/server'
import { auth, reverificationErrorResponse } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { badRequest, notFound, serverError, unauthorized, validateBody } from '@/lib/api-utils'
import { upsertMeetingNoteSchema } from '@/lib/schemas'
import { requestLogger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptNote, encryptNote, meetingNotesConfigured } from '@/lib/crypto/meeting-notes'

/**
 * Private meeting notes — owners/brokers' notes about viewings. GDPR-sensitive.
 *
 * - Text is encrypted before it reaches the database (lib/crypto/meeting-notes.ts).
 * - Only the **author** can read or delete a note; only the meeting's **host**
 *   (`booking.ownerId`) can write one. Ownership always comes from the database row,
 *   never from the request.
 * - Reading requires a **fresh identity check** (Clerk reverification, last 10 min), so an
 *   unattended, still-signed-in browser doesn't expose them.
 * - Note text is never logged, and Sentry strips this route's request data
 *   (sentry.server.config.ts).
 */

const NOT_CONFIGURED = { error: 'Meeting notes are not available' } as const

async function guard() {
  if (!meetingNotesConfigured()) return { error: NextResponse.json(NOT_CONFIGURED, { status: 503 }) }
  const user = await getCurrentUser()
  if (!user) return { error: unauthorized() }
  if (!(await checkRateLimit(`meeting-notes:${user.id}`, 60, 60_000))) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }
  return { user }
}

async function requireFreshIdentity() {
  const { has } = await auth()
  // `strict` = re-verified within the last 10 minutes. The client's useReverification()
  // sees this response, asks the user to confirm (password / email code), and retries.
  return has({ reverification: 'strict' }) ? null : reverificationErrorResponse('strict')
}

// GET /api/meeting-notes?homeKey=… | ?bookingKey=…
// The caller's meetings for that listing (or that one meeting) — who visited and when — with
// the caller's own decrypted note for each.
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const user = g.user

    const reverify = await requireFreshIdentity()
    if (reverify) return reverify

    const homeKey = request.nextUrl.searchParams.get('homeKey')
    const bookingKey = request.nextUrl.searchParams.get('bookingKey')
    if (!homeKey && !bookingKey) return badRequest('homeKey or bookingKey is required')

    const bookings = await prisma.booking.findMany({
      where: {
        ownerId: user.id,
        ...(bookingKey ? { key: bookingKey } : { home: { key: homeKey! } }),
      },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        key: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: { name: true } },
        notes: {
          where: { authorId: user.id },
          select: { key: true, ciphertext: true, keyVersion: true, updatedAt: true },
        },
      },
    })

    let unreadable = 0
    const meetings = bookings.map(b => {
      const n = b.notes[0]
      let text: string | null = null
      if (n) {
        try {
          text = decryptNote(n.ciphertext, n.keyVersion, b.id)
        } catch {
          unreadable++
        }
      }
      return {
        bookingKey: b.key,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        visitorName: b.user.name,
        note: n ? { key: n.key, text, updatedAt: n.updatedAt } : null,
      }
    })
    // Counts only — never content, never which meeting.
    if (unreadable > 0) log.error({ unreadable }, 'Meeting notes failed to decrypt')

    return NextResponse.json(
      { meetings },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'GET /api/meeting-notes failed')
    return serverError()
  }
}

// PUT /api/meeting-notes  { bookingKey, text } — create or replace the caller's note
export async function PUT(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const user = g.user

    // Overwriting replaces what the caller can only see after re-verifying, so writing
    // demands the same fresh identity — a hijacked session can't silently rewrite notes.
    const reverify = await requireFreshIdentity()
    if (reverify) return reverify

    const { data, error } = validateBody(upsertMeetingNoteSchema, await request.json().catch(() => null))
    if (error) return error

    const booking = await prisma.booking.findUnique({
      where: { key: data.bookingKey },
      select: { id: true, ownerId: true },
    })
    // Same answer for "no such meeting" and "not your meeting": keys can't be probed.
    if (!booking || booking.ownerId !== user.id) return notFound('Meeting not found')

    const { ciphertext, keyVersion } = encryptNote(data.text, booking.id)
    const note = await prisma.meetingNote.upsert({
      where: { bookingId_authorId: { bookingId: booking.id, authorId: user.id } },
      create: { bookingId: booking.id, authorId: user.id, ciphertext, keyVersion },
      update: { ciphertext, keyVersion },
      select: { key: true, updatedAt: true },
    })

    return NextResponse.json({ note }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'PUT /api/meeting-notes failed')
    return serverError()
  }
}

// DELETE /api/meeting-notes?bookingKey=… — permanently delete the caller's note
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const user = g.user

    const bookingKey = request.nextUrl.searchParams.get('bookingKey')
    if (!bookingKey) return badRequest('bookingKey is required')

    // Deleting needs no re-verification: it can only remove data, never reveal it.
    const result = await prisma.meetingNote.deleteMany({
      where: { authorId: user.id, booking: { key: bookingKey } },
    })
    if (result.count === 0) return notFound('Note not found')
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'DELETE /api/meeting-notes failed')
    return serverError()
  }
}
