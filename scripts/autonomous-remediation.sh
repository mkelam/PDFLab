#!/bin/bash
# Autonomous Remediation Script - Runs every 5 minutes via cron
# Auto-fixes common production issues without human intervention

LOG_FILE="/var/log/pdflab/remediation.log"
API_URL="http://localhost:3006/api/admin/monitoring/remediation-log"
THRESHOLD_DISK=85
THRESHOLD_MEMORY=80
THRESHOLD_CPU=90

# Ensure log directory exists
mkdir -p /var/log/pdflab

log_action() {
  local message=$1
  local action_type=$2
  local target=$3
  local status=$4

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$status] $message" >> "$LOG_FILE"

  # Also log to database via API (fire and forget)
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"action_type\": \"$action_type\",
      \"target\": \"$target\",
      \"reason\": \"$message\",
      \"status\": \"$status\"
    }" > /dev/null 2>&1 || true
}

# 1. CHECK DISK SPACE
check_disk_space() {
  disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ "$disk_usage" -gt "$THRESHOLD_DISK" ]; then
    log_action "Disk usage at ${disk_usage}% - executing cleanup" "disk_cleanup" "root_volume" "in_progress"

    # Clean Docker resources (older than 72 hours)
    docker system prune -af --volumes --filter "until=72h" > /dev/null 2>&1

    # Clean old logs
    find /var/log -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null
    find /var/log -name "*.gz" -mtime +30 -delete 2>/dev/null

    # Clean conversion job storage (older than 24 hours)
    find /var/pdflab/app/backend/storage/uploads -type f -mtime +1 -delete 2>/dev/null

    new_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    log_action "Disk cleanup complete: ${disk_usage}% → ${new_usage}%" "disk_cleanup" "root_volume" "success"
  fi
}

# 2. CHECK CONTAINER HEALTH
check_container_health() {
  # Check for unhealthy containers
  unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null)

  if [ -n "$unhealthy" ]; then
    for container in $unhealthy; do
      log_action "Container $container is unhealthy - restarting" "restart" "$container" "in_progress"
      docker restart "$container" > /dev/null 2>&1
      sleep 10

      # Verify restart
      if docker ps --filter "name=$container" --filter "health=healthy" | grep -q "$container"; then
        log_action "Container $container restarted successfully" "restart" "$container" "success"
      else
        # Check if just running (no health check defined)
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
          log_action "Container $container restarted (running but no health check)" "restart" "$container" "success"
        else
          log_action "Container $container restart FAILED" "restart" "$container" "failed"
        fi
      fi
    done
  fi

  # Also check for exited containers that should be running
  exited=$(docker ps -a --filter "status=exited" --filter "name=pdflab" --format "{{.Names}}" 2>/dev/null)

  if [ -n "$exited" ]; then
    for container in $exited; do
      log_action "Container $container is stopped - starting" "restart" "$container" "in_progress"
      docker start "$container" > /dev/null 2>&1
      sleep 5

      if docker ps --filter "name=$container" | grep -q "$container"; then
        log_action "Container $container started successfully" "restart" "$container" "success"
      else
        log_action "Container $container start FAILED" "restart" "$container" "failed"
      fi
    done
  fi
}

# 3. CHECK REDIS MEMORY
check_redis_memory() {
  # Get Redis memory usage
  redis_used=$(docker exec pdflab-redis-prod redis-cli INFO memory 2>/dev/null | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
  redis_max=$(docker exec pdflab-redis-prod redis-cli CONFIG GET maxmemory 2>/dev/null | tail -1 | tr -d '\r')

  # Skip if Redis is not running or maxmemory is 0 (unlimited)
  if [ -z "$redis_used" ] || [ "$redis_max" = "0" ]; then
    return
  fi

  # Calculate percentage
  usage_percent=$((redis_used * 100 / redis_max))

  if [ "$usage_percent" -gt "$THRESHOLD_MEMORY" ]; then
    log_action "Redis memory at ${usage_percent}% - clearing volatile keys" "cache_clear" "redis" "in_progress"

    # Delete temporary keys
    docker exec pdflab-redis-prod redis-cli --scan --pattern "temp:*" 2>/dev/null | xargs -r docker exec -i pdflab-redis-prod redis-cli DEL 2>/dev/null
    docker exec pdflab-redis-prod redis-cli --scan --pattern "session:*:expired" 2>/dev/null | xargs -r docker exec -i pdflab-redis-prod redis-cli DEL 2>/dev/null

    log_action "Redis cache cleared successfully" "cache_clear" "redis" "success"
  fi
}

# 4. CHECK DATABASE CONNECTIONS
check_database_connections() {
  # Get active DB connections
  active=$(docker exec pdflab-mysql-prod mysql -e "SHOW STATUS LIKE 'Threads_connected'" 2>/dev/null | tail -1 | awk '{print $2}')
  max=$(docker exec pdflab-mysql-prod mysql -e "SHOW VARIABLES LIKE 'max_connections'" 2>/dev/null | tail -1 | awk '{print $2}')

  # Skip if MySQL is not running
  if [ -z "$active" ] || [ -z "$max" ]; then
    return
  fi

  usage_percent=$((active * 100 / max))

  if [ "$usage_percent" -gt 85 ]; then
    log_action "Database connections at ${usage_percent}% (${active}/${max}) - restarting backend" "restart" "backend" "in_progress"
    docker restart pdflab-backend-prod > /dev/null 2>&1
    sleep 15

    # Verify backend is healthy
    if curl -sf http://localhost:3006/health > /dev/null 2>&1; then
      log_action "Backend restarted successfully to clear stale DB connections" "restart" "backend" "success"
    else
      log_action "Backend restart completed but health check FAILED" "restart" "backend" "failed"
    fi
  fi
}

# 5. CHECK SSL CERTIFICATE EXPIRATION
check_ssl_certificate() {
  # Get certificate expiration date
  expiry_date=$(echo | openssl s_client -servername pdflab.pro -connect pdflab.pro:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  # Skip if unable to get certificate
  if [ -z "$expiry_date" ]; then
    return
  fi

  expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
  current_epoch=$(date +%s)
  days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

  if [ "$days_until_expiry" -lt 30 ] && [ "$days_until_expiry" -gt 0 ]; then
    log_action "SSL certificate expires in $days_until_expiry days - attempting renewal" "ssl_renew" "pdflab.pro" "in_progress"

    # Try to renew certificate
    if command -v certbot > /dev/null 2>&1; then
      certbot renew --quiet --deploy-hook "docker restart pdflab-nginx-prod" 2>/dev/null

      # Check if renewal was successful
      new_expiry_date=$(echo | openssl s_client -servername pdflab.pro -connect pdflab.pro:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

      if [ "$new_expiry_date" != "$expiry_date" ]; then
        log_action "SSL certificate renewed successfully" "ssl_renew" "pdflab.pro" "success"
      else
        log_action "SSL renewal attempted but certificate unchanged (may not be due for renewal yet)" "ssl_renew" "pdflab.pro" "info"
      fi
    else
      log_action "Certbot not installed - cannot auto-renew SSL" "ssl_renew" "pdflab.pro" "failed"
    fi
  fi
}

# 6. CHECK BACKEND API HEALTH
check_backend_health() {
  # Test backend health endpoint
  if ! curl -sf http://localhost:3006/health > /dev/null 2>&1; then
    log_action "Backend health check FAILED - restarting" "restart" "backend" "in_progress"
    docker restart pdflab-backend-prod > /dev/null 2>&1
    sleep 15

    # Re-check health
    if curl -sf http://localhost:3006/health > /dev/null 2>&1; then
      log_action "Backend restarted successfully - health restored" "restart" "backend" "success"
    else
      log_action "Backend restart FAILED - health still degraded" "restart" "backend" "failed"
    fi
  fi
}

# 7. CHECK FRONTEND HEALTH
check_frontend_health() {
  # Test frontend (basic connectivity check)
  if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log_action "Frontend not responding - restarting" "restart" "frontend" "in_progress"
    docker restart pdflab-frontend-prod > /dev/null 2>&1
    sleep 10

    # Re-check
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
      log_action "Frontend restarted successfully" "restart" "frontend" "success"
    else
      log_action "Frontend restart FAILED" "restart" "frontend" "failed"
    fi
  fi
}

# MAIN EXECUTION
echo "=== Starting remediation check at $(date) ===" >> "$LOG_FILE"

check_disk_space
check_container_health
check_redis_memory
check_database_connections
check_backend_health
check_frontend_health
check_ssl_certificate

echo "=== Remediation check complete ===" >> "$LOG_FILE"

# Rotate log file if it gets too large (>10MB)
if [ -f "$LOG_FILE" ]; then
  log_size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
  if [ "$log_size" -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d)"
    gzip "${LOG_FILE}.$(date +%Y%m%d)"
    touch "$LOG_FILE"
  fi
fi
