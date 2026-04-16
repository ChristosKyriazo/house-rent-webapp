import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'

// POST: Reject inquiry (owner/broker only, after scheduled meeting)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ homeKey: string; inquiryId: string }> | { homeKey: string; inquiryId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const resolvedParams = await Promise.resolve(params)
    const { inquiryId } = resolvedParams
    const parsedInquiryId = parsePositiveInt(inquiryId)
    if (!parsedInquiryId) {
      return badRequest('Invalid inquiry ID')
    }

    // Find the inquiry
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parsedInquiryId },
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
      return notFound('Inquiry not found')
    }

    // Verify user is the owner/broker
    const userRole = (user.role || 'user').toLowerCase()
    const isOwner = user.id === inquiry.home.ownerId || userRole === 'broker' || userRole === 'both'
    
    if (!isOwner) {
      return forbidden('Only owners and brokers can reject inquiries')
    }

    // Check if there's a scheduled booking for this inquiry
    const scheduledBooking = await prisma.booking.findFirst({
      where: {
        inquiryId: inquiry.id,
        status: 'scheduled',
      },
    })

    if (!scheduledBooking) {
      return badRequest('Can only reject after a scheduled meeting')
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
    return serverError()
  }
}


