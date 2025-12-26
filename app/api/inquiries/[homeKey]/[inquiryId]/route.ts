import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Get inquiry details (for finalize modal)
export async function GET(
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

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: parseInt(inquiryId) },
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
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Verify user is authorized (must be either owner or the user who made the inquiry)
    if (user.id !== inquiry.home.owner.id && user.id !== inquiry.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this inquiry' },
        { status: 403 }
      )
    }

    return NextResponse.json({ inquiry }, { status: 200 })
  } catch (error) {
    console.error('Get inquiry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an owner
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both') {
      return NextResponse.json(
        { error: 'Only owners can manage inquiries' },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const { homeKey, inquiryId } = resolvedParams

    const body = await request.json()
    const { action, contactInfo } = body // 'approve' or 'dismiss', and optional contactInfo

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
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Verify the home belongs to the user
    if (inquiry.home.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to manage this inquiry' },
        { status: 403 }
      )
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
      const updateData: any = { 
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
