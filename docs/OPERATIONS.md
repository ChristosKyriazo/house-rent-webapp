# Operations

Everything about running kaparro in production: branching, deploys, secrets, the server, rollback, and incidents.

Companion docs: [README](../README.md) for local setup, [docs/APP.md](./APP.md) for what the app does, [CLAUDE.md](../CLAUDE.md) for agent-facing context.

---

## Environments

| | Local | UAT / staging | Production |
|---|---|---|---|
| Branch | `feature/*` | `dev` | `main` |
| Domain | localhost:3000 | dev.kaparro.com | kaparro.com, www.kaparro.com |
| Database | own Postgres on 5432, fake seed | staging DB | production DB |
| Host secret | — | `SERVER_HOST_STAGING` | `SERVER_HOST_PROD` |
| GitHub Environment | — | `staging` | `production` |

Local runs against its own database (`npm run db:setup`) — see the [README](../README.md#the-three-environments). Port 5433 is a tunnel to *staging*, not a local database; treat it as read-only.

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

`ci.yml` runs on every push to a non-`main`/`dev` branch, so you get lint/typecheck/test/build feedback within a few minutes of pushing, before the PR is even open. It runs again on the PR, and a third time as the blocking first job of `deploy.yml`.

### Promotion to production

Promote by **pull request**, not by pushing `main`. The PR is what triggers the full Playwright suite against dev.kaparro.com — the release gate. A direct push to `main` skips it.

```bash
gh pr create --base main --head dev --title "Release: <summary>" --body "<what changed>"
```

Wait for CI **and** the full E2E run to go green, then merge. Merging deploys to production, which runs its own in-deploy smoke check and rolls back automatically on failure.

If the merge conflicts, resolve on a branch off `main` and PR that. Never bypass checks on `main`.

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

1. **CI** (`ci.yml` via `workflow_call`): lint → typecheck → `npm test` → build.
2. **Build & push image** to GHCR, tagged `sha-<commit>` and `<branch>-latest`.
3. **scp `Caddyfile`** to `/opt/house-rent/`.
4. **Regenerate `/opt/house-rent/.env`** wholesale from GitHub secrets (mktemp → `chmod 600` → atomic `mv`, so the running container never sees a partial file).
5. `docker login ghcr.io` → `docker compose -f docker-compose.prod.yml pull app`.
6. **Rolling restart of the app only**: `up -d --no-deps --remove-orphans app`. DB, pgbouncer, Redis and Caddy keep running.
7. `caddy reload` — config-validated, so a bad Caddyfile keeps the old config serving rather than taking the site down. Suffixed `|| true`.
8. **Verification, in three rungs** — any failure triggers an automatic rollback (below):
   - **Liveness**: `/api/healthz`, polled 30× at 3s (90s total). Proves the process answers.
   - **Readiness**: `/api/readyz` must report `"db":"connected"`, polled 10× at 3s. Catches a failed migration or a dead pool, which liveness alone happily passes.
   - **Smoke**: `/` and `/homes` each expected to return 200. Exercises routing and rendering, not just the container.

   All three go over **HTTPS via `curl --resolve <host>:443:127.0.0.1`**, not `http://localhost`. This matters: Caddy 308-redirects every port-80 request to HTTPS, and `curl -f` only fails on 4xx/5xx — so a 308 with an empty body is a curl *success*. The original `curl -sf http://localhost/api/healthz` gate passed the moment Caddy was up, regardless of whether the app worked, and had never verified anything. `-k` is required because the origin certificate is a Cloudflare origin cert, not publicly trusted.
9. **Post-deploy E2E** (`dev` only): `e2e.yml` runs the Playwright `public` project against dev.kaparro.com. Not run against production — those specs write data.

### Automatic rollback

Before pulling the new image the deploy records the running container's image **ID** (`docker inspect --format '{{.Image}}'`) and tags it `house-rent-rollback:previous`. The ID rather than the tag, because `docker compose pull` repoints `dev-latest` at the new build moments later; the explicit tag because the pull would otherwise leave those layers dangling. If any verification rung fails, the deploy:

1. prints the last 50 lines of the failing container's logs into the Actions output,
2. rewrites `APP_IMAGE` in `.env` to the previous image and restarts the app,
3. exits non-zero so the run goes red.

**The pin does not survive the next deploy** — `.env` is regenerated wholesale every time. Always follow an automatic rollback with a revert commit.

### Image tags

Tags produced are `sha-<short-commit>` and `<branch>-latest` — i.e. `dev-latest` and `main-latest`. **There is no plain `:latest` tag.** Pulling `:latest` gets you nothing.

`APP_IMAGE` is deployed as the **immutable `sha-` tag**, never `<branch>-latest`. Deploying a mutable tag makes rollback meaningless: re-pinning `dev-latest` just re-selects whatever was pushed last, which is the broken build you are trying to escape.

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
| `ADMIN_CLERK_IDS` | admin allowlist (Clerk user IDs). **Empty = nobody can reach /admin.** |
| `ADMIN_EMAILS` | legacy admin allowlist, honoured as a fallback |
| `CRON_SECRET` | `x-cron-secret` value; **unset means `/api/bookings/reminders` 401s every request** |

### Build args (baked into the image)

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

`DATABASE_URL` and `CLERK_SECRET_KEY` are deliberately **not** build args — the Dockerfile uses safe placeholders so real values never land in an image layer.

### Infrastructure

`SERVER_HOST_STAGING`, `SERVER_HOST_PROD`, `DEPLOY_SSH_KEY` (private key whose public half is in `deploy`'s `authorized_keys`), and the automatic `GITHUB_TOKEN`.

### Feature flags — GitHub *variables*, not secrets

`FEATURE_AI_SEARCH`, `FEATURE_BOOKINGS`, `FEATURE_USAGE_ASSISTANT` and `FEATURE_VIBER_ALERTS` are read from `vars.*` (Settings → Environments → Variables), defaulting to `true` (`false` for Viber). They are not secret, and keeping them as variables means you can flip a feature off per environment and redeploy without touching secrets.

### Optional E2E secrets

`TEST_OWNER_EMAIL` / `TEST_OWNER_PASSWORD` and the `RENTER`, `BROKER`, `BOTH` equivalents, plus `CLERK_SECRET_KEY`, let `e2e.yml` run the authenticated projects. **If they are absent the release gate silently degrades to smoke-only** — it emits a workflow warning and passes. Set them, or the `dev` → `main` gate is much weaker than it looks.

### Not written by deploy.yml

`LOG_LEVEL` is hardcoded to `info`. `REDIS_URL` comes from compose.

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

### Migrations must apply to an empty database

`20260612000001_remove_calcom_fields` originally ran `ALTER TABLE "User"` — a table that has never existed, since the User model is `@@map("users")`. It was recorded as applied on staging and production without ever succeeding, so nothing looked wrong; but on a **fresh** database `prisma migrate deploy` aborted there with 42P01, which meant a new environment could not be provisioned and a backup could not be restored into a clean box.

It is now a safe no-op (`ALTER TABLE IF EXISTS`), and all 32 migrations apply to an empty database.

**Test this, don't assume it.** `migrate deploy` only applies *pending* migrations, so a chain that is broken for new databases stays invisible on long-lived ones indefinitely:

```bash
npm run db:nuke && npm run db:setup     # full chain against an empty DB
```

Do that before any release that adds a migration.

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

## Branch protection

Configure under Settings → Branches. Both branches deploy, so both need rules.

**`main`** — production:
- Require a pull request before merging (no direct pushes)
- Require status checks: `Lint · Typecheck · Test`, and the E2E job
- Require branches to be up to date before merging
- Do not allow force pushes or deletion
- Include administrators — the point is to stop *you* pushing to prod at 2am

**`dev`** — UAT:
- Require a pull request before merging
- Require status check: `Lint · Typecheck · Test`
- Do not allow force pushes or deletion

Apply with the `gh` CLI:

```bash
gh api -X PUT repos/ChristosKyriazo/house-rent-webapp/branches/main/protection \
  --input .github/branch-protection-main.json
gh api -X PUT repos/ChristosKyriazo/house-rent-webapp/branches/dev/protection \
  --input .github/branch-protection-dev.json
```

---

## Release-readiness checklist

- [x] CI blocks the deploy — `deploy.yml`'s `build-push` job has `needs: ci`
- [x] CI runs E2E as well as lint/typecheck/test — `e2e.yml`, smoke post-deploy and full on the release PR
- [x] Deploy verifies more than liveness — readiness plus page-render smoke
- [x] Automatic rollback on a failed deploy
- [x] Migrations proven to apply to an empty database
- [x] Local development isolated from UAT — own database, guarded seed
- [ ] Branch protections active on `main` and `dev` — **apply the JSON above**
- [ ] `TEST_*` E2E secrets set, so the release gate is not smoke-only
- [ ] `ADMIN_CLERK_IDS` and `CRON_SECRET` set in both GitHub Environments
- [ ] Rollback rehearsed against staging, not just implemented
- [ ] Alerting policy beyond raw Sentry errors
- [ ] Off-server backup copy
- [ ] On-call / owner responsibilities defined
- [ ] Security review pass on high-risk endpoints
