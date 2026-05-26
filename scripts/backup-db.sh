#!/usr/bin/env bash
# Daily PostgreSQL backup script.
# Install: crontab -e → add:  0 2 * * * /opt/house-rent/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
KEEP_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/house_rent_${TIMESTAMP}.sql.gz"

# Load env so we can read POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
set -a
source /opt/house-rent/.env
set +a

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup → ${BACKUP_FILE}"

docker exec \
  "$(docker compose -f /opt/house-rent/docker-compose.prod.yml ps -q db)" \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB:-house_rent}" \
  | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup complete ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Prune backups older than KEEP_DAYS
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${KEEP_DAYS} days"
