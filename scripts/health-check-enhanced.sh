#!/bin/bash
################################################################################
# PDFLab Enhanced Automated Health Check
################################################################################
# Comprehensive health monitoring across all services (Week 3 version)
# Run every 5 minutes via cron
#
# Usage: ./health-check-enhanced.sh [production|staging]
################################################################################

set -e

ENV="${1:-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

UNHEALTHY_SERVICES=0

# Service status tracking for database logging
BACKEND_STATUS="unknown"
WORKER_STATUS="unknown"
MYSQL_STATUS="unknown"
REDIS_STATUS="unknown"

check_service_health() {
    local service=$1
    local container="pdflab-${service}-${ENV}"

    # Check if container is running
    if ! docker ps --filter "name=${container}" --format '{{.Names}}' | grep -q "${container}"; then
        echo -e "${RED}[FAIL]${NC} ${service}: Container not running"
        UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
        # Update service status variable
        case "$service" in
            "backend") BACKEND_STATUS="unhealthy" ;;
            "worker") WORKER_STATUS="unhealthy" ;;
            "mysql") MYSQL_STATUS="unhealthy" ;;
            "redis") REDIS_STATUS="unhealthy" ;;
        esac
        return 1
    fi

    # Check container health status
    HEALTH=$(docker inspect ${container} --format '{{.State.Health.Status}}' 2>/dev/null || echo "none")

    if [ "$HEALTH" == "healthy" ] || [ "$HEALTH" == "none" ]; then
        echo -e "${GREEN}[OK]${NC} ${service}: Running"
        # Update service status variable
        case "$service" in
            "backend") BACKEND_STATUS="healthy" ;;
            "worker") WORKER_STATUS="healthy" ;;
            "mysql") MYSQL_STATUS="healthy" ;;
            "redis") REDIS_STATUS="healthy" ;;
        esac
    else
        echo -e "${YELLOW}[WARN]${NC} ${service}: Unhealthy (may be false positive)"

        # Test actual functionality
        case "$service" in
            "backend")
                # Test HTTP endpoint
                if docker exec ${container} wget -qO- http://localhost:3006/health >/dev/null 2>&1; then
                    echo -e "  ${GREEN}→ HTTP check passed${NC} (health check config issue)"
                else
                    echo -e "  ${RED}→ HTTP check failed${NC}"
                    UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
                fi
                ;;
            "worker")
                # Test if worker process is running
                if docker exec ${container} ps aux | grep -q "node.*worker" 2>/dev/null; then
                    echo -e "  ${GREEN}→ Worker process check passed${NC}"
                else
                    echo -e "  ${RED}→ Worker process check failed${NC}"
                    UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
                fi
                ;;
            "mysql")
                # Test MySQL connection
                DB_PASS="pdflab_${ENV}_2024"
                if [ "$ENV" == "prod" ]; then
                    DB_PASS="***REMOVED***"
                fi
                if docker exec ${container} mysql -updflab -p${DB_PASS} -e "SELECT 1" >/dev/null 2>&1; then
                    echo -e "  ${GREEN}→ MySQL check passed${NC}"
                else
                    echo -e "  ${RED}→ MySQL check failed${NC}"
                    UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
                fi
                ;;
            "redis")
                # Test Redis connection
                if docker exec ${container} redis-cli PING 2>/dev/null | grep -q "PONG"; then
                    echo -e "  ${GREEN}→ Redis check passed${NC}"
                else
                    echo -e "  ${RED}→ Redis check failed${NC}"
                    UNHEALTHY_SERVICES=$((UNHEALTHY_SERVICES + 1))
                fi
                ;;
        esac
    fi
}

# Main execution
echo "=========================================="
echo "PDFLab Health Check - $(date)"
echo "Environment: $ENV"
echo "=========================================="
echo ""

check_service_health "backend"
check_service_health "worker"
check_service_health "mysql"
check_service_health "redis"

echo ""
echo "=========================================="

# Determine overall status
OVERALL_STATUS="healthy"
if [ $UNHEALTHY_SERVICES -gt 0 ]; then
    OVERALL_STATUS="unhealthy"
    echo -e "${RED}✗ $UNHEALTHY_SERVICES service(s) unhealthy${NC}"
else
    echo -e "${GREEN}✓ All services healthy${NC}"
fi

# Log to database (if monitoring-logger.sh exists)
if [ -f "/usr/local/bin/pdflab-scripts/monitoring-logger.sh" ]; then
    /usr/local/bin/pdflab-scripts/monitoring-logger.sh health \
        "$ENV" "$OVERALL_STATUS" \
        "$BACKEND_STATUS" "$WORKER_STATUS" "$MYSQL_STATUS" "$REDIS_STATUS" \
        "{}" 2>/dev/null || true
fi

# Exit with appropriate code
if [ $UNHEALTHY_SERVICES -eq 0 ]; then
    exit 0
else
    exit 1
fi
