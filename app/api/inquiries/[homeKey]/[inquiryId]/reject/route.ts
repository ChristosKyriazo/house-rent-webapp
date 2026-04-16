import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, parsePositiveInt, serverError, unauthorized } from '@/lib/api-utils'
import {
  InquiryManagementError,
  rejectInquiryAfterMeeting,
} from '@/lib/services/inquiry-management-service'

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

    await rejectInquiryAfterMeeting(parsedInquiryId, user.id, user.role)

    return NextResponse.json(
      { message: 'Inquiry rejected and user notified' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof InquiryManagementError) {
      if (error.status === 400) return badRequest(error.message)
      if (error.status === 403) return forbidden(error.message)
      if (error.status === 404) return notFound(error.message)
    }
    console.error('Reject inquiry error:', error)
    return serverError()
  }
}


