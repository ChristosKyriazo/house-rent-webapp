import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get notifications for the current user (excluding deleted ones)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all non-deleted notifications for this user
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        deleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get home titles for notifications that have homeKey
    const homeKeys = notifications
      .filter(n => n.homeKey)
      .map(n => n.homeKey!)
      .filter((key, index, self) => self.indexOf(key) === index) // Unique keys

    const homes = homeKeys.length > 0 
      ? await prisma.home.findMany({
          where: { key: { in: homeKeys } },
          select: { key: true, title: true },
        })
      : []

    const homeMap = new Map(homes.map(h => [h.key, h.title]))

    // Get user information for owner notifications (inquiry type) and finalize notifications
    const userIds = notifications
      .filter(n => (n.type === 'inquiry' || n.type === 'finalize') && n.userId)
      .map(n => n.userId!)
      .filter((id, index, self) => self.indexOf(id) === index) // Unique IDs

    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []

    const userMap = new Map(users.map(u => [u.id, u]))

    // Get inquiries for finalize notifications to get sender info
    const inquiryIds = notifications
      .filter(n => n.type === 'finalize' && n.inquiryId)
      .map(n => n.inquiryId!)
      .filter((id, index, self) => self.indexOf(id) === index)

    const inquiries = inquiryIds.length > 0
      ? await prisma.inquiry.findMany({
          where: { id: { in: inquiryIds } },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            home: {
              select: {
                owner: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        })
      : []

    const inquiryMap = new Map(inquiries.map(i => [i.id, i]))

    // Format notifications for response
    const formattedNotifications = notifications.map(notif => {
      const homeTitle = notif.homeKey ? homeMap.get(notif.homeKey) : null
      
      let message = ''
      if (notif.type === 'inquiry') {
        // For owners: show who inquired
        if (notif.userId) {
          const inquiryUser = userMap.get(notif.userId)
          const userName = inquiryUser?.name || inquiryUser?.email.split('@')[0] || 'A user'
          message = `${userName} has inquired for ${homeTitle || 'your property'}`
        } else {
          message = `New inquiry for ${homeTitle || 'your property'}`
        }
      } else if (notif.type === 'approved') {
        // For users: show their inquiry was approved
        message = `Your inquiry for ${homeTitle || 'the property'} has been approved`
      } else if (notif.type === 'dismissed') {
        // For users: show their inquiry was dismissed
        message = `Your inquiry for ${homeTitle || 'the property'} has been dismissed`
      } else if (notif.type === 'finalize') {
        // For finalize: show who wants to finalize
        if (notif.inquiryId) {
          const inquiry = inquiryMap.get(notif.inquiryId)
          if (inquiry) {
            // Determine sender: if recipient is owner, sender is user; if recipient is user, sender is owner
            const sender = notif.role === 'owner' ? inquiry.user : inquiry.home.owner
            const senderName = sender.name || sender.email.split('@')[0] || 'Someone'
            message = `${senderName} wants to finalize the deal for ${homeTitle || 'the property'}`
          } else {
            message = `Someone wants to finalize the deal for ${homeTitle || 'the property'}`
          }
        } else {
          message = `Finalization request for ${homeTitle || 'the property'}`
        }
      }

      return {
        id: notif.id,
        type: notif.type,
        message: message,
        homeKey: notif.homeKey || '',
        inquiryId: notif.inquiryId || null,
        createdAt: notif.createdAt,
      }
    })

    return NextResponse.json({ notifications: formattedNotifications, count: formattedNotifications.length }, { status: 200 })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Mark a notification as deleted
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    // Mark notification as deleted (don't actually delete it)
    await prisma.notification.update({
      where: {
        id: parseInt(notificationId),
        recipientId: user.id, // Ensure user can only delete their own notifications
      },
      data: {
        deleted: true,
      },
    })

    return NextResponse.json({ message: 'Notification deleted' }, { status: 200 })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a notification (called when inquiries are created/approved/dismissed)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipientId, role, type, homeKey, userId, ownerKey } = body

    if (!recipientId || !role || !type) {
      return NextResponse.json(
        { error: 'recipientId, role, and type are required' },
        { status: 400 }
      )
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        recipientId: parseInt(recipientId),
        role: role,
        type: type,
        homeKey: homeKey || null,
        userId: userId ? parseInt(userId) : null,
        ownerKey: ownerKey || null,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
