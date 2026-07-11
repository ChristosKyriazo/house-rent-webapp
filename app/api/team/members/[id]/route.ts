import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { detachChildBroker } from '@/lib/broker-hierarchy'

// DELETE: a Main broker removes a Default (child) broker from their team.
// The child's listings transfer to the Main broker (see detachChildBroker).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params
    const childId = parseInt(id, 10)
    if (!Number.isInteger(childId)) return badRequest('Invalid member id')

    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { parentBrokerId: true, brokerCategory: true },
    })
    if (!child || child.brokerCategory !== 'child') return notFound('Team member not found')
    if (child.parentBrokerId !== user.id) return forbidden('This broker is not on your team')

    await detachChildBroker(childId)

    // Notify the removed broker.
    try {
      await prisma.notification.create({
        data: { recipientId: childId, role: 'broker', type: 'team_removed', userId: user.id },
      })
    } catch (err) {
      log.error({ err }, 'Failed to create removal notification')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error removing team member')
    return serverError()
  }
}
