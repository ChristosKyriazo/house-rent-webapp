import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    inquiry: { findUnique: vi.fn(), update: vi.fn() },
    home: { update: vi.fn() },
    booking: { findFirst: vi.fn() },
    notification: { create: vi.fn(), updateMany: vi.fn() },
    finalization: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
  } as any
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  initiateFinalization,
  respondToFinalization,
} from '@/lib/services/inquiry-finalization-service'

const moveInDate = new Date('2026-07-01')

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
    await expect(initiateFinalization(99, 20, 'owner', moveInDate)).rejects.toMatchObject({ status: 404 })
  })

  it('throws 400 when inquiry is not yet approved', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({ ...baseInquiry, approved: false })
    await expect(initiateFinalization(1, 20, 'owner', moveInDate)).rejects.toMatchObject({ status: 400 })
  })

  it('throws 400 when inquiry is already finalized', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({ ...baseInquiry, finalized: true })
    await expect(initiateFinalization(1, 20, 'owner', moveInDate)).rejects.toMatchObject({ status: 400 })
  })

  it('throws 403 when actor is a plain user (not owner/broker)', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    await expect(initiateFinalization(1, 99, 'user', moveInDate)).rejects.toMatchObject({ status: 403 })
  })

  it('throws 400 when no scheduled booking exists', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue(null)
    await expect(initiateFinalization(1, 20, 'owner', moveInDate)).rejects.toMatchObject({ status: 400 })
  })

  it('creates a finalize notification for the renter', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue({ id: 1, status: 'scheduled' })
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.finalization.create.mockResolvedValue({})

    await initiateFinalization(1, 20, 'owner', moveInDate)

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'finalize', recipientId: 10 }),
      })
    )
  })

  it('throws 403 when broker is not the home owner', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    // userId 99 is a broker but ownerId is 20 — role alone does not grant access
    await expect(initiateFinalization(1, 99, 'broker', moveInDate)).rejects.toMatchObject({ status: 403 })
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
    mockPrisma.inquiry.findUnique.mockResolvedValue({
      ...baseInquiry,
      finalization: { id: 42 },
    })
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.home.update.mockResolvedValue({})
    mockPrisma.finalization.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    const result = await respondToFinalization(1, 10, 'approve')

    expect(result).toMatchObject({ finalized: true })
    expect(mockPrisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ finalized: true }) })
    )
    expect(mockPrisma.home.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { finalized: true } })
    )
  })

  it('creates a rate notification for the tenant when finalization is approved', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({
      ...baseInquiry,
      finalization: { id: 42 },
    })
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.home.update.mockResolvedValue({})
    mockPrisma.finalization.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    await respondToFinalization(1, 10, 'approve')

    const rateCalls = mockPrisma.notification.create.mock.calls.filter(
      (c: any) => c[0].data.type === 'rate'
    )
    expect(rateCalls.length).toBe(1)
  })

  it('dismisses finalization and sends a rejected notification to renter', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({
      ...baseInquiry,
      finalization: { id: 42 },
    })
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.finalization.update.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    const result = await respondToFinalization(1, 10, 'dismiss')

    expect(result).toMatchObject({ declined: true })
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'rejected' }),
      })
    )
  })
})
