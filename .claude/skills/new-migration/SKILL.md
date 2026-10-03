---
name: new-migration
description: Create and verify a Prisma migration safely. Use for any schema change — new table, column, index, enum, drop, or data backfill — before the migration is committed.
---

Migrations are the highest-blast-radius change in this repo: they run **automatically on container startup** (the `command:` in `docker-compose.prod.yml`), so a bad migration means the app container never starts.

## 1. Look up the real table name first

Every model in `prisma/schema.prisma` is `@@map`ped to a snake_case plural table. **The Prisma model name is never the table name.**

```bash
grep -n "@@map" prisma/schema.prisma
```

`model User` → `users`, `model Home` → `homes`, `model TeamInvitation` → `team_invitations`, and so on for all 22 models.

This is not hypothetical: migration `20260612000001_remove_calcom_fields` was written as `ALTER TABLE "User"` and aborted with `42P01` at migration 22 of 32 on every **new** database — no new environment, no restore-from-backup, no local DB — while leaving staging and production untouched (`migrate deploy` only applies pending migrations, it never re-checks applied ones). The breakage was invisible for weeks.

Column names, by contrast, stay camelCase in Postgres, so raw SQL needs them double-quoted: `"clerkUserId"`, not `clerkUserId`.

## 2. Generate it locally, and only locally

Confirm `DATABASE_URL` in `.env` points at **localhost:5432** before running anything:

```bash
grep DATABASE_URL .env
npm run db:migrate      # prisma migrate dev — interactive, local only
```

Never run `prisma migrate dev` against port **5433** (the production tunnel) or any remote host. It prompts interactively and can drop data.

## 3. Review the generated SQL

Open the new file under `prisma/migrations/<timestamp>_<name>/migration.sql` and check:

- Destructive and cleanup statements are guarded: `ALTER TABLE IF EXISTS`, `DROP COLUMN IF EXISTS`, `DROP INDEX IF EXISTS`. A migration must be a safe no-op on **every** database shape — fresh, staging, production, and a restored backup.
- Table names are the `@@map`ped ones; camelCase columns are quoted.
- Adding a `NOT NULL` column to a populated table has a default or a backfill, in that order.
- Nothing references `calComBookingId` — Cal.com is gone; the column is vestigial.

## 4. Verify against an empty database

This is the step that catches the class of bug above. It rebuilds from nothing and applies all migrations in order:

```bash
npm run db:nuke && npm run db:setup
```

If that succeeds, a fresh environment and a restore-from-backup both work. If you skip it, you are only testing the migration against your already-migrated local DB, which proves nothing.

## 5. Ship it

```bash
npm run typecheck && npm run lint
```

Leave the pgbouncer carve-out alone. The app talks to Postgres through **pgbouncer in transaction pooling mode**, which `prisma migrate deploy` cannot use, so the compose `command:` overrides `DATABASE_URL` with a direct `db:5432` URL for migrations only and then starts the server on the pooled URL. Preserve that split.

## Red flags

- An unguarded `ALTER`/`DROP` on a table that may not exist in some environment.
- A Prisma model name appearing inside raw SQL.
- A migration committed without `db:nuke && db:setup` having been run.
- Any suggestion to add a seed to the deploy pipeline — `scripts/seeds/seed-dev.ts` refuses non-localhost hosts and port 5433 on purpose. Do not weaken that guard.
