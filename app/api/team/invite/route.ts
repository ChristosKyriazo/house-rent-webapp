import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import {
  INVITE_TTL_DAYS,
  TEAM_REQUIRED_TIER,
  hasTeamCapacity,
  promoteToParent,
} from '@/lib/broker-hierarchy'
import { TIER_RANK } from '@/lib/subscription'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_TIERS = ['free', 'plus', 'pro'] as const
type Tier = (typeof VALID_TIERS)[number]

// POST: a Main broker (Pro) invites another broker to join their team as a Default (child) broker.
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    if (user.role !== 'broker') {
      return forbidden('Only brokers can build a team')
    }
    if ((user.subscriptionTier ?? 'free') !== TEAM_REQUIRED_TIER) {
      return NextResponse.json(
        { error: 'subscription_required', requiredTier: TEAM_REQUIRED_TIER, message: 'A Pro subscription is required to invite brokers.' },
        { status: 402 }
      )
    }
    if (user.brokerCategory === 'child') {
      return forbidden('A broker who is part of a team cannot invite others')
    }

    let body: { email?: string; message?: string; tier?: string }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON')
    }

    const email = (body.email ?? '').trim().toLowerCase()
    const message = body.message?.trim() || null
    if (!email || !EMAIL_RE.test(email)) return badRequest('A valid email is required')
    if (email === user.email.toLowerCase()) return badRequest('You cannot invite yourself')

    // The plan the Main broker is assigning this invitee. Defaults to Pro (prior behaviour) and can
    // never exceed the owner's own tier.
    const tier = (body.tier ?? 'pro') as Tier
    if (!VALID_TIERS.includes(tier)) return badRequest(`tier must be one of: ${VALID_TIERS.join(', ')}`)
    if ((TIER_RANK[tier] ?? 0) > (TIER_RANK[user.subscriptionTier ?? 'free'] ?? 0)) {
      return badRequest("A member's plan cannot exceed your own plan")
    }

    if (!(await hasTeamCapacity(user.id))) {
      return NextResponse.json(
        { error: 'team_full', message: 'Your team is full (including pending invites).' },
        { status: 409 }
      )
    }

    // Reject if the target already belongs to a team or leads one.
    const invitee = await prisma.user.findUnique({
      where: { email },
      select: { id: true, brokerCategory: true, parentBrokerId: true },
    })
    if (invitee?.brokerCategory === 'child' && invitee.parentBrokerId != null) {
      return NextResponse.json({ error: 'already_in_team', message: 'This broker is already part of a team.' }, { status: 409 })
    }
    if (invitee?.brokerCategory === 'parent') {
      return NextResponse.json({ error: 'is_team_lead', message: "This broker manages their own team and can't join yours." }, { status: 409 })
    }

    // One pending invite per email from this inviter.
    const existing = await prisma.teamInvitation.findFirst({
      where: { inviterUserId: user.id, inviteeEmail: email, status: 'pending' },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'already_invited', message: 'You already have a pending invite for this email.' }, { status: 409 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

    const invitation = await prisma.$transaction(async (tx) => {
      // Flip to a Main (parent) broker on the first invite sent, so the My Team surface appears immediately.
      await promoteToParent(user.id, tx)
      return tx.teamInvitation.create({
        data: {
          inviterUserId: user.id,
          inviteeEmail: email,
          inviteeUserId: invitee?.id ?? null,
          token,
          message,
          tier,
          expiresAt,
        },
        select: { key: true, inviteeEmail: true, status: true, tier: true, createdAt: true, expiresAt: true },
      })
    })

    // If the invitee already has an account, drop them an in-app notification.
    if (invitee?.id) {
      try {
        await prisma.notification.create({
          data: { recipientId: invitee.id, role: 'broker', type: 'team_invite', userId: user.id },
        })
      } catch (err) {
        log.error({ err }, 'Failed to create team invite notification')
      }
    }

    const origin = request.headers.get('origin') ?? 'https://dev.kaparro.com'
    return NextResponse.json(
      { invitation, inviteUrl: `${origin}/join-team?token=${token}` },
      { status: 201 }
    )
  } catch (error) {
    log.error({ err: error }, 'Error creating team invitation')
    return serverError()
  }
}
