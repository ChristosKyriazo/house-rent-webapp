import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getStripe } from '@/lib/stripe'
import { attachChildBroker, hasTeamCapacity } from '@/lib/broker-hierarchy'
import { syncOwnerSeats } from '@/lib/team-billing'

// POST: the invitee accepts and joins the Main broker's team as a Default (child) broker.
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
      include: { inviter: { select: { id: true, subscriptionTier: true, brokerCategory: true } } },
    })
    if (!invitation) return notFound('Invitation not found')
    if (invitation.status !== 'pending') return badRequest('This invitation is no longer valid')
    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({ where: { id: invitation.id }, data: { status: 'expired' } })
      return badRequest('This invitation has expired')
    }
    if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
      return forbidden('This invitation was sent to a different email address')
    }
    if (user.id === invitation.inviterUserId) return badRequest('You cannot accept your own invitation')
    if (user.brokerCategory === 'parent') {
      return forbidden('You manage your own team; leave it before joining another')
    }
    if (user.brokerCategory === 'child' && user.parentBrokerId != null) {
      return forbidden('You are already part of a team')
    }
    if (!(await hasTeamCapacity(invitation.inviterUserId))) {
      return NextResponse.json({ error: 'team_full', message: 'This team is now full.' }, { status: 409 })
    }

    // The plan the Main broker assigned to this invite (not simply the parent's own tier).
    const assignedTier = invitation.tier ?? 'pro'

    // Cancel the invitee's own active Stripe subscription — the Main broker now pays.
    const activeTransaction = await prisma.transaction.findFirst({
      where: { userId: user.id, stripeSubscriptionId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { stripeSubscriptionId: true },
    })
    if (activeTransaction?.stripeSubscriptionId) {
      try {
        await getStripe().subscriptions.cancel(activeTransaction.stripeSubscriptionId)
      } catch (err) {
        log.error({ err }, 'Failed to cancel invitee subscription on team join (continuing)')
      }
    }

    await prisma.$transaction(async (tx) => {
      await attachChildBroker(user.id, invitation.inviterUserId, assignedTier, tx)
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', inviteeUserId: user.id, decidedAt: new Date() },
      })
    })

    // Add the new member's seat to the Main broker's per-seat subscription (best-effort).
    await syncOwnerSeats(invitation.inviterUserId)

    // Notify the Main broker.
    try {
      await prisma.notification.create({
        data: { recipientId: invitation.inviterUserId, role: 'broker', type: 'team_invite_accepted', userId: user.id },
      })
    } catch (err) {
      log.error({ err }, 'Failed to create accept notification')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ err: error }, 'Error accepting invitation')
    return serverError()
  }
}
