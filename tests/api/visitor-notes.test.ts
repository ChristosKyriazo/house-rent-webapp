import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

const { mockGetCurrentUser, mockHas, svc } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockHas: vi.fn(),
  svc: { listVisitors: vi.fn(), resolveHandle: vi.fn(), saveVisitorNote: vi.fn(), deleteVisitorNote: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/services/visitor-notes', () => svc)
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ has: mockHas }),
  reverificationErrorResponse: () => new Response('{}', { status: 403 }),
}))

const url = (q = '') => `http://localhost/api/visitor-notes${q}`
const put = (body: unknown) => new NextRequest(url(), { method: 'PUT', body: JSON.stringify(body) })
const valid = { bookingKey: 'b1', text: 'liked it', outcome: 'interested', followUp: true }

describe('/api/visitor-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MEETING_NOTES_KEYS = `1:${randomBytes(32).toString('base64')}`
    mockGetCurrentUser.mockResolvedValue({ id: 10 })
    mockHas.mockReturnValue(true)
  })

  it('is off (503) without an encryption key', async () => {
    process.env.MEETING_NOTES_KEYS = ''
    const { GET } = await import('@/app/api/visitor-notes/route')
    expect((await GET(new NextRequest(url('?homeKey=h')))).status).toBe(503)
  })

  it('requires sign-in', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/visitor-notes/route')
    expect((await GET(new NextRequest(url('?homeKey=h')))).status).toBe(401)
  })

  it('reading and writing need a fresh identity check; nothing is touched without it', async () => {
    mockHas.mockReturnValue(false)
    const { GET, PUT } = await import('@/app/api/visitor-notes/route')
    expect((await GET(new NextRequest(url('?homeKey=h')))).status).toBe(403)
    expect((await PUT(put(valid))).status).toBe(403)
    expect(svc.listVisitors).not.toHaveBeenCalled()
    expect(svc.saveVisitorNote).not.toHaveBeenCalled()
  })

  it('lists only the caller\'s visitors, uncached', async () => {
    svc.listVisitors.mockResolvedValue([])
    const { GET } = await import('@/app/api/visitor-notes/route')
    const res = await GET(new NextRequest(url('?homeKey=h1')))
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(svc.listVisitors).toHaveBeenCalledWith(10, { homeKey: 'h1' })
  })

  it('rejects an empty note and an unknown outcome', async () => {
    const { PUT } = await import('@/app/api/visitor-notes/route')
    expect((await PUT(put({ bookingKey: 'b1', text: '  ', outcome: null, followUp: false }))).status).toBe(400)
    expect((await PUT(put({ ...valid, outcome: 'hot' }))).status).toBe(400)
  })

  it('a meeting the caller does not host is a 404, same as a missing one', async () => {
    svc.resolveHandle.mockResolvedValue(null)
    const { PUT, DELETE } = await import('@/app/api/visitor-notes/route')
    expect((await PUT(put(valid))).status).toBe(404)
    expect((await DELETE(new NextRequest(url('?bookingKey=b1'), { method: 'DELETE' }))).status).toBe(404)
    expect(svc.saveVisitorNote).not.toHaveBeenCalled()
  })

  it('saves outcome-only notes for the resolved visitor', async () => {
    svc.resolveHandle.mockResolvedValue({ homeId: 3, visitorId: 7 })
    svc.saveVisitorNote.mockResolvedValue({ key: 'n', updatedAt: new Date() })
    const { PUT } = await import('@/app/api/visitor-notes/route')
    expect((await PUT(put({ bookingKey: 'b1', text: '', outcome: 'maybe', followUp: false }))).status).toBe(200)
    expect(svc.saveVisitorNote).toHaveBeenCalledWith(10, 3, 7, { text: '', outcome: 'maybe', followUp: false })
  })
})
