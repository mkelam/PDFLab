#!/bin/bash
################################################################################
# Auto-Optimize Database Script
# Optimizes MySQL tables for better performance
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

LOG_FILE="/var/log/auto-remediation.log"
MYSQL_CONTAINER="pdflab-mysql-prod"
DB_NAME="pdflab_production"
DB_USER="pdflab"
DB_PASS="***REMOVED***"

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

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  log "ERROR: MySQL container $MYSQL_CONTAINER not running"
  exit 1
fi

log "INFO: Starting database optimization for $DB_NAME"

# Get all tables
TABLES=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SHOW TABLES" 2>/dev/null | tail -n +2)

if [[ -z "$TABLES" ]]; then
  log "ERROR: Could not retrieve table list"
  exit 1
fi

TABLE_COUNT=$(echo "$TABLES" | wc -l)
log "INFO: Found $TABLE_COUNT tables to optimize"

OPTIMIZED=0
FAILED=0
START_TIME=$(date +%s)

# Optimize each table
while IFS= read -r TABLE; do
  log "INFO: Analyzing and optimizing table: $TABLE"

  # Analyze table
  ANALYZE_RESULT=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "ANALYZE TABLE \`$TABLE\`;" 2>/dev/null | tail -n +2 | awk '{print $3}')

  # Optimize table
  OPTIMIZE_RESULT=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "OPTIMIZE TABLE \`$TABLE\`;" 2>/dev/null | tail -n +2 | awk '{print $3}')

  if [[ "$OPTIMIZE_RESULT" == "OK" ]] || [[ "$OPTIMIZE_RESULT" == "Table" ]]; then
    log "SUCCESS: Table $TABLE optimized"
    ((OPTIMIZED++))
  else
    log "WARNING: Table $TABLE optimization returned: $OPTIMIZE_RESULT"
    ((FAILED++))
  fi

done <<< "$TABLES"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Get database size
DB_SIZE=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.TABLES
      WHERE table_schema = '$DB_NAME';" 2>/dev/null | tail -n +2)

# Get fragmentation info
FRAGMENTED_TABLES=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT COUNT(*)
      FROM information_schema.TABLES
      WHERE table_schema = '$DB_NAME'
      AND data_free > 0;" 2>/dev/null | tail -n +2)

log "SUCCESS: Database optimization completed"
log "  Duration: ${DURATION}s"
log "  Tables processed: $TABLE_COUNT"
log "  Successfully optimized: $OPTIMIZED"
log "  Failed: $FAILED"
log "  Database size: ${DB_SIZE}MB"
log "  Fragmented tables remaining: $FRAGMENTED_TABLES"

# Send alert
if [[ $FAILED -eq 0 ]]; then
  send_alert "INFO" "Database optimization completed successfully. Optimized $OPTIMIZED tables in ${DURATION}s. DB size: ${DB_SIZE}MB"
else
  send_alert "WARNING" "Database optimization completed with $FAILED failures. Optimized $OPTIMIZED/$TABLE_COUNT tables. Duration: ${DURATION}s"
fi

# Check for slow queries in the last hour
SLOW_QUERIES=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE time > 60;" 2>/dev/null | tail -n +2 || echo "0")

if [[ $SLOW_QUERIES -gt 0 ]]; then
  log "WARNING: Found $SLOW_QUERIES slow queries (>60s)"
  send_alert "WARNING" "Database has $SLOW_QUERIES slow queries running. Consider reviewing query performance."
fi

# Check connection count
CONNECTIONS=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" \
  -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -n +2 | awk '{print $2}')

MAX_CONNECTIONS=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" \
  -e "SHOW VARIABLES LIKE 'max_connections';" 2>/dev/null | tail -n +2 | awk '{print $2}')

if [[ -n "$CONNECTIONS" ]] && [[ -n "$MAX_CONNECTIONS" ]]; then
  CONN_PERCENT=$((CONNECTIONS * 100 / MAX_CONNECTIONS))
  log "INFO: Database connections: $CONNECTIONS/$MAX_CONNECTIONS (${CONN_PERCENT}%)"

  if [[ $CONN_PERCENT -gt 80 ]]; then
    send_alert "WARNING" "Database connection pool at ${CONN_PERCENT}% ($CONNECTIONS/$MAX_CONNECTIONS). Consider increasing max_connections."
  fi
fi

exit 0
