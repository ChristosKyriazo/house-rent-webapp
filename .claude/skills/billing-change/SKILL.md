---
name: billing-change
description: Change anything touching Stripe, subscription tiers, AI credit packs, or per-seat team billing. Use for new prices, new webhook events, tier limit changes, or gating a feature behind a tier.
---

Low frequency, high blast radius: a mistake here either charges the wrong amount or silently grants paid features. Read the invariants before editing.

## Pricing is server-side, always

`lib/stripe.ts` holds the only authority on amounts:

```ts
export const AI_PACKS = {
  '10': { credits: 10, amountCents: 299 },
  '25': { credits: 25, amountCents: 599 },
  '50': { credits: 50, amountCents: 999 },
} as const
```

Subscription prices come from `STRIPE_PRICES` (`STRIPE_PRICE_ID_PLUS` / `STRIPE_PRICE_ID_PRO` in the environment). Checkout sessions are created server-side; **there is no publishable key** in this app.

Never read an amount, price, or credit count out of a request body — a tampered body must not be able to buy cheap credits. Take a pack **size** (`AiPackSize`) and look the price up.

## The webhook

`app/api/webhooks/stripe/route.ts`:

- `export const dynamic = 'force-dynamic'`, and the body is read with `request.text()`, not `request.json()` — the **raw body** is required for signature verification. Do not add a JSON parse or middleware that consumes the body.
- Signature is verified with `getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`; failure returns `400`.
- The route is exempt from Clerk in `proxy.ts` (`isPublicApi`), protected instead by that signature. Route-level exemptions belong in `isPublicApi` — nowhere else.
- Handles `checkout.session.completed` and `customer.subscription.deleted`. Branching inside the first is driven by `session.metadata` (`userId`, `boostRequestKey`, pack size).

**Idempotency** comes from the unique `Transaction.stripeEventId`. Every handler opens a transaction, checks `tx.transaction.findUnique({ where: { stripeEventId: event.id } })`, returns early if seen, and writes the `Transaction` row **in the same transaction** as the effect it is paying for. A new event type must follow that exact shape — Stripe retries, and a handler that grants credits outside the guarded transaction grants them twice.

Always return `200 { received: true }` for events you do not handle. A non-2xx makes Stripe retry forever.

## Tiers

`lib/subscription.ts` — free (1 listing, 0 slots), plus (10, 2, 7d), pro (unlimited, 5, 30d):

- `checkTier(userTier, required)` → a `402 { error: 'subscription_required', requiredTier }` response or `null`. This is the only correct way to gate an endpoint.
- `meetsMinimumTier` for boolean checks, `TIER_RANK` for ordering.
- `getListingLimit` / `getSlotLimit` for limits — don't hardcode 1/10/2/5 anywhere else.
- `enforceTierListingLimits(tx, userId, tier)` for a tier change applied **on someone's behalf** (a Main broker changing a member's tier, or a cascade to free): hides the least-recently-updated listings over the limit on downgrade, restores on upgrade. The self-serve `/api/subscription/upgrade` route keeps its own `keepKeys` selection so an owner picks which of their own listings survive.

Adding a tier means touching `TIER_RANK`, both limit functions, `STRIPE_PRICES`, and the webhook — all four.

## Team seats

Billing is **per-seat on one owner subscription** using quantity-based line items. `syncOwnerSeats(ownerId)` in `lib/team-billing.ts` reconciles after **every** membership or tier change (invite accepted, member removed, member leaves, tier changed, `TEAM_MAX_CHILDREN = 10`).

It is deliberately best-effort — it logs and never throws — so a Stripe outage cannot corrupt membership state. **Do not make it throw** and do not move it inside a membership transaction so that its failure rolls one back. If you add a new path that changes membership or a member's tier, call it there.

## Verifying

```bash
npm test && npm run typecheck && npm run lint
```

Add coverage under `tests/api/`. For the webhook, replay real events with the Stripe CLI against a local dev server, with `STRIPE_WEBHOOK_SECRET` set to the CLI's signing secret:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

Send the same event twice and assert the effect happened once — that is the test that actually exercises the idempotency guard.

On deploy, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PLUS` and `STRIPE_PRICE_ID_PRO` are written into `/opt/house-rent/.env` from the GitHub environment secrets. An unset one lands empty and payments fail at runtime, not at deploy time.
