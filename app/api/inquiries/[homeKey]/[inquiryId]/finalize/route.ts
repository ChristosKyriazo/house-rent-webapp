import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'

// POST: Initiate finalization (send notification to other party)
export async function POST(
  request: NextRequest,
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

    // Check if inquiry is approved
    if (!inquiry.approved) {
      return badRequest('Inquiry must be approved before finalization')
    }

    // Check if already finalized
    if (inquiry.finalized) {
      return badRequest('Inquiry already finalized')
    }

    // Only owners/brokers can initiate finalization
    const userRole = (user.role || 'user').toLowerCase()
    const isOwner = user.id === inquiry.home.ownerId || userRole === 'broker' || userRole === 'both'
    
    if (!isOwner) {
      return forbidden('Only owners and brokers can initiate finalization')
    }

    // Check if there's a scheduled booking for this inquiry
    const scheduledBooking = await prisma.booking.findFirst({
      where: {
        inquiryId: inquiry.id,
        status: 'scheduled',
      },
    })

    if (!scheduledBooking) {
      return badRequest('Can only finalize after a scheduled meeting')
    }

    // Owner is initiating - notify the user for approval
    const recipientId = inquiry.user.id
    const recipientRole = 'user'

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
    return serverError()
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
      return unauthorized()
    }

    const resolvedParams = await Promise.resolve(params)
    const { inquiryId } = resolvedParams
    const parsedInquiryId = parsePositiveInt(inquiryId)
    if (!parsedInquiryId) {
      return badRequest('Invalid inquiry ID')
    }

    const body = await request.json()
    const { action } = body // 'approve' or 'dismiss'

    if (!action || (action !== 'approve' && action !== 'dismiss')) {
      return badRequest('Invalid action. Must be "approve" or "dismiss"')
    }

    // Find the inquiry
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parsedInquiryId },
      include: {
        home: {
          select: {
            id: true,
            key: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                key: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            key: true,
          },
        },
      },
    })

    if (!inquiry) {
      return notFound('Inquiry not found')
    }

    // Verify user is authorized (must be either owner or the user who made the inquiry)
    if (user.id !== inquiry.home.ownerId && user.id !== inquiry.user.id) {
      return forbidden('Not authorized to manage this finalization')
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

      // Delete approval notifications for the user when finalized
      // This ensures the approval notification is automatically deleted when house is finalized
      try {
        await prisma.notification.updateMany({
          where: {
            homeKey: inquiry.home.key,
            type: 'approved',
            recipientId: inquiry.user.id,
            deleted: false, // Only delete if not already deleted
          },
          data: {
            deleted: true,
          },
        })
      } catch (error) {
        console.error('Failed to delete approval notifications:', error)
      }

      // Create rating prompt notifications for both parties
      // Check if they've already rated each other for this finalized inquiry
      try {
        // Check if user has already rated the owner
        const userRating = await prisma.rating.findFirst({
          where: {
            raterId: inquiry.user.id,
            ratedUserId: inquiry.home.ownerId,
            type: 'owner',
          },
        })

        // Check if owner has already rated the user
        const ownerRating = await prisma.rating.findFirst({
          where: {
            raterId: inquiry.home.ownerId,
            ratedUserId: inquiry.user.id,
            type: 'renter',
          },
        })

        // Create rating notification for user (to rate owner) if not already rated
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

        // Create rating notification for owner (to rate user) if not already rated
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
        // Don't fail the finalization if rating notification creation fails
      }

      return NextResponse.json(
        { message: 'Deal finalized', finalized: true },
        { status: 200 }
      )
    } else {
      // Dismiss finalization (reject) - mark inquiry as dismissed and hide the home from the user
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: {
          dismissed: true,
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
      
      // Create a rejected notification for the user
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

      return NextResponse.json(
        { message: 'Finalization dismissed', dismissed: true },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Manage finalization error:', error)
    return serverError()
  }
}




