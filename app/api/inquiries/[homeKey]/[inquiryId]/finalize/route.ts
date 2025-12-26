import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST: Initiate finalization (send notification to other party)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string; inquiryId: string }> | { homeKey: string; inquiryId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { homeKey, inquiryId } = resolvedParams

    // Find the inquiry
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parseInt(inquiryId) },
      include: {
        home: {
          select: {
            id: true,
            key: true,
            title: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                key: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            key: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Check if inquiry is approved
    if (!inquiry.approved) {
      return NextResponse.json(
        { error: 'Inquiry must be approved before finalization' },
        { status: 400 }
      )
    }

    // Check if already finalized
    if (inquiry.finalized) {
      return NextResponse.json(
        { error: 'Inquiry already finalized' },
        { status: 400 }
      )
    }

    // Determine recipient: if user is owner, notify user; if user is the inquirer, notify owner
    let recipientId: number
    let recipientRole: string
    let senderName: string

    if (user.id === inquiry.home.ownerId) {
      // Owner is initiating - notify the user
      recipientId = inquiry.user.id
      recipientRole = 'user'
      senderName = inquiry.home.owner.name || inquiry.home.owner.email.split('@')[0]
    } else if (user.id === inquiry.userId) {
      // User is initiating - notify the owner
      recipientId = inquiry.home.ownerId
      recipientRole = 'owner'
      senderName = inquiry.user.name || inquiry.user.email.split('@')[0]
    } else {
      return NextResponse.json(
        { error: 'Not authorized to finalize this inquiry' },
        { status: 403 }
      )
    }

    // Create notification for the other party
    await prisma.notification.create({
      data: {
        recipientId: recipientId,
        role: recipientRole,
        type: 'finalize',
        homeKey: inquiry.home.key,
        userId: inquiry.userId,
        ownerKey: inquiry.home.owner.key,
        inquiryId: inquiry.id,
      },
    })

    return NextResponse.json(
      { message: 'Finalization request sent', notificationCreated: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Finalize inquiry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Approve or dismiss finalization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string; inquiryId: string }> | { homeKey: string; inquiryId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const { homeKey, inquiryId } = resolvedParams

    const body = await request.json()
    const { action } = body // 'approve' or 'dismiss'

    if (!action || (action !== 'approve' && action !== 'dismiss')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "dismiss"' },
        { status: 400 }
      )
    }

    // Find the inquiry
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parseInt(inquiryId) },
      include: {
        home: {
          select: {
            id: true,
            key: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Verify user is authorized (must be either owner or the user who made the inquiry)
    if (user.id !== inquiry.home.ownerId && user.id !== inquiry.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to manage this finalization' },
        { status: 403 }
      )
    }

    if (action === 'approve') {
      // Finalize the inquiry
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: {
          finalized: true,
          finalizedBy: user.id,
        },
      })

      // Mark home as finalized
      await prisma.home.update({
        where: { id: inquiry.home.id },
        data: {
          finalized: true,
        },
      })

      // Delete the finalize notification
      await prisma.notification.updateMany({
        where: {
          inquiryId: inquiry.id,
          type: 'finalize',
          recipientId: user.id,
        },
        data: {
          deleted: true,
        },
      })

      return NextResponse.json(
        { message: 'Deal finalized', finalized: true },
        { status: 200 }
      )
    } else {
      // Dismiss finalization - just delete the notification
      await prisma.notification.updateMany({
        where: {
          inquiryId: inquiry.id,
          type: 'finalize',
          recipientId: user.id,
        },
        data: {
          deleted: true,
        },
      })

      return NextResponse.json(
        { message: 'Finalization dismissed', dismissed: true },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Manage finalization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

