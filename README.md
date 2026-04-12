# House Rent Webapp

A Next.js (App Router) application for browsing and managing rental listings. The stack includes **Prisma** with **SQLite** for local development, **Clerk** for authentication, and optional **OpenAI** / **Google Maps** integrations for AI-assisted search and location features.

**Default git branch:** `dev` — day-to-day work happens here; `main` tracks the stable line.

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- A **Clerk** account and application ([Clerk Dashboard](https://dashboard.clerk.com)) — required for sign-in and protected routes

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

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env` and never commit it.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | SQLite for local dev: `file:./dev.db` (→ `prisma/dev.db`; avoid `file:./prisma/dev.db` or Prisma resolves to `prisma/prisma/dev.db`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (browser) |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (server) |
| `OPENAI_API_KEY` | No | AI search, descriptions, translation, bulk-upload helpers |
| `GOOGLE_MAPS_API_KEY` | No | Maps / geocoding features in `lib/google-maps.ts` |

Create keys in the Clerk dashboard and paste them into `.env`. Without Clerk keys, auth and middleware-backed flows will not work.

### 4. Database: generate client and apply migrations

```bash
npm run db:generate
npm run db:migrate
```

This creates/updates the local SQLite database under `prisma/` (path depends on `DATABASE_URL`) and applies Prisma migrations.

### 5. Optional: seed reference data

```bash
npm run db:seed:universities   # Athens universities
npm run db:seed:nea-smirni     # Nea Smirni area data
```

Raw SQL helpers live under `scripts/sql/` for manual or one-off use; TypeScript seeds live under `scripts/seeds/`.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use Clerk’s sign-in/sign-up pages (`/login`, `/signup`) to authenticate. The app syncs users to the Prisma `User` model via `clerkUserId` (see `lib/auth.ts`).

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server (`next dev`) |
| `build` | Production build |
| `start` | Run production server after `build` |
| `lint` / `lint:fix` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | Prisma Studio (inspect DB) |
| `db:seed:universities` | Seed universities (`scripts/seeds/`) |
| `db:seed:nea-smirni` | Seed Nea Smirni (`scripts/seeds/`) |

---

## Production build (local check)

```bash
npm run build
npm run start
```

Point `DATABASE_URL` at your production database if you move off SQLite; keep secrets in the host’s environment (Vercel, Docker, etc.), not in the repo.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `app/` | App Router routes: `app/page.tsx`, features under `app/homes/`, `app/profile/`, … |
| `app/api/` | Route handlers only |
| `app/components/` | Shared React components |
| `app/contexts/` | React context providers |
| `app/hooks/` | Shared hooks |
| `lib/` | Server/shared helpers (Prisma, auth, translations, AI, maps) |
| `middleware.ts` | Clerk middleware for protected routes and API |
| `prisma/` | `schema.prisma` and migrations |
| `scripts/sql/` | Raw SQL snippets (manual / one-off) |
| `scripts/seeds/` | Prisma seed scripts (`tsx`) |
| `scripts/tools/` | Small Node utilities (e.g. CUID generation) |

---

## Git workflow

1. **Work on `dev`** (default for new changes):

   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Commit and push:**

   ```bash
   git add -A
   git commit -m "Describe your change"
   git push origin dev
   ```

3. **Promote to `main`** when ready (merge or fast-forward from `dev`):

   ```bash
   git checkout main
   git pull origin main
   git merge dev
   git push origin main
   git checkout dev
   ```

Use tags or release notes on your host if you deploy from `main`.

---

## Troubleshooting

- **Prisma client / schema errors:** Run `npm run db:generate`, then `npm run db:migrate`.
- **Port 3000 in use:** `npx next dev -p 3001`
- **Clerk / auth issues:** Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` match the same Clerk application and environment (e.g. development vs production).
- **Database locked (SQLite):** Close Prisma Studio and other processes using the same `.db` file; see `scripts/tools/unlock-database.js` if you use it in your workflow.
