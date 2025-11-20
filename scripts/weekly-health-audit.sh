#!/bin/bash
################################################################################
# Weekly Health Audit Script
# Comprehensive system health check and report
################################################################################

set -euo pipefail

# Load environment variables
if [[ -f /var/pdflab/.env.monitoring ]]; then
  source /var/pdflab/.env.monitoring
fi

LOG_FILE="/var/log/weekly-audit.log"
REPORT_FILE="/tmp/weekly-health-report.txt"

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

# Start report
cat > "$REPORT_FILE" <<EOF
================================================================================
PDFLab Weekly Health Audit Report
Generated: $(date '+%Y-%m-%d %H:%M:%S')
================================================================================

EOF

log "INFO: Starting weekly health audit"

# ===========================
# 1. System Uptime
# ===========================
echo "=== System Uptime ===" >> "$REPORT_FILE"
uptime >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ===========================
# 2. Docker Container Status
# ===========================
echo "=== Docker Containers ===" >> "$REPORT_FILE"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Container health
echo "=== Container Health ===" >> "$REPORT_FILE"
for container in $(docker ps --format '{{.Names}}'); do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
  echo "$container: $HEALTH" >> "$REPORT_FILE"
done
echo "" >> "$REPORT_FILE"

# ===========================
# 3. Resource Usage
# ===========================
echo "=== Resource Usage ===" >> "$REPORT_FILE"
echo "Disk Usage:" >> "$REPORT_FILE"
df -h | grep -E '^/dev/' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "Memory Usage:" >> "$REPORT_FILE"
free -h >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "CPU Load:" >> "$REPORT_FILE"
top -bn1 | head -20 >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ===========================
# 4. Database Health
# ===========================
echo "=== Database Health ===" >> "$REPORT_FILE"

MYSQL_CONTAINER="pdflab-mysql-prod"
DB_USER="pdflab"
DB_PASS="***REMOVED***"
DB_NAME="pdflab_production"

if docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  # Database size
  DB_SIZE=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = '$DB_NAME';" 2>/dev/null | tail -n +2)

  echo "Database Size: ${DB_SIZE}MB" >> "$REPORT_FILE"

  # Table count
  TABLE_COUNT=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema = '$DB_NAME';" 2>/dev/null | tail -n +2)

  echo "Tables: $TABLE_COUNT" >> "$REPORT_FILE"

  # Connections
  CONNECTIONS=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" \
    -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -n +2 | awk '{print $2}')

  MAX_CONNECTIONS=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" \
    -e "SHOW VARIABLES LIKE 'max_connections';" 2>/dev/null | tail -n +2 | awk '{print $2}')

  echo "Connections: $CONNECTIONS/$MAX_CONNECTIONS" >> "$REPORT_FILE"

  # Slow queries
  SLOW_QUERIES=$(docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" \
    -e "SHOW STATUS LIKE 'Slow_queries';" 2>/dev/null | tail -n +2 | awk '{print $2}')

  echo "Slow Queries (all time): $SLOW_QUERIES" >> "$REPORT_FILE"
else
  echo "MySQL container not running!" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# 5. Redis Health
# ===========================
echo "=== Redis Health ===" >> "$REPORT_FILE"

REDIS_CONTAINER="pdflab-redis-prod"

if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
  # Memory
  MEMORY_INFO=$(docker exec "$REDIS_CONTAINER" redis-cli INFO memory 2>/dev/null)
  USED_MEMORY=$(echo "$MEMORY_INFO" | grep "^used_memory_human:" | cut -d: -f2 | tr -d '\r')
  MAX_MEMORY=$(echo "$MEMORY_INFO" | grep "^maxmemory_human:" | cut -d: -f2 | tr -d '\r')

  echo "Memory: $USED_MEMORY / $MAX_MEMORY" >> "$REPORT_FILE"

  # Keys
  KEYS=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE 2>/dev/null | awk '{print $1}')
  echo "Total Keys: $KEYS" >> "$REPORT_FILE"

  # Hit rate
  STATS=$(docker exec "$REDIS_CONTAINER" redis-cli INFO stats 2>/dev/null)
  HITS=$(echo "$STATS" | grep "^keyspace_hits:" | cut -d: -f2 | tr -d '\r')
  MISSES=$(echo "$STATS" | grep "^keyspace_misses:" | cut -d: -f2 | tr -d '\r')

  if [[ -n "$HITS" ]] && [[ -n "$MISSES" ]]; then
    TOTAL=$((HITS + MISSES))
    if [[ $TOTAL -gt 0 ]]; then
      HIT_RATE=$(awk "BEGIN {printf \"%.2f\", ($HITS / $TOTAL) * 100}")
      echo "Hit Rate: ${HIT_RATE}%" >> "$REPORT_FILE"
    fi
  fi
else
  echo "Redis container not running!" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# 6. Backup Status
# ===========================
echo "=== Backup Status ===" >> "$REPORT_FILE"

if [[ -d /var/pdflab/backups ]]; then
  LATEST_MYSQL=$(ls -t /var/pdflab/backups/mysql_*.sql.gz 2>/dev/null | head -1)
  LATEST_REDIS=$(ls -t /var/pdflab/backups/redis_*.rdb 2>/dev/null | head -1)

  if [[ -n "$LATEST_MYSQL" ]]; then
    MYSQL_DATE=$(stat -c%y "$LATEST_MYSQL" 2>/dev/null | cut -d' ' -f1)
    MYSQL_SIZE=$(du -h "$LATEST_MYSQL" | awk '{print $1}')
    echo "Latest MySQL Backup: $MYSQL_DATE ($MYSQL_SIZE)" >> "$REPORT_FILE"
  else
    echo "No MySQL backups found!" >> "$REPORT_FILE"
  fi

  if [[ -n "$LATEST_REDIS" ]]; then
    REDIS_DATE=$(stat -c%y "$LATEST_REDIS" 2>/dev/null | cut -d' ' -f1)
    REDIS_SIZE=$(du -h "$LATEST_REDIS" | awk '{print $1}')
    echo "Latest Redis Backup: $REDIS_DATE ($REDIS_SIZE)" >> "$REPORT_FILE"
  else
    echo "No Redis backups found!" >> "$REPORT_FILE"
  fi

  TOTAL_BACKUPS=$(find /var/pdflab/backups -type f \( -name "*.gz" -o -name "*.rdb" \) | wc -l)
  BACKUP_SIZE=$(du -sh /var/pdflab/backups | awk '{print $1}')

  echo "Total Backups: $TOTAL_BACKUPS ($BACKUP_SIZE)" >> "$REPORT_FILE"
else
  echo "Backup directory not found!" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# 7. Security Checks
# ===========================
echo "=== Security Checks ===" >> "$REPORT_FILE"

# Failed SSH attempts
FAILED_SSH=$(grep "Failed password" /var/log/auth.log 2>/dev/null | wc -l || echo 0)
echo "Failed SSH Attempts (all time): $FAILED_SSH" >> "$REPORT_FILE"

# Open ports
echo "Open Ports:" >> "$REPORT_FILE"
ss -tulpn | grep LISTEN >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"

# ===========================
# 8. SSL Certificate Status
# ===========================
echo "=== SSL Certificates ===" >> "$REPORT_FILE"

DOMAIN="pdflab.pro"
EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [[ -n "$EXPIRY_DATE" ]]; then
  EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
  CURRENT_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

  echo "Domain: $DOMAIN" >> "$REPORT_FILE"
  echo "Expires: $EXPIRY_DATE" >> "$REPORT_FILE"
  echo "Days Remaining: $DAYS_LEFT" >> "$REPORT_FILE"
else
  echo "Could not retrieve SSL certificate info" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# 9. Recent Errors
# ===========================
echo "=== Recent Errors (Last 24h) ===" >> "$REPORT_FILE"

if [[ -f /var/log/auto-remediation.log ]]; then
  grep "ERROR\|CRITICAL" /var/log/auto-remediation.log | tail -20 >> "$REPORT_FILE"
else
  echo "No error logs found" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# 10. Recommendations
# ===========================
echo "=== Recommendations ===" >> "$REPORT_FILE"

DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 80 ]]; then
  echo "⚠️  Disk usage at ${DISK_USAGE}% - consider cleanup" >> "$REPORT_FILE"
fi

if [[ -n "$CONNECTIONS" ]] && [[ -n "$MAX_CONNECTIONS" ]]; then
  CONN_PERCENT=$((CONNECTIONS * 100 / MAX_CONNECTIONS))
  if [[ $CONN_PERCENT -gt 70 ]]; then
    echo "⚠️  Database connections at ${CONN_PERCENT}% - monitor closely" >> "$REPORT_FILE"
  fi
fi

if [[ -n "$DAYS_LEFT" ]] && [[ $DAYS_LEFT -lt 30 ]]; then
  echo "⚠️  SSL certificate expires in $DAYS_LEFT days - renewal recommended" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ===========================
# End Report
# ===========================
echo "=================================================================================" >> "$REPORT_FILE"
echo "End of Weekly Health Audit Report" >> "$REPORT_FILE"
echo "=================================================================================" >> "$REPORT_FILE"

log "SUCCESS: Weekly health audit completed"

# Send report via email
REPORT_CONTENT=$(cat "$REPORT_FILE")
send_alert "INFO" "Weekly Health Audit Report:\n\n$REPORT_CONTENT"

# Cleanup
rm -f "$REPORT_FILE"

exit 0
