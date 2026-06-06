import { prisma } from '@/lib/prisma'

export class InquiryManagementError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'InquiryManagementError'
    this.status = status
  }
}

interface ManageInquiryInput {
  inquiryId: number
  actorId: number
  actorRole?: string | null
  action: 'approve' | 'dismiss'
  contactInfo?: unknown
}

export async function manageInquiryApproval({
  inquiryId,
  actorId,
  actorRole,
  action,
  contactInfo,
}: ManageInquiryInput) {
  const normalizedRole = (actorRole || 'user').toLowerCase()
  if (!['owner', 'both', 'broker'].includes(normalizedRole)) {
    throw new InquiryManagementError('Only owners and brokers can manage inquiries', 403)
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      home: { select: { ownerId: true } },
    },
  })

  if (!inquiry) throw new InquiryManagementError('Inquiry not found', 404)
  if (inquiry.home.ownerId !== actorId) {
    throw new InquiryManagementError('Not authorized to manage this inquiry', 403)
  }

  const inquiryWithDetails = await prisma.inquiry.findUnique({
    where: { id: inquiry.id },
    include: {
      user: { select: { id: true } },
      home: {
        select: {
          key: true,
          owner: { select: { key: true } },
        },
      },
    },
  })

  if (action === 'approve') {
    const updateData: { approved: boolean; dismissed: boolean; contactInfo?: string } = {
      approved: true,
      dismissed: false,
    }
    if (contactInfo) updateData.contactInfo = JSON.stringify(contactInfo)

    await prisma.$transaction(async tx => {
      await tx.inquiry.update({ where: { id: inquiry.id }, data: updateData })

      if (inquiryWithDetails) {
        await tx.notification.create({
          data: {
            recipientId: inquiryWithDetails.user.id,
            role: 'user',
            type: 'approved',
            homeKey: inquiryWithDetails.home.key,
            ownerKey: inquiryWithDetails.home.owner.key,
          },
        })
        await tx.notification.updateMany({
          where: { homeKey: inquiryWithDetails.home.key, type: 'inquiry', recipientId: actorId, deleted: false },
          data: { deleted: true },
        })
        await tx.notification.updateMany({
          where: {
            homeKey: inquiryWithDetails.home.key,
            type: 'inquiry',
            recipientId: inquiryWithDetails.user.id,
            deleted: false,
          },
          data: { deleted: true },
        })
      }
    })

    return { message: 'Inquiry approved', approved: true }
  }

  await prisma.$transaction(async tx => {
    await tx.inquiry.update({ where: { id: inquiry.id }, data: { dismissed: true, approved: false } })

    if (inquiryWithDetails) {
      await tx.notification.updateMany({
        where: { homeKey: inquiryWithDetails.home.key, type: 'inquiry', recipientId: actorId, deleted: false },
        data: { deleted: true },
      })
      await tx.notification.create({
        data: {
          recipientId: inquiryWithDetails.user.id,
          role: 'user',
          type: 'dismissed',
          homeKey: inquiryWithDetails.home.key,
          ownerKey: inquiryWithDetails.home.owner.key,
        },
      })
    }
  })

  return { message: 'Inquiry dismissed' }
}

export async function rejectInquiryAfterMeeting(inquiryId: number, actorId: number, _actorRole?: string | null) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      home: {
        select: {
          ownerId: true,
          key: true,
          owner: { select: { key: true } },
        },
      },
      user: { select: { id: true } },
    },
  })

  if (!inquiry) throw new InquiryManagementError('Inquiry not found', 404)

  if (actorId !== inquiry.home.ownerId) {
    throw new InquiryManagementError('Only the home owner can reject inquiries', 403)
  }

  const scheduledBooking = await prisma.booking.findFirst({
    where: { inquiryId: inquiry.id, status: 'scheduled' },
  })
  if (!scheduledBooking) throw new InquiryManagementError('Can only reject after a scheduled meeting', 400)

  await prisma.$transaction(async tx => {
    await tx.inquiry.update({ where: { id: inquiry.id }, data: { dismissed: true } })
    await tx.notification.create({
      data: {
        recipientId: inquiry.user.id,
        role: 'user',
        type: 'rejected',
        homeKey: inquiry.home.key,
        userId: inquiry.userId,
        ownerKey: inquiry.home.owner.key,
        inquiryId: inquiry.id,
      },
    })
  })
}
