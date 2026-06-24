import Stripe from 'stripe'

// Singleton — reused across requests in the same Node process
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})

export const STRIPE_PRICES: Record<'plus' | 'pro', string | undefined> = {
  plus: process.env.STRIPE_PRICE_ID_PLUS,
  pro:  process.env.STRIPE_PRICE_ID_PRO,
}
