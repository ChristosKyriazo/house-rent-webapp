import Stripe from 'stripe'

// Singleton — reused across requests in the same Node process.
// STRIPE_SECRET_KEY is a server-only secret; never expose it to the client.
// We use Stripe Checkout (server-side sessions), so no client-side publishable key needed.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})

export const STRIPE_PRICES: Record<'plus' | 'pro', string | undefined> = {
  plus: process.env.STRIPE_PRICE_ID_PLUS,
  pro:  process.env.STRIPE_PRICE_ID_PRO,
}
