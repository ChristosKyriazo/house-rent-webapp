---
name: staging-triage
description: Diagnose something broken on the deployed staging environment (dev.kaparro.com) — errors, blank pages, a feature not working, a deploy that looks wrong. Use when the symptom is on the server, not in local code.
---

Staging is `dev.kaparro.com` on `116.203.100.64`, everything under `/opt/house-rent`, all compose commands with `-f docker-compose.prod.yml`. It holds **real UAT data shared with testers** — read freely, write nothing.

```bash
ssh -i ~/.ssh/deploy_key deploy@116.203.100.64
```

## 1. Health, over HTTPS

From the box. Do **not** use `http://localhost`: Caddy 308-redirects every port-80 request, and `curl -f` treats a 308 as success, so an HTTP health check passes whether or not the app works. `--resolve` pins the public hostname to loopback so the request goes through Caddy's real site block — routing, TLS, and the app.

```bash
curl -sk --resolve dev.kaparro.com:443:127.0.0.1 https://dev.kaparro.com/api/healthz   # process alive
curl -sk --resolve dev.kaparro.com:443:127.0.0.1 https://dev.kaparro.com/api/readyz    # {"status":"ok","db":"connected"}
curl -sk -o /dev/null -w '%{http_code}\n' --resolve dev.kaparro.com:443:127.0.0.1 https://dev.kaparro.com/homes
```

`-k` is expected: the origin certificate is a Cloudflare origin cert, not publicly trusted.

`healthz` green + `readyz` red means the Node process is up but the database is unreachable — a failed migration or a dead pool. Go to step 3.

## 2. Containers and logs

```bash
cd /opt/house-rent
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail 200 app
docker compose -f docker-compose.prod.yml logs --tail 50 db pgbouncer redis caddy
```

Logs are pino JSON — pipe through `| jq .` if available. Useful filters:

```bash
docker compose -f docker-compose.prod.yml logs --tail 500 app | grep -i '"level":50'   # errors
docker compose -f docker-compose.prod.yml logs --tail 500 app | grep 'ai call failed'  # lib/ai-logger.ts
docker compose -f docker-compose.prod.yml logs app | grep -i 'OPENAI_API_KEY'          # missing-key guards
```

An app container restart-looping is almost always a **migration failure on startup** — migrations run from the compose `command:`, before `node server.js`. The failure is at the very top of the log, so read from the start, not the tail:

```bash
docker compose -f docker-compose.prod.yml logs app | head -60
```

## 3. Which image is actually running?

```bash
docker compose -f docker-compose.prod.yml ps -q app | xargs docker inspect --format '{{.Config.Image}} {{.Image}}'
grep APP_IMAGE .env
```

`APP_IMAGE` should be an immutable `sha-<7 chars>` tag matching the commit you expect. If it reads `house-rent-rollback:previous`, **a deploy failed verification and rolled back** — and that pin does not survive the next deploy, so the bad image comes straight back. Push a revert commit.

## 4. Environment

`/opt/house-rent/.env` is regenerated wholesale from GitHub secrets on **every** deploy. Hand edits do not survive, so never fix anything by editing it — fix the GitHub `staging` environment secret and redeploy. An unset secret lands as an **empty value**, silently.

Check presence without printing secrets:

```bash
cut -d= -f1 .env | grep -v '^#' | grep -v '^$'              # which keys exist
awk -F= '!/^#/ && NF && $2==""{print $1" is EMPTY"}' .env     # which are empty
```

Known quiet failures from an empty value: `ADMIN_CLERK_IDS` / `ADMIN_EMAILS` → `/admin` unreachable for everyone; `CRON_SECRET` → `/api/bookings/reminders` 401s every call so reminders never send; `OPENAI_API_KEY` → AI descriptions, embeddings, and the assistant degrade with no user-visible error (`lib/house-description-generator.ts` logs `OPENAI_API_KEY not set`).

## 5. Reading the staging database

Open the tunnel (see the `db-tunnel` skill) and connect on **5433**, read-only — writing mutates the environment testers are using. Or from the box:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U "$POSTGRES_USER" house_rent -c 'select count(*) from homes;'
```

Table names are the `@@map`ped snake_case plurals (`users`, `homes`, `team_invitations`), and camelCase columns need double quotes.

To confirm migrations are fully applied:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U "$POSTGRES_USER" house_rent \
  -c 'select migration_name, finished_at from _prisma_migrations order by finished_at desc limit 5;'
```

## 6. Redis

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
docker compose -f docker-compose.prod.yml exec redis redis-cli info keyspace
```

Redis backs cross-process rate limiting and AI-search caching. With `REDIS_URL` unset the app falls back to per-process memory — so "rate limits behave oddly" can mean Redis is down rather than a logic bug.

## 7. Correlating with Sentry and CI

Sentry needs both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` set to the same value; `deploy.yml` writes both from the single `SENTRY_DSN` secret. Request logs carry `requestId` from the `x-request-id` header — use it to join a Sentry event to a log line.

```bash
gh run list --branch dev --limit 5   # did the last deploy and post-deploy smoke actually pass?
```

## Don't

- Don't `docker compose down` — that stops the database and Caddy too. The deploy only ever restarts `app`:
  `docker compose -f docker-compose.prod.yml up -d --no-deps app`
- Don't run `prisma migrate dev` against staging; it prompts and can drop data.
- Don't run the dev seed anywhere near it — `scripts/seeds/seed-dev.ts` refuses non-localhost hosts and port 5433 by design.
- Don't expect the Caddyfile `rate_limit` block to be doing anything: it needs the caddy-ratelimit plugin, which `caddy:2-alpine` does not ship.
