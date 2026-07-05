import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetCurrentUser, mockPrisma } = vi.hoisted(() => {
  const mockGetCurrentUser = vi.fn()
  const mockPrisma = {
    rating: { findUnique: vi.fn(), update: vi.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { mockGetCurrentUser, mockPrisma }
})

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/ratings/flag/5', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: '5' }) }

function baseRating(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    flagged: false,
    raterId: 10,
    ratedUserId: 20,
    ratedHomeId: null,
    ratedHome: null,
    ...overrides,
  }
}

describe('POST /api/ratings/flag/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid rating id', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 20 })
    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: 'abc' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the rating does not exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 20 })
    mockPrisma.rating.findUnique.mockResolvedValue(null)
    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)
    expect(res.status).toBe(404)
  })

  it('returns 403 when the caller is neither the rated user nor the home owner', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 999 })
    mockPrisma.rating.findUnique.mockResolvedValue(baseRating())

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)

    expect(res.status).toBe(403)
    expect(mockPrisma.rating.update).not.toHaveBeenCalled()
  })

  it('returns 403 when the rater tries to flag their own rating', async () => {
    // Rater is also the rated user (self-rating edge) — the rater block must win
    mockGetCurrentUser.mockResolvedValue({ id: 10 })
    mockPrisma.rating.findUnique.mockResolvedValue(baseRating({ ratedUserId: 10 }))

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)

    expect(res.status).toBe(403)
    expect(mockPrisma.rating.update).not.toHaveBeenCalled()
  })

  it('lets the rated user flag and stores the trimmed reason', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 20 })
    mockPrisma.rating.findUnique.mockResolvedValue(baseRating())
    mockPrisma.rating.update.mockResolvedValue({ id: 5, flagged: true, flaggedAt: new Date() })

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest({ reason: '  retaliatory rating  ' }), params)

    expect(res.status).toBe(200)
    expect(mockPrisma.rating.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ flagged: true, flagReason: 'retaliatory rating' }),
      })
    )
  })

  it('lets the home owner flag a rating on their home', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 30 })
    mockPrisma.rating.findUnique.mockResolvedValue(
      baseRating({ ratedUserId: null, ratedHomeId: 7, ratedHome: { ownerId: 30 } })
    )
    mockPrisma.rating.update.mockResolvedValue({ id: 5, flagged: true, flaggedAt: new Date() })

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)

    expect(res.status).toBe(200)
  })

  it('is idempotent — an already-flagged rating is not re-updated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 20 })
    mockPrisma.rating.findUnique.mockResolvedValue(baseRating({ flagged: true }))

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    const res = await POST(makeRequest(), params)

    expect(res.status).toBe(200)
    expect(mockPrisma.rating.update).not.toHaveBeenCalled()
  })

  it('caps an oversized reason at 500 characters', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 20 })
    mockPrisma.rating.findUnique.mockResolvedValue(baseRating())
    mockPrisma.rating.update.mockResolvedValue({ id: 5, flagged: true, flaggedAt: new Date() })

    const { POST } = await import('@/app/api/ratings/flag/[id]/route')
    await POST(makeRequest({ reason: 'x'.repeat(2000) }), params)

    const stored = mockPrisma.rating.update.mock.calls[0][0].data.flagReason
    expect(stored).toHaveLength(500)
  })
})
