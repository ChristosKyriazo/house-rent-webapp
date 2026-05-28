# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript 5 (strict)
- **Database:** PostgreSQL via Prisma 5 (ORM + migrations)
- **Auth:** Clerk — synced to Prisma `User` via `clerkUserId`. Never alter this mapping without a migration plan; mismatches create orphan users.
- **Middleware:** `proxy.ts` (not `middleware.ts`) — this is Clerk's Next.js 16 convention.
- **AI:** OpenAI (descriptions, embeddings, vision), Google Maps (distances)
- **Styling:** Tailwind CSS 4 with PostCSS
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
npm run dev          # Start dev server (port 3000)
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm run lint:fix     # Auto-fix lint issues
npm test             # Vitest unit tests (uses SQLite — no tunnel needed)
npm run db:migrate   # Run Prisma migrations interactively (local)
npm run db:studio    # Prisma Studio on port 5555
```

Run `npm run typecheck && npm run lint` before pushing — CI blocks the deploy if either fails.

## Migrations

Migrations run **automatically on container startup** via the production compose entrypoint (`prisma migrate deploy && node server.js`). Never run `prisma migrate dev` against the production or staging DB — it prompts interactively and can drop data.

## Deploy flow

- Push to **`dev`** → builds Docker image → deploys to **staging** (dev.kaparro.com)
- Push to **`main`** → deploys to **production**
- Never push directly to `main` — it triggers the production pipeline immediately.
- The deploy only restarts the app container; DB and Caddy keep running.
- Health check polls `/api/healthz` for up to 90 seconds post-deploy.

## Key gotchas

- **`db:seed:demo` is local-only.** Never run it on staging or production — it inserts fake listings.
- **Prisma binary targets** include `linux-musl-openssl-3.0.x` for Alpine/Docker. Don't remove it from the schema.
- **Uploads** are served directly by Caddy from the `uploads_data` volume (`/srv/uploads`), not via Next.js. File writes go to `public/uploads/` locally but the Docker volume maps to `/srv/uploads` in production.
- **Background jobs** (e.g. `BulkUploadJob`) use fire-and-forget async functions. This works because the app runs as a persistent Node.js process, not serverless. Don't move it to Vercel without adding a proper queue.
- **In-memory caching** (OpenAI descriptions, Google Maps results) is per-process. There is no Redis. Fine for single-instance deploys.
- **Tests use SQLite** (`DATABASE_URL=file:./test.db`). The tunnel is not needed to run tests.
- **Cal.com token encryption** requires a stable 32-byte hex `CALCOM_TOKEN_ENCRYPTION_KEY`. Rotating it invalidates all stored tokens.
