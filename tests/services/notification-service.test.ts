import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  notification: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
} as any

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws not-found when deleting a notification not owned by recipient', async () => {
    const { deleteNotificationForUser } = await import('@/lib/services/notification-service')
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 })

    await expect(deleteNotificationForUser(123, 88)).rejects.toMatchObject({
      status: 404,
      message: 'Notification not found',
    })
  })
})
