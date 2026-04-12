# House Rent Webapp

Next.js (App Router) + Prisma + SQLite for local dev. Default branch: **`dev`**.

## Quick start

```bash
cd webapp
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## npm scripts

| Script | Purpose |
|--------|--------|
| `dev` | Next.js dev server |
| `build` / `start` | Production build / run |
| `lint` / `lint:fix` | ESLint |
| `typecheck` | `tsc --noEmit` (no emit) |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | `prisma studio` |
| `db:seed:universities` | Seed Athens universities |
| `db:seed:nea-smirni` | Seed / update Nea Smirni area |

## Environment

```bash
cp .env.example .env
# edit .env — never commit it
```

Minimum: `DATABASE_URL`. Optional: `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY` (see `lib/` and `app/api/`).

## Repo layout

| Path | Purpose |
|------|--------|
| `app/` | Routes: `app/page.tsx`, features under `app/homes/`, `app/profile/`, … |
| `app/api/` | HTTP handlers only |
| `app/components/` | Shared React components |
| `app/contexts/` | React context providers |
| `app/hooks/` | Shared hooks |
| `lib/` | Server/shared TS helpers (Prisma, auth, translations, AI helpers) |
| `prisma/` | `schema.prisma`, migrations |
| `scripts/sql/` | Raw SQL helpers (manual / one-off) |
| `scripts/seeds/` | Prisma seed scripts (`tsx`) |
| `scripts/tools/` | Small Node one-offs (e.g. generate CUID) |

## Git

```bash
git checkout dev
git add -A && git commit -m "your message"
git push origin dev
```

**Troubleshooting:** Prisma errors → `npm run db:generate` then `npm run db:migrate`. Port busy → `npx next dev -p 3001`.
