import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { detachChildBroker } from '@/lib/broker-hierarchy'
import { createNotification } from '@/lib/services/notification-service'

// POST: a Default (child) broker leaves their team. Their listings transfer to the Main broker.
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    if (user.brokerCategory !== 'child' || user.parentBrokerId == null) {
      return badRequest('You are not part of a team')
    }
    const parentId = user.parentBrokerId

    await detachChildBroker(user.id)

    try {
      await createNotification({ recipientId: parentId, role: 'broker', type: 'team_left', userId: user.id })
    } catch (err) {
      log.error({ err }, 'Failed to create leave notification')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error leaving team')
    return serverError()
  }
}
