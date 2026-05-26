# Server Setup — Safe Deployment Guide

Stack: **Hetzner CX32 · Ubuntu 24.04 · Docker · Caddy · PostgreSQL**

---

## 1. Provision the server

1. Create a Hetzner account → Cloud → New server
   - Location: closest to your users (e.g. Helsinki, Nuremberg)
   - Image: **Ubuntu 24.04**
   - Type: **CX32** (4 vCPU, 8 GB RAM — ~€14/month)
   - SSH key: paste your public key (`~/.ssh/id_ed25519.pub`)
   - Enable **Hetzner Firewall** (create one, attach to server — see step 3)

2. Note the server's public IP.

---

## 2. Harden the server (run as root after first SSH)

```bash
ssh root@YOUR_SERVER_IP
```

```bash
# Update packages
apt update && apt upgrade -y

# Create a non-root deploy user
useradd -m -s /bin/bash deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
usermod -aG sudo,docker deploy

# Harden SSH: disable password auth, disable root login
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# UFW firewall — only SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp    # HTTP/3
ufw --force enable

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

---

## 3. Hetzner Firewall rules (hardware-level, before the OS)

In the Hetzner Cloud console → Firewalls → Create firewall:

| Direction | Protocol | Port | Source |
|-----------|----------|------|--------|
| Inbound | TCP | 22 | Your office/home IP only |
| Inbound | TCP | 80 | Any |
| Inbound | TCP | 443 | Any |
| Inbound | UDP | 443 | Any |

**Do not allow port 5432 (Postgres) from outside — ever.**

---

## 4. Deploy user setup (as `deploy`)

```bash
ssh deploy@YOUR_SERVER_IP

# App directory
sudo mkdir -p /opt/house-rent
sudo chown deploy:deploy /opt/house-rent
cd /opt/house-rent

# Copy docker-compose.prod.yml and Caddyfile from the repo (or scp them)
# scp docker-compose.prod.yml Caddyfile scripts/backup-db.sh deploy@YOUR_SERVER_IP:/opt/house-rent/

# Make backup script executable
chmod +x /opt/house-rent/scripts/backup-db.sh

# Create backups directory
sudo mkdir -p /opt/backups/postgres
sudo chown deploy:deploy /opt/backups/postgres
```

---

## 5. Create `.env` on the server

```bash
nano /opt/house-rent/.env
```

**Never copy-paste from `.env.example` — generate real secrets:**

```dotenv
# Image to run (GitHub Actions updates this automatically on deploy)
APP_IMAGE=ghcr.io/christoskyria zo/house-rent-webapp:dev-latest

# Database
POSTGRES_USER=houserent
POSTGRES_PASSWORD=<generate: openssl rand -base64 32>
POSTGRES_DB=house_rent
DATABASE_URL=postgresql://houserent:<password>@db:5432/house_rent

# Auth — Clerk staging app (create a separate Clerk app for staging)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cal.com
CALCOM_TOKEN_ENCRYPTION_KEY=<generate: openssl rand -hex 32>
CALCOM_API_KEY=

# AI / Maps
OPENAI_API_KEY=
GOOGLE_MAPS_API_KEY=

# Observability
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
LOG_LEVEL=info
```

```bash
# Lock down the file — only the deploy user can read it
chmod 600 /opt/house-rent/.env
```

---

## 6. Configure Caddyfile

Edit `/opt/house-rent/Caddyfile` and replace `YOUR_DOMAIN` with your actual domain.

If you only have a bare IP (no domain), use:
```
:80 {
    reverse_proxy app:3000
}
```
(No TLS in this case — only use for initial testing.)

---

## 7. Point DNS to the server

In your domain registrar (or Cloudflare):
- Add an **A record**: `staging.yourdomain.com → YOUR_SERVER_IP`
- Wait for propagation (usually 1–5 minutes with Cloudflare, up to 1 hour elsewhere)

---

## 8. First deploy (manual, to verify everything)

```bash
cd /opt/house-rent

# Log in to GHCR to pull the image
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull and start everything
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Watch the logs
docker compose -f docker-compose.prod.yml logs -f app
```

Caddy will automatically fetch a TLS certificate on first request. Visit `https://staging.yourdomain.com` — you should see the app.

---

## 9. Set up automatic deploys (GitHub Actions)

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret name | Value |
|---|---|
| `SERVER_HOST_STAGING` | Your server IP |
| `DEPLOY_SSH_KEY` | Private key of an SSH keypair where the public key is in `deploy`'s `~/.ssh/authorized_keys` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk staging publishable key |
| `CLERK_SECRET_KEY` | Clerk staging secret key |
| `DATABASE_URL` | Full Postgres URL (used only at build time for Prisma) |

Also add a **GitHub Environment** called `staging` (Settings → Environments) and optionally require a manual approval for `production`.

After this, every push to `dev` will:
1. Build and push a new Docker image to GHCR
2. SSH into the server, pull the image, restart only the app container
3. Verify the `/api/healthz` endpoint before declaring success

---

## 10. Automated database backups

```bash
# Install the cron job as the deploy user
crontab -e
```

Add:
```
0 2 * * * /opt/house-rent/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
```

Backups land in `/opt/backups/postgres/`, retained for 14 days.

**Optional but recommended:** also push backups off-server to Hetzner Object Storage (S3-compatible) or Backblaze B2. Add `rclone copy ${BACKUP_FILE} remote:bucket/` to the backup script after testing.

---

## 11. Clerk: create a staging application

1. Go to [clerk.com](https://clerk.com) → Create application → name it "House Rent Staging"
2. Grab the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
3. In Clerk dashboard → Domains → add `staging.yourdomain.com`
4. In Clerk dashboard → Settings → set the home URL to `https://staging.yourdomain.com`

---

## 12. Google Maps API key for the server

In [Google Cloud Console](https://console.cloud.google.com) → Credentials → your API key:
- Remove HTTP referrer restrictions (those block server-side calls)
- Add **IP restriction**: add only your server's IP
- Enable: Geocoding API, Places API, Maps JavaScript API

---

## Ongoing operations

| Task | Command |
|---|---|
| View live logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Restart app only | `docker compose -f docker-compose.prod.yml restart app` |
| Manual DB backup | `bash /opt/house-rent/scripts/backup-db.sh` |
| Restore DB backup | `zcat backup.sql.gz \| docker exec -i $(docker compose -f docker-compose.prod.yml ps -q db) psql -U houserent house_rent` |
| Update to specific image | Edit `APP_IMAGE` in `.env` then `docker compose -f docker-compose.prod.yml up -d --no-deps app` |
| Open DB shell | `docker compose -f docker-compose.prod.yml exec db psql -U houserent house_rent` |
