#!/bin/bash
################################################################################
# Auto-Cleanup Disk Script
# Cleans up disk space when usage exceeds threshold
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

THRESHOLD=${DISK_THRESHOLD:-85}  # Cleanup when >85%
LOG_FILE="/var/log/auto-remediation.log"

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

# Get disk usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')

log "INFO: Disk usage: ${DISK_USAGE}% (${DISK_AVAILABLE} available)"

# Check if threshold exceeded
if [[ $DISK_USAGE -lt $THRESHOLD ]]; then
  log "INFO: Disk usage (${DISK_USAGE}%) below threshold (${THRESHOLD}%) - no action needed"
  exit 0
fi

log "WARNING: Disk at ${DISK_USAGE}% - threshold ${THRESHOLD}% exceeded - initiating cleanup"

FREED_TOTAL=0

# Step 1: Docker system prune (remove unused containers, images, networks, build cache)
log "INFO: Running Docker system prune (72h filter)"
DOCKER_FREED=$(docker system prune -af --volumes --filter "until=72h" 2>&1 | grep "Total reclaimed space" | awk '{print $4}' || echo "0")

if [[ "$DOCKER_FREED" != "0" ]]; then
  log "SUCCESS: Docker cleanup freed: ${DOCKER_FREED}"
fi

# Step 2: Clean old uploads (>30 days)
if [[ -d /var/www/pdflab/backend/storage/uploads ]]; then
  log "INFO: Cleaning old uploads (>30 days)"
  UPLOADS_BEFORE=$(du -sh /var/www/pdflab/backend/storage/uploads 2>/dev/null | awk '{print $1}' || echo "0")

  find /var/www/pdflab/backend/storage/uploads -type f -mtime +30 -delete 2>/dev/null || true

  UPLOADS_AFTER=$(du -sh /var/www/pdflab/backend/storage/uploads 2>/dev/null | awk '{print $1}' || echo "0")
  log "INFO: Uploads directory: ${UPLOADS_BEFORE} → ${UPLOADS_AFTER}"
fi

# Step 3: Compress old logs (>7 days)
log "INFO: Compressing old logs (>7 days)"
COMPRESSED=0

if [[ -d /var/log ]]; then
  while IFS= read -r -d '' logfile; do
    if gzip "$logfile" 2>/dev/null; then
      ((COMPRESSED++))
    fi
  done < <(find /var/log -name "*.log" -mtime +7 -type f -print0 2>/dev/null)

  log "INFO: Compressed $COMPRESSED log files"
fi

# Step 4: Remove old compressed logs (>30 days)
log "INFO: Removing old compressed logs (>30 days)"
REMOVED=0

if [[ -d /var/log ]]; then
  while IFS= read -r -d '' gzfile; do
    rm -f "$gzfile" && ((REMOVED++))
  done < <(find /var/log -name "*.gz" -mtime +30 -type f -print0 2>/dev/null)

  log "INFO: Removed $REMOVED old compressed logs"
fi

# Step 5: Clean old backups (keep last 7 days)
if [[ -d /var/pdflab/backups ]]; then
  log "INFO: Cleaning old backups (>7 days)"
  BACKUPS_BEFORE=$(du -sh /var/pdflab/backups 2>/dev/null | awk '{print $1}' || echo "0")

  # Remove old MySQL backups
  find /var/pdflab/backups -name "mysql_*.sql.gz" -mtime +7 -delete 2>/dev/null || true

  # Remove old Redis backups
  find /var/pdflab/backups -name "redis_*.rdb" -mtime +7 -delete 2>/dev/null || true

  # Remove old upload backups
  find /var/pdflab/backups -name "uploads_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

  BACKUPS_AFTER=$(du -sh /var/pdflab/backups 2>/dev/null | awk '{print $1}' || echo "0")
  log "INFO: Backups directory: ${BACKUPS_BEFORE} → ${BACKUPS_AFTER}"
fi

# Step 6: Clean Docker logs (keep last 100MB per container)
log "INFO: Truncating Docker container logs"
for container in $(docker ps -q); do
  CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$container" | sed 's#/##')
  LOG_PATH=$(docker inspect --format='{{.LogPath}}' "$container")

  if [[ -f "$LOG_PATH" ]]; then
    LOG_SIZE=$(stat -f%z "$LOG_PATH" 2>/dev/null || stat -c%s "$LOG_PATH" 2>/dev/null || echo 0)
    LOG_SIZE_MB=$((LOG_SIZE / 1048576))

    if [[ $LOG_SIZE_MB -gt 100 ]]; then
      # Truncate to last 100MB
      tail -c 104857600 "$LOG_PATH" > "${LOG_PATH}.tmp" && mv "${LOG_PATH}.tmp" "$LOG_PATH"
      log "INFO: Truncated ${CONTAINER_NAME} log from ${LOG_SIZE_MB}MB to 100MB"
    fi
  fi
done

# Step 7: Clean npm/yarn cache
if command -v npm &> /dev/null; then
  log "INFO: Cleaning npm cache"
  npm cache clean --force > /dev/null 2>&1 || true
fi

# Step 8: Clean apt cache (if on Debian/Ubuntu)
if command -v apt-get &> /dev/null; then
  log "INFO: Cleaning apt cache"
  apt-get clean > /dev/null 2>&1 || true
  apt-get autoclean > /dev/null 2>&1 || true
  apt-get autoremove -y > /dev/null 2>&1 || true
fi

# Check new disk usage
sleep 2
NEW_DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
NEW_DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')

FREED=$((DISK_USAGE - NEW_DISK_USAGE))

log "SUCCESS: Disk cleanup completed"
log "  Before: ${DISK_USAGE}%"
log "  After:  ${NEW_DISK_USAGE}%"
log "  Freed:  ${FREED}%"
log "  Available: ${NEW_DISK_AVAILABLE}"

# Send alert
if [[ $FREED -gt 5 ]]; then
  send_alert "SUCCESS" "Disk cleanup freed ${FREED}%. Usage: ${DISK_USAGE}% → ${NEW_DISK_USAGE}%. Available: ${NEW_DISK_AVAILABLE}"
else
  send_alert "WARNING" "Disk cleanup completed but minimal space freed (${FREED}%). Disk still at ${NEW_DISK_USAGE}%. Available: ${NEW_DISK_AVAILABLE}"
fi

# If still above 90% after cleanup, escalate
if [[ $NEW_DISK_USAGE -gt 90 ]]; then
  log "CRITICAL: Disk usage still at ${NEW_DISK_USAGE}% after cleanup"
  send_alert "CRITICAL" "Disk usage at ${NEW_DISK_USAGE}% after cleanup. Manual intervention required. Available: ${NEW_DISK_AVAILABLE}"
  exit 1
fi

# If still above threshold but below 90%, warn
if [[ $NEW_DISK_USAGE -gt $THRESHOLD ]]; then
  log "WARNING: Disk usage still above threshold (${NEW_DISK_USAGE}%)"
  send_alert "WARNING" "Disk usage at ${NEW_DISK_USAGE}% after cleanup. Monitor closely. Available: ${NEW_DISK_AVAILABLE}"
fi

exit 0
