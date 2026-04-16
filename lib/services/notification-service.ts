import { prisma } from '@/lib/prisma'

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

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      role: input.role,
      type: input.type,
      homeKey: input.homeKey || null,
      userId: input.userId || null,
      ownerKey: input.ownerKey || null,
    },
  })
}
