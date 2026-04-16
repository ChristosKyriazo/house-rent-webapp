import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  badRequest,
  notFound,
  parsePositiveInt,
  serverError,
  unauthorized,
} from '@/lib/api-utils'

// GET: Get all inquiries for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const inquiries = await prisma.inquiry.findMany({
      where: { userId: user.id },
      select: { 
        id: true,
        homeId: true,
        approved: true,
        dismissed: true,
        finalized: true,
      },
    })

    // Return inquiry status and IDs for each home
    const inquiryStatus: Record<number, 'inquired' | 'approved' | 'dismissed'> = {}
    const inquiryIds: Record<number, number> = {}
    const finalizedHomes: Record<number, boolean> = {}
    
    inquiries.forEach(inq => {
      inquiryIds[inq.homeId] = inq.id
      finalizedHomes[inq.homeId] = inq.finalized || false
      if (inq.approved) {
        inquiryStatus[inq.homeId] = 'approved'
      } else if (inq.dismissed) {
        inquiryStatus[inq.homeId] = 'dismissed'
      } else {
        inquiryStatus[inq.homeId] = 'inquired'
      }
    })

    return NextResponse.json({ inquiryStatus, inquiryIds, finalizedHomes }, { status: 200 })
  } catch (error) {
    console.error('Get inquiries error:', error)
    return serverError()
  }
}

// POST: Create an inquiry
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const parsedHomeId = parsePositiveInt(body?.homeId)

    if (!parsedHomeId) {
      return badRequest('Home ID is required')
    }

    // Check if inquiry already exists
    const existing = await prisma.inquiry.findFirst({
      where: {
        userId: user.id,
        homeId: parsedHomeId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Inquiry already exists' },
        { status: 400 }
      )
    }

    // Get the home to find the owner
    const home = await prisma.home.findUnique({
      where: { id: parsedHomeId },
      include: {
        owner: {
          select: {
            id: true,
            key: true,
          },
        },
      },
    })

    if (!home) {
      return notFound('Home not found')
    }

    if (home.owner.id === user.id) {
      return badRequest('Owners cannot create inquiries on their own properties')
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        userId: user.id,
        homeId: parsedHomeId,
      },
    })

    // Create notification for the owner
    try {
      await prisma.notification.create({
        data: {
          recipientId: home.owner.id,
          role: 'owner',
          type: 'inquiry',
          homeKey: home.key,
          userId: user.id,
        },
      })
    } catch (error) {
      console.error('Failed to create notification:', error)
      // Don't fail the inquiry creation if notification fails
    }

    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (error: any) {
    console.error('Create inquiry error:', error)
    
    // Handle Prisma unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Inquiry already exists' },
        { status: 400 }
      )
    }
    return serverError()
  }
}

// DELETE: Remove an inquiry
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorized()
    }

    const searchParams = request.nextUrl.searchParams
    const homeId = parsePositiveInt(searchParams.get('homeId'))

    if (!homeId) {
      return badRequest('Home ID is required')
    }

    // Get the home to find the owner and homeKey for notification deletion
    const home = await prisma.home.findUnique({
      where: { id: homeId },
      select: {
        id: true,
        key: true,
        ownerId: true,
      },
    })

    if (!home) {
      return notFound('Home not found')
    }

    // Delete the inquiry
    await prisma.inquiry.deleteMany({
      where: {
        userId: user.id,
        homeId: homeId,
      },
    })

    // Delete the owner's notification for this inquiry
    try {
      await prisma.notification.updateMany({
        where: {
          recipientId: home.ownerId,
          type: 'inquiry',
          homeKey: home.key,
          userId: user.id,
          deleted: false,
        },
        data: {
          deleted: true,
        },
      })
    } catch (error) {
      console.error('Failed to delete inquiry notification:', error)
      // Don't fail the inquiry deletion if notification deletion fails
    }

    return NextResponse.json({ message: 'Inquiry removed' }, { status: 200 })
  } catch (error) {
    console.error('Delete inquiry error:', error)
    return serverError()
  }
}

