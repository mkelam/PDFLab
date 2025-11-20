#!/bin/bash
################################################################################
# Auto-Clear Redis Cache Script
# Clears Redis cache when memory usage exceeds threshold
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

THRESHOLD=${CACHE_THRESHOLD:-80}  # Clear cache when >80%
LOG_FILE="/var/log/auto-remediation.log"
REDIS_CONTAINER="pdflab-redis-prod"

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

# Check if Redis container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
  log "ERROR: Redis container $REDIS_CONTAINER not running"
  exit 1
fi

# Get memory info
MEMORY_INFO=$(docker exec "$REDIS_CONTAINER" redis-cli INFO memory 2>/dev/null)

if [[ -z "$MEMORY_INFO" ]]; then
  log "ERROR: Could not retrieve Redis memory info"
  exit 1
fi

# Extract memory values
USED_MEMORY=$(echo "$MEMORY_INFO" | grep "^used_memory:" | cut -d: -f2 | tr -d '\r')
MAX_MEMORY=$(echo "$MEMORY_INFO" | grep "^maxmemory:" | cut -d: -f2 | tr -d '\r')

# If maxmemory is 0, Redis has no limit (use system memory)
if [[ "$MAX_MEMORY" == "0" ]]; then
  TOTAL_MEMORY=$(echo "$MEMORY_INFO" | grep "^total_system_memory:" | cut -d: -f2 | tr -d '\r')
  MAX_MEMORY=$TOTAL_MEMORY
fi

# Calculate percentage
if [[ -n "$USED_MEMORY" ]] && [[ -n "$MAX_MEMORY" ]] && [[ "$MAX_MEMORY" != "0" ]]; then
  PERCENT=$(awk "BEGIN {printf \"%.0f\", ($USED_MEMORY / $MAX_MEMORY) * 100}")
else
  log "ERROR: Could not calculate memory percentage"
  exit 1
fi

# Convert to human-readable
USED_MB=$(awk "BEGIN {printf \"%.2f\", $USED_MEMORY / 1048576}")
MAX_MB=$(awk "BEGIN {printf \"%.2f\", $MAX_MEMORY / 1048576}")

log "INFO: Redis memory usage: ${USED_MB}MB / ${MAX_MB}MB (${PERCENT}%)"

# Check if threshold exceeded
if [[ $PERCENT -lt $THRESHOLD ]]; then
  log "INFO: Memory usage (${PERCENT}%) below threshold (${THRESHOLD}%) - no action needed"
  exit 0
fi

log "WARNING: Redis memory at ${PERCENT}% - threshold ${THRESHOLD}% exceeded - initiating cleanup"

# Record pre-cleanup stats
KEYS_BEFORE=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE | awk '{print $2}')

# Step 1: Clear temporary keys (pattern: temp:*)
log "INFO: Clearing temporary keys (temp:*)"
TEMP_CLEARED=$(docker exec "$REDIS_CONTAINER" redis-cli --scan --pattern "temp:*" 2>/dev/null | \
  xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL 2>/dev/null | wc -l)

log "INFO: Cleared $TEMP_CLEARED temporary keys"

# Step 2: Clear expired keys
log "INFO: Clearing expired keys"
docker exec "$REDIS_CONTAINER" redis-cli --scan --pattern "*" 2>/dev/null | while read -r key; do
  TTL=$(docker exec "$REDIS_CONTAINER" redis-cli TTL "$key" 2>/dev/null)
  if [[ "$TTL" == "-1" ]]; then
    # Key has no expiration - skip
    continue
  elif [[ "$TTL" -le 0 ]]; then
    # Key is expired
    docker exec "$REDIS_CONTAINER" redis-cli DEL "$key" > /dev/null 2>&1
  fi
done

# Step 3: Force memory purge
log "INFO: Running memory purge"
docker exec "$REDIS_CONTAINER" redis-cli MEMORY PURGE > /dev/null 2>&1 || true

# Step 4: Clear session keys older than 7 days (if using sessions)
log "INFO: Clearing old session keys"
SESSION_CLEARED=$(docker exec "$REDIS_CONTAINER" redis-cli --scan --pattern "sess:*" 2>/dev/null | \
  head -1000 | xargs -r docker exec "$REDIS_CONTAINER" redis-cli DEL 2>/dev/null | wc -l)

log "INFO: Cleared $SESSION_CLEARED old session keys"

# Wait for cleanup to complete
sleep 2

# Check new memory usage
NEW_MEMORY_INFO=$(docker exec "$REDIS_CONTAINER" redis-cli INFO memory 2>/dev/null)
NEW_USED=$(echo "$NEW_MEMORY_INFO" | grep "^used_memory:" | cut -d: -f2 | tr -d '\r')
NEW_PERCENT=$(awk "BEGIN {printf \"%.0f\", ($NEW_USED / $MAX_MEMORY) * 100}")
NEW_USED_MB=$(awk "BEGIN {printf \"%.2f\", $NEW_USED / 1048576}")

KEYS_AFTER=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE | awk '{print $2}')
KEYS_REMOVED=$((KEYS_BEFORE - KEYS_AFTER))

FREED=$((PERCENT - NEW_PERCENT))
FREED_MB=$(awk "BEGIN {printf \"%.2f\", ($USED_MEMORY - $NEW_USED) / 1048576}")

log "SUCCESS: Cache cleanup completed"
log "  Before: ${USED_MB}MB (${PERCENT}%) - $KEYS_BEFORE keys"
log "  After:  ${NEW_USED_MB}MB (${NEW_PERCENT}%) - $KEYS_AFTER keys"
log "  Freed:  ${FREED_MB}MB (${FREED}%) - $KEYS_REMOVED keys removed"

# Send alert
if [[ $FREED -gt 10 ]]; then
  send_alert "SUCCESS" "Redis cache cleared successfully. Freed ${FREED_MB}MB (${FREED}%). Memory: ${PERCENT}% → ${NEW_PERCENT}%"
else
  send_alert "WARNING" "Redis cache cleared but minimal space freed (${FREED_MB}MB). Memory still at ${NEW_PERCENT}%. Consider increasing maxmemory or reviewing cache strategy."
fi

# If still above threshold after cleanup, escalate
if [[ $NEW_PERCENT -gt $THRESHOLD ]]; then
  log "WARNING: Memory still above threshold after cleanup (${NEW_PERCENT}%)"
  send_alert "CRITICAL" "Redis memory at ${NEW_PERCENT}% after cleanup. Manual intervention may be required."
  exit 1
fi

exit 0
