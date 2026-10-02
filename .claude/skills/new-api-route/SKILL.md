---
name: new-api-route
description: Write a new API route (or edit an existing one) following this repo's house pattern — Zod validation, Clerk auth, tier gates, rate limits, pino logging. Use when adding or modifying anything under app/api/.
---

There are 68 route files under `app/api/`. They share one shape. Follow it rather than inventing a new one — drift here is what produced the ~185 `any` warnings.

## Skeleton

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { badRequest, forbidden, notFound, serverError, unauthorized, validateBody } from '@/lib/api-utils'
import { createThingSchema } from '@/lib/schemas'
import { requestLogger } from '@/lib/logger'
import { features } from '@/lib/features'

export async function POST(request: NextRequest) {
  const log = requestLogger(request)
  try {
    if (!features.thing) {
      return NextResponse.json({ error: 'Thing is currently disabled' }, { status: 503 })
    }

    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { data: body, error: validationError } = validateBody(createThingSchema, await request.json())
    if (validationError) return validationError

    // ... work ...

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error({ err }, 'POST /api/things failed')
    return serverError()
  }
}
```

## The rules

**Validation.** Add the schema to `lib/schemas/index.ts` under the matching section banner (`// ── Homes ───`), built from the shared primitives already defined there (`positiveInt`, `nonEmptyString`, `isoDate`). Then run it through `validateBody` from `lib/api-utils.ts`. Do not hand-roll `typeof` checks on request bodies.

**Responses.** Use the helpers in `lib/api-utils.ts` — `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError` — so error shapes stay uniform. `serverError()` deliberately returns a generic message; put the detail in the log, not the response.

**Auth.** `getCurrentUser()` from `lib/auth.ts` resolves Clerk → the Prisma `User` row via `clerkUserId`, creating it on first login. It returns `null` rather than throwing. Never touch that mapping without a migration plan.

**Never trust client-sent ownership.** Resolve owner and home server-side from the related row. `app/api/bookings/route.ts` documents why: a caller could otherwise pair their own inquiry with someone else's `ownerId` and poison that owner's calendar.

**Tier gates.** `checkTier(user.subscriptionTier, 'pro')` from `lib/subscription.ts` returns a `402 { error: 'subscription_required', requiredTier }` response or `null`:

```ts
const gate = checkTier(user.subscriptionTier, 'pro')
if (gate) return gate
```

Limits come from `getListingLimit` / `getSlotLimit` — free (1 listing, 0 slots), plus (10, 2), pro (unlimited, 5). When a tier changes on someone's behalf, call `enforceTierListingLimits(tx, userId, tier)` inside the transaction.

**Rate limits.** `lib/rate-limit.ts` exposes `checkRateLimit(key, limit, windowMs)` plus per-feature wrappers: `checkAiSearchLimit`, `checkAiDescriptionLimit`, `checkTranslationLimit`, `checkMapsLimit`, `checkEmbeddingLimit`, `checkUsageAssistantLimit`. Any route that calls OpenAI, Google Maps, or embeddings needs one. They return `false` when the caller is over budget — respond `429`.

Do not rely on the Caddyfile `rate_limit` block as a backstop: it needs the caddy-ratelimit plugin, which `caddy:2-alpine` does not ship, so it is inert.

**Broker hierarchy.** Use the predicates in `lib/broker-hierarchy.ts` instead of comparing `brokerCategory` strings inline. `isChildBroker` is a type predicate that narrows `parentBrokerId` to non-null.

**Notifications.** Go through `createNotification(input, tx)` from `lib/services/notification-service.ts`. Pass `tx` inside a transaction so the notification commits or rolls back with the rest.

**Logging.** `requestLogger(request)` gives a pino child logger carrying `requestId`, `method`, and `path`. No `console.log` / `console.error` in routes.

**Types.** No new `any`. `lint` and `typecheck` both gate the deploy.

## Finish

Add or extend a test under `tests/api/` (Vitest against SQLite — no database needed), then:

```bash
npm test && npm run typecheck && npm run lint
```
