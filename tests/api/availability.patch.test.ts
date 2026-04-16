import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUser = vi.fn()

const mockPrisma = {
  home: {
    findUnique: vi.fn(),
  },
  availability: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
} as any

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('PATCH /api/homes/[id]/availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects updates when availability does not belong to the home', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 9, role: 'owner' })
    mockPrisma.home.findUnique.mockResolvedValue({ id: 100, ownerId: 9 })
    mockPrisma.availability.findUnique.mockResolvedValue({ id: 555, homeId: 101 })

    const { PATCH } = await import('@/app/api/homes/[id]/availability/route')
    const req = new NextRequest('http://localhost/api/homes/home-1/availability', {
      method: 'PATCH',
      body: JSON.stringify({
        availabilityId: 555,
        isAvailable: false,
      }),
    })

    const res = await PATCH(req, { params: { id: 'home-1' } })
    const payload = await res.json()

    expect(res.status).toBe(400)
    expect(payload.error).toContain('does not belong to this home')
    expect(mockPrisma.availability.update).not.toHaveBeenCalled()
  })
})
