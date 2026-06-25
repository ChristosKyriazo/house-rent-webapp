import Stripe from 'stripe'

// Lazy singleton — instantiated on first request, not at module load time.
// This prevents the build from failing when STRIPE_SECRET_KEY is not set
// as a Docker build arg (it is a runtime secret, injected via .env at deploy).
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured on this server.')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    })
  }
  return _stripe
}

export const STRIPE_PRICES: Record<'plus' | 'pro', string | undefined> = {
  plus: process.env.STRIPE_PRICE_ID_PLUS,
  pro:  process.env.STRIPE_PRICE_ID_PRO,
}
