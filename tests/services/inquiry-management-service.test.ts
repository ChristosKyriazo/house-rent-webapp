import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  inquiry: {
    findUnique: vi.fn(),
  },
  booking: {
    findFirst: vi.fn(),
  },
  notification: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
} as any

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('inquiry management service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reject flow requires a scheduled booking', async () => {
    const { rejectInquiryAfterMeeting } = await import('@/lib/services/inquiry-management-service')

    mockPrisma.inquiry.findUnique.mockResolvedValue({
      id: 44,
      userId: 77,
      home: { ownerId: 12, key: 'home-key', owner: { key: 'owner-key' } },
      user: { id: 77 },
    })
    mockPrisma.booking.findFirst.mockResolvedValue(null)

    await expect(rejectInquiryAfterMeeting(44, 12, 'owner')).rejects.toMatchObject({
      status: 400,
      message: 'Can only reject after a scheduled meeting',
    })
  })
})
