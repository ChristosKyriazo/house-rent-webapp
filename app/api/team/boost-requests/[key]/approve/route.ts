import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-utils'
import { requestLogger } from '@/lib/logger'
import { getStripe } from '@/lib/stripe'

// POST: a Main broker approves a boost request and pays via Stripe Checkout.
// The boost is applied to the listing by the webhook once payment succeeds.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> | { key: string } }
) {
  const log = requestLogger(request)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { key } = await params
    const boostRequest = await prisma.boostRequest.findUnique({
      where: { key },
      select: { approverId: true, status: true, amountCents: true, days: true, home: { select: { title: true } } },
    })
    if (!boostRequest) return notFound('Boost request not found')
    if (boostRequest.approverId !== user.id) return forbidden('This request is not addressed to you')
    if (boostRequest.status !== 'pending') return badRequest('This request has already been decided')

    const origin = request.headers.get('origin') ?? 'https://dev.kaparro.com'
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: boostRequest.amountCents,
          product_data: { name: `Listing boost — ${boostRequest.days} days (${boostRequest.home.title})` },
        },
      }],
      metadata: {
        userId: user.id.toString(),
        boostRequestKey: key,
      },
      success_url: `${origin}/homes/agency/requests?boost=success`,
      cancel_url: `${origin}/homes/agency/requests?boost=canceled`,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    log.error({ err: error }, 'Error approving boost request')
    return serverError()
  }
}
