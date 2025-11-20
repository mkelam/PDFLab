#!/bin/bash
################################################################################
# Auto-Restart Container Script
# Restarts unhealthy Docker containers with safety checks
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

CONTAINER=$1
MAX_RESTARTS=${MAX_RESTARTS:-3}
COOLDOWN=${COOLDOWN:-300}  # 5 minutes
LOG_FILE="/var/log/auto-remediation.log"
STATE_DIR="/var/pdflab/state"

mkdir -p "$STATE_DIR"

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

# Validate input
if [[ -z "$CONTAINER" ]]; then
  log "ERROR: Container name required"
  exit 1
fi

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  log "ERROR: Container $CONTAINER does not exist"
  exit 1
fi

# Check restart count in last hour
RESTART_COUNT_FILE="$STATE_DIR/${CONTAINER}.restart_count"
CURRENT_TIME=$(date +%s)

# Reset counter if older than 1 hour
if [[ -f "$RESTART_COUNT_FILE" ]]; then
  LAST_RESTART=$(cat "$RESTART_COUNT_FILE")
  TIME_DIFF=$((CURRENT_TIME - LAST_RESTART))

  if [[ $TIME_DIFF -lt 3600 ]]; then
    # Within last hour - check count
    COUNT_FILE="$STATE_DIR/${CONTAINER}.count"
    if [[ -f "$COUNT_FILE" ]]; then
      COUNT=$(cat "$COUNT_FILE")
    else
      COUNT=0
    fi

    if [[ $COUNT -ge $MAX_RESTARTS ]]; then
      log "ERROR: Container $CONTAINER has been restarted $COUNT times in last hour (max: $MAX_RESTARTS)"
      send_alert "CRITICAL" "Container $CONTAINER in restart loop. Manual intervention required. Restart count: $COUNT/hour"
      exit 1
    fi

    # Increment count
    echo $((COUNT + 1)) > "$COUNT_FILE"
  else
    # More than 1 hour - reset counter
    echo 1 > "$COUNT_FILE"
  fi
else
  # First restart
  echo 1 > "$COUNT_FILE"
fi

# Record restart time
echo "$CURRENT_TIME" > "$RESTART_COUNT_FILE"

# Get current status
CURRENT_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "none")

log "INFO: Restarting container $CONTAINER (status: $CURRENT_STATUS, health: $HEALTH_STATUS)"

# Restart container
if docker restart "$CONTAINER"; then
  log "SUCCESS: Container $CONTAINER restart initiated"
else
  log "ERROR: Failed to restart container $CONTAINER"
  send_alert "CRITICAL" "Failed to restart container $CONTAINER"
  exit 1
fi

# Wait for container to stabilize
log "INFO: Waiting 30 seconds for container to stabilize..."
sleep 30

# Verify healthy
NEW_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
NEW_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "none")

if [[ "$NEW_STATUS" == "running" ]]; then
  if [[ "$NEW_HEALTH" == "healthy" ]] || [[ "$NEW_HEALTH" == "none" ]]; then
    log "SUCCESS: Container $CONTAINER restarted successfully (status: $NEW_STATUS, health: $NEW_HEALTH)"
    send_alert "SUCCESS" "Container $CONTAINER restarted successfully. Status: $NEW_STATUS, Health: $NEW_HEALTH"
    exit 0
  else
    log "WARNING: Container $CONTAINER running but unhealthy (health: $NEW_HEALTH)"
    send_alert "WARNING" "Container $CONTAINER restarted but health check failed. Health: $NEW_HEALTH"
    exit 1
  fi
else
  log "ERROR: Container $CONTAINER restart failed (status: $NEW_STATUS)"
  send_alert "CRITICAL" "Container $CONTAINER restart failed. Status: $NEW_STATUS"
  exit 1
fi
