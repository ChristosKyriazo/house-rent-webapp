import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    inquiry: { findUnique: vi.fn(), update: vi.fn() },
    home: { update: vi.fn() },
    booking: { findFirst: vi.fn() },
    notification: { create: vi.fn(), updateMany: vi.fn() },
    rating: { findFirst: vi.fn() },
  } as any
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  initiateFinalization,
  respondToFinalization,
} from '@/lib/services/inquiry-finalization-service'

const baseInquiry = {
  id: 1,
  userId: 10,
  homeId: 5,
  approved: true,
  finalized: false,
  home: { id: 5, key: 'home-abc', ownerId: 20, owner: { key: 'owner-xyz' } },
  user: { id: 10 },
}

describe('initiateFinalization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when inquiry not found', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(null)
    await expect(initiateFinalization(99, 20, 'owner')).rejects.toMatchObject({ status: 404 })
  })

  it('throws 400 when inquiry is not yet approved', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({ ...baseInquiry, approved: false })
    await expect(initiateFinalization(1, 20, 'owner')).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when inquiry is already finalized', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({ ...baseInquiry, finalized: true })
    await expect(initiateFinalization(1, 20, 'owner')).rejects.toMatchObject({ status: 400 })
  })

  it('throws 403 when actor is a plain user (not owner/broker)', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    await expect(initiateFinalization(1, 99, 'user')).rejects.toMatchObject({ status: 403 })
  })

  it('throws 400 when no scheduled booking exists', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue(null)
    await expect(initiateFinalization(1, 20, 'owner')).rejects.toMatchObject({ status: 400 })
  })

  it('creates a finalize notification for the renter', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue({ id: 1, status: 'scheduled' })
    mockPrisma.notification.create.mockResolvedValue({})

    await initiateFinalization(1, 20, 'owner')

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'finalize', recipientId: 10 }),
      })
    )
  })

  it('broker role can initiate finalization', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue({ id: 1, status: 'scheduled' })
    mockPrisma.notification.create.mockResolvedValue({})

    await expect(initiateFinalization(1, 99, 'broker')).resolves.not.toThrow()
  })
})

describe('respondToFinalization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when inquiry not found', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(null)
    await expect(respondToFinalization(99, 10, 'approve')).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when actor is unrelated to the inquiry', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    await expect(respondToFinalization(1, 999, 'approve')).rejects.toMatchObject({ status: 403 })
  })

  it('approves finalization and marks inquiry + home as finalized', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.home.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.rating.findFirst.mockResolvedValue(null)

    const result = await respondToFinalization(1, 10, 'approve')

    expect(result).toMatchObject({ finalized: true })
    expect(mockPrisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ finalized: true }) })
    )
    expect(mockPrisma.home.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { finalized: true } })
    )
  })

  it('creates two rating notifications when no ratings exist yet', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.home.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.rating.findFirst.mockResolvedValue(null)

    await respondToFinalization(1, 10, 'approve')

    const rateCalls = mockPrisma.notification.create.mock.calls.filter(
      (c: any) => c[0].data.type === 'rate'
    )
    expect(rateCalls.length).toBe(2)
  })

  it('skips rating notifications when both ratings already exist', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.home.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.rating.findFirst.mockResolvedValue({ id: 1 })

    await respondToFinalization(1, 10, 'approve')

    const rateCalls = mockPrisma.notification.create.mock.calls.filter(
      (c: any) => c[0].data.type === 'rate'
    )
    expect(rateCalls.length).toBe(0)
  })

  it('dismisses finalization and sends a rejected notification to renter', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    const result = await respondToFinalization(1, 10, 'dismiss')

    expect(result).toMatchObject({ dismissed: true })
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'rejected' }),
      })
    )
  })
})
