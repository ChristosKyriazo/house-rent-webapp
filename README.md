# House Rent Webapp

Next.js app (App Router) + Prisma + SQLite for local dev. Work on branch **`dev`**.

## Quick start

```bash
cd webapp
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```bash
cp .env.example .env
# edit .env — never commit it
```

At minimum set `DATABASE_URL`. Optional keys for some features: `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY` (see `lib/` and `app/api/`).

## Database

```bash
npx prisma studio          # GUI at http://localhost:5555
npx prisma migrate dev      # after schema changes
```

## Git

```bash
git checkout dev
git add -A && git commit -m "your message"
git push origin dev
```

## Layout (where to look)

| Path | Purpose |
|------|--------|
| `app/` | Pages and `app/api/` route handlers |
| `lib/` | Shared helpers, Prisma client |
| `prisma/` | `schema.prisma`, migrations |

Troubleshooting: if Prisma errors, run `npx prisma generate` then `npx prisma migrate dev`. Port in use: run `next dev` on another port, e.g. `npx next dev -p 3001`.
