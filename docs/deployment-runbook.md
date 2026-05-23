# Deployment Runbook

## Normal Deploy

Merging a PR into `main` triggers `.github/workflows/deploy.yml` automatically:
1. Builds the Docker image with the standalone Next.js output
2. Pushes to `ghcr.io/<org>/<repo>:sha-<commit>` and `:latest`
3. Runs the deploy step for your hosting provider

The container entrypoint runs `npx prisma migrate deploy && node server.js`, so migrations are applied before the server starts.

---

## Rollback Procedure

### 1. Identify the last good image

```bash
# List recent images in GHCR — find the sha tag before the bad deploy
# Example: sha-a1b2c3d
```

Check the GitHub Actions run history for the commit SHA of the last successful deploy.

### 2. Re-deploy the previous image

**Fly.io**
```bash
flyctl deploy --image ghcr.io/<org>/<repo>:sha-<previous-sha> --remote-only
```

**Railway**
```bash
# In the Railway dashboard: Deployments → select the previous deployment → Redeploy
```

**Manual Docker Compose (staging/self-hosted)**
```bash
# Pull and restart with the previous tag
IMAGE_TAG=sha-<previous-sha> docker compose pull app && docker compose up -d app
```

### 3. Verify the rollback

```bash
curl https://<your-domain>/api/healthz   # expects: {"status":"ok"}
curl https://<your-domain>/api/readyz    # expects: {"status":"ok","db":"connected"}
```

Check Sentry for new error spikes after the rollback.

---

## Database Migration Rollback

Prisma does not auto-generate down migrations. If a migration must be reverted:

1. Connect to the production database directly.
2. Manually reverse the DDL change (drop column, revert type, etc.).
3. Delete the migration record from `_prisma_migrations` so Prisma does not re-apply it:

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';
```

4. Redeploy the previous application image (step 2 above).

> **Prevention**: For destructive schema changes, always use an expand-contract pattern — add the new column, backfill, deploy, then drop the old column in a separate migration.

---

## Environment Secrets (GitHub Actions)

Required repository secrets (`Settings → Secrets and variables → Actions`):

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `DATABASE_URL` | Production PostgreSQL connection string |
| `CALCOM_TOKEN_ENCRYPTION_KEY` | 32-byte hex key for Cal.com token encryption |
| `OPENAI_API_KEY` | OpenAI API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `SENTRY_DSN` | Sentry DSN (server-side) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (client-side, same value) |
| `SENTRY_ORG` | Sentry organisation slug |
| `SENTRY_PROJECT` | Sentry project slug |

---

## Health Checks

| Endpoint | Expected response | Purpose |
|---|---|---|
| `GET /api/healthz` | `200 {"status":"ok"}` | Liveness (is the process up?) |
| `GET /api/readyz` | `200 {"status":"ok","db":"connected"}` | Readiness (can it serve traffic?) |

Configure your load balancer / hosting provider to use `/api/readyz` as the readiness probe so traffic is only routed once the DB connection is established.
