import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST: Reject inquiry (owner/broker only, after scheduled meeting)
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

    // Verify user is the owner/broker
    const userRole = (user.role || 'user').toLowerCase()
    const isOwner = user.id === inquiry.home.ownerId || userRole === 'broker' || userRole === 'both'
    
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only owners and brokers can reject inquiries' },
        { status: 403 }
      )
    }

    // Check if there's a scheduled booking for this inquiry
    const scheduledBooking = await prisma.booking.findFirst({
      where: {
        inquiryId: inquiry.id,
        status: 'scheduled',
      },
    })

    if (!scheduledBooking) {
      return NextResponse.json(
        { error: 'Can only reject after a scheduled meeting' },
        { status: 400 }
      )
    }

    // Mark inquiry as dismissed (rejected)
    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: {
        dismissed: true,
      },
    })

    // Create a "rejected" notification for the user
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

    return NextResponse.json(
      { message: 'Inquiry rejected and user notified' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reject inquiry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


