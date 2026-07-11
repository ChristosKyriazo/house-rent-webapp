import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getStripe } from '@/lib/stripe'
import { BOOST_AMOUNT_CENTS, BOOST_DAYS } from '@/lib/broker-hierarchy'

// POST: a Main broker proactively boosts one of their Default (child) brokers' listings and pays.
// Creates a proactive BoostRequest, then a Checkout session; the webhook applies the boost on payment.
export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.brokerCategory !== 'parent') return forbidden('Only Main brokers can boost team listings')

    let body: { homeKey?: string }
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON')
    }
    const homeKey = body.homeKey?.trim()
    if (!homeKey) return badRequest('homeKey is required')

    const home = await prisma.home.findUnique({
      where: { key: homeKey },
      select: { id: true, ownerId: true, title: true, promotedUntil: true, owner: { select: { parentBrokerId: true, brokerCategory: true } } },
    })
    if (!home) return notFound('Home not found')

    // Allowed on the lead's own listings, or any of their children's listings.
    const isOwnListing = home.ownerId === user.id
    const isChildListing = home.owner.brokerCategory === 'child' && home.owner.parentBrokerId === user.id
    if (!isOwnListing && !isChildListing) return forbidden('This listing is not on your team')

    const now = new Date()
    if (home.promotedUntil && home.promotedUntil > now) {
      return NextResponse.json({ error: 'already_boosted', message: 'This listing is already boosted.' }, { status: 409 })
    }

    const boostRequest = await prisma.boostRequest.create({
      data: {
        homeId: home.id,
        requesterId: home.ownerId,
        approverId: user.id,
        amountCents: BOOST_AMOUNT_CENTS,
        days: BOOST_DAYS,
        proactive: true,
      },
      select: { key: true },
    })

    const origin = request.headers.get('origin') ?? 'https://dev.kaparro.com'
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: BOOST_AMOUNT_CENTS,
          product_data: { name: `Listing boost — ${BOOST_DAYS} days (${home.title})` },
        },
      }],
      metadata: {
        userId: user.id.toString(),
        boostRequestKey: boostRequest.key,
      },
      success_url: `${origin}/homes/agency?boost=success`,
      cancel_url: `${origin}/homes/agency?boost=canceled`,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    log.error({ err: error }, 'Error creating proactive boost')
    return serverError()
  }
}
