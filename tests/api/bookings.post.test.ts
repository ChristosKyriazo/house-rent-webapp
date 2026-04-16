import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUser = vi.fn()

const mockPrisma = {
  availability: {
    findUnique: vi.fn(),
  },
  inquiry: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
} as any

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('POST /api/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid time ranges before transaction', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 11, role: 'user' })

    const { POST } = await import('@/app/api/bookings/route')
    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ownerId: 22,
        title: 'Viewing',
        startTime: '2026-05-01T12:00:00.000Z',
        endTime: '2026-05-01T11:00:00.000Z',
      }),
    })

    const res = await POST(req)
    const payload = await res.json()

    expect(res.status).toBe(400)
    expect(payload.error).toContain('Invalid appointment time range')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
