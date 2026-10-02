import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetCurrentUser, mockPrisma } = vi.hoisted(() => {
  const mockGetCurrentUser = vi.fn()
  const mockPrisma = {
    booking: { findMany: vi.fn() },
    availability: { findMany: vi.fn() },
    home: { findMany: vi.fn() },
    inquiry: { findUnique: vi.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { mockGetCurrentUser, mockPrisma }
})

vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

function makeGetRequest(searchParams = '') {
  return new NextRequest(`http://localhost/api/bookings${searchParams}`)
}

describe('GET /api/bookings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/bookings/route')
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns empty bookings when user has no bookings', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: 'user' })
    mockPrisma.booking.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/bookings/route')
    const res = await GET(makeGetRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.bookings).toEqual([])
  })

  it('returns orphan bookings (availabilityId=null) even when no valid availabilities exist', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: 'user' })
    const orphan = { id: 1, availabilityId: null, inquiryId: null, status: 'scheduled' }
    // First call: allBookings (select); second call: final query with includes
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([orphan])
      .mockResolvedValueOnce([orphan])

    const { GET } = await import('@/app/api/bookings/route')
    const res = await GET(makeGetRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.bookings).toEqual([{ ...orphan, home: null }])
  })

  it('filters bookings to those with valid homes', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: 'user' })
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([
        { id: 1, availabilityId: 10, inquiryId: null, status: 'scheduled' },
      ])
      .mockResolvedValueOnce([])

    mockPrisma.availability.findMany.mockResolvedValue([{ id: 10, homeId: 5 }])
    mockPrisma.home.findMany.mockResolvedValue([{ id: 5 }])

    const { GET } = await import('@/app/api/bookings/route')
    const res = await GET(makeGetRequest())

    expect(res.status).toBe(200)
  })

  it('returns 200 with bookings when filtered by valid inquiryId', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: 'user' })

    const fakeInquiry = {
      id: 5,
      userId: 1,
      homeId: 10,
      home: { ownerId: 20, key: 'home-k', title: 'T', street: 'S', city: 'C', country: 'GR' },
    }
    mockPrisma.inquiry.findUnique.mockResolvedValue(fakeInquiry)
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { GET } = await import('@/app/api/bookings/route')
    const res = await GET(makeGetRequest('?inquiryId=5'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.bookings).toBeDefined()
  })
})
