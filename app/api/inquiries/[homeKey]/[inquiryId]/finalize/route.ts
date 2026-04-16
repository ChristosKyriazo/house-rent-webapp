import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'
import {
  InquiryFinalizationError,
  initiateFinalization,
  respondToFinalization,
} from '@/lib/services/inquiry-finalization-service'

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

    await initiateFinalization(parsedInquiryId, user.id, user.role)

    return NextResponse.json(
      { message: 'Finalization request sent', notificationCreated: true },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof InquiryFinalizationError) {
      if (error.status === 400) return badRequest(error.message)
      if (error.status === 403) return forbidden(error.message)
      if (error.status === 404) return notFound(error.message)
    }
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

    const result = await respondToFinalization(parsedInquiryId, user.id, action)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof InquiryFinalizationError) {
      if (error.status === 400) return badRequest(error.message)
      if (error.status === 403) return forbidden(error.message)
      if (error.status === 404) return notFound(error.message)
    }
    console.error('Manage finalization error:', error)
    return serverError()
  }
}




