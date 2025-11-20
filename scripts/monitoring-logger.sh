#!/bin/bash
################################################################################
# PDFLab Monitoring Logger
################################################################################
# Helper script to log monitoring data to MySQL database
# Called by health-check and drift-detector scripts
#
# Usage:
#   ./monitoring-logger.sh health <environment> <status> <details_json>
#   ./monitoring-logger.sh drift <score> <level> <details_json>
#   ./monitoring-logger.sh validation <environment> <result> <details_json>
################################################################################

# Don't use set -e because MySQL warnings would cause false failures

# Database connection settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-pdflab}"
DB_PASS="${DB_PASS:-***REMOVED***}"
DB_NAME="${DB_NAME:-pdflab_production}"

# Function to execute MySQL query
execute_query() {
    local query="$1"
    # Check if running in Docker environment (VPS)
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "pdflab-mysql-prod"; then
        docker exec pdflab-mysql-prod mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$query" 2>/dev/null
    else
        # Local development - connect directly
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$query" 2>/dev/null
    fi
}

# Function to generate UUID
generate_uuid() {
    cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$(date +%s)-$$-$RANDOM"
}

################################################################################
# Log Health Check
################################################################################

log_health_check() {
    local environment="$1"
    local overall_status="$2"
    local backend_status="${3:-unknown}"
    local worker_status="${4:-unknown}"
    local mysql_status="${5:-unknown}"
    local redis_status="${6:-unknown}"
    local details="${7:-{}}"

    local healthy_count=0
    local unhealthy_count=0

    # Count healthy/unhealthy services
    [[ "$backend_status" == "healthy" ]] && healthy_count=$((healthy_count + 1)) || unhealthy_count=$((unhealthy_count + 1))
    [[ "$worker_status" == "healthy" ]] && healthy_count=$((healthy_count + 1)) || unhealthy_count=$((unhealthy_count + 1))
    [[ "$mysql_status" == "healthy" ]] && healthy_count=$((healthy_count + 1)) || unhealthy_count=$((unhealthy_count + 1))
    [[ "$redis_status" == "healthy" ]] && healthy_count=$((healthy_count + 1)) || unhealthy_count=$((unhealthy_count + 1))

    local id=$(generate_uuid)
    local query="INSERT INTO health_checks (
        id, environment, overall_status, services_healthy, services_unhealthy,
        backend_status, worker_status, mysql_status, redis_status, details
    ) VALUES (
        '$id', '$environment', '$overall_status', $healthy_count, $unhealthy_count,
        '$backend_status', '$worker_status', '$mysql_status', '$redis_status', '$details'
    );"

    execute_query "$query"
}

################################################################################
# Log Drift Check
################################################################################

log_drift_check() {
    local drift_score="$1"
    local drift_level="$2"
    local checks_total="${3:-6}"
    local checks_passed="${4:-0}"
    local checks_failed="${5:-0}"
    local details="${6:-{}}"

    local id=$(generate_uuid)
    local query="INSERT INTO drift_checks (
        id, drift_score, drift_level, checks_total, checks_passed, checks_failed, details
    ) VALUES (
        '$id', $drift_score, '$drift_level', $checks_total, $checks_passed, $checks_failed, '$details'
    );"

    execute_query "$query"
}

################################################################################
# Log Deployment Validation
################################################################################

log_validation() {
    local environment="$1"
    local result="$2"
    local checks_total="${3:-12}"
    local checks_passed="${4:-0}"
    local checks_warnings="${5:-0}"
    local checks_failed="${6:-0}"
    local details="${7:-{}}"

    local id=$(generate_uuid)
    local query="INSERT INTO deployment_validations (
        id, environment, validation_result, checks_total, checks_passed, checks_warnings, checks_failed, details
    ) VALUES (
        '$id', '$environment', '$result', $checks_total, $checks_passed, $checks_warnings, $checks_failed, '$details'
    );"

    execute_query "$query"
}

################################################################################
# Log Alert
################################################################################

log_alert() {
    local alert_type="$1"
    local severity="$2"
    local environment="$3"
    local title="$4"
    local message="$5"
    local details="${6:-{}}"

    local id=$(generate_uuid)
    # Escape single quotes in title and message
    title="${title//\'/\\\'}"
    message="${message//\'/\\\'}"

    local query="INSERT INTO monitoring_alerts (
        id, alert_type, severity, environment, title, message, details
    ) VALUES (
        '$id', '$alert_type', '$severity', '$environment', '$title', '$message', '$details'
    );"

    execute_query "$query"
}

################################################################################
# Main Execution
################################################################################

LOG_TYPE="$1"

case "$LOG_TYPE" in
    health)
        log_health_check "$2" "$3" "$4" "$5" "$6" "$7" "$8"
        ;;
    drift)
        log_drift_check "$2" "$3" "$4" "$5" "$6" "$7"
        ;;
    validation)
        log_validation "$2" "$3" "$4" "$5" "$6" "$7" "$8"
        ;;
    alert)
        log_alert "$2" "$3" "$4" "$5" "$6" "$7"
        ;;
    *)
        echo "Usage: $0 {health|drift|validation|alert} [arguments...]"
        exit 1
        ;;
esac

exit 0
