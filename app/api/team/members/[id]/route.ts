import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { detachChildBroker } from '@/lib/broker-hierarchy'
import { syncOwnerSeats } from '@/lib/team-billing'
import { TIER_RANK, enforceTierListingLimits } from '@/lib/subscription'

const VALID_TIERS = ['free', 'plus', 'pro'] as const
type Tier = (typeof VALID_TIERS)[number]

// PATCH: a Main broker changes a Default (child) broker's plan. The member's tier is set directly
// (owner-initiated — no request/approval), their listings are reconciled to the new limits, and the
// owner's per-seat subscription is adjusted.
export async function PATCH(
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

    let body: { tier?: string }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON')
    }
    const tier = body.tier as Tier
    if (!tier || !VALID_TIERS.includes(tier)) {
      return badRequest(`tier must be one of: ${VALID_TIERS.join(', ')}`)
    }
    if ((TIER_RANK[tier] ?? 0) > (TIER_RANK[user.subscriptionTier ?? 'free'] ?? 0)) {
      return badRequest("A member's plan cannot exceed your own plan")
    }

    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { parentBrokerId: true, brokerCategory: true, subscriptionTier: true },
    })
    if (!child || child.brokerCategory !== 'child') return notFound('Team member not found')
    if (child.parentBrokerId !== user.id) return forbidden('This broker is not on your team')

    if (child.subscriptionTier !== tier) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: childId }, data: { subscriptionTier: tier } })
        await enforceTierListingLimits(tx, childId, tier)
      })

      // Reconcile the owner's per-seat billing (best-effort) and notify the member.
      await syncOwnerSeats(user.id)
      try {
        await prisma.notification.create({
          data: { recipientId: childId, role: 'broker', type: 'team_tier_changed', userId: user.id },
        })
      } catch (err) {
        log.error({ err }, 'Failed to create tier-change notification')
      }
    }

    return NextResponse.json({ ok: true, tier })
  } catch (error) {
    log.error({ err: error }, 'Error changing team member plan')
    return serverError()
  }
}

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

    // Drop the freed seat from the Main broker's per-seat subscription (best-effort).
    await syncOwnerSeats(user.id)

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
