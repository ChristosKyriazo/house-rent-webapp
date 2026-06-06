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
  },
  finalization: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
} as any

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const moveInDate = new Date('2026-07-01')

describe('inquiry finalization service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks initiation without scheduled booking', async () => {
    const { initiateFinalization } = await import('@/lib/services/inquiry-finalization-service')

    mockPrisma.inquiry.findUnique.mockResolvedValue({
      id: 10,
      approved: true,
      finalized: false,
      userId: 31,
      home: { id: 5, ownerId: 22, key: 'home-key', owner: { key: 'owner-key' } },
      user: { id: 31 },
    })
    mockPrisma.booking.findFirst.mockResolvedValue(null)

    await expect(initiateFinalization(10, 22, 'owner', moveInDate)).rejects.toMatchObject({
      status: 400,
      message: 'Can only finalize after a scheduled meeting',
    })
  })
})
