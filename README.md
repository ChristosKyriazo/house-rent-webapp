# House Rent Webapp

A Next.js (App Router) application for browsing and managing rental listings. The stack includes **Prisma** with **PostgreSQL** (via Docker locally), **Clerk** for authentication, **Sentry** for error monitoring, **pino** for structured logging, and optional **OpenAI** / **Google Maps** integrations for AI-assisted search and location features.

**Default git branch:** `dev` — day-to-day work happens here; `main` triggers the automated deploy pipeline.

---

## Prerequisites

- **Node.js 20** (LTS) and **npm**
- **Docker Desktop** — runs the local PostgreSQL database ([docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/))
- A **Clerk** account and application ([dashboard.clerk.com](https://dashboard.clerk.com)) — required for sign-in and protected routes

---

## End-to-end local setup

### 1. Clone and enter the app

```bash
git clone <your-repo-url>
cd webapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the database

```bash
docker compose up db -d
```

This starts PostgreSQL on port 5432. The container is healthy when `docker compose ps` shows `(healthy)`.

### 4. Environment variables

```bash
cp .env.example .env
```

Edit `.env` — never commit it. Required variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL: `postgresql://postgres:postgres@localhost:5432/house_rent` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (browser) — from [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (server) — same Clerk app |
| `CALCOM_TOKEN_ENCRYPTION_KEY` | Yes | 32-byte hex key for Cal.com OAuth tokens. Generate with: `openssl rand -hex 32` |
| `SENTRY_DSN` | Recommended | Sentry DSN for server-side error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Same DSN value — used by the browser Sentry SDK |
| `LOG_LEVEL` | No | `debug` / `info` / `warn` / `error` (default: `info`) |
| `OPENAI_API_KEY` | No | AI descriptions, translation, and natural-language search |
| `GOOGLE_MAPS_API_KEY` | No | Geocoding and nearby-places distance calculation |

### 5. Apply database migrations

```bash
npx prisma migrate dev
```

This creates all tables in the PostgreSQL database and generates the Prisma client.

### 6. Optional: seed reference data

```bash
npm run db:seed:universities   # Greek universities
npm run db:seed:areas          # All 83 areas (Athens, Thessaloniki, Volos, Ioannina, Serres, Komotini, Chania, Iraklio, Patra)
```

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in via `/login`. The app syncs Clerk users into the Prisma `User` model via `lib/auth.ts`.

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server |
| `build` | Production build |
| `start` | Run production server after `build` |
| `lint` / `lint:fix` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest unit tests |
| `test:e2e` | Playwright end-to-end tests (requires dev server running) |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | Prisma Studio — visual DB browser |
| `db:seed:universities` | Seed Greek universities |
| `db:seed:areas` | Seed all 83 areas across Greece |

---

## Testing

```bash
npm test                   # unit tests (vitest) — 101 tests, no database needed
npm run test:e2e           # E2E smoke tests (Playwright) — requires dev server + DB
```

Coverage is enforced at ≥60% on statements, branches, and lines. Running `npm test -- --coverage` prints the full report.

---

## Health endpoints

| Endpoint | Expected | Purpose |
|----------|----------|---------|
| `GET /api/healthz` | `{"status":"ok"}` | Liveness — is the process up? |
| `GET /api/readyz` | `{"status":"ok","db":"connected"}` | Readiness — is the DB reachable? |

---

## Production build (local check)

```bash
npm run build
npm run start
```

For full containerised local/staging parity:

```bash
docker compose up         # starts both db + app
```

---

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | App Router pages and layouts |
| `app/api/` | API route handlers |
| `app/components/` | Shared React components |
| `lib/` | Server/shared helpers (Prisma, auth, logger, AI, maps) |
| `proxy.ts` | Clerk auth middleware (Next.js 16 convention, replaces `middleware.ts`) |
| `prisma/` | `schema.prisma` and migration history |
| `tests/` | Vitest unit tests (`tests/api/`, `tests/lib/`, `tests/services/`) and Playwright E2E (`tests/e2e/`) |
| `scripts/seeds/` | Prisma seed scripts |
| `scripts/sql/` | Raw SQL snippets for manual use |
| `.github/workflows/` | CI (`ci.yml`) and deploy (`deploy.yml`) pipelines |

---

## Git workflow

1. **Work on `dev`:**
   ```bash
   git checkout dev && git pull origin dev
   ```
2. **Commit and push:**
   ```bash
   git commit -m "Your change"
   git push origin dev
   ```
3. **Promote to `main`** (triggers the deploy pipeline):
   ```bash
   git checkout main && git merge dev && git push origin main
   ```

See `docs/BRANCHING_STRATEGY.md` for full branch roles, hotfix handling, and rollback steps.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `prisma migrate dev` fails with URL error | Check `DATABASE_URL` starts with `postgresql://` |
| Docker port 5432 already in use | Stop other Postgres processes or change the port in `docker-compose.yml` |
| App boots but auth fails instantly | Verify Clerk keys match your Clerk application and environment (dev vs prod) |
| Port 3000 in use | `npx next dev -p 3001` |
| Sentry not receiving events | Check `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are both set |
