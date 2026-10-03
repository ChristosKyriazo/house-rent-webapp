import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

const { mockGetCurrentUser, mockPrisma, mockHas } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockHas: vi.fn(),
  mockPrisma: {
    booking: { findMany: vi.fn(), findUnique: vi.fn() },
    meetingNote: { upsert: vi.fn(), deleteMany: vi.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
}))

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(true) }))
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ has: mockHas }),
  reverificationErrorResponse: () => new Response(JSON.stringify({ clerk_error: { type: 'forbidden', reason: 'reverification-error' } }), { status: 403 }),
}))

const OWNER = { id: 10 }
const url = (q = '') => `http://localhost/api/meeting-notes${q}`
const put = (body: unknown) => new NextRequest(url(), { method: 'PUT', body: JSON.stringify(body) })

describe('/api/meeting-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MEETING_NOTES_KEYS = `1:${randomBytes(32).toString('base64')}`
    mockGetCurrentUser.mockResolvedValue(OWNER)
    mockHas.mockReturnValue(true)
  })

  it('is off (503) when no encryption key is configured — never stores clear text', async () => {
    process.env.MEETING_NOTES_KEYS = ''
    const { PUT } = await import('@/app/api/meeting-notes/route')
    const res = await PUT(put({ bookingKey: 'b1', text: 'hi' }))
    expect(res.status).toBe(503)
    expect(mockPrisma.meetingNote.upsert).not.toHaveBeenCalled()
  })

  it('requires sign-in', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/meeting-notes/route')
    expect((await GET(new NextRequest(url('?homeKey=h1')))).status).toBe(401)
  })

  it('reading requires a fresh identity check, and reveals nothing without it', async () => {
    mockHas.mockReturnValue(false)
    const { GET } = await import('@/app/api/meeting-notes/route')
    const res = await GET(new NextRequest(url('?homeKey=h1')))
    expect(res.status).toBe(403)
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled()
  })

  it('writing requires a fresh identity check too', async () => {
    mockHas.mockReturnValue(false)
    const { PUT } = await import('@/app/api/meeting-notes/route')
    expect((await PUT(put({ bookingKey: 'b1', text: 'x' }))).status).toBe(403)
    expect(mockPrisma.meetingNote.upsert).not.toHaveBeenCalled()
  })

  it('only the meeting host can write; others get the same 404 as a missing meeting', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ id: 5, ownerId: 99 })
    const { PUT } = await import('@/app/api/meeting-notes/route')
    expect((await PUT(put({ bookingKey: 'b1', text: 'x' }))).status).toBe(404)
    expect(mockPrisma.meetingNote.upsert).not.toHaveBeenCalled()
  })

  it('stores ciphertext only, and reads it back decrypted for the author', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ id: 5, ownerId: OWNER.id })
    let stored: { ciphertext: string; keyVersion: number } | null = null
    mockPrisma.meetingNote.upsert.mockImplementation(async ({ create }: { create: { ciphertext: string; keyVersion: number } }) => {
      stored = create
      return { key: 'n1', updatedAt: new Date() }
    })
    const { PUT, GET } = await import('@/app/api/meeting-notes/route')
    const secret = 'Visitor: Maria K., 6944123456, can pay 3 months upfront'
    expect((await PUT(put({ bookingKey: 'b1', text: secret }))).status).toBe(200)
    expect(stored!.ciphertext).not.toContain('Maria')
    expect(Buffer.from(stored!.ciphertext, 'base64').toString('utf8')).not.toContain('6944123456')

    mockPrisma.booking.findMany.mockResolvedValue([{
      id: 5, key: 'b1', startTime: new Date(), endTime: new Date(), status: 'completed',
      user: { name: 'Maria' },
      notes: [{ key: 'n1', ciphertext: stored!.ciphertext, keyVersion: stored!.keyVersion, updatedAt: new Date() }],
    }])
    const res = await GET(new NextRequest(url('?homeKey=h1')))
    const body = await res.json()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(body.meetings[0].note.text).toBe(secret)
    expect(body.meetings[0].visitorName).toBe('Maria')
  })

  it('only ever queries the caller\'s own meetings and own notes', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([])
    const { GET } = await import('@/app/api/meeting-notes/route')
    await GET(new NextRequest(url('?homeKey=h1')))
    const args = mockPrisma.booking.findMany.mock.calls[0][0]
    expect(args.where.ownerId).toBe(OWNER.id)
    expect(args.select.notes.where).toEqual({ authorId: OWNER.id })
  })

  it('deletes only the caller\'s own note', async () => {
    mockPrisma.meetingNote.deleteMany.mockResolvedValue({ count: 1 })
    const { DELETE } = await import('@/app/api/meeting-notes/route')
    const res = await DELETE(new NextRequest(url('?bookingKey=b1'), { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(mockPrisma.meetingNote.deleteMany.mock.calls[0][0].where).toEqual({ authorId: OWNER.id, booking: { key: 'b1' } })
  })
})
