# kaparro

A two-sided Greek property marketplace for rentals and sales — listings, AI-assisted search, inquiries, viewing bookings, deal finalization, and two-way ratings. Next.js 16 App Router, PostgreSQL via Prisma, Clerk auth, Stripe payments.

| Doc | For |
|---|---|
| This file | setting up and running the app locally |
| [docs/APP.md](./docs/APP.md) | what the app does — features, routes, data model, journeys |
| [docs/OPERATIONS.md](./docs/OPERATIONS.md) | branching, deploys, secrets, the server, rollback, incidents |
| [CLAUDE.md](./CLAUDE.md) | agent-facing context, gotchas, known issues |
| [tests/e2e/TEST_PLAN.md](./tests/e2e/TEST_PLAN.md) | numbered E2E scenarios and coverage |

---

## Prerequisites

- **Node.js 22.18.0** (see `.nvmrc`; `package.json` `engines` requires `>=22.18.0`)
- npm, Docker Desktop
- A Clerk account (create a **separate** application per environment)
- *Optional:* SSH access to the staging server and `~/.ssh/deploy_key`, only if you need to inspect staging data

---

## The three environments

| | Local | UAT / staging | Production |
|---|---|---|---|
| Branch | `feature/*` | `dev` | `main` |
| URL | localhost:3000 | dev.kaparro.com | kaparro.com |
| Database | your own Postgres on **5432**, seeded with fake data | staging DB (real-ish data) | production DB |

Local development runs against **your own database**. Nothing you do locally can affect UAT.

### The port that will bite you

| Port | What it is |
|---|---|
| **5432** | your local Postgres — fake seeded data, safe to wipe |
| **5433** | an SSH tunnel to the **STAGING** database — real data, shared with UAT |

Port 5433 is for *reading* staging when debugging a UAT-only bug. Writing to it changes the environment you are testing against, so point `DATABASE_URL` back at 5432 when you are done. `npm run db:seed:dev` refuses to run against 5433 or any non-localhost host.

---

## Local setup

```bash
git clone https://github.com/ChristosKyriazo/house-rent-webapp.git
cd house-rent-webapp
npm install
```

**1. Create `.env`** from `.env.example`. The defaults already point at the local database; set your Clerk keys:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/house_rent"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**2. Bring up the database and fill it** — starts Postgres + Redis, applies all migrations, seeds areas, universities and fake listings:

```bash
npm run db:setup
```

**3. Run it:**

```bash
npm run dev          # http://localhost:3000
```

You get 6 users, 10 listings across real Athens/Thessaloniki areas (8 rentals, 2 for sale), 83 areas and 20 universities.

### Signing in locally

Seeded users have no `clerkUserId`, so you cannot log in *as* them — they exist to own listings and give the UI data to render. To sign in, register through your own Clerk dev instance; the Prisma `User` is created and synced on first request.

### Day-to-day database commands

| Command | What it does |
|---|---|
| `npm run db:up` | start Postgres + Redis, wait until healthy |
| `npm run db:down` | stop them (data survives) |
| `npm run db:nuke` | stop and **delete the volumes** — full reset |
| `npm run db:setup` | up + migrate + seed, from nothing |
| `npm run db:seed:dev` | re-seed fake users/listings only |
| `npm run db:studio` | Prisma Studio on :5555 |

### Creating a migration

With `DATABASE_URL` on **5432**:

```bash
npm run db:migrate
```

Never run `prisma migrate dev` against 5433 — that is staging, and the command is interactive and destructive.

### Container parity check

```bash
npm run build && docker compose up --build
```

---

## Environment variables

Full list, from `.env.example` plus a grep of `process.env` in the code.

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (local Postgres on 5432 by default) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk, client side (also a Docker build arg) |
| `CLERK_SECRET_KEY` | Clerk, server side |

### Feature-dependent

| Variable | Needed for |
|---|---|
| `OPENAI_API_KEY` | AI search, description generation, vision tagging, embeddings |
| `GOOGLE_MAPS_API_KEY` | server-side geocoding and distances |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | the client-side map page — same value, separate build arg |
| `STRIPE_SECRET_KEY` | payments |
| `STRIPE_WEBHOOK_SECRET` | verifying webhook signatures |
| `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_PRO` | recurring price IDs per tier |
| `REDIS_URL` | cross-process rate limiting and AI-search cache; falls back to per-process memory if unset |

There is deliberately **no** `NEXT_PUBLIC_STRIPE_*` key — checkout sessions are created server-side.

### Optional

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | error tracking — **set both to the same value** |
| `SENTRY_ORG`, `SENTRY_PROJECT` | source map upload |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (production hardcodes `info`) |
| `ADMIN_CLERK_IDS` | preferred admin allowlist (Clerk user IDs) |
| `ADMIN_EMAILS` | legacy admin allowlist, still honoured as a fallback |
| `CRON_SECRET` | value for the `x-cron-secret` header on cron-triggered endpoints |
| `FEATURE_AI_SEARCH`, `FEATURE_BOOKINGS` | set to `"false"` to disable; absent = enabled |
| `OPENAI_FILTER_MODEL`, `OPENAI_VISION_MODEL`, `OPENAI_HOUSE_DESCRIPTION_MODEL`, `OPENAI_COMPATIBILITY_MODEL` | per-task model overrides |
| `E2E_BASE_URL` | Playwright target (defaults to `https://dev.kaparro.com`) |

---

## npm scripts

| Script | Does |
|---|---|
| `dev` / `build` / `start` | Next.js dev server, production build, production server |
| `lint` / `lint:fix` | ESLint (flat config) |
| `typecheck` | `tsc --noEmit` |
| `format` / `format:check` | Prettier — **note the repo is not currently prettier-formatted and CI does not check it** |
| `test` | Vitest, all unit tests |
| `test:integration` | Vitest, `tests/api` only |
| `test:e2e` | Playwright, all projects |
| `test:e2e:auth` | the four authenticated projects (owner, renter, broker, both) |
| `test:e2e:owner` / `:renter` / `:broker` / `:both` / `:flows` | a single project |
| `test:e2e:role-checks` | owner + broker + both |
| `test:e2e:smoke` | the `public` project only — what runs after a staging deploy |
| `test:e2e:report` | open the last HTML report |
| `db:up` / `db:down` | start / stop local Postgres + Redis |
| `db:nuke` | stop and delete the local volumes (full reset) |
| `db:setup` | up + migrate + seed — local environment from nothing |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` (local only) |
| `db:studio` | Prisma Studio, port 5555 |
| `db:seed:dev` | fake local users and listings — **refuses to run against a non-local DB** |
| `db:seed:universities` / `db:seed:areas` / `db:seed:embeddings` | seed scripts |

---

## Testing

**Unit** — 318 tests across 26 files. Uses SQLite (`DATABASE_URL=file:./test.db`), so no database and no Docker needed:

```bash
npm test
```

Coverage thresholds (`vitest.config.ts`): statements 60, **branches 55**, functions 60, lines 60.

**E2E** — Playwright, 6 projects (`public`, `owner`, `renter`, `broker`, `both`, `flows`) using saved `storageState` auth. It runs against **`https://dev.kaparro.com`** by default, not localhost — set `E2E_BASE_URL` to point elsewhere, and put credentials in `.env.test`.

**Where E2E runs in CI:**

| Trigger | Suite |
|---|---|
| push to `feature/*` | none — fast gate only (lint, typecheck, unit, build) |
| PR into `dev` | none — fast gate only |
| merge to `dev` | smoke (`public` project) against dev.kaparro.com, after the deploy |
| **PR `dev` → `main`** | **full suite** against dev.kaparro.com — the release gate |
| merge to `main` | in-deploy smoke (liveness, readiness, page render) with auto-rollback |

---

## Repository layout

| Path | Contents |
|---|---|
| `app/` | App Router pages, layouts, and `app/api/*` route handlers |
| `app/components/` | shared React components |
| `app/contexts/` | React context providers (role, language) |
| `lib/` | business logic, integrations, helpers |
| `lib/services/` | transaction-aware service layer (inquiries, finalization, notifications) |
| `lib/search/` | location matching, scoring, description scoring, student context |
| `lib/schemas/` | Zod request schemas |
| `prisma/` | `schema.prisma` and migration history |
| `proxy.ts` | Clerk middleware (Next.js 16 convention — replaces `middleware.ts`) |
| `scripts/seeds/` | seed scripts |
| `scripts/sql/` | raw SQL snippets for manual use |
| `scripts/tools/` | maintenance utilities |
| `tests/` | Vitest tests (`tests/api/`, `tests/lib/`, `tests/services/`) and Playwright E2E (`tests/e2e/`) |
| `types/` | shared TypeScript types |
| `docs/` | operations and app reference |
| `.github/workflows/` | fast gate (`ci.yml`), Playwright (`e2e.yml`), deploy (`deploy.yml`) |

---

## Git workflow

Short version — the full playbook is in [docs/OPERATIONS.md](./docs/OPERATIONS.md#branching-and-release).

1. Branch from `dev`: `feature/*` for product work, `hardening/*` for reliability work.
2. Small commits, push, open a **PR into `dev`**.
3. Merging to `dev` **deploys to staging** (dev.kaparro.com).
4. Promote `dev` → `main` with `git merge --ff-only dev` when a release candidate is ready.
5. Never work directly on `main` — pushing it deploys to production immediately.

---

## Health endpoints

| Endpoint | Response | Purpose |
|---|---|---|
| `GET /api/healthz` | `{"status":"ok"}` | liveness |
| `GET /api/readyz` | `{"status":"ok","db":"connected"}` | readiness (DB reachable) |

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ECONNREFUSED ... 5432` | local Postgres is not running — `npm run db:up` |
| Queries return no data | the local DB was never seeded — `npm run db:setup` |
| `ECONNREFUSED ... 5433` | you are pointed at the staging tunnel and it is not running. For normal work use 5432 |
| Seed refuses to run | working as intended — `DATABASE_URL` is not a local database. Check it is `localhost:5432` |
| `prisma migrate dev` prompts to reset | you are pointed at 5433 (staging). Point at 5432 first |
| Docker port 5432 already in use | stop other Postgres processes, or change the port in `docker-compose.yml` |
| Clerk session not recognised | dev vs production Clerk keys mismatched between `.env` and the Clerk dashboard |
| Port 3000 in use | `npx next dev -p 3001` |
| Sentry silent | both `SENTRY_DSN` **and** `NEXT_PUBLIC_SENTRY_DSN` must be set |
| E2E failing on auth | the saved `storageState` has expired — re-run `test:e2e:auth` to refresh |
| `docker compose up` hangs on app | the `app` service waits for a healthy `redis`; check `docker compose ps` |
