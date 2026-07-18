import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { BOOST_AMOUNT_CENTS, BOOST_DAYS, isChildBroker, isMainBroker } from '@/lib/broker-hierarchy'
import type { BoostRequestStatus, BoostRequestView } from '@/types/team'
import { createNotification } from '@/lib/services/notification-service'

// GET: list boost requests. A Main broker sees all their team's requests; a child sees their own.
export async function GET(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const where = isMainBroker(user)
      ? { approverId: user.id }
      : { requesterId: user.id }

    const rows = await prisma.boostRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        key: true, id: true, status: true, proactive: true, amountCents: true, days: true,
        note: true, decisionNote: true, createdAt: true, decidedAt: true,
        home: { select: { key: true, title: true } },
        requester: { select: { id: true, name: true } },
      },
    })

    const requests: BoostRequestView[] = rows.map((r) => ({
      id: r.id,
      key: r.key,
      status: r.status as BoostRequestStatus,
      proactive: r.proactive,
      amountCents: r.amountCents,
      days: r.days,
      note: r.note,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      home: r.home,
      requester: r.requester,
    }))

    return NextResponse.json({ requests, viewerRole: isMainBroker(user) ? 'parent' : 'child' })
  } catch (error) {
    log.error({ err: error }, 'Error listing boost requests')
    return serverError()
  }
}

// POST: a Default (child) broker requests a boost for one of their listings; goes to their Main broker.
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (!isChildBroker(user)) {
      return forbidden('Only brokers who are part of a team can request boosts')
    }

    let body: { homeKey?: string; note?: string }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON')
    }
    const homeKey = body.homeKey?.trim()
    if (!homeKey) return badRequest('homeKey is required')

    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true, title: true, promotedUntil: true },
    })
    if (!home) return notFound('Home not found')
    if (home.ownerId !== user.id) return forbidden('You do not own this listing')

    const now = new Date()
    if (home.promotedUntil && home.promotedUntil > now) {
      return NextResponse.json({ error: 'already_boosted', message: 'This listing is already boosted.' }, { status: 409 })
    }

    const existing = await prisma.boostRequest.findFirst({
      where: { homeId: home.id, status: 'pending' },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'already_requested', message: 'A boost request for this listing is already pending.' }, { status: 409 })
    }

    const boostRequest = await prisma.boostRequest.create({
      data: {
        homeId: home.id,
        requesterId: user.id,
        approverId: user.parentBrokerId,
        amountCents: BOOST_AMOUNT_CENTS,
        days: BOOST_DAYS,
        note: body.note?.trim() || null,
      },
      select: { key: true, status: true },
    })

    // Notify the Main broker.
    try {
      await createNotification({ recipientId: user.parentBrokerId, role: 'broker', type: 'boost_request', homeKey, userId: user.id })
    } catch (err) {
      log.error({ err }, 'Failed to create boost_request notification')
    }

    return NextResponse.json({ boostRequest }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Error creating boost request')
    return serverError()
  }
}
