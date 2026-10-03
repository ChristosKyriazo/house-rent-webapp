import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getBatchUserRatings } from '@/lib/ratings'
import { decryptNote, decryptWithContext, encryptWithContext, visitorNoteContext } from '@/lib/crypto/meeting-notes'

/**
 * Visitors of a listing, as an owner/broker sees them: one entry per person, with their
 * viewings, who they are, and the owner's private (encrypted) note about them.
 *
 * The person's details (name, photo, phone, email, rating) are read live from their account
 * at display time and are never copied into the note — so when a renter deletes their account
 * they vanish from the list together with every note about them (FK cascade).
 */

export const OUTCOMES = ['interested', 'maybe', 'not_a_fit', 'offer'] as const
export type Outcome = (typeof OUTCOMES)[number]

export interface NotePayload {
  text: string
  outcome: Outcome | null
  followUp: boolean
}

export interface VisitorEntry {
  /** Any of this visitor's booking keys for this listing — the handle for saving/deleting. */
  handle: string
  homeKey: string
  profile: {
    name: string | null
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    occupation: string | null
    email: string | null
    phone: string | null
    verified: boolean
    tenantScore: number | null
  }
  visits: Array<{ bookingKey: string; startTime: Date; status: string }>
  upcoming: boolean
  note: (NotePayload & { updatedAt: Date }) | null
  /** Old per-meeting notes not yet folded into the visitor note (shown read-only). */
  legacyNotes: Array<{ date: Date; text: string }>
}

export function parsePayload(raw: string): NotePayload {
  try {
    const p = JSON.parse(raw) as Partial<NotePayload>
    return {
      text: typeof p.text === 'string' ? p.text : '',
      outcome: OUTCOMES.includes(p.outcome as Outcome) ? (p.outcome as Outcome) : null,
      followUp: p.followUp === true,
    }
  } catch {
    return { text: raw, outcome: null, followUp: false }
  }
}

export function encryptPayload(p: NotePayload, homeId: number, visitorId: number) {
  return encryptWithContext(JSON.stringify({ v: 1, ...p }), visitorNoteContext(homeId, visitorId))
}

async function clerkProfiles(clerkIds: string[]) {
  const out = new Map<string, { firstName: string | null; lastName: string | null; imageUrl: string | null; phone: string | null; email: string | null }>()
  if (clerkIds.length === 0) return out
  try {
    const clerk = await clerkClient()
    const { data } = await clerk.users.getUserList({ userId: clerkIds, limit: Math.min(clerkIds.length, 500) })
    for (const u of data) {
      const phone = u.phoneNumbers.find(p => p.id === u.primaryPhoneNumberId) ?? u.phoneNumbers[0]
      const email = u.emailAddresses.find(e => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0]
      out.set(u.id, {
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.hasImage ? u.imageUrl : null,
        phone: phone?.phoneNumber ?? null,
        email: email?.emailAddress ?? null,
      })
    }
  } catch {
    // Clerk unavailable: fall back to what our own database holds (name, email).
  }
  return out
}

/**
 * Visitors for the author's listing (`homeKey`), or only the visitor of one meeting
 * (`bookingKey`). Only meetings the author hosts, and only the author's own notes.
 */
export async function listVisitors(authorId: number, where: { homeKey: string } | { bookingKey: string }): Promise<VisitorEntry[]> {
  let homeId: number | null = null
  let onlyVisitor: number | null = null
  if ('bookingKey' in where) {
    const b = await prisma.booking.findUnique({ where: { key: where.bookingKey }, select: { ownerId: true, homeId: true, userId: true } })
    if (!b || b.ownerId !== authorId || b.homeId == null) return []
    homeId = b.homeId
    onlyVisitor = b.userId
  } else {
    const h = await prisma.home.findUnique({ where: { key: where.homeKey }, select: { id: true } })
    if (!h) return []
    homeId = h.id
  }

  const bookings = await prisma.booking.findMany({
    where: { ownerId: authorId, homeId, ...(onlyVisitor ? { userId: onlyVisitor } : {}) },
    orderBy: { startTime: 'desc' },
    select: {
      id: true, key: true, startTime: true, status: true, userId: true,
      home: { select: { key: true } },
      user: { select: { id: true, name: true, email: true, occupation: true, verified: true, clerkUserId: true } },
      notes: { where: { authorId }, select: { ciphertext: true, keyVersion: true } },
    },
  })
  if (bookings.length === 0) return []

  const visitorIds = [...new Set(bookings.map(b => b.userId))]
  const [notes, ratings, clerk] = await Promise.all([
    prisma.visitorNote.findMany({ where: { authorId, homeId: homeId!, visitorId: { in: visitorIds } } }),
    getBatchUserRatings(visitorIds),
    clerkProfiles(bookings.map(b => b.user.clerkUserId).filter((x): x is string => Boolean(x))),
  ])
  const noteByVisitor = new Map(notes.map(n => [n.visitorId, n]))

  const byVisitor = new Map<number, typeof bookings>()
  for (const b of bookings) {
    if (!byVisitor.has(b.userId)) byVisitor.set(b.userId, [])
    byVisitor.get(b.userId)!.push(b)
  }

  const now = Date.now()
  const entries: VisitorEntry[] = []
  for (const [visitorId, visits] of byVisitor) {
    const u = visits[0].user
    const c = u.clerkUserId ? clerk.get(u.clerkUserId) : undefined
    const stored = noteByVisitor.get(visitorId)
    let note: VisitorEntry['note'] = null
    if (stored) {
      try {
        note = { ...parsePayload(decryptWithContext(stored.ciphertext, stored.keyVersion, visitorNoteContext(homeId!, visitorId))), updatedAt: stored.updatedAt }
      } catch {
        note = null // unreadable (wrong key/tampered) — never shown, never fatal
      }
    }
    const legacyNotes: VisitorEntry['legacyNotes'] = []
    if (!stored) {
      for (const v of visits) {
        const n = v.notes[0]
        if (!n) continue
        try { legacyNotes.push({ date: v.startTime, text: decryptNote(n.ciphertext, n.keyVersion, v.id) }) } catch { /* skip */ }
      }
    }
    entries.push({
      handle: visits[0].key,
      homeKey: visits[0].home!.key,
      profile: {
        name: u.name,
        firstName: c?.firstName ?? null,
        lastName: c?.lastName ?? null,
        imageUrl: c?.imageUrl ?? null,
        occupation: u.occupation,
        email: c?.email ?? u.email,
        phone: c?.phone ?? null,
        verified: u.verified,
        tenantScore: ratings.get(visitorId)?.userScore ?? null,
      },
      visits: visits.map(v => ({ bookingKey: v.key, startTime: v.startTime, status: v.status })),
      upcoming: visits.some(v => v.status === 'scheduled' && v.startTime.getTime() > now),
      note,
      legacyNotes,
    })
  }
  return entries
}

/** Resolve a booking handle to the (home, visitor) pair the author may annotate — or null. */
export async function resolveHandle(authorId: number, bookingKey: string) {
  const b = await prisma.booking.findUnique({ where: { key: bookingKey }, select: { ownerId: true, homeId: true, userId: true } })
  if (!b || b.ownerId !== authorId || b.homeId == null) return null
  return { homeId: b.homeId, visitorId: b.userId }
}

export async function saveVisitorNote(authorId: number, homeId: number, visitorId: number, payload: NotePayload) {
  const { ciphertext, keyVersion } = encryptPayload(payload, homeId, visitorId)
  return prisma.$transaction(async tx => {
    const note = await tx.visitorNote.upsert({
      where: { homeId_visitorId_authorId: { homeId, visitorId, authorId } },
      create: { homeId, visitorId, authorId, ciphertext, keyVersion },
      update: { ciphertext, keyVersion },
      select: { key: true, updatedAt: true },
    })
    // Old per-meeting notes were shown to the author while editing and are now part of this
    // note — remove them so the same text doesn't live twice.
    await tx.meetingNote.deleteMany({ where: { authorId, booking: { homeId, userId: visitorId } } })
    return note
  })
}

export async function deleteVisitorNote(authorId: number, homeId: number, visitorId: number) {
  const [a, b] = await prisma.$transaction([
    prisma.visitorNote.deleteMany({ where: { authorId, homeId, visitorId } }),
    prisma.meetingNote.deleteMany({ where: { authorId, booking: { homeId, userId: visitorId } } }),
  ])
  return a.count + b.count
}
