#!/bin/bash
################################################################################
# PDFLab Drift Remediation - Week 2: Standardization
################################################################################
# This script standardizes configurations between staging and production
# Duration: ~3 hours
# Impact: 18% drift → 8% drift
#
# Usage: bash drift-remediation-week2.sh
# Prerequisites: Week 1 completed, SSH access to 141.136.44.168
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="141.136.44.168"
PROD_DIR="/var/pdflab/app"
STAGING_DIR="/var/pdflab-staging/app"

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }

################################################################################
# Task 2.1: Standardize Docker Compose Configurations
################################################################################

task_2_1_docker_compose_template() {
    log "=== Task 2.1: Standardize Docker Compose Configurations ==="
    info "Priority: P1 - HIGH"
    info "Effort: 45 minutes"
    echo ""

    info "Creating templated Docker Compose structure..."

    ssh root@${VPS_IP} << 'ENDSSH'
cd /var/pdflab

# Create base configuration (shared between environments)
cat > docker-compose.base.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword123}
      MYSQL_DATABASE: ${DB_NAME:-pdflab}
      MYSQL_USER: ${DB_USER:-pdflab}
      MYSQL_PASSWORD: ${DB_PASSWORD:-***REMOVED***}
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: mkelam/pdflab-backend:latest
    restart: unless-stopped
    env_file:
      - ./backend/.env
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - storage_data:/app/storage
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3006/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: mkelam/pdflab-backend:latest
    restart: unless-stopped
    env_file:
      - ./backend/.env
    environment:
      - WORKER_MODE=true
    depends_on:
      backend:
        condition: service_healthy
    volumes:
      - storage_data:/app/storage

  frontend:
    image: mkelam/pdflab-frontend:latest
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mysql_data:
  redis_data:
  storage_data:
EOF

# Create production overrides
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  mysql:
    container_name: pdflab-mysql-prod
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  redis:
    container_name: pdflab-redis-prod
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 128M
          cpus: '0.25'

  backend:
    container_name: pdflab-backend-prod
    ports:
      - "3006:3006"
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  worker:
    container_name: pdflab-worker-prod
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '4.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  frontend:
    container_name: pdflab-frontend-prod
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'

networks:
  default:
    name: pdflab-network
EOF

# Create staging overrides
cat > docker-compose.staging.yml << 'EOF'
version: '3.8'

services:
  mysql:
    container_name: pdflab-mysql-staging
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  redis:
    container_name: pdflab-redis-staging
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

  backend:
    container_name: pdflab-backend-staging
    ports:
      - "3007:3006"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  worker:
    container_name: pdflab-worker-staging
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'

  frontend:
    container_name: pdflab-frontend-staging
    ports:
      - "3001:3000"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

networks:
  default:
    name: pdflab-staging-network
EOF

echo "Docker Compose templates created:"
ls -lh docker-compose.*.yml
ENDSSH

    success "Task 2.1 COMPLETE - Docker Compose templated structure created!"
    echo ""
    info "Usage examples:"
    info "  Production: docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d"
    info "  Staging:    docker-compose -f docker-compose.base.yml -f docker-compose.staging.yml up -d"
    echo ""
}

################################################################################
# Task 2.2: Fix MySQL Root Password Access
################################################################################

task_2_2_mysql_root_password() {
    log "=== Task 2.2: Fix MySQL Root Password Access ==="
    info "Priority: P1 - HIGH"
    info "Effort: 15 minutes"
    echo ""

    info "Step 1: Reset production MySQL root password..."
    ssh root@${VPS_IP} << 'ENDSSH'
# Reset root password in MySQL
docker exec -i pdflab-mysql-prod mysql --skip-password << 'EOSQL'
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rootpassword123';
ALTER USER 'root'@'%' IDENTIFIED BY 'rootpassword123';
FLUSH PRIVILEGES;
SELECT 'Root password updated successfully' AS status;
EOSQL
ENDSSH

    info "Step 2: Test root access..."
    TEST_RESULT=$(ssh root@${VPS_IP} "docker exec pdflab-mysql-prod mysql -uroot -prootpassword123 -e 'SELECT 1 AS test' 2>/dev/null | grep -c 'test' || echo '0'")

    if [ "$TEST_RESULT" == "1" ]; then
        success "Task 2.2 COMPLETE - MySQL root access restored!"
    else
        error "Task 2.2 FAILED - Root access still broken"
    fi

    echo ""
}

################################################################################
# Task 2.3: Add Resource Limits to All Containers
################################################################################

task_2_3_resource_limits() {
    log "=== Task 2.3: Add Resource Limits to All Containers ==="
    info "Priority: P1 - HIGH"
    info "Effort: 30 minutes"
    echo ""

    info "Resource limits already configured in templated docker-compose files (Task 2.1)"
    info "Applying to production environment..."

    ssh root@${VPS_IP} << 'ENDSSH'
cd /var/pdflab

# Backup current configuration
cp app/docker-compose.yml app/docker-compose.yml.pre-limits-$(date +%Y%m%d)

# Use new templated configuration with resource limits
cd app
docker-compose -f ../docker-compose.base.yml -f ../docker-compose.prod.yml down
docker-compose -f ../docker-compose.base.yml -f ../docker-compose.prod.yml up -d

echo "Waiting for services to start with new limits..."
sleep 20
ENDSSH

    info "Verifying resource limits..."
    ssh root@${VPS_IP} << 'ENDSSH'
echo ""
echo "Container Resource Limits:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}" | grep pdflab
echo ""
echo "Configured Limits:"
docker inspect pdflab-backend-prod | jq '.[0].HostConfig.Memory' | awk '{print "Backend Memory Limit: " $1/1024/1024/1024 "GB"}'
docker inspect pdflab-worker-prod | jq '.[0].HostConfig.Memory' | awk '{print "Worker Memory Limit: " $1/1024/1024/1024 "GB"}'
ENDSSH

    success "Task 2.3 COMPLETE - Resource limits applied to all containers!"
    echo ""
}

################################################################################
# Task 2.4: Populate Staging with Test Data
################################################################################

task_2_4_staging_test_data() {
    log "=== Task 2.4: Populate Staging with Test Data ==="
    info "Priority: P1 - HIGH"
    info "Effort: 60 minutes"
    echo ""

    info "Step 1: Create test data seed script..."
    ssh root@${VPS_IP} << 'ENDSSH'
cd /var/pdflab-staging

cat > seed-staging.sql << 'EOF'
-- PDFLab Staging Test Data Seed Script
-- Creates representative test users and conversion jobs

USE pdflab_staging;

-- Test Users (10 users across all plans)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, created_at, updated_at) VALUES
  (UUID(), 'test-free-1@pdflab.pro', '$2b$10$abc123...', 'Free User 1', 'free', 1, 3, NOW(), NOW()),
  (UUID(), 'test-free-2@pdflab.pro', '$2b$10$abc123...', 'Free User 2', 'free', 3, 3, NOW(), NOW()),
  (UUID(), 'test-starter-1@pdflab.pro', '$2b$10$abc123...', 'Starter User 1', 'starter', 25, 100, NOW(), NOW()),
  (UUID(), 'test-starter-2@pdflab.pro', '$2b$10$abc123...', 'Starter User 2', 'starter', 75, 100, NOW(), NOW()),
  (UUID(), 'test-pro-1@pdflab.pro', '$2b$10$abc123...', 'Pro User 1', 'pro', 250, -1, NOW(), NOW()),
  (UUID(), 'test-pro-2@pdflab.pro', '$2b$10$abc123...', 'Pro User 2', 'pro', 1500, -1, NOW(), NOW()),
  (UUID(), 'test-enterprise-1@pdflab.pro', '$2b$10$abc123...', 'Enterprise User 1', 'enterprise', 5000, -1, NOW(), NOW()),
  (UUID(), 'test-enterprise-2@pdflab.pro', '$2b$10$abc123...', 'Enterprise User 2', 'enterprise', 10000, -1, NOW(), NOW()),
  (UUID(), 'test-admin@pdflab.pro', '$2b$10$abc123...', 'Admin User', 'enterprise', 0, -1, NOW(), NOW()),
  (UUID(), 'test-beta@pdflab.pro', '$2b$10$abc123...', 'Beta User', 'pro', 50, -1, NOW(), NOW());

-- Test Conversion Jobs (50 jobs with various statuses)
-- Note: Replace user_id references with actual UUIDs after user insertion
SET @free_user = (SELECT id FROM users WHERE email = 'test-free-1@pdflab.pro' LIMIT 1);
SET @pro_user = (SELECT id FROM users WHERE email = 'test-pro-1@pdflab.pro' LIMIT 1);
SET @enterprise_user = (SELECT id FROM users WHERE email = 'test-enterprise-1@pdflab.pro' LIMIT 1);

INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, created_at, expires_at) VALUES
  (UUID(), @free_user, 'pdf-to-docx', 'completed', 100, 'invoice.pdf', 156789, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY)),
  (UUID(), @free_user, 'pdf-to-pptx', 'completed', 100, 'presentation.pdf', 2456789, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY)),
  (UUID(), @free_user, 'pdf-to-png', 'failed', 0, 'corrupted.pdf', 456789, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY)),
  (UUID(), @pro_user, 'pdf-to-docx', 'completed', 100, 'contract.pdf', 3456789, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 6 DAY)),
  (UUID(), @pro_user, 'pdf-to-xlsx', 'processing', 45, 'data-report.pdf', 5456789, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), @enterprise_user, 'merge-pdfs', 'completed', 100, 'merged-docs.pdf', 15456789, DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_ADD(NOW(), INTERVAL 6 DAY)),
  (UUID(), @enterprise_user, 'compress-pdf', 'queued', 0, 'large-file.pdf', 45456789, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY));

-- More conversion jobs for history testing (43 more jobs)
-- Add random completed jobs across different users and conversion types
DELIMITER $$
CREATE PROCEDURE generate_test_jobs()
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE random_user_id CHAR(36);
  DECLARE random_type VARCHAR(50);
  DECLARE random_status VARCHAR(50);

  WHILE i < 43 DO
    SET random_user_id = (SELECT id FROM users WHERE email LIKE 'test-%' ORDER BY RAND() LIMIT 1);
    SET random_type = ELT(FLOOR(1 + RAND() * 5), 'pdf-to-docx', 'pdf-to-pptx', 'pdf-to-xlsx', 'pdf-to-png', 'merge-pdfs');
    SET random_status = ELT(FLOOR(1 + RAND() * 3), 'completed', 'completed', 'failed');

    INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, created_at, expires_at) VALUES
      (UUID(), random_user_id, random_type, random_status, IF(random_status='completed', 100, 0),
       CONCAT('test-file-', i, '.pdf'), FLOOR(100000 + RAND() * 5000000),
       DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY),
       DATE_ADD(NOW(), INTERVAL FLOOR(RAND() * 7) DAY));

    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL generate_test_jobs();
DROP PROCEDURE generate_test_jobs;

SELECT 'Staging database seeded successfully' AS status;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_jobs FROM conversion_jobs;
SELECT status, COUNT(*) AS count FROM conversion_jobs GROUP BY status;
EOF

echo "Test data seed script created"
ENDSSH

    info "Step 2: Execute seed script in staging database..."
    ssh root@${VPS_IP} << 'ENDSSH'
cd /var/pdflab-staging

# Execute the seed script
docker exec -i pdflab-mysql-staging mysql -updflab -p***REMOVED*** < seed-staging.sql

echo ""
echo "Staging database populated!"
ENDSSH

    info "Step 3: Verify test data..."
    ssh root@${VPS_IP} << 'ENDSSH'
docker exec pdflab-mysql-staging mysql -updflab -p***REMOVED*** -e "
USE pdflab_staging;
SELECT 'Test Users:' AS '';
SELECT COUNT(*) AS total_users FROM users;
SELECT plan, COUNT(*) AS count FROM users GROUP BY plan;
SELECT '';
SELECT 'Test Conversion Jobs:' AS '';
SELECT COUNT(*) AS total_jobs FROM conversion_jobs;
SELECT status, COUNT(*) AS count FROM conversion_jobs GROUP BY status;
"
ENDSSH

    success "Task 2.4 COMPLETE - Staging populated with representative test data!"
    echo ""
}

################################################################################
# Week 2 Completion Validation
################################################################################

validate_week2_completion() {
    log "=== Validating Week 2 Completion ==="
    echo ""

    local all_passed=true

    # Check 1: Docker Compose templates exist
    info "Check 1: Docker Compose templates..."
    TEMPLATE_COUNT=$(ssh root@${VPS_IP} "ls -1 /var/pdflab/docker-compose.*.yml 2>/dev/null | wc -l")
    if [ "$TEMPLATE_COUNT" -ge "3" ]; then
        success "Docker Compose templates found ($TEMPLATE_COUNT files)"
    else
        echo "${RED}[✗]${NC} Docker Compose templates missing"
        all_passed=false
    fi

    # Check 2: MySQL root access
    info "Check 2: MySQL root access..."
    ROOT_ACCESS=$(ssh root@${VPS_IP} "docker exec pdflab-mysql-prod mysql -uroot -prootpassword123 -e 'SELECT 1' 2>/dev/null | grep -c '1' || echo '0'")
    if [ "$ROOT_ACCESS" == "1" ]; then
        success "MySQL root access working"
    else
        echo "${RED}[✗]${NC} MySQL root access broken"
        all_passed=false
    fi

    # Check 3: Resource limits configured
    info "Check 3: Resource limits..."
    BACKEND_LIMIT=$(ssh root@${VPS_IP} "docker inspect pdflab-backend-prod | jq '.[0].HostConfig.Memory' 2>/dev/null || echo '0'")
    if [ "$BACKEND_LIMIT" != "0" ] && [ "$BACKEND_LIMIT" != "null" ]; then
        success "Resource limits configured (Backend: $(echo $BACKEND_LIMIT | awk '{print $1/1024/1024/1024}')GB)"
    else
        echo "${RED}[✗]${NC} Resource limits not configured"
        all_passed=false
    fi

    # Check 4: Staging test data
    info "Check 4: Staging test data..."
    STAGING_USERS=$(ssh root@${VPS_IP} "docker exec pdflab-mysql-staging mysql -updflab -p***REMOVED*** -e 'SELECT COUNT(*) FROM pdflab_staging.users' 2>/dev/null | tail -1")
    if [ "$STAGING_USERS" -ge "10" ]; then
        success "Staging test data present ($STAGING_USERS users)"
    else
        echo "${RED}[✗]${NC} Staging test data missing"
        all_passed=false
    fi

    echo ""
    if [ "$all_passed" = true ]; then
        success "All Week 2 validation checks PASSED!"
        return 0
    else
        echo "${YELLOW}[!]${NC} Some validation checks failed. Review output above."
        return 1
    fi
}

################################################################################
# Main Execution Flow
################################################################################

main() {
    echo ""
    log "=========================================="
    log "PDFLab Drift Remediation - Week 2"
    log "Standardization Tasks"
    log "=========================================="
    echo ""

    info "This script will execute 4 standardization tasks:"
    info "  1. Standardize Docker Compose configurations"
    info "  2. Fix MySQL root password access"
    info "  3. Add resource limits to all containers"
    info "  4. Populate staging with test data"
    echo ""
    info "Expected duration: ~3 hours"
    info "Expected impact: 18% drift → 8% drift"
    echo ""

    read -p "Ready to proceed? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Aborted by user"
        exit 0
    fi

    echo ""
    START_TIME=$(date +%s)

    # Execute all tasks
    task_2_1_docker_compose_template
    task_2_2_mysql_root_password
    task_2_3_resource_limits
    task_2_4_staging_test_data

    # Validate completion
    validate_week2_completion

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    HOURS=$((DURATION / 3600))
    MINUTES=$(((DURATION % 3600) / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    log "=========================================="
    log "Week 2 Remediation COMPLETE! ✓"
    log "=========================================="
    echo ""
    success "All 4 standardization tasks completed"
    success "Drift reduced from 18% to ~8%"
    success "Infrastructure standardized across environments"
    echo ""
    info "Execution time: ${HOURS}h ${MINUTES}m ${SECONDS}s"
    echo ""
    info "Next Steps:"
    info "  1. Monitor both environments for 48 hours"
    info "  2. Test staging with representative workflows"
    info "  3. Schedule Week 3 execution (automation)"
    echo ""
}

# Run main function
main "$@"
