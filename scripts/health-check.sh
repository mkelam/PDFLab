#!/bin/bash

################################################################################
# PDFLab Health Check Script
################################################################################
# This script verifies that all PDFLab services are running correctly
# Usage: bash health-check.sh
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() {
    echo -e "${GREEN}${NC} $1"
    PASS=$((PASS + 1))
}

log_fail() {
    echo -e "${RED}${NC} $1"
    FAIL=$((FAIL + 1))
}

log_warn() {
    echo -e "${YELLOW} ${NC} $1"
}

log_info() {
    echo -e "${BLUE}9${NC} $1"
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDFLab Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

################################################################################
# 1. Check Docker
################################################################################

echo -e "${GREEN}[1/10] Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    log_pass "Docker is installed"
    if docker info > /dev/null 2>&1; then
        log_pass "Docker daemon is running"
    else
        log_fail "Docker daemon is not running"
    fi
else
    log_fail "Docker is not installed"
fi
echo ""

################################################################################
# 2. Check Docker Compose
################################################################################

echo -e "${GREEN}[2/10] Checking Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    VERSION=$(docker-compose --version)
    log_pass "Docker Compose is installed ($VERSION)"
else
    log_fail "Docker Compose is not installed"
fi
echo ""

################################################################################
# 3. Check Containers
################################################################################

echo -e "${GREEN}[3/10] Checking Containers...${NC}"

containers=("pdflab-mysql" "pdflab-redis" "pdflab-backend" "pdflab-worker" "pdflab-frontend")

for container in "${containers[@]}"; do
    if docker ps | grep -q "$container"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

        if [ "$STATUS" == "running" ]; then
            if [ "$HEALTH" == "healthy" ] || [ "$HEALTH" == "none" ]; then
                log_pass "$container is running and healthy"
            else
                log_warn "$container is running but not healthy (Status: $HEALTH)"
            fi
        else
            log_fail "$container is not running (Status: $STATUS)"
        fi
    else
        log_fail "$container is not running"
    fi
done
echo ""

################################################################################
# 4. Check MySQL
################################################################################

echo -e "${GREEN}[4/10] Checking MySQL Database...${NC}"
if docker ps | grep -q "pdflab-mysql"; then
    # Test MySQL connection
    if docker exec pdflab-mysql mysqladmin ping -h localhost &> /dev/null; then
        log_pass "MySQL is responding to ping"

        # Check if database exists
        DB_EXISTS=$(docker exec pdflab-mysql mysql -u${DB_USER:-pdflab} -p${DB_PASSWORD:-***REMOVED***} -e "SHOW DATABASES LIKE '${DB_NAME:-pdflab}';" 2>/dev/null | grep -c "${DB_NAME:-pdflab}" || echo "0")
        if [ "$DB_EXISTS" -gt 0 ]; then
            log_pass "Database '${DB_NAME:-pdflab}' exists"

            # Check tables
            TABLES=$(docker exec pdflab-mysql mysql -u${DB_USER:-pdflab} -p${DB_PASSWORD:-***REMOVED***} ${DB_NAME:-pdflab} -e "SHOW TABLES;" 2>/dev/null | wc -l)
            if [ "$TABLES" -gt 1 ]; then
                log_pass "Database has $((TABLES - 1)) tables"
            else
                log_warn "Database exists but has no tables"
            fi
        else
            log_fail "Database '${DB_NAME:-pdflab}' does not exist"
        fi
    else
        log_fail "MySQL is not responding"
    fi
else
    log_fail "MySQL container is not running"
fi
echo ""

################################################################################
# 5. Check Redis
################################################################################

echo -e "${GREEN}[5/10] Checking Redis...${NC}"
if docker ps | grep -q "pdflab-redis"; then
    # Test Redis connection
    REDIS_RESPONSE=$(docker exec pdflab-redis redis-cli ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} PING 2>/dev/null || echo "FAIL")
    if [ "$REDIS_RESPONSE" == "PONG" ]; then
        log_pass "Redis is responding to PING"

        # Check keys
        KEYS=$(docker exec pdflab-redis redis-cli ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} DBSIZE 2>/dev/null | grep -o '[0-9]*')
        log_info "Redis has $KEYS keys"
    else
        log_fail "Redis is not responding"
    fi
else
    log_fail "Redis container is not running"
fi
echo ""

################################################################################
# 6. Check Backend API
################################################################################

echo -e "${GREEN}[6/10] Checking Backend API...${NC}"
if docker ps | grep -q "pdflab-backend"; then
    # Test health endpoint
    HEALTH_RESPONSE=$(docker exec pdflab-backend wget -qO- http://localhost:3006/health 2>/dev/null || echo "FAIL")
    if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
        log_pass "Backend health endpoint is responding"

        # Check database connection
        if echo "$HEALTH_RESPONSE" | grep -q '"database":"OK"'; then
            log_pass "Backend can connect to database"
        else
            log_fail "Backend cannot connect to database"
        fi

        # Check Redis connection
        if echo "$HEALTH_RESPONSE" | grep -q '"redis":"OK"'; then
            log_pass "Backend can connect to Redis"
        else
            log_fail "Backend cannot connect to Redis"
        fi
    else
        log_fail "Backend health endpoint is not responding"
    fi

    # Check backend logs for errors
    ERROR_COUNT=$(docker logs pdflab-backend --tail 50 2>&1 | grep -ic "error" || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        log_pass "No errors in backend logs (last 50 lines)"
    else
        log_warn "Found $ERROR_COUNT errors in backend logs (last 50 lines)"
    fi
else
    log_fail "Backend container is not running"
fi
echo ""

################################################################################
# 7. Check Worker
################################################################################

echo -e "${GREEN}[7/10] Checking Worker...${NC}"
if docker ps | grep -q "pdflab-worker"; then
    log_pass "Worker container is running"

    # Check worker logs
    WORKER_LOGS=$(docker logs pdflab-worker --tail 20 2>&1)
    if echo "$WORKER_LOGS" | grep -q "Worker started"; then
        log_pass "Worker has started successfully"
    else
        log_warn "Could not confirm worker startup message"
    fi

    # Check for worker errors
    ERROR_COUNT=$(echo "$WORKER_LOGS" | grep -ic "error" || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        log_pass "No errors in worker logs (last 20 lines)"
    else
        log_warn "Found $ERROR_COUNT errors in worker logs (last 20 lines)"
    fi
else
    log_fail "Worker container is not running"
fi
echo ""

################################################################################
# 8. Check Frontend
################################################################################

echo -e "${GREEN}[8/10] Checking Frontend...${NC}"
if docker ps | grep -q "pdflab-frontend"; then
    # Test frontend HTTP response
    HTTP_CODE=$(docker exec pdflab-frontend wget --spider -S http://localhost:3000 2>&1 | grep "HTTP/" | awk '{print $2}' | head -1)
    if [ "$HTTP_CODE" == "200" ]; then
        log_pass "Frontend is responding with HTTP 200"
    else
        log_fail "Frontend is not responding correctly (HTTP $HTTP_CODE)"
    fi
else
    log_fail "Frontend container is not running"
fi
echo ""

################################################################################
# 9. Check Disk Space
################################################################################

echo -e "${GREEN}[9/10] Checking Disk Space...${NC}"

# Check Docker disk usage
DOCKER_USAGE=$(docker system df --format "{{.Type}}\t{{.Size}}" 2>/dev/null)
log_info "Docker disk usage:"
echo "$DOCKER_USAGE" | while read line; do
    echo "  $line"
done

# Check available disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 80 ]; then
    log_pass "Disk usage is healthy ($DISK_USAGE%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    log_warn "Disk usage is high ($DISK_USAGE%)"
else
    log_fail "Disk usage is critical ($DISK_USAGE%)"
fi
echo ""

################################################################################
# 10. Check Network Connectivity
################################################################################

echo -e "${GREEN}[10/10] Checking Network Connectivity...${NC}"

# Check if ports are exposed
PORTS=("3000" "3006")
for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        log_pass "Port $port is listening"
    else
        log_fail "Port $port is not listening"
    fi
done
echo ""

################################################################################
# Summary
################################################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Health Check Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN} All checks passed! PDFLab is healthy.${NC}"
    exit 0
else
    echo -e "${RED} Some checks failed. Please review the issues above.${NC}"
    echo ""
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "  1. Restart containers: docker-compose -f docker-compose.production.yml restart"
    echo "  2. Check logs: docker-compose -f docker-compose.production.yml logs"
    echo "  3. Verify .env file: cat /opt/pdflab/.env"
    echo "  4. Re-deploy: bash /opt/pdflab/deploy-vps.sh"
    exit 1
fi
