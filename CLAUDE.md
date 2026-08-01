# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Deeper references: [docs/APP.md](./docs/APP.md) for features and data model, [docs/OPERATIONS.md](./docs/OPERATIONS.md) for deploys and infrastructure, [README.md](./README.md) for local setup.

## Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript 5 (strict)
- **Database:** PostgreSQL via Prisma 5 (ORM + migrations), on the **pgvector** image for listing embeddings
- **Auth:** Clerk — synced to Prisma `User` via `clerkUserId`. Never alter this mapping without a migration plan; mismatches create orphan users.
- **Middleware:** `proxy.ts` (not `middleware.ts`) — this is Clerk's Next.js 16 convention.
- **Payments:** Stripe (`lib/stripe.ts`, `lib/subscription.ts`, `lib/team-billing.ts`)
- **Cache / rate limit:** Redis via ioredis (`lib/redis.ts`, `lib/rate-limit.ts`)
- **Validation:** Zod (`lib/schemas/`, `validateBody` in `lib/api-utils.ts`)
- **AI:** OpenAI (descriptions, embeddings, vision), Google Maps (distances)
- **Styling:** Tailwind CSS 4 with PostCSS
- **Testing:** Vitest (unit, SQLite) + Playwright (E2E, 6 projects)
- **Observability:** Sentry (set both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to the same value), pino logging

## Local database connection

The local dev environment connects to the **staging database** via an SSH tunnel — there is no local Postgres instance with real data.

**Start the tunnel** (run in a dedicated terminal, it blocks — that's normal):
```
ssh -i ~/.ssh/deploy_key -L 5433:172.18.0.2:5432 deploy@116.203.100.64 -N
```

Then set `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://houserent:<password>@localhost:5433/house_rent"
```

Port 5432 is an empty local Postgres used only when running `prisma migrate dev`. Port 5433 is the tunnel to real data.

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run typecheck        # TypeScript check (no emit)
npm run lint             # ESLint (flat config, eslint.config.mjs)
npm run lint:fix         # Auto-fix lint issues
npm test                 # Vitest unit tests (SQLite — no tunnel needed)
npm run test:integration # Vitest, tests/api only
npm run test:e2e         # Playwright (runs against dev.kaparro.com by default)
npm run db:migrate       # prisma migrate dev (local, interactive)
npm run db:studio        # Prisma Studio on port 5555
```

Run `npm run typecheck && npm run lint` before pushing — CI blocks the deploy if either fails.

`npm run format` exists but the repo is **not** prettier-formatted and CI does not check it. Running it would reformat everything; don't, unless that is the intended change.

There is **no `db:seed:demo` script.** The seeds that exist are `db:seed:universities`, `db:seed:areas`, `db:seed:embeddings`.

## Migrations

Migrations run **automatically on container startup** — via the `command:` in `docker-compose.prod.yml`, not the Dockerfile entrypoint (which is plain `node server.js`).

The app talks to Postgres through **pgbouncer in transaction pooling mode**, which `prisma migrate deploy` cannot use. The compose `command:` therefore overrides `DATABASE_URL` with a **direct `db:5432` URL for migrations only**, then starts the server on the pooled URL. Preserve that carve-out.

Never run `prisma migrate dev` against the production or staging DB — it prompts interactively and can drop data.

## Deploy flow

- Push to **`dev`** → builds Docker image → deploys to **staging** (dev.kaparro.com)
- Push to **`main`** → deploys to **production** (kaparro.com)
- Never push directly to `main` — it triggers the production pipeline immediately.
- Image tags are `sha-<commit>` and `<branch>-latest` (`dev-latest` / `main-latest`). **There is no plain `:latest`.**
- The deploy only restarts the app container; DB, pgbouncer, Redis and Caddy keep running.
- **`/opt/house-rent/.env` is regenerated wholesale from GitHub secrets on every deploy.** Hand edits do not survive.
- Health check polls `/api/healthz` 30 times at 3s intervals (90 seconds total).

## Payments (Stripe)

Tiers: free (1 listing, 0 slots), plus (10, 2 slots, 7d), pro (unlimited, 5 slots, 30d) — `lib/subscription.ts`. Gated endpoints return `402 { error: 'subscription_required', requiredTier }`.

Checkout is created server-side; there is no publishable key. The webhook at `app/api/webhooks/stripe/route.ts` needs the **raw body** and is exempted from Clerk in `proxy.ts`. Idempotency comes from a unique `Transaction.stripeEventId`.

AI credit packs are priced server-side in `lib/stripe.ts` (`AI_PACKS`) so a tampered body cannot buy cheap credits. Full detail in [docs/APP.md](./docs/APP.md#subscriptions-and-payments).

## Broker teams

Three broker shapes via `brokerCategory`: `standalone`, `parent` (Main), `child` (Default). A Pro broker can invite up to `TEAM_MAX_CHILDREN = 10`.

Billing is **per-seat on one owner subscription** using quantity-based line items — `syncOwnerSeats` in `lib/team-billing.ts` reconciles on every membership/tier change and is deliberately best-effort (logs, never throws) so a Stripe failure cannot corrupt membership state.

Use the predicates in `lib/broker-hierarchy.ts` rather than comparing `brokerCategory` strings inline. `isChildBroker` is a type predicate that narrows `parentBrokerId` to non-null. Full detail in [docs/APP.md](./docs/APP.md#broker--agency-teams).

## Key gotchas

- **Prisma binary targets** include `linux-musl-openssl-3.0.x` for Alpine/Docker. Don't remove it from the schema.
- **The DB image is `pgvector/pgvector:pg16`**, not stock Postgres — embeddings need it.
- **Uploads** are served directly by Caddy from the `uploads_data` volume (`/srv/uploads`), not via Next.js. File writes go to `public/uploads/` locally but the Docker volume maps to `/srv/uploads` in production.
- **Background jobs** (e.g. `BulkUploadJob`) use fire-and-forget async functions. This works because the app runs as a persistent Node.js process, not serverless. Don't move it to Vercel without adding a proper queue.
- **Redis** is deployed in both compose files and used for cross-process rate limiting and AI-search caching when `REDIS_URL` is set; it falls back to per-process memory when it isn't. OpenAI description and Google Maps geocoding caches are still per-process — fine for single-instance deploys.
- **Tests use SQLite** (`DATABASE_URL=file:./test.db`). The tunnel is not needed to run tests.
- **Playwright targets `https://dev.kaparro.com`** by default, not localhost. Override with `E2E_BASE_URL`.
- **CSP comes from `next.config.ts`, not the Caddyfile.** Two CSP headers make browsers enforce the intersection of both.
- **Notifications** go through `createNotification` (`lib/services/notification-service.ts`). Pass `tx` when inside a transaction so they commit or roll back with the rest.
- **Locale formatting** lives in `lib/format.ts`; `useLanguage()` returns `isEl`. Don't reintroduce inline `language === 'el' ? 'el-GR' : 'en-US'` ternaries.
- **`Booking.calComBookingId` is vestigial.** Cal.com was removed in migration `20260612000001_remove_calcom_fields`; nothing writes that column.

## Known issues / status

Replaces four overlapping phase-plan documents. Verified against the code on 2026-07-18.

| # | Issue |
|---|---|
| 1 | ~~Viber alerts are not gated on payment.~~ **Fixed.** The route now returns `501` (`FEATURE_VIBER_ALERTS` off by default) and the modal is gated on `NEXT_PUBLIC_FEATURE_VIBER_ALERTS`. Shipping it for real still needs a verified phone column, a Stripe gate flipped from the webhook, and a sender — see [docs/APP.md](./docs/APP.md#viber-alerts--not-shipped). |
| 2 | **Admin allowlist is likely empty in production.** `deploy.yml` writes neither `ADMIN_EMAILS` nor `ADMIN_CLERK_IDS`. Needs verification. |
| 3 | **Node version is split.** `.nvmrc` and `engines` say 22.18.0; `ci.yml` and the Dockerfile use Node 20. Production runs 20, local runs 22. |
| 4 | **CI never runs E2E.** `ci.yml` is lint → typecheck → test → build only, though the `flows/` specs exist and pass locally. |
| 5 | **Caddy rate limiting is inert.** The `rate_limit` directive needs the caddy-ratelimit plugin, which `caddy:2-alpine` does not ship. Either build with xcaddy or drop the block. |
| 6 | **`CALCOM_TOKEN_ENCRYPTION_KEY`** is still written into the production `.env` with zero consumers. |
| 7 | Backups are on-box only — no off-server copy. |
| 8 | `~185` `any` warnings across API routes. |
| 9 | `lib/translations.ts` (~1270 lines) has not been migrated to next-intl/i18next. |
| 10 | The booking endpoint has never been load-tested. |
| 11 | No metrics dashboard or alerting policy beyond raw Sentry errors. |
| 12 | Branch protection on `main` — status unverified. |
