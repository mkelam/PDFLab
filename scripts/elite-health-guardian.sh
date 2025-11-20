#!/bin/bash

# ============================================
# Elite Health Guardian Agent
# ============================================
# Level 5 Autonomous Health Management System
# Monitors, manages, and heals PDFLab infrastructure
# Created: 2025-11-16
# ============================================

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/pdflab/logs/health-guardian.log"
METRICS_DB="pdflab_production"
ALERT_EMAIL="mmkela@gmail.com"
PAUSE_FILE="/var/pdflab/.guardian-paused"

# Load environment
if [ -f "/var/pdflab/.env.monitoring" ]; then
    source /var/pdflab/.env.monitoring
fi

# ============================================
# Utility Functions
# ============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local severity="$1"
    local title="$2"
    local message="$3"

    bash "$SCRIPT_DIR/send-alert-email.sh" "$severity" "$title" "$message"

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO monitoring_alerts (id, alert_type, severity, environment, title, message, timestamp)
        VALUES (UUID(), 'health', LOWER('$severity'), 'prod', '$title', '$message', NOW());
    " 2>/dev/null
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
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "$usage"
}

check_database_connectivity() {
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** -e "SELECT 1" >/dev/null 2>&1
    echo $?
}

check_redis_connectivity() {
    docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli ping >/dev/null 2>&1
    echo $?
}

# ============================================
# Auto-Remediation Actions
# ============================================

auto_restart_container() {
    local container_name="$1"
    local reason="$2"
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "$container_name" 2>/dev/null || echo "0")

    log "🔄 Auto-restarting $container_name (Reason: $reason)"

    docker restart "$container_name" >/dev/null 2>&1
    local restart_status=$?

    # Capture metrics after
    sleep 2
    local memory_after=$(check_memory_usage "$container_name" 2>/dev/null || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Determine status
    local status="failed"
    local error_msg=""
    if [ $restart_status -eq 0 ]; then
        status="success"
        log "✅ $container_name restarted successfully"
        send_alert "SUCCESS" "$container_name Auto-Restart Successful" "Container restarted due to: $reason. Duration: ${duration}s"
    else
        status="failed"
        error_msg="Docker restart command failed with exit code $restart_status"
        log "❌ Failed to restart $container_name"
        send_alert "CRITICAL" "$container_name Auto-Restart FAILED" "Failed to restart container. Manual intervention required."
    fi

    # Escape single quotes for SQL
    local reason_escaped=$(echo "$reason" | sed "s/'/''/g")
    local error_msg_escaped=$(echo "$error_msg" | sed "s/'/''/g")

    # Log to remediation_log table
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status, error_message)
        VALUES (
            '$action_id',
            NOW(),
            'restart',
            '$container_name',
            '$reason_escaped',
            '{\"memory_percent\": $memory_before}',
            '{\"memory_percent\": $memory_after}',
            $duration,
            '$status',
            '$error_msg_escaped'
        );
    " 2>/dev/null

    return $restart_status
}

auto_clear_redis_cache() {
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod" 2>/dev/null || echo "0")
    local keys_before=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")

    log "🧹 Clearing Redis cache (Memory threshold exceeded)"

    docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli FLUSHDB >/dev/null 2>&1
    local clear_status=$?

    # Capture metrics after
    sleep 1
    local memory_after=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod" 2>/dev/null || echo "0")
    local keys_after=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local status="failed"
    local error_msg=""
    if [ $clear_status -eq 0 ]; then
        status="success"
        log "✅ Redis cache cleared successfully"
        send_alert "SUCCESS" "Redis Cache Cleared" "Cache automatically cleared. Memory: ${memory_before}% → ${memory_after}%. Keys: ${keys_before} → ${keys_after}"
    else
        status="failed"
        error_msg="Redis FLUSHDB command failed with exit code $clear_status"
        log "❌ Failed to clear Redis cache"
        send_alert "WARNING" "Redis Cache Clear FAILED" "Failed to clear cache. Manual intervention may be required."
    fi

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status, error_message)
        VALUES (
            '$action_id',
            NOW(),
            'cache_clear',
            'redis',
            'Memory exceeded 80% threshold',
            '{\"memory_percent\": $memory_before, \"keys\": $keys_before}',
            '{\"memory_percent\": $memory_after, \"keys\": $keys_after}',
            $duration,
            '$status',
            '$error_msg'
        );
    " 2>/dev/null

    return $clear_status
}

auto_cleanup_disk() {
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local disk_before=$(check_disk_space)

    log "🧹 Starting automatic disk cleanup"

    # Delete temp files >7 days
    local temp_deleted=$(find /var/pdflab/storage/temp -type f -mtime +7 2>/dev/null | wc -l)
    find /var/pdflab/storage/temp -type f -mtime +7 -delete 2>/dev/null

    # Delete old conversion jobs >30 days
    local output_deleted=$(find /var/pdflab/storage/outputs -type f -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab/storage/outputs -type f -mtime +30 -delete 2>/dev/null

    # Compress old logs
    find /var/pdflab/logs -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null

    # Delete compressed logs >30 days
    local logs_deleted=$(find /var/pdflab/logs -name "*.log.gz" -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab/logs -name "*.log.gz" -mtime +30 -delete 2>/dev/null

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Capture metrics after
    local disk_after=$(check_disk_space)
    local files_deleted=$((temp_deleted + output_deleted + logs_deleted))

    log "✅ Disk cleanup complete. Usage: ${disk_before}% → ${disk_after}%. Deleted: $files_deleted files"
    send_alert "SUCCESS" "Disk Cleanup Completed" "Disk usage reduced from ${disk_before}% to ${disk_after}%. Deleted $files_deleted files."

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status)
        VALUES (
            '$action_id',
            NOW(),
            'disk_cleanup',
            '/var/pdflab/storage',
            'Disk usage exceeded 85% threshold',
            '{\"disk_percent\": $disk_before, \"files_found\": $files_deleted}',
            '{\"disk_percent\": $disk_after, \"files_deleted\": $files_deleted}',
            $duration,
            'success'
        );
    " 2>/dev/null
}

auto_optimize_database() {
    log "⚡ Optimizing database tables"

    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        OPTIMIZE TABLE users, conversions, subscriptions, health_checks, drift_checks;
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
    local health=$(check_container_health "pdflab-backend-prod")
    local memory=$(check_memory_usage "pdflab-backend-prod")

    if [ "$health" = "unhealthy" ] || [ "$health" = "exited" ]; then
        log "⚠️  Backend is $health - initiating auto-restart"
        auto_restart_container "pdflab-backend-prod" "Health status: $health"
    fi

    if (( $(echo "$memory > 80" | bc -l) )); then
        log "⚠️  Backend memory usage high: ${memory}%"
        send_alert "WARNING" "Backend High Memory Usage" "Backend memory at ${memory}%. Monitoring for potential leak."
    fi

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO health_checks (id, environment, timestamp, overall_status, services_healthy, services_unhealthy, backend_status)
        VALUES (UUID(), 'prod', NOW(),
            CASE WHEN '$health' = 'healthy' OR '$health' = 'running' THEN 'healthy' ELSE 'unhealthy' END,
            CASE WHEN '$health' = 'healthy' OR '$health' = 'running' THEN 1 ELSE 0 END,
            CASE WHEN '$health' != 'healthy' AND '$health' != 'running' THEN 1 ELSE 0 END,
            CASE WHEN '$health' = 'healthy' OR '$health' = 'running' THEN 'healthy' ELSE 'unhealthy' END
        );
    " 2>/dev/null
}

monitor_worker() {
    local health=$(check_container_health "pdflab-worker-prod")

    if [ "$health" = "unhealthy" ] || [ "$health" = "exited" ]; then
        log "⚠️  Worker is $health - initiating auto-restart"
        auto_restart_container "pdflab-worker-prod" "Health status: $health"
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
    local memory=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod")

    if [ $connectivity -ne 0 ]; then
        log "🔴 CRITICAL: Redis cache is not responding!"
        auto_restart_container "54dfd3ac119a_pdflab-redis-prod" "Connectivity check failed"
    fi

    if (( $(echo "$memory > 80" | bc -l) )); then
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

monitor_ssl_certificate() {
    local domain="pdflab.pro"
    local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -n "$expiry_date" ]; then
        local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

        if [ $days_until_expiry -lt 7 ]; then
            log "🔴 SSL certificate expires in $days_until_expiry days!"
            send_alert "CRITICAL" "SSL Certificate Expiring Soon" "Certificate expires in $days_until_expiry days. Auto-renewal needed."

            # Try auto-renewal with certbot
            certbot renew --nginx --quiet 2>/dev/null
            if [ $? -eq 0 ]; then
                send_alert "SUCCESS" "SSL Certificate Renewed" "Certificate auto-renewed successfully"
            fi
        elif [ $days_until_expiry -lt 30 ]; then
            log "ℹ️  SSL certificate expires in $days_until_expiry days"
            send_alert "INFO" "SSL Certificate Expiring" "Certificate expires in $days_until_expiry days. Renewal scheduled."
        fi
    fi
}

collect_resource_metrics() {
    # Get disk stats
    local disk_stats=$(df / | tail -1 | awk '{print $5, $3, $2}')
    local disk_percent=$(echo "$disk_stats" | awk '{print $1}' | sed 's/%//')
    local disk_used_kb=$(echo "$disk_stats" | awk '{print $2}')
    local disk_total_kb=$(echo "$disk_stats" | awk '{print $3}')
    local disk_used_gb=$(echo "scale=2; $disk_used_kb / 1024 / 1024" | bc 2>/dev/null || echo "0")
    local disk_total_gb=$(echo "scale=2; $disk_total_kb / 1024 / 1024" | bc 2>/dev/null || echo "0")

    # Get memory usage per container (with error handling)
    local backend_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-backend-prod 2>/dev/null | sed 's/%//' || echo "0")
    local worker_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-worker-prod 2>/dev/null | sed 's/%//' || echo "0")
    local redis_mem=$(docker stats --no-stream --format '{{.MemPerc}}' 54dfd3ac119a_pdflab-redis-prod 2>/dev/null | sed 's/%//' || echo "0")
    local mysql_mem=$(docker stats --no-stream --format '{{.MemPerc}}' 57d5d601930a_pdflab-mysql-prod 2>/dev/null | sed 's/%//' || echo "0")
    local frontend_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-frontend-prod 2>/dev/null | sed 's/%//' || echo "0")
    local partners_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-partners-prod 2>/dev/null | sed 's/%//' || echo "0")

    # Clean up values (remove any trailing characters)
    backend_mem=$(echo "$backend_mem" | awk '{print $1}')
    worker_mem=$(echo "$worker_mem" | awk '{print $1}')
    redis_mem=$(echo "$redis_mem" | awk '{print $1}')
    mysql_mem=$(echo "$mysql_mem" | awk '{print $1}')
    frontend_mem=$(echo "$frontend_mem" | awk '{print $1}')
    partners_mem=$(echo "$partners_mem" | awk '{print $1}')

    # Get Redis stats
    local redis_keys=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")

    # Calculate Redis hit rate from INFO STATS
    local redis_hits=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli INFO STATS 2>/dev/null | grep keyspace_hits | cut -d: -f2 | tr -d '\r' || echo "0")
    local redis_misses=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli INFO STATS 2>/dev/null | grep keyspace_misses | cut -d: -f2 | tr -d '\r' || echo "0")
    local redis_hit_rate="0"
    if [ "$redis_hits" != "0" ] || [ "$redis_misses" != "0" ]; then
        redis_hit_rate=$(echo "scale=4; $redis_hits / ($redis_hits + $redis_misses)" | bc 2>/dev/null || echo "0")
    fi

    # Insert into resource_metrics table
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO resource_metrics (
            id, timestamp,
            disk_used_percent, disk_used_gb, disk_total_gb,
            backend_memory_percent, worker_memory_percent, redis_memory_percent, mysql_memory_percent,
            frontend_memory_percent, partners_memory_percent,
            redis_keys, redis_hit_rate
        ) VALUES (
            UUID(), NOW(),
            $disk_percent, $disk_used_gb, $disk_total_gb,
            $backend_mem, $worker_mem, $redis_mem, $mysql_mem,
            $frontend_mem, $partners_mem,
            $redis_keys, $redis_hit_rate
        );
    " 2>/dev/null
}

# ============================================
# Main Monitoring Loop
# ============================================

monitor_frontend() {
    local status=$(check_container_health "pdflab-frontend-prod")

    if [ "$status" = "exited" ] || [ "$status" = "restarting" ]; then
        log "⚠️  Frontend is $status - initiating auto-restart"
        auto_restart_container "pdflab-frontend-prod" "Status: $status"
    fi
}

monitor_partners() {
    local status=$(check_container_health "pdflab-partners-prod")

    if [ "$status" = "exited" ] || [ "$status" = "restarting" ]; then
        log "⚠️  Partners portal is $status - initiating auto-restart"
        auto_restart_container "pdflab-partners-prod" "Status: $status"
    fi
}

main() {
    # Check if paused
    check_pause

    log "🤖 Elite Health Guardian - Running health checks"

    # Monitor all 6 services
    monitor_backend
    monitor_worker
    monitor_mysql
    monitor_redis
    monitor_frontend
    monitor_partners
    monitor_disk_space

    # Collect resource metrics every run
    collect_resource_metrics

    # Periodic checks (run less frequently)
    local minute=$(date +%M)

    # Run SSL check once per hour (at :00)
    if [ "$minute" = "00" ]; then
        monitor_ssl_certificate
    fi

    # Run database optimization weekly (Sunday 2 AM)
    if [ "$(date +%u)" = "7" ] && [ "$(date +%H)" = "02" ] && [ "$minute" = "00" ]; then
        auto_optimize_database
    fi

    log "✅ Health check cycle complete"
}

# ============================================
# Execute
# ============================================

main "$@"
