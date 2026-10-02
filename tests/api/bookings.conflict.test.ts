import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUser = vi.fn()

const mockPrisma = {
  availability: { findUnique: vi.fn() },
  inquiry: { findUnique: vi.fn(), findFirst: vi.fn() },
  notification: { create: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// A booking must resolve to a home via availabilityId (or inquiryId) — the
// owner is derived server-side from that, never from a client-sent ownerId.
const validBody = {
  availabilityId: 33,
  title: 'Viewing',
  startTime: '2026-06-01T10:00:00.000Z',
  endTime: '2026-06-01T11:00:00.000Z',
}

const availabilityWithHome = {
  id: 33,
  homeId: 5,
  home: { id: 5, ownerId: 22, key: 'home-key-5', owner: { key: 'owner-key-22' } },
}

function mockResolvedHomeContext() {
  mockPrisma.availability.findUnique.mockResolvedValue(availabilityWithHome)
  // Approved-inquiry gate + inquiry auto-match both resolve
  mockPrisma.inquiry.findFirst.mockResolvedValue({ id: 77 })
}

describe('POST /api/bookings — conflict and auth cases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 when owner ID is missing and no availabilityId', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        booking: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
      })
    })

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest({
      title: 'Viewing',
      startTime: '2026-06-01T10:00:00.000Z',
      endTime: '2026-06-01T11:00:00.000Z',
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Owner ID')
  })

  it('returns 400 when only ownerId is sent (no availability or inquiry) — booking cannot target arbitrary owners', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest({
      ownerId: 22,
      title: 'Viewing',
      startTime: '2026-06-01T10:00:00.000Z',
      endTime: '2026-06-01T11:00:00.000Z',
    }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valid availability or inquiry')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 403 when the user has no approved inquiry for the home', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
    mockPrisma.availability.findUnique.mockResolvedValue(availabilityWithHome)
    mockPrisma.inquiry.findFirst.mockResolvedValue(null)

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))

    expect(res.status).toBe(403)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 400 on user booking conflict', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
    mockResolvedHomeContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        booking: {
          count: vi.fn()
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(0),
        },
      })
    })

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('already have an appointment')
  })

  it('returns 400 on owner booking conflict', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
    mockResolvedHomeContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        booking: {
          count: vi.fn()
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1),
        },
      })
    })

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('owner/broker already has')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
    mockResolvedHomeContext()
    mockPrisma.$transaction.mockRejectedValue(new Error('DB crash'))

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))

    expect(res.status).toBe(500)
  })
})
