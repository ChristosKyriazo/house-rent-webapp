import { prisma } from '@/lib/prisma'

export class InquiryFinalizationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'InquiryFinalizationError'
    this.status = status
  }
}

export async function initiateFinalization(
  inquiryId: number,
  userId: number,
  userRole: string | undefined,
  moveInDate: Date,
  moveOutDate?: Date,
) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      home: {
        select: {
          id: true,
          key: true,
          ownerId: true,
          owner: { select: { key: true } },
        },
      },
      user: { select: { id: true } },
      finalization: true,
    },
  })

  if (!inquiry) throw new InquiryFinalizationError('Inquiry not found', 404)
  if (!inquiry.approved) throw new InquiryFinalizationError('Inquiry must be approved before finalization', 400)
  if (inquiry.finalized) throw new InquiryFinalizationError('Inquiry already finalized', 400)
  if (inquiry.finalization) throw new InquiryFinalizationError('Finalization already initiated', 400)

  if (userId !== inquiry.home.ownerId) {
    throw new InquiryFinalizationError('Only the home owner can initiate finalization', 403)
  }

  const scheduledBooking = await prisma.booking.findFirst({
    where: { inquiryId: inquiry.id, status: 'scheduled' },
  })
  if (!scheduledBooking) throw new InquiryFinalizationError('Can only finalize after a scheduled meeting', 400)

  // Guard: meeting must have ended before finalization can be initiated
  if (new Date(scheduledBooking.endTime) > new Date()) {
    throw new InquiryFinalizationError('Cannot finalize before the scheduled meeting has ended', 400)
  }

  try {
  await prisma.$transaction(async tx => {
    await tx.finalization.create({
      data: {
        inquiryId: inquiry.id,
        homeId: inquiry.home.id,
        landlordId: inquiry.home.ownerId,
        tenantId: inquiry.user.id,
        moveInDate,
        moveOutDate: moveOutDate ?? null,
        status: 'pending_tenant',
      },
    })

    await tx.notification.create({
      data: {
        recipientId: inquiry.user.id,
        role: 'user',
        type: 'finalize',
        homeKey: inquiry.home.key,
        userId: inquiry.userId,
        ownerKey: inquiry.home.owner.key,
        inquiryId: inquiry.id,
      },
    })
  })
  } catch (err: unknown) {
    // P2002 = unique constraint violation — another request already created the finalization
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      throw new InquiryFinalizationError('Finalization already initiated', 409)
    }
    throw err
  }
}

export async function respondToFinalization(inquiryId: number, userId: number, action: 'approve' | 'dismiss') {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      finalization: true,
      home: {
        select: {
          id: true,
          key: true,
          ownerId: true,
          owner: { select: { key: true } },
        },
      },
      user: { select: { id: true } },
    },
  })

  if (!inquiry) throw new InquiryFinalizationError('Inquiry not found', 404)
  if (userId !== inquiry.user.id) {
    throw new InquiryFinalizationError('Only the tenant can respond to a finalization request', 403)
  }
  if (!inquiry.finalization) {
    throw new InquiryFinalizationError('No pending finalization found for this inquiry', 400)
  }

  if (action === 'approve') {
    await prisma.$transaction(async tx => {
      await tx.finalization.update({
        where: { id: inquiry.finalization!.id },
        data: { status: 'confirmed' },
      })
      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { finalized: true, finalizedBy: userId },
      })
      await tx.home.update({
        where: { id: inquiry.home.id },
        data: { finalized: true },
      })
      await tx.notification.updateMany({
        where: { inquiryId: inquiry.id, type: 'finalize', recipientId: userId },
        data: { deleted: true },
      })
      await tx.notification.updateMany({
        where: { homeKey: inquiry.home.key, type: 'approved', recipientId: inquiry.user.id, deleted: false },
        data: { deleted: true },
      })
      // Notify tenant: move-in rating window opens 3 days after moveInDate
      await tx.notification.create({
        data: {
          recipientId: inquiry.user.id,
          role: 'user',
          type: 'rate',
          homeKey: inquiry.home.key,
          ownerKey: inquiry.home.owner.key,
          inquiryId: inquiry.id,
        },
      })
    })

    return { message: 'Deal finalized', finalized: true }
  }

  // dismiss
  await prisma.$transaction(async tx => {
    await tx.finalization.update({
      where: { id: inquiry.finalization!.id },
      data: { status: 'declined' },
    })
    await tx.inquiry.update({
      where: { id: inquiry.id },
      data: { dismissed: true },
    })
    await tx.notification.updateMany({
      where: { inquiryId: inquiry.id, type: 'finalize', recipientId: userId },
      data: { deleted: true },
    })
    await tx.notification.create({
      data: {
        recipientId: inquiry.home.ownerId,
        role: 'owner',
        type: 'rejected',
        homeKey: inquiry.home.key,
        ownerKey: inquiry.home.owner.key,
        userId: inquiry.user.id,
      },
    })
  })

  return { message: 'Finalization declined', declined: true }
}
