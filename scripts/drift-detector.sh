#!/bin/bash
################################################################################
# PDFLab Drift Detection Script
################################################################################
# Compares staging and production environments to detect configuration drift
# Run hourly via cron for continuous monitoring
#
# Usage: ./drift-detector.sh [--slack-webhook URL] [--email address]
# Cron: 0 * * * * /usr/local/bin/drift-detector.sh >> /var/log/drift-detector.log 2>&1
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DRIFT_THRESHOLD=10  # Alert if drift > 10%
SLACK_WEBHOOK="${1:-}"  # Optional Slack webhook URL
ALERT_EMAIL="${2:-}"    # Optional email for alerts

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
alert() { echo -e "${RED}[ALERT]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

################################################################################
# Environment Fingerprinting Functions
################################################################################

get_docker_image_digest() {
    local container=$1
    docker inspect $container --format '{{.Image}}' 2>/dev/null || echo "not_found"
}

get_redis_config() {
    local container=$1
    local key=$2
    docker exec $container redis-cli CONFIG GET $key 2>/dev/null | tail -1 || echo "unknown"
}

get_container_memory_limit() {
    local container=$1
    docker inspect $container | jq '.[0].HostConfig.Memory' 2>/dev/null || echo "0"
}

get_env_var_count() {
    local container=$1
    docker exec $container env 2>/dev/null | grep -v -E '^(PATH|HOME|HOSTNAME)' | grep '=' | wc -l || echo "0"
}

################################################################################
# Drift Detection Checks
################################################################################

check_docker_image_parity() {
    log "Checking Docker image parity..."

    PROD_BACKEND=$(get_docker_image_digest "pdflab-backend-prod")
    PROD_WORKER=$(get_docker_image_digest "pdflab-worker-prod")
    STAGING_BACKEND=$(get_docker_image_digest "pdflab-backend-staging")

    local drift_found=0

    # Check backend vs worker (same environment)
    if [ "$PROD_BACKEND" != "$PROD_WORKER" ]; then
        alert "DRIFT: Production backend and worker images don't match"
        echo "  Backend: $PROD_BACKEND"
        echo "  Worker:  $PROD_WORKER"
        drift_found=1
    fi

    # Check staging vs production
    if [ "$PROD_BACKEND" != "$STAGING_BACKEND" ]; then
        warn "Production and staging backend images differ (may be intentional)"
        echo "  Production: $PROD_BACKEND"
        echo "  Staging:    $STAGING_BACKEND"
    fi

    return $drift_found
}

check_redis_persistence() {
    log "Checking Redis persistence configuration..."

    PROD_AOF=$(get_redis_config "pdflab-redis-prod" "appendonly")
    STAGING_AOF=$(get_redis_config "pdflab-redis-staging" "appendonly")

    local drift_found=0

    if [ "$PROD_AOF" != "yes" ]; then
        alert "DRIFT: Production Redis AOF not enabled!"
        drift_found=1
    fi

    if [ "$STAGING_AOF" != "yes" ]; then
        alert "DRIFT: Staging Redis AOF not enabled!"
        drift_found=1
    fi

    if [ "$PROD_AOF" != "$STAGING_AOF" ]; then
        warn "Redis persistence mismatch: Prod=$PROD_AOF, Staging=$STAGING_AOF"
    fi

    return $drift_found
}

check_environment_variables() {
    log "Checking environment variable completeness..."

    PROD_VAR_COUNT=$(get_env_var_count "pdflab-backend-prod")
    STAGING_VAR_COUNT=$(get_env_var_count "pdflab-backend-staging")

    local drift_found=0
    local diff=$((PROD_VAR_COUNT - STAGING_VAR_COUNT))
    local abs_diff=${diff#-}  # Absolute value

    if [ "$abs_diff" -gt 5 ]; then
        warn "Environment variable count mismatch: Prod=$PROD_VAR_COUNT, Staging=$STAGING_VAR_COUNT"
    fi

    # Check critical variables exist
    local critical_vars=("PAYFAST_MERCHANT_ID" "JWT_SECRET" "CLOUDCONVERT_API_KEY" "SMTP_HOST")

    for var in "${critical_vars[@]}"; do
        if ! docker exec pdflab-backend-prod env 2>/dev/null | grep -q "^${var}="; then
            alert "DRIFT: Critical variable $var missing in production!"
            drift_found=1
        fi
    done

    return $drift_found
}

check_resource_limits() {
    log "Checking container resource limits..."

    BACKEND_LIMIT=$(get_container_memory_limit "pdflab-backend-prod")
    WORKER_LIMIT=$(get_container_memory_limit "pdflab-worker-prod")

    local drift_found=0

    if [ "$BACKEND_LIMIT" == "0" ] || [ "$BACKEND_LIMIT" == "null" ]; then
        warn "Backend has no memory limit configured"
    fi

    if [ "$WORKER_LIMIT" == "0" ] || [ "$WORKER_LIMIT" == "null" ]; then
        warn "Worker has no memory limit configured"
    fi

    return $drift_found
}

check_mysql_mounts() {
    log "Checking for dangerous MySQL mounts..."

    local drift_found=0

    # Check for init.sql mount
    INIT_SQL_MOUNT=$(docker inspect pdflab-mysql-prod 2>/dev/null | jq '.[0].Mounts[] | select(.Destination == "/docker-entrypoint-initdb.d/init.sql")' | wc -l)

    if [ "$INIT_SQL_MOUNT" != "0" ]; then
        alert "DRIFT: Dangerous init.sql mount detected in production MySQL!"
        drift_found=1
    fi

    return $drift_found
}

check_ssl_certificates() {
    log "Checking SSL certificate expiry..."

    # Check if Let's Encrypt cert exists and when it expires
    if [ -f "/etc/letsencrypt/live/pdflab.pro/fullchain.pem" ]; then
        CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/pdflab.pro/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
        CERT_EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( ($CERT_EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

        if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
            warn "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
        fi
    fi
}

################################################################################
# Drift Scoring & Reporting
################################################################################

calculate_drift_score() {
    local drift_checks_failed=$1
    local total_checks=6  # Total number of drift checks

    local drift_percentage=$(( (drift_checks_failed * 100) / total_checks ))
    echo $drift_percentage
}

generate_drift_report() {
    local drift_score=$1
    local drift_details="$2"

    echo ""
    echo "============================================"
    echo "PDFLab Drift Detection Report"
    echo "============================================"
    echo "Timestamp: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "Drift Score: ${drift_score}%"
    echo ""

    if [ "$drift_score" -eq 0 ]; then
        echo "${GREEN}✓ No drift detected${NC}"
    elif [ "$drift_score" -lt "$DRIFT_THRESHOLD" ]; then
        echo "${YELLOW}⚠ Minor drift detected (${drift_score}%)${NC}"
    else
        echo "${RED}✗ CRITICAL DRIFT DETECTED (${drift_score}%)${NC}"
    fi

    echo ""
    echo "Details:"
    echo "$drift_details"
    echo ""
    echo "============================================"
}

send_slack_alert() {
    local drift_score=$1
    local message="$2"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \":warning: PDFLab Drift Alert\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"fields\": [
                        {\"title\": \"Drift Score\", \"value\": \"${drift_score}%\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$(date)\", \"short\": true},
                        {\"title\": \"Details\", \"value\": \"${message}\", \"short\": false}
                    ]
                }]
            }" >/dev/null 2>&1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting drift detection scan..."
    echo ""

    local drift_count=0
    local drift_details=""

    # Run all drift checks
    if ! check_docker_image_parity; then
        drift_count=$((drift_count + 1))
        drift_details="${drift_details}\n- Docker image drift detected"
    fi

    if ! check_redis_persistence; then
        drift_count=$((drift_count + 1))
        drift_details="${drift_details}\n- Redis persistence issues"
    fi

    if ! check_environment_variables; then
        drift_count=$((drift_count + 1))
        drift_details="${drift_details}\n- Environment variable issues"
    fi

    if ! check_resource_limits; then
        drift_count=$((drift_count + 1))
        drift_details="${drift_details}\n- Resource limit issues"
    fi

    if ! check_mysql_mounts; then
        drift_count=$((drift_count + 1))
        drift_details="${drift_details}\n- Dangerous MySQL mounts"
    fi

    check_ssl_certificates  # Non-critical, doesn't increment drift count

    # Calculate drift score
    local drift_score=$(calculate_drift_score $drift_count)

    # Generate report
    generate_drift_report "$drift_score" "$drift_details"

    # Send alerts if needed
    if [ "$drift_score" -ge "$DRIFT_THRESHOLD" ]; then
        alert "Drift threshold exceeded! Sending alerts..."
        send_slack_alert "$drift_score" "$(echo -e $drift_details)"

        if [ -n "$ALERT_EMAIL" ]; then
            echo -e "Drift Score: ${drift_score}%\n\n${drift_details}" | mail -s "PDFLab Drift Alert" "$ALERT_EMAIL"
        fi
    fi

    # Exit code reflects drift severity
    if [ "$drift_score" -ge "$DRIFT_THRESHOLD" ]; then
        exit 2  # Critical drift
    elif [ "$drift_score" -gt 0 ]; then
        exit 1  # Minor drift
    else
        exit 0  # No drift
    fi
}

# Run main function
main "$@"
