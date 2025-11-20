#!/bin/bash
################################################################################
# Auto-Backup Script
# Automated daily backups of MySQL, Redis, and application files
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

LOG_FILE="/var/log/backup.log"
BACKUP_DIR="/var/pdflab/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MYSQL_CONTAINER="pdflab-mysql-prod"
REDIS_CONTAINER="pdflab-redis-prod"
DB_USER="pdflab"
DB_PASS="***REMOVED***"

mkdir -p "$BACKUP_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local severity=$1
  local message=$2
  if [[ -x /var/pdflab/scripts/send-alert-email.sh ]]; then
    /var/pdflab/scripts/send-alert-email.sh "$severity" "$message"
  fi
}

log "INFO: Starting daily backup - $TIMESTAMP"

BACKUP_SUCCESS=true
START_TIME=$(date +%s)

# ===========================
# 1. MySQL Backup
# ===========================
log "INFO: Backing up MySQL databases"

if docker exec "$MYSQL_CONTAINER" mysqldump \
  -u"$DB_USER" -p"$DB_PASS" \
  --all-databases \
  --single-transaction \
  --quick \
  --lock-tables=false \
  --routines \
  --triggers \
  --events 2>/dev/null | gzip > "$BACKUP_DIR/mysql_${TIMESTAMP}.sql.gz"; then

  MYSQL_SIZE=$(du -h "$BACKUP_DIR/mysql_${TIMESTAMP}.sql.gz" | awk '{print $1}')
  log "SUCCESS: MySQL backup completed - Size: $MYSQL_SIZE"

  # Verify backup integrity
  if gzip -t "$BACKUP_DIR/mysql_${TIMESTAMP}.sql.gz" 2>/dev/null; then
    log "SUCCESS: MySQL backup integrity verified"
  else
    log "ERROR: MySQL backup integrity check failed"
    BACKUP_SUCCESS=false
  fi
else
  log "ERROR: MySQL backup failed"
  BACKUP_SUCCESS=false
fi

# ===========================
# 2. Redis Backup
# ===========================
log "INFO: Backing up Redis data"

# Trigger background save
if docker exec "$REDIS_CONTAINER" redis-cli BGSAVE > /dev/null 2>&1; then
  log "INFO: Redis BGSAVE initiated"

  # Wait for save to complete (check every 2 seconds, max 60 seconds)
  SAVE_COMPLETE=false
  for i in {1..30}; do
    SAVE_STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE 2>/dev/null)
    sleep 2
    NEW_SAVE_STATUS=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE 2>/dev/null)

    if [[ "$NEW_SAVE_STATUS" -gt "$SAVE_STATUS" ]]; then
      SAVE_COMPLETE=true
      break
    fi
  done

  if [[ "$SAVE_COMPLETE" == "true" ]]; then
    # Copy RDB file from container
    if docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" 2>/dev/null; then
      REDIS_SIZE=$(du -h "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" | awk '{print $1}')
      log "SUCCESS: Redis backup completed - Size: $REDIS_SIZE"
    else
      log "ERROR: Failed to copy Redis backup file"
      BACKUP_SUCCESS=false
    fi
  else
    log "WARNING: Redis save timed out after 60 seconds"
    BACKUP_SUCCESS=false
  fi
else
  log "ERROR: Redis BGSAVE command failed"
  BACKUP_SUCCESS=false
fi

# ===========================
# 3. Application Files Backup
# ===========================
log "INFO: Backing up application files"

if [[ -d /var/www/pdflab/backend/storage/uploads ]]; then
  if tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" \
    -C /var/www/pdflab/backend/storage uploads 2>/dev/null; then

    UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" | awk '{print $1}')
    log "SUCCESS: Uploads backup completed - Size: $UPLOADS_SIZE"
  else
    log "WARNING: Uploads backup failed"
  fi
else
  log "WARNING: Uploads directory not found - skipping"
fi

# ===========================
# 4. Environment Files Backup
# ===========================
log "INFO: Backing up environment files"

ENV_BACKUP_DIR="$BACKUP_DIR/env_${TIMESTAMP}"
mkdir -p "$ENV_BACKUP_DIR"

# Backend .env
if [[ -f /var/www/pdflab/backend/.env ]]; then
  cp /var/www/pdflab/backend/.env "$ENV_BACKUP_DIR/backend.env" 2>/dev/null || true
fi

# Frontend .env.local
if [[ -f /var/www/pdflab/.env.local ]]; then
  cp /var/www/pdflab/.env.local "$ENV_BACKUP_DIR/frontend.env.local" 2>/dev/null || true
fi

# Docker compose
if [[ -f /var/www/pdflab/docker-compose.production.yml ]]; then
  cp /var/www/pdflab/docker-compose.production.yml "$ENV_BACKUP_DIR/" 2>/dev/null || true
fi

# Compress env files
if tar -czf "$BACKUP_DIR/env_${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR" "env_${TIMESTAMP}" 2>/dev/null; then
  rm -rf "$ENV_BACKUP_DIR"
  log "SUCCESS: Environment files backed up"
else
  log "WARNING: Environment files backup failed"
fi

# ===========================
# 5. Cleanup Old Backups
# ===========================
log "INFO: Cleaning up old backups (keep last 7 days)"

# Count backups before cleanup
BACKUPS_BEFORE=$(find "$BACKUP_DIR" -name "*.gz" -o -name "*.rdb" | wc -l)

# Remove old backups
find "$BACKUP_DIR" -name "mysql_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "env_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# Count backups after cleanup
BACKUPS_AFTER=$(find "$BACKUP_DIR" -name "*.gz" -o -name "*.rdb" | wc -l)
BACKUPS_REMOVED=$((BACKUPS_BEFORE - BACKUPS_AFTER))

log "INFO: Removed $BACKUPS_REMOVED old backups"

# ===========================
# 6. Calculate Total Backup Size
# ===========================
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}' || echo "unknown")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "SUCCESS: Backup completed in ${DURATION}s"
log "  Total backup size: $TOTAL_SIZE"
log "  Backups retained: $BACKUPS_AFTER"

# ===========================
# 7. Send Alert
# ===========================
if [[ "$BACKUP_SUCCESS" == "true" ]]; then
  send_alert "SUCCESS" "Daily backup completed successfully in ${DURATION}s. Total size: $TOTAL_SIZE. Backups: $BACKUPS_AFTER (removed $BACKUPS_REMOVED old backups)"
else
  send_alert "CRITICAL" "Daily backup completed with errors. Check logs at /var/log/backup.log. Duration: ${DURATION}s"
  exit 1
fi

# ===========================
# 8. Optional: Off-site Backup
# ===========================
# Uncomment and configure for off-site replication
# if [[ -n "${OFFSITE_BACKUP_HOST:-}" ]]; then
#   log "INFO: Syncing to off-site backup"
#   rsync -avz --delete "$BACKUP_DIR/" "${OFFSITE_BACKUP_HOST}:${OFFSITE_BACKUP_PATH}/" 2>&1 | tee -a "$LOG_FILE"
# fi

exit 0
