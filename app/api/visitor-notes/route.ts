import { NextRequest, NextResponse } from 'next/server'
import { auth, reverificationErrorResponse } from '@clerk/nextjs/server'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, notFound, serverError, unauthorized, validateBody } from '@/lib/api-utils'
import { upsertVisitorNoteSchema } from '@/lib/schemas'
import { requestLogger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { meetingNotesConfigured } from '@/lib/crypto/meeting-notes'
import { deleteVisitorNote, listVisitors, resolveHandle, saveVisitorNote } from '@/lib/services/visitor-notes'

/**
 * Visitors of a listing with the owner's private notes about each — GDPR-sensitive.
 *
 * - Note text, outcome and follow-up flag are encrypted together (lib/crypto/meeting-notes.ts).
 * - Only meetings the caller hosts appear; only the caller's own notes are decrypted.
 *   Ownership always comes from the database row, never from the request.
 * - Reading and writing require Clerk reverification within 10 minutes; deleting doesn't
 *   (it can only remove data).
 * - `no-store`, never logged; Sentry strips this route's request data.
 */

async function guard() {
  if (!meetingNotesConfigured()) return { error: NextResponse.json({ error: 'Notes are not available' }, { status: 503 }) }
  const user = await getCurrentUser()
  if (!user) return { error: unauthorized() }
  if (!(await checkRateLimit(`visitor-notes:${user.id}`, 60, 60_000))) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }
  return { user }
}

async function requireFreshIdentity() {
  const { has } = await auth()
  return has({ reverification: 'strict' }) ? null : reverificationErrorResponse('strict')
}

const noStore = { 'Cache-Control': 'no-store' }

// GET /api/visitor-notes?homeKey=…   — every visitor of the caller's listing
// GET /api/visitor-notes?bookingKey=… — the visitor of one meeting (calendar)
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const reverify = await requireFreshIdentity()
    if (reverify) return reverify

    const homeKey = request.nextUrl.searchParams.get('homeKey')
    const bookingKey = request.nextUrl.searchParams.get('bookingKey')
    if (!homeKey && !bookingKey) return badRequest('homeKey or bookingKey is required')

    const visitors = await listVisitors(g.user.id, bookingKey ? { bookingKey } : { homeKey: homeKey! })
    return NextResponse.json({ visitors }, { headers: noStore })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'GET /api/visitor-notes failed')
    return serverError()
  }
}

// PUT /api/visitor-notes { bookingKey, text, outcome, followUp } — create or replace
export async function PUT(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const reverify = await requireFreshIdentity()
    if (reverify) return reverify

    const { data, error } = validateBody(upsertVisitorNoteSchema, await request.json().catch(() => null))
    if (error) return error

    // Same answer for "no such meeting" and "not your meeting": keys can't be probed.
    const target = await resolveHandle(g.user.id, data.bookingKey)
    if (!target) return notFound('Visitor not found')

    const note = await saveVisitorNote(g.user.id, target.homeId, target.visitorId, {
      text: data.text,
      outcome: data.outcome,
      followUp: data.followUp,
    })
    return NextResponse.json({ note }, { headers: noStore })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'PUT /api/visitor-notes failed')
    return serverError()
  }
}

// DELETE /api/visitor-notes?bookingKey=… — permanently delete the caller's note on that visitor
export async function DELETE(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const g = await guard()
    if (g.error) return g.error
    const bookingKey = request.nextUrl.searchParams.get('bookingKey')
    if (!bookingKey) return badRequest('bookingKey is required')
    const target = await resolveHandle(g.user.id, bookingKey)
    if (!target) return notFound('Note not found')
    const removed = await deleteVisitorNote(g.user.id, target.homeId, target.visitorId)
    if (removed === 0) return notFound('Note not found')
    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'DELETE /api/visitor-notes failed')
    return serverError()
  }
}
