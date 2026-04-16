import { prisma } from '@/lib/prisma'

export class InquiryFinalizationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'InquiryFinalizationError'
    this.status = status
  }
}

export async function initiateFinalization(inquiryId: number, userId: number, userRole?: string) {
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
    },
  })

  if (!inquiry) throw new InquiryFinalizationError('Inquiry not found', 404)
  if (!inquiry.approved) throw new InquiryFinalizationError('Inquiry must be approved before finalization', 400)
  if (inquiry.finalized) throw new InquiryFinalizationError('Inquiry already finalized', 400)

  const normalizedRole = (userRole || 'user').toLowerCase()
  const canInitiate = userId === inquiry.home.ownerId || normalizedRole === 'broker' || normalizedRole === 'both'
  if (!canInitiate) throw new InquiryFinalizationError('Only owners and brokers can initiate finalization', 403)

  const scheduledBooking = await prisma.booking.findFirst({
    where: { inquiryId: inquiry.id, status: 'scheduled' },
  })
  if (!scheduledBooking) throw new InquiryFinalizationError('Can only finalize after a scheduled meeting', 400)

  await prisma.notification.create({
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
}

export async function respondToFinalization(inquiryId: number, userId: number, action: 'approve' | 'dismiss') {
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
    },
  })

  if (!inquiry) throw new InquiryFinalizationError('Inquiry not found', 404)
  if (userId !== inquiry.home.ownerId && userId !== inquiry.user.id) {
    throw new InquiryFinalizationError('Not authorized to manage this finalization', 403)
  }

  if (action === 'approve') {
    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { finalized: true, finalizedBy: userId },
    })
    await prisma.home.update({
      where: { id: inquiry.home.id },
      data: { finalized: true },
    })

    await prisma.notification.updateMany({
      where: { inquiryId: inquiry.id, type: 'finalize', recipientId: userId },
      data: { deleted: true },
    })

    try {
      await prisma.notification.updateMany({
        where: {
          homeKey: inquiry.home.key,
          type: 'approved',
          recipientId: inquiry.user.id,
          deleted: false,
        },
        data: { deleted: true },
      })

      const [userRating, ownerRating] = await Promise.all([
        prisma.rating.findFirst({
          where: { raterId: inquiry.user.id, ratedUserId: inquiry.home.ownerId, type: 'owner' },
        }),
        prisma.rating.findFirst({
          where: { raterId: inquiry.home.ownerId, ratedUserId: inquiry.user.id, type: 'renter' },
        }),
      ])

      if (!userRating) {
        await prisma.notification.create({
          data: {
            recipientId: inquiry.user.id,
            role: 'user',
            type: 'rate',
            homeKey: inquiry.home.key,
            ownerKey: inquiry.home.owner.key,
            inquiryId: inquiry.id,
          },
        })
      }

      if (!ownerRating) {
        await prisma.notification.create({
          data: {
            recipientId: inquiry.home.ownerId,
            role: 'owner',
            type: 'rate',
            homeKey: inquiry.home.key,
            userId: inquiry.user.id,
            inquiryId: inquiry.id,
          },
        })
      }
    } catch (error) {
      console.error('Failed to create rating notifications:', error)
    }
    return { message: 'Deal finalized', finalized: true }
  }

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { dismissed: true },
  })
  await prisma.notification.updateMany({
    where: { inquiryId: inquiry.id, type: 'finalize', recipientId: userId },
    data: { deleted: true },
  })
  await prisma.notification.create({
    data: {
      recipientId: inquiry.user.id,
      role: 'user',
      type: 'rejected',
      homeKey: inquiry.home.key,
      ownerKey: inquiry.home.owner.key,
      userId: inquiry.userId,
    },
  })
  return { message: 'Finalization dismissed', dismissed: true }
}
