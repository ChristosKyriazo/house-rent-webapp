import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { revertParentIfEmpty } from '@/lib/broker-hierarchy'

// DELETE: a Main broker revokes a pending invitation they sent.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> | { key: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { key } = await params
    const invitation = await prisma.teamInvitation.findUnique({
      where: { key },
      select: { id: true, inviterUserId: true, status: true },
    })
    if (!invitation) return notFound('Invitation not found')
    if (invitation.inviterUserId !== user.id) return forbidden('Not your invitation')

    if (invitation.status === 'pending') {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'revoked', decidedAt: new Date() },
      })
      // Revoking the last outstanding invite (with no children) drops the lead back to standalone.
      await revertParentIfEmpty(user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error revoking team invitation')
    return serverError()
  }
}
