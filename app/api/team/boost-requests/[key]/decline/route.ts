import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { createNotification } from '@/lib/services/notification-service'

// POST: a Main broker declines a boost request.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> | { key: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { key } = await params
    let body: { reason?: string } = {}
    try {
      body = await request.json()
    } catch { /* reason is optional */ }

    const boostRequest = await prisma.boostRequest.findUnique({
      where: { key },
      select: { id: true, approverId: true, requesterId: true, status: true, home: { select: { key: true } } },
    })
    if (!boostRequest) return notFound('Boost request not found')
    if (boostRequest.approverId !== user.id) return forbidden('This request is not addressed to you')
    if (boostRequest.status !== 'pending') return badRequest('This request has already been decided')

    await prisma.boostRequest.update({
      where: { id: boostRequest.id },
      data: { status: 'rejected', decisionNote: body.reason?.trim() || null, decidedAt: new Date() },
    })

    try {
      await createNotification({ recipientId: boostRequest.requesterId, role: 'broker', type: 'boost_declined', homeKey: boostRequest.home.key, userId: user.id })
    } catch (err) {
      log.error({ err }, 'Failed to create boost_declined notification')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error declining boost request')
    return serverError()
  }
}
