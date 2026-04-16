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

    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: updateData,
    })

    if (inquiryWithDetails) {
      try {
        await prisma.notification.create({
          data: {
            recipientId: inquiryWithDetails.user.id,
            role: 'user',
            type: 'approved',
            homeKey: inquiryWithDetails.home.key,
            ownerKey: inquiryWithDetails.home.owner.key,
          },
        })
      } catch (error) {
        console.error('Failed to create notification:', error)
      }

      try {
        await prisma.notification.updateMany({
          where: {
            homeKey: inquiryWithDetails.home.key,
            type: 'inquiry',
            recipientId: actorId,
            deleted: false,
          },
          data: { deleted: true },
        })
        await prisma.notification.updateMany({
          where: {
            homeKey: inquiryWithDetails.home.key,
            type: 'inquiry',
            recipientId: inquiryWithDetails.user.id,
            deleted: false,
          },
          data: { deleted: true },
        })
      } catch (error) {
        console.error('Failed to clear inquiry notifications:', error)
      }
    }

    return { message: 'Inquiry approved', approved: true }
  }

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { dismissed: true, approved: false },
  })

  if (inquiryWithDetails) {
    try {
      await prisma.notification.updateMany({
        where: {
          homeKey: inquiryWithDetails.home.key,
          type: 'inquiry',
          recipientId: actorId,
          deleted: false,
        },
        data: { deleted: true },
      })
      await prisma.notification.create({
        data: {
          recipientId: inquiryWithDetails.user.id,
          role: 'user',
          type: 'dismissed',
          homeKey: inquiryWithDetails.home.key,
          ownerKey: inquiryWithDetails.home.owner.key,
        },
      })
    } catch (error) {
      console.error('Failed to process dismiss notifications:', error)
    }
  }

  return { message: 'Inquiry dismissed' }
}

export async function rejectInquiryAfterMeeting(inquiryId: number, actorId: number, actorRole?: string | null) {
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

  const normalizedRole = (actorRole || 'user').toLowerCase()
  const isOwner = actorId === inquiry.home.ownerId || normalizedRole === 'broker' || normalizedRole === 'both'
  if (!isOwner) throw new InquiryManagementError('Only owners and brokers can reject inquiries', 403)

  const scheduledBooking = await prisma.booking.findFirst({
    where: { inquiryId: inquiry.id, status: 'scheduled' },
  })
  if (!scheduledBooking) throw new InquiryManagementError('Can only reject after a scheduled meeting', 400)

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { dismissed: true },
  })

  await prisma.notification.create({
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
}
