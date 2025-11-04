#!/bin/bash

###############################################################################
# PDFLab VPS Setup Verification Script
# Run this on your Hostinger VPS to verify all components are installed
###############################################################################

echo "========================================="
echo "PDFLab VPS Setup Verification"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check command
check_command() {
    local cmd=$1
    local name=$2

    echo -n "Checking $name... "
    if command -v $cmd &> /dev/null; then
        VERSION=$($cmd --version 2>&1 | head -n 1)
        echo -e "${GREEN}✓ INSTALLED${NC} - $VERSION"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check service
check_service() {
    local service=$1
    local name=$2

    echo -n "Checking $name service... "
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✓ RUNNING${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ NOT RUNNING${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory
check_directory() {
    local dir=$1
    local name=$2

    echo -n "Checking $name directory... "
    if [ -d "$dir" ]; then
        SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
        echo -e "${GREEN}✓ EXISTS${NC} - Size: $SIZE"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container=$1
    local name=$2

    echo -n "Checking $name container... "
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker ps --filter "name=${container}" --format "{{.Status}}")
        echo -e "${GREEN}✓ RUNNING${NC} - $STATUS"
        ((PASSED++))
        return 0
    else
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${YELLOW}⚠ EXISTS BUT NOT RUNNING${NC}"
        else
            echo -e "${RED}✗ NOT FOUND${NC}"
        fi
        ((FAILED++))
        return 1
    fi
}

echo "=== System Components ==="
check_command "docker" "Docker"
check_command "docker" "Docker Compose" && docker compose version
check_command "mysql" "MySQL Client"
check_command "git" "Git"
check_command "nginx" "Nginx (optional)"

echo ""
echo "=== System Services ==="
check_service "docker" "Docker"

echo ""
echo "=== Directory Structure ==="
check_directory "/var/pdflab" "Main directory"
check_directory "/var/pdflab/app" "Application"
check_directory "/var/pdflab/storage" "Storage"
check_directory "/var/pdflab/logs" "Logs"
check_directory "/var/pdflab/backups" "Backups"
check_directory "/var/pdflab/scripts" "Scripts"

echo ""
echo "=== Docker Containers ==="
check_container "pdflab-mysql-prod" "MySQL"
check_container "pdflab-redis-prod" "Redis"
check_container "pdflab-backend-prod" "Backend"

echo ""
echo "=== Network Connectivity ==="

# Check if containers can communicate
echo -n "Checking MySQL accessibility from host... "
if docker exec pdflab-mysql-prod mysqladmin ping -h localhost -uroot -p"${MYSQL_ROOT_PASSWORD:-}" 2>/dev/null | grep -q "mysqld is alive"; then
    echo -e "${GREEN}✓ ACCESSIBLE${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ CHECK MANUALLY${NC}"
fi

echo -n "Checking Redis accessibility... "
if docker exec pdflab-redis-prod redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ ACCESSIBLE${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ NOT ACCESSIBLE${NC}"
    ((FAILED++))
fi

echo ""
echo "=== Database Check ==="

echo -n "Checking if database exists... "
if docker exec pdflab-mysql-prod mysql -uroot -p"${MYSQL_ROOT_PASSWORD:-}" -e "USE pdflab_production; SELECT 1;" 2>/dev/null | grep -q "1"; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    ((PASSED++))

    # Count tables
    TABLE_COUNT=$(docker exec pdflab-mysql-prod mysql -uroot -p"${MYSQL_ROOT_PASSWORD:-}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'pdflab_production';" 2>/dev/null | tail -n 1)
    echo "   └─ Tables: $TABLE_COUNT (expected: 8)"

    if [ "$TABLE_COUNT" = "8" ]; then
        echo -e "      ${GREEN}✓ All tables present${NC}"
        ((PASSED++))
    else
        echo -e "      ${YELLOW}⚠ Missing tables - run migration${NC}"
    fi
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    echo "   └─ Run: CREATE DATABASE pdflab_production;"
    ((FAILED++))
fi

echo ""
echo "=== File Permissions ==="

echo -n "Checking storage directory permissions... "
STORAGE_PERMS=$(stat -c "%a" /var/pdflab/storage 2>/dev/null)
if [ "$STORAGE_PERMS" = "755" ] || [ "$STORAGE_PERMS" = "777" ]; then
    echo -e "${GREEN}✓ CORRECT${NC} ($STORAGE_PERMS)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ UNUSUAL${NC} ($STORAGE_PERMS) - Expected 755 or 777"
fi

echo ""
echo "=== Disk Space ==="

DISK_USAGE=$(df -h /var/pdflab | tail -1)
DISK_PERCENT=$(echo $DISK_USAGE | awk '{print $5}' | sed 's/%//')

echo "Disk usage for /var/pdflab:"
echo "$DISK_USAGE"

if [ "$DISK_PERCENT" -lt 60 ]; then
    echo -e "${GREEN}✓ Disk space OK${NC} (${DISK_PERCENT}% used)"
    ((PASSED++))
elif [ "$DISK_PERCENT" -lt 80 ]; then
    echo -e "${YELLOW}⚠ Disk space moderate${NC} (${DISK_PERCENT}% used)"
else
    echo -e "${RED}✗ Disk space critical${NC} (${DISK_PERCENT}% used)"
    ((FAILED++))
fi

echo ""
echo "=== Port Availability ==="

check_port() {
    local port=$1
    local name=$2

    echo -n "Checking port $port ($name)... "
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓ IN USE${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ NOT IN USE${NC}"
    fi
}

check_port "3306" "MySQL"
check_port "6379" "Redis"
check_port "3006" "Backend API"

echo ""
echo "=== Environment Files ==="

check_file() {
    local file=$1
    local name=$2

    echo -n "Checking $name... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        ((FAILED++))
        return 1
    fi
}

check_file "/var/pdflab/app/backend/.env.production" "Backend .env"
check_file "/var/pdflab/app/docker-compose.production.yml" "Docker Compose config"

echo ""
echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All checks passed! VPS is ready for deployment.${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Some checks failed. Review the issues above.${NC}"
    exit 1
fi
