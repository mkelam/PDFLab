#!/bin/bash
# Container monitoring and auto-recovery script
# Run this in production to ensure backend always stays healthy

set -e

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-pdflab-backend-prod}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3006/health}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"  # seconds
MAX_FAILURES="${MAX_FAILURES:-3}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# State tracking
FAILURE_COUNT=0
LAST_RESTART_TIME=0
RESTART_COOLDOWN=300  # 5 minutes between restarts

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

# Send notification (email or webhook)
send_notification() {
    local message="$1"
    log_warning "ALERT: $message"

    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "PDFLab Backend Alert" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi

    # Add webhook notification here if needed
    # curl -X POST "https://hooks.slack.com/..." -d "{\"text\": \"$message\"}"
}

# Check if container is running
is_container_running() {
    docker ps --filter "name=$CONTAINER_NAME" --format '{{.Names}}' | grep -q "$CONTAINER_NAME"
}

# Check container health status
check_container_health() {
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    echo "$health_status"
}

# Check application health via HTTP
check_app_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" --max-time 5 2>/dev/null || echo "000")
    echo "$response"
}

# Restart container
restart_container() {
    local current_time=$(date +%s)
    local time_since_last_restart=$((current_time - LAST_RESTART_TIME))

    if [ $time_since_last_restart -lt $RESTART_COOLDOWN ]; then
        log_warning "Restart attempted too soon. Waiting for cooldown..."
        return 1
    fi

    log_warning "Attempting to restart container: $CONTAINER_NAME"

    # Get container logs before restart
    log_info "Capturing logs before restart..."
    docker logs --tail 100 "$CONTAINER_NAME" > "/tmp/${CONTAINER_NAME}_crash_$(date +%s).log" 2>&1

    # Restart the container
    if docker restart "$CONTAINER_NAME"; then
        log_success "Container restarted successfully"
        LAST_RESTART_TIME=$(date +%s)
        FAILURE_COUNT=0
        send_notification "Container $CONTAINER_NAME was automatically restarted"
        return 0
    else
        log_error "Failed to restart container"
        send_notification "CRITICAL: Failed to restart container $CONTAINER_NAME"
        return 1
    fi
}

# Rebuild and restart (last resort)
rebuild_and_restart() {
    log_error "Multiple restart failures detected. Attempting rebuild..."
    send_notification "CRITICAL: Rebuilding container $CONTAINER_NAME"

    cd "$(dirname "$0")/.." || return 1

    # Run safe build script
    if [ -f "scripts/docker-build-safe.sh" ]; then
        sh scripts/docker-build-safe.sh
    else
        docker-compose -f docker-compose.production.yml build backend
    fi

    # Restart with docker-compose
    docker-compose -f docker-compose.production.yml up -d backend

    if [ $? -eq 0 ]; then
        log_success "Container rebuilt and restarted"
        FAILURE_COUNT=0
        return 0
    else
        log_error "Rebuild failed"
        send_notification "CRITICAL: Container rebuild failed for $CONTAINER_NAME"
        return 1
    fi
}

# Main monitoring loop
monitor() {
    log_info "Starting monitoring for container: $CONTAINER_NAME"
    log_info "Health check URL: $HEALTH_CHECK_URL"
    log_info "Check interval: ${CHECK_INTERVAL}s"
    log_info "Max failures before restart: $MAX_FAILURES"
    echo ""

    while true; do
        # Check if container exists and is running
        if ! is_container_running; then
            log_error "Container is not running!"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))

            if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
                send_notification "Container $CONTAINER_NAME stopped unexpectedly"
                log_warning "Starting container..."
                docker start "$CONTAINER_NAME" || rebuild_and_restart
                FAILURE_COUNT=0
            fi
        else
            # Check Docker health status
            health_status=$(check_container_health)

            if [ "$health_status" == "healthy" ]; then
                # Double-check with HTTP request
                http_status=$(check_app_health)

                if [ "$http_status" == "200" ]; then
                    log_success "Container healthy (HTTP 200)"
                    FAILURE_COUNT=0
                else
                    log_warning "Container reports healthy but HTTP check failed (HTTP $http_status)"
                    FAILURE_COUNT=$((FAILURE_COUNT + 1))
                fi
            elif [ "$health_status" == "unhealthy" ]; then
                log_error "Container health check failed"
                FAILURE_COUNT=$((FAILURE_COUNT + 1))

                if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
                    restart_container || rebuild_and_restart
                fi
            elif [ "$health_status" == "starting" ]; then
                log_info "Container is starting..."
                FAILURE_COUNT=0
            else
                log_warning "Unknown health status: $health_status"
            fi
        fi

        # Check if we've exceeded max failures
        if [ $FAILURE_COUNT -ge $((MAX_FAILURES * 2)) ]; then
            log_error "Multiple restart attempts failed. Manual intervention required."
            send_notification "CRITICAL: Container $CONTAINER_NAME requires manual intervention"
            exit 1
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# Signal handlers
trap 'log_info "Monitoring stopped"; exit 0' SIGINT SIGTERM

# Start monitoring
monitor
