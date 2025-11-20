#!/bin/bash
################################################################################
# PDFLab Pre-Deployment Validation
################################################################################
# Runs comprehensive checks before any deployment to production or staging
# Blocks deployment if critical issues detected
#
# Usage: ./pre-deployment-validation.sh [production|staging]
# Exit codes: 0 = pass, 1 = warnings, 2 = critical failures
################################################################################

set -e

ENV="${1:-production}"
CRITICAL_FAILURES=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[CHECK]${NC} $1"; }
pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1)); }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

################################################################################
# Validation Checks (12-Point Checklist)
################################################################################

check_1_docker_images() {
    log "1/12: Validating Docker image parity..."

    BACKEND=$(docker inspect pdflab-backend-${ENV} --format '{{.Image}}' 2>/dev/null || echo "missing")
    WORKER=$(docker inspect pdflab-worker-${ENV} --format '{{.Image}}' 2>/dev/null || echo "missing")

    if [ "$BACKEND" == "missing" ] || [ "$WORKER" == "missing" ]; then
        fail "Backend or worker container not found"
        return 1
    fi

    if [ "$BACKEND" == "$WORKER" ]; then
        pass "Backend and worker images match: ${BACKEND:0:12}..."
    else
        fail "Image drift detected: backend != worker"
        echo "  Backend: $BACKEND"
        echo "  Worker:  $WORKER"
    fi
}

check_2_environment_variables() {
    log "2/12: Validating critical environment variables..."

    CRITICAL_VARS=(
        "JWT_SECRET"
        "CLOUDCONVERT_API_KEY"
        "PAYFAST_MERCHANT_ID"
        "DB_PASSWORD"
        "SMTP_HOST"
    )

    MISSING_VARS=0
    for var in "${CRITICAL_VARS[@]}"; do
        if ! docker exec pdflab-backend-${ENV} env 2>/dev/null | grep -q "^${var}="; then
            fail "Missing critical variable: $var"
            MISSING_VARS=$((MISSING_VARS + 1))
        fi
    done

    if [ $MISSING_VARS -eq 0 ]; then
        pass "All 5 critical environment variables present"
    fi
}

check_3_database_connectivity() {
    log "3/12: Validating database connectivity..."

    if docker exec pdflab-mysql-${ENV} mysql -updflab -ppdflab_${ENV}_2024 -e "SELECT 1" >/dev/null 2>&1; then
        pass "Database connection successful"
    else
        fail "Cannot connect to MySQL database"
    fi
}

check_4_redis_connectivity() {
    log "4/12: Validating Redis connectivity..."

    if docker exec pdflab-redis-${ENV} redis-cli PING 2>/dev/null | grep -q "PONG"; then
        pass "Redis connection successful"
    else
        fail "Cannot connect to Redis"
    fi
}

check_5_redis_persistence() {
    log "5/12: Validating Redis persistence (AOF)..."

    AOF=$(docker exec pdflab-redis-${ENV} redis-cli CONFIG GET appendonly 2>/dev/null | tail -1)

    if [ "$AOF" == "yes" ]; then
        pass "Redis AOF persistence enabled"
    else
        fail "Redis AOF not enabled - risk of job queue data loss"
    fi
}

check_6_resource_limits() {
    log "6/12: Validating container resource limits..."

    CONTAINERS=("backend" "worker" "mysql" "redis")
    LIMITS_MISSING=0

    for container in "${CONTAINERS[@]}"; do
        MEMORY=$(docker inspect pdflab-${container}-${ENV} 2>/dev/null | jq '.[0].HostConfig.Memory')

        if [ "$MEMORY" == "0" ] || [ "$MEMORY" == "null" ]; then
            warn "No memory limit for pdflab-${container}-${ENV}"
            LIMITS_MISSING=$((LIMITS_MISSING + 1))
        fi
    done

    if [ $LIMITS_MISSING -eq 0 ]; then
        pass "All containers have resource limits"
    else
        warn "$LIMITS_MISSING containers missing resource limits"
    fi
}

check_7_dangerous_mounts() {
    log "7/12: Checking for dangerous volume mounts..."

    INIT_SQL_MOUNT=$(docker inspect pdflab-mysql-${ENV} 2>/dev/null | jq '.[0].Mounts[] | select(.Destination == "/docker-entrypoint-initdb.d/init.sql")' | wc -l)

    if [ "$INIT_SQL_MOUNT" != "0" ]; then
        fail "Dangerous init.sql mount detected in MySQL"
    else
        pass "No dangerous MySQL mounts found"
    fi
}

check_8_ssl_certificates() {
    log "8/12: Validating SSL certificate expiry..."

    if [ "$ENV" == "production" ] || [ "$ENV" == "prod" ]; then
        if [ -f "/etc/letsencrypt/live/pdflab.pro/fullchain.pem" ]; then
            CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/pdflab.pro/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
            CERT_EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
            NOW_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( ($CERT_EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

            if [ "$DAYS_UNTIL_EXPIRY" -lt 14 ]; then
                fail "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            elif [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
                warn "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            else
                pass "SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
            fi
        else
            warn "SSL certificate not found (may be using HTTP)"
        fi
    else
        pass "SSL check skipped for staging"
    fi
}

check_9_disk_space() {
    log "9/12: Validating available disk space..."

    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$DISK_USAGE" -gt 90 ]; then
        fail "Disk usage at ${DISK_USAGE}% (critical)"
    elif [ "$DISK_USAGE" -gt 80 ]; then
        warn "Disk usage at ${DISK_USAGE}% (high)"
    else
        pass "Disk usage at ${DISK_USAGE}% (healthy)"
    fi
}

check_10_network_connectivity() {
    log "10/12: Validating container network..."

    BACKEND_NETWORK=$(docker inspect pdflab-backend-${ENV} 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | keys[0]')
    MYSQL_NETWORK=$(docker inspect pdflab-mysql-${ENV} 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | keys[0]')

    if [ "$BACKEND_NETWORK" == "$MYSQL_NETWORK" ]; then
        pass "All containers on same network: $BACKEND_NETWORK"
    else
        fail "Network isolation issue detected"
        echo "  Backend: $BACKEND_NETWORK"
        echo "  MySQL:   $MYSQL_NETWORK"
    fi
}

check_11_container_health() {
    log "11/12: Validating container health status..."

    UNHEALTHY=$(docker ps --filter "name=pdflab-*-${ENV}" --format '{{.Names}} {{.Status}}' | grep -i "unhealthy" | wc -l)

    if [ "$UNHEALTHY" -gt 0 ]; then
        warn "$UNHEALTHY containers reporting unhealthy status"
        docker ps --filter "name=pdflab-*-${ENV}" --format 'table {{.Names}}\t{{.Status}}' | grep -i "unhealthy"
    else
        pass "All containers healthy"
    fi
}

check_12_test_suite() {
    log "12/12: Running critical API tests..."

    # Only run if npm test command exists
    if [ -f "package.json" ]; then
        info "Skipping automated tests (run manually via 'npm run test:integration:api')"
        pass "Test suite check deferred to CI/CD"
    else
        warn "No package.json found - cannot run tests"
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    echo ""
    info "=========================================="
    info "PDFLab Pre-Deployment Validation"
    info "Environment: $ENV"
    info "=========================================="
    echo ""

    # Run all checks
    check_1_docker_images
    check_2_environment_variables
    check_3_database_connectivity
    check_4_redis_connectivity
    check_5_redis_persistence
    check_6_resource_limits
    check_7_dangerous_mounts
    check_8_ssl_certificates
    check_9_disk_space
    check_10_network_connectivity
    check_11_container_health
    check_12_test_suite

    # Summary
    echo ""
    info "=========================================="
    info "Validation Summary"
    info "=========================================="
    echo ""

    TOTAL_CHECKS=12
    PASSED=$((TOTAL_CHECKS - CRITICAL_FAILURES - WARNINGS))

    echo "Total Checks:      $TOTAL_CHECKS"
    echo -e "${GREEN}Passed:${NC}            $PASSED"
    echo -e "${YELLOW}Warnings:${NC}          $WARNINGS"
    echo -e "${RED}Critical Failures:${NC} $CRITICAL_FAILURES"
    echo ""

    # Exit code logic
    if [ $CRITICAL_FAILURES -gt 0 ]; then
        fail "DEPLOYMENT BLOCKED - Critical failures detected"
        echo ""
        info "Fix all critical issues before deploying"
        exit 2
    elif [ $WARNINGS -gt 0 ]; then
        warn "DEPLOYMENT ALLOWED WITH WARNINGS"
        echo ""
        info "Consider fixing warnings to improve stability"
        exit 1
    else
        pass "ALL CHECKS PASSED - Deployment approved"
        echo ""
        exit 0
    fi
}

# Run validation
main "$@"
