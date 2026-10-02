import { prisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = Prisma.TransactionClient | PrismaClient

export class NotificationServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'NotificationServiceError'
    this.status = status
  }
}

interface CreateNotificationInput {
  recipientId: number
  role: string
  type: string
  homeKey?: string | null
  userId?: number | null
  ownerKey?: string | null
  inquiryId?: number | null
}

export async function deleteNotificationForUser(notificationId: number, recipientId: number) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId },
    data: { deleted: true },
  })

  if (updated.count === 0) {
    throw new NotificationServiceError('Notification not found', 404)
  }
}

export async function markAllNotificationsAsViewed(recipientId: number) {
  await prisma.notification.updateMany({
    where: { recipientId, viewed: false, deleted: false },
    data: { viewed: true },
  })
}

/**
 * Single entry point for writing a Notification.
 *
 * Pass `tx` when creating inside a `prisma.$transaction` so the notification commits or rolls
 * back with the rest of the work — without it this helper could not be used from the inquiry
 * and finalization services, which is why it previously sat unused.
 */
export async function createNotification(input: CreateNotificationInput, tx: Tx = prisma) {
  return tx.notification.create({
    data: {
      recipientId: input.recipientId,
      role: input.role,
      type: input.type,
      homeKey: input.homeKey ?? null,
      userId: input.userId ?? null,
      ownerKey: input.ownerKey ?? null,
      inquiryId: input.inquiryId ?? null,
    },
  })
}
