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
import {
  InquiryManagementError,
  manageInquiryApproval,
} from '@/lib/services/inquiry-management-service'

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

    const result = await manageInquiryApproval({
      inquiryId: parsedInquiryId,
      actorId: user.id,
      actorRole: user.role,
      action,
      contactInfo,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof InquiryManagementError) {
      if (error.status === 400) return badRequest(error.message)
      if (error.status === 403) return forbidden(error.message)
      if (error.status === 404) return notFound(error.message)
    }
    console.error('Manage inquiry error:', error)
    return serverError()
  }
}
