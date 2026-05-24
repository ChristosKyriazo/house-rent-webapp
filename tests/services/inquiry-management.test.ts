import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    inquiry: { findUnique: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn(), updateMany: vi.fn() },
    booking: { findFirst: vi.fn() },
  } as any
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  manageInquiryApproval,
  rejectInquiryAfterMeeting,
} from '@/lib/services/inquiry-management-service'

const baseInquiry = {
  id: 1,
  userId: 10,
  homeId: 5,
  home: { id: 5, ownerId: 20, key: 'home-abc', owner: { key: 'owner-xyz' } },
  user: { id: 10 },
}

describe('manageInquiryApproval', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 403 when actor is a plain user', async () => {
    await expect(
      manageInquiryApproval({ inquiryId: 1, actorId: 10, actorRole: 'user', action: 'approve' })
    ).rejects.toMatchObject({ status: 403 })
  })

  it('throws 404 when inquiry not found', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(null)
    await expect(
      manageInquiryApproval({ inquiryId: 99, actorId: 20, actorRole: 'owner', action: 'approve' })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when actor is not the home owner', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({ id: 1, home: { ownerId: 99 } })
    await expect(
      manageInquiryApproval({ inquiryId: 1, actorId: 20, actorRole: 'owner', action: 'approve' })
    ).rejects.toMatchObject({ status: 403 })
  })

  it('approves inquiry and creates notification', async () => {
    mockPrisma.inquiry.findUnique
      .mockResolvedValueOnce({ id: 1, home: { ownerId: 20 } })
      .mockResolvedValueOnce(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})

    const result = await manageInquiryApproval({
      inquiryId: 1,
      actorId: 20,
      actorRole: 'owner',
      action: 'approve',
    })

    expect(result).toMatchObject({ approved: true })
    expect(mockPrisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approved: true }) })
    )
  })

  it('dismisses inquiry and creates dismissed notification', async () => {
    mockPrisma.inquiry.findUnique
      .mockResolvedValueOnce({ id: 1, home: { ownerId: 20 } })
      .mockResolvedValueOnce(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})

    const result = await manageInquiryApproval({
      inquiryId: 1,
      actorId: 20,
      actorRole: 'owner',
      action: 'dismiss',
    })

    expect(result).toMatchObject({ message: 'Inquiry dismissed' })
    expect(mockPrisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dismissed: true }) })
    )
  })

  it('broker role can manage inquiries', async () => {
    mockPrisma.inquiry.findUnique
      .mockResolvedValueOnce({ id: 1, home: { ownerId: 20 } })
      .mockResolvedValueOnce(baseInquiry)
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
    mockPrisma.notification.updateMany.mockResolvedValue({})

    const result = await manageInquiryApproval({
      inquiryId: 1,
      actorId: 20,
      actorRole: 'broker',
      action: 'approve',
    })

    expect(result).toMatchObject({ approved: true })
  })
})

describe('rejectInquiryAfterMeeting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws 404 when inquiry not found', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(null)
    await expect(rejectInquiryAfterMeeting(99, 20, 'owner')).rejects.toMatchObject({ status: 404 })
  })

  it('throws 403 when actor is not the owner', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue({
      ...baseInquiry,
      home: { ...baseInquiry.home, ownerId: 99 },
    })
    await expect(rejectInquiryAfterMeeting(1, 20, 'user')).rejects.toMatchObject({ status: 403 })
  })

  it('throws 400 when no scheduled booking exists', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue(null)
    await expect(rejectInquiryAfterMeeting(1, 20, 'owner')).rejects.toMatchObject({ status: 400 })
  })

  it('dismisses inquiry and creates rejected notification', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(baseInquiry)
    mockPrisma.booking.findFirst.mockResolvedValue({ id: 55, status: 'scheduled' })
    mockPrisma.inquiry.update.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})

    await rejectInquiryAfterMeeting(1, 20, 'owner')

    expect(mockPrisma.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dismissed: true } })
    )
    expect(mockPrisma.notification.create).toHaveBeenCalled()
  })
})
