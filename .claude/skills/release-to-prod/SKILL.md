---
name: release-to-prod
description: Promote dev to production via a dev → main PR, with the pre-flight checks that the pipeline cannot enforce by itself. Use when cutting a release to kaparro.com.
disable-model-invocation: true
---

Pushing to `main` deploys to production immediately. **Never push to `main` directly** — the only supported path is a `dev` → `main` PR, because that PR is what triggers the full E2E suite.

Work through this in order and report each result.

## 1. Is dev green and actually deployed?

```bash
gh run list --branch dev --limit 5
```

All three must be green for the commit you are promoting: `CI`, `Deploy`, and the post-deploy `Post-deploy E2E (staging)`. A green `Deploy` already proves staging passed liveness → readiness → page smoke, since a failure there rolls back and fails the job.

## 2. What is in the release?

```bash
git fetch origin
git log --oneline origin/main..origin/dev | wc -l
git log --oneline origin/main..origin/dev
git diff --stat origin/main..origin/dev -- prisma/migrations
```

Production is far behind `dev` and has never been released, so the first release carries a large migration backlog. Review every migration landing in it against the `new-migration` checklist — especially that each is a safe no-op on a database shape that is not staging's. Migrations run on container startup, so a failing one means the container does not start.

## 3. Back up the production database first

Backups are on-box only, with no off-server copy (known issue 7), so take one and confirm it exists before a large release:

```bash
ssh deploy@<prod-host> 'bash /opt/house-rent/scripts/backup-db.sh && ls -lh /opt/backups/postgres | tail -5'
```

Backups land in `/opt/backups/postgres/` and are retained 14 days.

## 4. Confirm the production environment secrets are populated

`/opt/house-rent/.env` is regenerated wholesale from GitHub secrets on every deploy. A secret that is unset lands as an **empty value, silently** — no error, just a broken feature. Check the GitHub `production` environment has all of:

`DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `SENTRY_DSN`, `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_PRO`, `ADMIN_CLERK_IDS`, `ADMIN_EMAILS`, `CRON_SECRET`.

Three of those fail quietly in ways worth calling out: empty `ADMIN_*` makes `/admin` unreachable (`lib/admin.ts` reads an empty allowlist as "nobody is an admin"), empty `CRON_SECRET` makes `/api/bookings/reminders` 401 every request so reminders never send, and a missing `OPENAI_API_KEY` disables AI descriptions with no user-visible error.

```bash
gh secret list --env production
```

## 5. Open the PR

```bash
gh pr create --base main --head dev \
  --title "release: <summary>" \
  --body "<migrations, user-facing changes, risks>"
```

## 6. Verify the full E2E suite really ran

The release gate degrades instead of failing: if `TEST_*` or `CLERK_SECRET_KEY` are missing from the environment, `e2e.yml` falls back to **smoke-only** with a `::warning::` and still reports green. Authenticated journeys would then be untested.

Confirm the job name reads `full → https://dev.kaparro.com`, not `smoke`, and that no fallback warning appears in the log.

## 7. Merge and watch

```bash
gh run watch
```

The deploy verifies over HTTPS with `curl --resolve <host>:443:127.0.0.1` — liveness (`/api/healthz`), readiness (`/api/readyz` reporting `"db":"connected"`), then page smoke on `/` and `/homes`. Any failure rolls back to the previous image.

**The rollback pin does not survive the next deploy.** It rewrites `APP_IMAGE` in `.env`, which the next deploy regenerates — so if a rollback fires, push a revert commit; do not rely on the pin.

No post-deploy E2E runs against production, by design: those specs write data.

## 8. Check production by hand

Load `https://kaparro.com`, sign in, open a listing, and confirm `/admin` is reachable for an allowlisted account. Then watch Sentry for new issues for a few minutes.
