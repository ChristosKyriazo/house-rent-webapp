import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { revertParentIfEmpty } from '@/lib/broker-hierarchy'

// POST: the invitee declines the invitation.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { token } = await params
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      select: { id: true, status: true, inviteeEmail: true, inviterUserId: true },
    })
    if (!invitation) return notFound('Invitation not found')
    if (invitation.status !== 'pending') return badRequest('This invitation is no longer valid')

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'declined', inviteeUserId: user.id, decidedAt: new Date() },
    })

    // If this was the lead's last outstanding invite and they have no children, revert to standalone.
    await revertParentIfEmpty(invitation.inviterUserId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error declining invitation')
    return serverError()
  }
}
