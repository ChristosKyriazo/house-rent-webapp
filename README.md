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
- SSH access to the staging server and `~/.ssh/deploy_key`, for the database tunnel

> ⚠️ CI and the production Dockerfile currently run **Node 20**, while `.nvmrc`/`engines` say 22.18.0. Local and production are on different majors — see Known issues in [CLAUDE.md](./CLAUDE.md).

---

## The two databases

This is the single most confusing thing about local setup, so read it before anything else.

| Port | What it is | Used for |
|---|---|---|
| **5432** | an **empty** local Postgres from `docker compose up db` | running `prisma migrate dev` only |
| **5433** | an SSH tunnel to the **staging** database | everything else — this is where the real data is |

There is no local Postgres holding real data. Day to day, `DATABASE_URL` points at **5433**.

---

## Local setup

```bash
git clone https://github.com/ChristosKyriazo/house-rent-webapp.git
cd house-rent-webapp
npm install
```

**1. Start the empty local database** (only needed for creating migrations):

```bash
docker compose up db -d
```

`docker-compose.yml` defines `db`, `redis` and `app`; the `app` service waits on a healthy `redis`. For normal development you run Next.js on the host and only need `db`.

**2. Open the tunnel to staging** — in a dedicated terminal, it blocks:

```bash
ssh -i ~/.ssh/deploy_key -L 5433:172.18.0.2:5432 deploy@116.203.100.64 -N
```

**3. Create `.env`** from `.env.example` and set at minimum:

```dotenv
DATABASE_URL="postgresql://houserent:<password>@localhost:5433/house_rent"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**4. Generate the Prisma client and run:**

```bash
npx prisma generate
npm run dev          # http://localhost:3000
```

Signing in creates the Clerk user and syncs a matching Prisma `User` on first request.

### Creating a migration

Point `DATABASE_URL` at **5432** (the empty local DB) first, then:

```bash
npm run db:migrate
```

Never run `prisma migrate dev` against 5433 — that is the staging database and the command is interactive and destructive.

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
| `DATABASE_URL` | Postgres connection string (5433 tunnel locally) |
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
| `test:e2e:report` | open the last HTML report |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` (local only) |
| `db:studio` | Prisma Studio, port 5555 |
| `db:seed:universities` / `db:seed:areas` / `db:seed:embeddings` | seed scripts |

---

## Testing

**Unit** — 201 tests across 21 files. Uses SQLite (`DATABASE_URL=file:./test.db`), so no tunnel and no Docker needed:

```bash
npm test
```

Coverage thresholds (`vitest.config.ts`): statements 60, **branches 55**, functions 60, lines 60.

**E2E** — Playwright, 6 projects (`public`, `owner`, `renter`, `broker`, `both`, `flows`) using saved `storageState` auth. It runs against **`https://dev.kaparro.com`** by default, not localhost — set `E2E_BASE_URL` to point elsewhere, and put credentials in `.env.test`.

> CI does **not** run E2E. `ci.yml` is lint → typecheck → test → build.

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
| `.github/workflows/` | CI (`ci.yml`) and deploy (`deploy.yml`) |

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
| `ECONNREFUSED ... 5433` | the SSH tunnel is not running — restart it in its own terminal |
| Queries return no data | `DATABASE_URL` is pointing at 5432 (the empty local DB) instead of 5433 |
| `prisma migrate dev` prompts to reset | you are pointed at 5433 (staging). Point at 5432 first |
| Docker port 5432 already in use | stop other Postgres processes, or change the port in `docker-compose.yml` |
| Clerk session not recognised | dev vs production Clerk keys mismatched between `.env` and the Clerk dashboard |
| Port 3000 in use | `npx next dev -p 3001` |
| Sentry silent | both `SENTRY_DSN` **and** `NEXT_PUBLIC_SENTRY_DSN` must be set |
| E2E failing on auth | the saved `storageState` has expired — re-run `test:e2e:auth` to refresh |
| `docker compose up` hangs on app | the `app` service waits for a healthy `redis`; check `docker compose ps` |
