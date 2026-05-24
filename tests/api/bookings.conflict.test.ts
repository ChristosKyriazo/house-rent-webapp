import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUser = vi.fn()

const mockPrisma = {
  availability: { findUnique: vi.fn() },
  inquiry: { findUnique: vi.fn(), findFirst: vi.fn() },
  notification: { create: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
} as any

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const validBody = {
  ownerId: 22,
  title: 'Viewing',
  startTime: '2026-06-01T10:00:00.000Z',
  endTime: '2026-06-01T11:00:00.000Z',
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

  it('returns 400 on user booking conflict', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })
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
    mockPrisma.$transaction.mockRejectedValue(new Error('DB crash'))

    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(makePostRequest(validBody))

    expect(res.status).toBe(500)
  })
})
