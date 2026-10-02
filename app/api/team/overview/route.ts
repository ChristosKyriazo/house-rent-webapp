import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { forbidden, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getBrokerScore } from '@/lib/ratings'
import type { AgencyOverviewResponse, InvitationStatus, TeamMember } from '@/types/team'

// GET: aggregate agency overview for a Main broker — the lead plus all Default (child) brokers,
// each with listing counts, ratings, and pending boost-request counts, plus team-wide KPIs.
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'broker' || user.brokerCategory === 'child') {
      return forbidden('You do not lead a team')
    }
    // A Pro standalone broker can access the agency surface to send their first invite;
    // they become a "parent" once that invite is sent.
    if (user.brokerCategory !== 'parent' && (user.subscriptionTier ?? 'free') !== 'pro') {
      return forbidden('Upgrade to Pro to build a team')
    }

    const children = await prisma.user.findMany({
      where: { parentBrokerId: user.id, brokerCategory: 'child' },
      select: { id: true, key: true, name: true, email: true, subscriptionTier: true },
      orderBy: { createdAt: 'asc' },
    })

    // Lead is always the first member (color slot 0).
    const roster = [
      { id: user.id, key: user.key, name: user.name, email: user.email, subscriptionTier: user.subscriptionTier, isLead: true },
      ...children.map((c) => ({ ...c, isLead: false })),
    ]
    const memberIds = roster.map((m) => m.id)

    const now = new Date()
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [listingCounts, boostCounts, brokerScores, activeBoosts, viewingsThisWeek] = await Promise.all([
      prisma.home.groupBy({ by: ['ownerId'], where: { ownerId: { in: memberIds } }, _count: { _all: true } }),
      prisma.boostRequest.groupBy({
        by: ['requesterId'],
        where: { requesterId: { in: memberIds }, status: 'pending' },
        _count: { _all: true },
      }),
      Promise.all(roster.map((m) => getBrokerScore(m.id))),
      prisma.home.count({
        where: { ownerId: { in: memberIds }, promotedUntil: { gt: now } },
      }),
      prisma.booking.count({
        where: { ownerId: { in: memberIds }, status: 'scheduled', startTime: { gte: now, lte: weekAhead } },
      }),
    ])

    const listingMap = new Map(listingCounts.map((r) => [r.ownerId, r._count._all]))
    const boostMap = new Map(boostCounts.map((r) => [r.requesterId, r._count._all]))

    const members: TeamMember[] = roster.map((m, i) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      email: m.email,
      tier: ((m.subscriptionTier ?? 'free') as TeamMember['tier']),
      listingCount: listingMap.get(m.id) ?? 0,
      avgRating: brokerScores[i].score,
      ratingCount: brokerScores[i].count,
      pendingBoostRequests: boostMap.get(m.id) ?? 0,
      isLead: m.isLead,
      colorSlot: i,
    }))

    const totalListings = members.reduce((sum, m) => sum + m.listingCount, 0)
    const ratedMembers = members.filter((m) => m.avgRating != null)
    const avgRating = ratedMembers.length
      ? Number((ratedMembers.reduce((s, m) => s + (m.avgRating ?? 0), 0) / ratedMembers.length).toFixed(1))
      : null

    const invitations = await prisma.teamInvitation.findMany({
      where: { inviterUserId: user.id, status: 'pending' },
      select: { id: true, key: true, inviteeEmail: true, status: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })

    const response: AgencyOverviewResponse = {
      summary: {
        agencyName: user.name,
        memberCount: members.length,
        totalListings,
        activeBoosts,
        viewingsThisWeek,
        avgRating,
      },
      members,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        key: inv.key,
        inviteeEmail: inv.inviteeEmail,
        status: inv.status as InvitationStatus,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error({ err: error }, 'Error building agency overview')
    return serverError()
  }
}
