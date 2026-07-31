# Operations

Everything about running kaparro in production: branching, deploys, secrets, the server, rollback, and incidents.

Companion docs: [README](../README.md) for local setup, [docs/APP.md](./APP.md) for what the app does, [CLAUDE.md](../CLAUDE.md) for agent-facing context.

---

## Environments

| | Staging | Production |
|---|---|---|
| Branch | `dev` | `main` |
| Domain | dev.kaparro.com | kaparro.com, www.kaparro.com |
| Host secret | `SERVER_HOST_STAGING` | `SERVER_HOST_PROD` |
| GitHub Environment | `staging` | `production` |

**Both branches deploy.** `.github/workflows/deploy.yml` triggers on pushes to `main` *and* `dev`. A push to `dev` is a real deploy to staging, not just a build.

Hosting is a self-hosted **Hetzner CX32** (4 vCPU / 8 GB, Ubuntu 24.04) at `/opt/house-rent`, deployed over SSH. There is no Fly.io, Railway, or Vercel involved anywhere.

---

## Branching and release

`main` is the production line and is always deployable. `dev` is the integration line. Work is born on a side branch, lands on `dev`, and is only then promoted.

| Prefix | Purpose |
|---|---|
| `feature/*` | product work (new user-facing behaviour) |
| `hardening/*` | reliability, security, testing, refactor work |
| `hotfix/*` | urgent production fix, branched from `main` |
| `backup/*` | safety snapshot before a big transition |

**Never work directly on `main`.**

### Daily workflow

```bash
git checkout dev && git pull origin dev
git checkout -b feature/<short-topic>
# small commits
git push -u origin <branch-name>
# open a PR into dev; merge when lint, typecheck and tests pass
```

Note that `ci.yml` only runs on `pull_request`. Pushing straight to `dev` skips that gate — the deploy workflow calls CI itself, so it is still caught, but at deploy time rather than review time.

### Promotion to production

```bash
git checkout dev  && git pull origin dev
git checkout main && git pull origin main
git merge --ff-only dev
git push origin main
git checkout dev
```

If `--ff-only` fails: open a PR from `dev` to `main`, resolve conflicts with review, merge with checks. Never bypass checks on `main`.

### Hotfix

1. Branch from `main`: `git checkout main && git pull && git checkout -b hotfix/<issue>`
2. Fix, test, PR into `main`.
3. **Sync back to `dev`** — easy to forget, and skipping it means the next promotion silently reverts the fix:
   ```bash
   git checkout dev && git pull origin dev && git merge main && git push origin dev
   ```

### Git-level rollback (distinct from image rollback below)

```bash
git checkout backup/pre-production-20260415              # inspect a snapshot
git checkout dev && git merge --ff-only backup/…         # restore dev to it
git checkout -b restore/preprod pre-production-snapshot-20260415   # from a tag
```

### Team rules

Keep PRs focused on one concern. Do not mix feature work and hardening work in one PR. Prefer small, reversible commits. If unsure, stop and ask before merging to `main`.

Naming: `feature/owner-notes-card`, `hardening/booking-overlap-invariants`, `hotfix/booking-timezone-regression`.

---

## What happens on a push

`deploy.yml`, in order:

1. **CI** (`ci.yml` via `workflow_call`): lint → typecheck → `npm test` → build. It does **not** run E2E.
2. **Build & push image** to GHCR, tagged `sha-<commit>` and `<branch>-latest`.
3. **scp `Caddyfile`** to `/opt/house-rent/`.
4. **Regenerate `/opt/house-rent/.env`** wholesale from GitHub secrets (mktemp → `chmod 600` → atomic `mv`, so the running container never sees a partial file).
5. `docker login ghcr.io` → `docker compose -f docker-compose.prod.yml pull app`.
6. **Rolling restart of the app only**: `up -d --no-deps --remove-orphans app`. DB, pgbouncer, Redis and Caddy keep running.
7. `caddy reload` — config-validated, so a bad Caddyfile keeps the old config serving rather than taking the site down. Suffixed `|| true`.
8. **Health check**: polls `/api/healthz` 30 times at 3-second intervals (90 seconds total), and fails the deploy if it never comes up.

### Image tags

Tags produced are `sha-<commit>` and `<branch>-latest` — i.e. `dev-latest` and `main-latest`. **There is no plain `:latest` tag.** Pulling `:latest` gets you nothing.

---

## ⚠️ The server `.env` is disposable

**Every deploy overwrites `/opt/house-rent/.env` in full**, from GitHub secrets. Consequences:

- Hand-editing the file on the server is pointless — the next push destroys it.
- Pinning `APP_IMAGE` for a rollback survives only until the next deploy. Always follow a pin with a real revert commit.
- Adding a new variable requires editing `deploy.yml` **and** adding the secret. Adding the secret alone does nothing.
- Rotating a secret = update it in the GitHub Environment, then push any commit to redeploy.

---

## Secrets

Derived from `deploy.yml`, which is the only authority. Set under **Settings → Environments** (`staging` / `production`), not repo-wide, so the two environments can hold different values.

### Written into the server `.env` at deploy time

| Secret | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | consumed by the `db` and `pgbouncer` services |
| `CLERK_SECRET_KEY` | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | also a build arg |
| `SENTRY_DSN` | written to **both** `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` — one secret, two vars |
| `OPENAI_API_KEY` | |
| `GOOGLE_MAPS_API_KEY` | server-side key |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_PRO` | |
| `CALCOM_TOKEN_ENCRYPTION_KEY` | **dead** — Cal.com was removed; zero code references. Safe to drop from `deploy.yml`. |

### Build args (baked into the image)

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

`DATABASE_URL` and `CLERK_SECRET_KEY` are deliberately **not** build args — the Dockerfile uses safe placeholders so real values never land in an image layer.

### Infrastructure

`SERVER_HOST_STAGING`, `SERVER_HOST_PROD`, `DEPLOY_SSH_KEY` (private key whose public half is in `deploy`'s `authorized_keys`), and the automatic `GITHUB_TOKEN`.

### Not written by deploy.yml

`LOG_LEVEL` is hardcoded to `info`. `REDIS_URL` comes from compose. `ADMIN_EMAILS`, `ADMIN_CLERK_IDS`, `CRON_SECRET`, `FEATURE_AI_SEARCH` and `FEATURE_BOOKINGS` are **not written at all**, so they are unset in production — see Known issues.

---

## Production topology

Five services on an internal bridge network. Only Caddy is publicly bound.

| Service | Image | Memory | Exposure |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | 512m | none — internal only |
| `pgbouncer` | `bitnami/pgbouncer` | 64m | internal |
| `redis` | `redis:7-alpine` | 128m | internal |
| `app` | `${APP_IMAGE}` from GHCR | 768m | `expose 3000`, internal |
| `caddy` | `caddy:2-alpine` | 64m | **80, 443, 443/udp** |

The DB image is **pgvector**, not stock Postgres — it is required for listing embeddings. Do not swap it for `postgres:16`.

### The pgbouncer migration carve-out

This is the most important operational subtlety in the stack.

The app's `DATABASE_URL` points at **pgbouncer** (transaction pooling, max 200 client connections, default pool 20). But `prisma migrate deploy` cannot run through a transaction-mode pooler, so the app service's `command:` overrides `DATABASE_URL` with a **direct `db:5432` URL for migrations only**, then starts the server on the pooled URL:

```
sh -c "DATABASE_URL=postgresql://…@db:5432/… prisma migrate deploy && node server.js"
```

Migrations therefore run on container start via the compose `command:` — *not* the Dockerfile entrypoint, which is plain `node server.js`.

### Volumes

`postgres_data`, `redis_data`, `uploads_data` (shared: read-write on app, read-only on Caddy), `caddy_data` (**holds TLS material — must stay a named volume**), `caddy_config`.

### Caddy

- **Explicit origin certificates**: `tls /etc/caddy/certs/origin.crt /etc/caddy/certs/origin.key`. ACME auto-TLS is **off** — certs are mounted from `./certs`, Cloudflare-origin style. They do not auto-renew; renew them before expiry.
- Two site blocks: `dev.kaparro.com` (HSTS 1 year) and `kaparro.com, www.kaparro.com` (HSTS 2 years, www → apex 301).
- `/uploads/*` is served straight from `/srv` by `file_server`, bypassing Next.js entirely.
- Security headers set here; **CSP is deliberately not** — it comes from `next.config.ts`, and two CSP headers make browsers enforce the intersection of both.
- `encode gzip`; access log rolls at 10 MB, 7 kept.
- The Caddyfile is repo-managed and scp'd on every deploy.

---

## Rollback

Rolling back the image does **not** roll back migrations. If the bad deploy included a schema change, see the next section.

1. Find the last-good `sha-<commit>` in the GitHub Actions run history.
2. SSH to the server and pin it:
   ```bash
   cd /opt/house-rent
   APP_IMAGE=ghcr.io/christoskyriazo/house-rent-webapp:sha-<good-sha> \
     docker compose -f docker-compose.prod.yml up -d --no-deps app
   ```
3. Verify:
   ```bash
   curl https://<domain>/api/healthz   # {"status":"ok"}
   curl https://<domain>/api/readyz    # {"status":"ok","db":"connected"}
   ```
   Then check Sentry for whether the error spike stopped.
4. **Push a revert commit.** The pin above lives in `.env`, which the next deploy overwrites — without a revert, the bad image comes straight back.

### Database migration rollback

Prisma does not generate down migrations. To reverse one:

1. Connect to the production database directly (bypassing pgbouncer).
2. Manually reverse the DDL (drop the column, revert the type, …).
3. Delete the migration record so Prisma does not re-apply it:
   ```sql
   DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';
   ```
4. Redeploy the previous image.

**Prevention:** for destructive schema changes use expand–contract — add the new column, backfill, deploy, then drop the old column in a *separate* later migration. That keeps every intermediate state rollback-safe.

---

## Server provisioning

Only needed when building a new box.

### 1. Provision

Hetzner Cloud → New server. Ubuntu 24.04, type CX32, location closest to users (Helsinki/Nuremberg), paste your SSH public key at create time, attach a firewall.

### 2. Harden (as root, on first SSH)

```bash
apt update && apt upgrade -y

useradd -m -s /bin/bash deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
usermod -aG sudo,docker deploy

sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable

curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 3. Hetzner cloud firewall (hardware level, in front of the OS)

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | TCP | 22 | your office/home IP only |
| Inbound | TCP | 80 | any |
| Inbound | TCP | 443 | any |
| Inbound | UDP | 443 | any |

**Never allow port 5432 from outside — ever.** Postgres has no port binding in compose and must stay that way.

### 4. Directories

```bash
sudo mkdir -p /opt/house-rent && sudo chown deploy:deploy /opt/house-rent
sudo mkdir -p /opt/backups/postgres && sudo chown deploy:deploy /opt/backups/postgres
chmod +x /opt/house-rent/scripts/backup-db.sh
```

Copy `docker-compose.prod.yml`, `Caddyfile` and `scripts/backup-db.sh` into `/opt/house-rent/`. Place the origin certs in `/opt/house-rent/certs/`.

Do **not** hand-write `.env` — the first deploy generates it. See "the server `.env` is disposable".

### 5. DNS

Add an A record pointing the domain at the server IP.

### 6. First deploy (manual, to verify)

```bash
cd /opt/house-rent
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f app
```

### 7. Clerk

Create a separate Clerk application per environment. Add the domain under Domains, and set the home URL to it. Staging and production must not share a Clerk app.

### 8. Google Maps server key

In Google Cloud Console → Credentials:
- **Remove HTTP referrer restrictions** — they block server-side calls.
- Add an **IP restriction** for the server's IP.
- Enable Geocoding API, Places API, Maps JavaScript API.

---

## Backups and restore

Cron, as the `deploy` user:

```
0 2 * * * /opt/house-rent/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
```

Backups land in `/opt/backups/postgres/`, retained 14 days.

```bash
# manual backup
bash /opt/house-rent/scripts/backup-db.sh

# restore
zcat backup.sql.gz | docker exec -i \
  $(docker compose -f docker-compose.prod.yml ps -q db) psql -U houserent house_rent
```

**Recommended and not yet done:** push backups off-server (Hetzner Object Storage or Backblaze B2) via `rclone copy ${BACKUP_FILE} remote:bucket/` at the end of the backup script. On-box-only backups do not survive losing the box.

---

## Routine operations

| Task | Command |
|---|---|
| Live logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Restart app only | `docker compose -f docker-compose.prod.yml restart app` |
| DB shell | `docker compose -f docker-compose.prod.yml exec db psql -U houserent house_rent` |
| Pin a specific image | see [Rollback](#rollback) — and remember `.env` is regenerated on next deploy |
| Dependency audit | `npm audit` — monthly |

### Health endpoints

| Endpoint | Response | Purpose |
|---|---|---|
| `GET /api/healthz` | `{"status":"ok"}` | liveness — is the process up? |
| `GET /api/readyz` | `{"status":"ok","db":"connected"}` | readiness — can it serve traffic? |

Use `/api/readyz` for any readiness probe, so traffic only arrives once the DB connection is established.

---

## Incident response

1. **Detect** — Sentry alert, failed deploy health check, or `/api/readyz` failing.
2. **Triage** — is it the app (check `logs -f app`), the database, or the edge (Caddy)? A deploy that failed its health check has already left the previous container running.
3. **Decide**: roll back the image if the bad change is recent and identifiable; hotfix forward if the fix is small and well understood.
4. **Hotfix** — branch from `main`, fix, PR to `main`, then **sync back to `dev`**.
5. **Post-incident** — write down what happened and what would have caught it.

### Priority order when it is unclear what to do

1. User safety and data integrity
2. System reliability
3. Security posture
4. Delivery speed
5. Nice-to-have polish

If a choice improves speed but hurts reliability or security, do not choose it.

---

## Release-readiness checklist

Open items, honestly marked. Nothing here has been verified as done.

- [ ] Branch protections active on `main`
- [ ] Required checks configured in CI
- [ ] CI runs E2E as well as lint/typecheck/test (see Known issues)
- [ ] Critical user journeys tested end-to-end in CI
- [ ] Rollback process actually rehearsed, not just documented
- [ ] Alerting policy beyond raw Sentry errors
- [ ] Off-server backup copy
- [ ] On-call / owner responsibilities defined
- [ ] Security review pass on high-risk endpoints
