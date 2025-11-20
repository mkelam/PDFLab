#!/bin/bash

# ============================================
# Elite Health Guardian Agent - STAGING
# ============================================
# Level 5 Autonomous Health Management System
# Monitors, manages, and heals PDFLab STAGING infrastructure
# Created: 2025-11-20
# ============================================

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/pdflab-staging/logs/health-guardian.log"
METRICS_DB="pdflab_staging"
ALERT_EMAIL="mmkela@gmail.com"
PAUSE_FILE="/var/pdflab-staging/.guardian-paused"
ENVIRONMENT="staging"

# Container Names (Staging-specific)
MYSQL_CONTAINER="pdflab-mysql-staging"
REDIS_CONTAINER="pdflab-redis-staging"
BACKEND_CONTAINER="pdflab-backend-staging"
WORKER_CONTAINER="pdflab-worker-staging"
FRONTEND_CONTAINER="pdflab-frontend-staging"
PARTNERS_CONTAINER="pdflab-partners-staging"

# Database Credentials (Staging)
DB_USER="pdflab_staging"
DB_PASS="StagingDB2024UserPass"

# Load environment
if [ -f "/var/pdflab-staging/.env.monitoring" ]; then
    source /var/pdflab-staging/.env.monitoring
fi

# ============================================
# Utility Functions
# ============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [STAGING] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local severity="$1"
    local title="$2"
    local message="$3"

    # Send email alert (if configured)
    if [ -x "$SCRIPT_DIR/send-alert-email.sh" ]; then
        bash "$SCRIPT_DIR/send-alert-email.sh" "$severity" "[STAGING] $title" "$message"
    fi

    # Log to database
    docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$METRICS_DB" -e "
        INSERT INTO monitoring_alerts (id, alert_type, severity, environment, title, message, timestamp)
        VALUES (UUID(), 'health', LOWER('$severity'), 'staging', '$title', '$message', NOW());
    " 2>/dev/null || log "Failed to log alert to database"
}

check_pause() {
    if [ -f "$PAUSE_FILE" ]; then
        log "⏸️  Guardian Agent PAUSED - Remove $PAUSE_FILE to resume"
        exit 0
    fi
}

# ============================================
# Health Check Functions
# ============================================

check_container_health() {
    local container_name="$1"
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)

    if [ -z "$health_status" ]; then
        health_status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null)
    fi

    echo "$health_status"
}

check_memory_usage() {
    local container_name="$1"
    local memory_percent=$(docker stats --no-stream --format "{{.MemPerc}}" "$container_name" 2>/dev/null | sed 's/%//')

    echo "${memory_percent:-0}"
}

check_disk_space() {
    local usage=$(df /var/pdflab-staging 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ -z "$usage" ]; then
        usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    fi
    echo "$usage"
}

check_database_connectivity() {
    docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1" >/dev/null 2>&1
    echo $?
}

check_redis_connectivity() {
    docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1
    echo $?
}

# ============================================
# Auto-Remediation Actions
# ============================================

auto_restart_container() {
    local container_name="$1"
    local reason="$2"
    local start_time=$(date +%s)

    log "🔄 Auto-restarting $container_name (Reason: $reason)"

    docker restart "$container_name" >/dev/null 2>&1
    local restart_status=$?

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $restart_status -eq 0 ]; then
        log "✅ $container_name restarted successfully in ${duration}s"
        send_alert "SUCCESS" "$container_name Auto-Restart Successful" "Container restarted due to: $reason. Duration: ${duration}s"
    else
        log "❌ Failed to restart $container_name"
        send_alert "CRITICAL" "$container_name Auto-Restart FAILED" "Failed to restart container. Manual intervention required."
    fi

    return $restart_status
}

auto_clear_redis_cache() {
    local start_time=$(date +%s)
    local keys_before=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")

    log "🧹 Clearing Redis cache (Memory threshold exceeded)"

    docker exec "$REDIS_CONTAINER" redis-cli FLUSHDB >/dev/null 2>&1
    local clear_status=$?

    local keys_after=$(docker exec "$REDIS_CONTAINER" redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ $clear_status -eq 0 ]; then
        log "✅ Redis cache cleared successfully"
        send_alert "SUCCESS" "Redis Cache Cleared" "Cache automatically cleared. Keys: ${keys_before} → ${keys_after}"
    else
        log "❌ Failed to clear Redis cache"
        send_alert "WARNING" "Redis Cache Clear FAILED" "Failed to clear cache. Manual intervention may be required."
    fi

    return $clear_status
}

auto_cleanup_disk() {
    local start_time=$(date +%s)
    local disk_before=$(check_disk_space)

    log "🧹 Starting automatic disk cleanup"

    # Delete temp files >7 days
    local temp_deleted=$(find /var/pdflab-staging/storage/temp -type f -mtime +7 2>/dev/null | wc -l)
    find /var/pdflab-staging/storage/temp -type f -mtime +7 -delete 2>/dev/null

    # Delete old conversion jobs >30 days
    local output_deleted=$(find /var/pdflab-staging/storage/outputs -type f -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab-staging/storage/outputs -type f -mtime +30 -delete 2>/dev/null

    # Compress old logs
    find /var/pdflab-staging/logs -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null

    # Delete compressed logs >30 days
    local logs_deleted=$(find /var/pdflab-staging/logs -name "*.log.gz" -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab-staging/logs -name "*.log.gz" -mtime +30 -delete 2>/dev/null

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local disk_after=$(check_disk_space)
    local files_deleted=$((temp_deleted + output_deleted + logs_deleted))

    log "✅ Disk cleanup complete. Usage: ${disk_before}% → ${disk_after}%. Deleted: $files_deleted files"
    send_alert "SUCCESS" "Disk Cleanup Completed" "Disk usage reduced from ${disk_before}% to ${disk_after}%. Deleted $files_deleted files."
}

auto_optimize_database() {
    log "⚡ Optimizing database tables"

    docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$METRICS_DB" -e "
        OPTIMIZE TABLE users, conversion_jobs, subscriptions, health_checks;
    " >/dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "✅ Database optimization complete"
        send_alert "INFO" "Database Optimized" "Tables optimized successfully during maintenance"
        return 0
    else
        log "❌ Database optimization failed"
        return 1
    fi
}

# ============================================
# Decision Engine
# ============================================

monitor_backend() {
    local health=$(check_container_health "$BACKEND_CONTAINER")
    local memory=$(check_memory_usage "$BACKEND_CONTAINER")

    if [ "$health" = "unhealthy" ] || [ "$health" = "exited" ]; then
        log "⚠️  Backend is $health - initiating auto-restart"
        auto_restart_container "$BACKEND_CONTAINER" "Health status: $health"
    fi

    if (( $(echo "$memory > 80" | bc -l 2>/dev/null || echo 0) )); then
        log "⚠️  Backend memory usage high: ${memory}%"
        send_alert "WARNING" "Backend High Memory Usage" "Backend memory at ${memory}%. Monitoring for potential leak."
    fi
}

monitor_worker() {
    local health=$(check_container_health "$WORKER_CONTAINER")

    if [ "$health" = "unhealthy" ] || [ "$health" = "exited" ]; then
        log "⚠️  Worker is $health - initiating auto-restart"
        auto_restart_container "$WORKER_CONTAINER" "Health status: $health"
    fi
}

monitor_mysql() {
    local connectivity=$(check_database_connectivity)

    if [ $connectivity -ne 0 ]; then
        log "🔴 CRITICAL: MySQL database is not responding!"
        send_alert "CRITICAL" "MySQL Database DOWN" "Database connectivity check failed. Immediate attention required!"
    fi
}

monitor_redis() {
    local connectivity=$(check_redis_connectivity)
    local memory=$(check_memory_usage "$REDIS_CONTAINER")

    if [ $connectivity -ne 0 ]; then
        log "🔴 CRITICAL: Redis cache is not responding!"
        auto_restart_container "$REDIS_CONTAINER" "Connectivity check failed"
    fi

    if (( $(echo "$memory > 80" | bc -l 2>/dev/null || echo 0) )); then
        log "⚠️  Redis memory usage high: ${memory}% - clearing cache"
        auto_clear_redis_cache
    fi
}

monitor_disk_space() {
    local usage=$(check_disk_space)

    if [ $usage -gt 95 ]; then
        log "🔴 CRITICAL: Disk space at ${usage}%!"
        send_alert "CRITICAL" "Disk Space CRITICAL" "Disk usage at ${usage}%. Initiating emergency cleanup."
        auto_cleanup_disk
    elif [ $usage -gt 85 ]; then
        log "⚠️  Disk space at ${usage}% - initiating cleanup"
        auto_cleanup_disk
    fi
}

monitor_frontend() {
    local status=$(check_container_health "$FRONTEND_CONTAINER")

    if [ "$status" = "exited" ] || [ "$status" = "restarting" ]; then
        log "⚠️  Frontend is $status - initiating auto-restart"
        auto_restart_container "$FRONTEND_CONTAINER" "Status: $status"
    fi
}

monitor_partners() {
    local status=$(check_container_health "$PARTNERS_CONTAINER")

    if [ "$status" = "exited" ] || [ "$status" = "restarting" ]; then
        log "⚠️  Partners portal is $status - initiating auto-restart"
        auto_restart_container "$PARTNERS_CONTAINER" "Status: $status"
    fi
}

# ============================================
# Main Monitoring Loop
# ============================================

main() {
    # Check if paused
    check_pause

    log "🤖 Elite Health Guardian - Running health checks (STAGING)"

    # Monitor all services
    monitor_backend
    monitor_worker
    monitor_mysql
    monitor_redis
    monitor_frontend
    monitor_partners
    monitor_disk_space

    log "✅ Health check cycle complete"
}

# ============================================
# Execute
# ============================================

main "$@"
