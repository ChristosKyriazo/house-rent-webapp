import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    if (action === 'approve') {
      // Mark as approved
      await prisma.inquiry.update({
        where: { id: inquiry.id },
        data: { approved: true },
      })
      return NextResponse.json(
        { message: 'Inquiry approved', approved: true },
        { status: 200 }
      )
    } else {
      // Dismiss - delete the inquiry
      await prisma.inquiry.delete({
        where: { id: inquiry.id },
      })
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

