import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  badRequest,
  forbidden,
  notFound,
  parsePositiveInt,
  serverError,
  unauthorized,
} from '@/lib/api-utils'

// GET: Get inquiry details (for finalize modal)
export async function GET(
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

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parsedInquiryId },
      include: {
        home: {
          select: {
            id: true,
            key: true,
            title: true,
            street: true,
            city: true,
            country: true,
            pricePerMonth: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!inquiry) {
      return notFound('Inquiry not found')
    }

    // Verify user is authorized (must be either owner or the user who made the inquiry)
    if (user.id !== inquiry.home.owner.id && user.id !== inquiry.user.id) {
      return forbidden('Not authorized to view this inquiry')
    }

    return NextResponse.json({ inquiry }, { status: 200 })
  } catch (error) {
    console.error('Get inquiry error:', error)
    return serverError()
  }
}

// PATCH: Approve or dismiss an inquiry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ homeKey: string; inquiryId: string }> | { homeKey: string; inquiryId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    // Check if user is an owner (brokers are treated like owners)
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return forbidden('Only owners and brokers can manage inquiries')
    }

    const resolvedParams = await Promise.resolve(params)
    const { inquiryId } = resolvedParams
    const parsedInquiryId = parsePositiveInt(inquiryId)
    if (!parsedInquiryId) {
      return badRequest('Invalid inquiry ID')
    }

    const body = await request.json()
    const { action, contactInfo } = body // 'approve' or 'dismiss', and optional contactInfo

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
          },
        },
      },
    })

    if (!inquiry) {
      return notFound('Inquiry not found')
    }

    // Verify the home belongs to the user
    if (inquiry.home.ownerId !== user.id) {
      return forbidden('Not authorized to manage this inquiry')
    }

    // Get the inquiry user and home for notifications
    const inquiryWithDetails = await prisma.inquiry.findUnique({
      where: { id: inquiry.id },
      include: {
        user: {
          select: {
            id: true,
            key: true,
          },
        },
        home: {
          select: {
            key: true,
            owner: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    })

    if (action === 'approve') {
      // Mark as approved and store contact info
      const updateData: { approved: boolean; dismissed: boolean; contactInfo?: string } = {
        approved: true,
        dismissed: false // Ensure dismissed is false when approving
      }
      
      // Store contact info as JSON string if provided
      if (contactInfo) {
        updateData.contactInfo = JSON.stringify(contactInfo)
      }
      
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: updateData,
      })

      // Create notification for the user
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
      }

      // Delete inquiry notifications for the owner when inquiry is approved
      // This ensures the inquiry notification is automatically deleted when approved
      try {
        await prisma.notification.updateMany({
          where: {
            homeKey: inquiryWithDetails?.home.key,
            type: 'inquiry',
            recipientId: user.id,
            deleted: false, // Only delete if not already deleted
          },
          data: {
            deleted: true,
          },
        })
      } catch (error) {
        console.error('Failed to delete inquiry notifications:', error)
      }

      // Delete inquiry notifications for the user when inquiry is approved
      if (inquiryWithDetails) {
        try {
          await prisma.notification.updateMany({
            where: {
              homeKey: inquiryWithDetails.home.key,
              type: 'inquiry',
              recipientId: inquiryWithDetails.user.id,
              deleted: false,
            },
            data: {
              deleted: true,
            },
          })
        } catch (error) {
          console.error('Failed to delete user inquiry notifications:', error)
        }
      }

      return NextResponse.json(
        { message: 'Inquiry approved', approved: true },
        { status: 200 }
      )
    } else {
      // Dismiss - mark as dismissed instead of deleting
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: { 
          dismissed: true,
          approved: false // Ensure approved is false when dismissing
        },
      })

      // Delete inquiry notifications for the owner when inquiry is dismissed/rejected
      // This ensures the inquiry notification is automatically deleted when dismissed
      try {
        await prisma.notification.updateMany({
          where: {
            homeKey: inquiryWithDetails?.home.key,
            type: 'inquiry',
            recipientId: user.id,
            deleted: false, // Only delete if not already deleted
          },
          data: {
            deleted: true,
          },
        })
      } catch (error) {
        console.error('Failed to delete inquiry notifications:', error)
      }

      // Create notification for the user
      if (inquiryWithDetails) {
        try {
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
          console.error('Failed to create notification:', error)
        }
      }

      return NextResponse.json(
        { message: 'Inquiry dismissed' },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Manage inquiry error:', error)
    return serverError()
  }
}
