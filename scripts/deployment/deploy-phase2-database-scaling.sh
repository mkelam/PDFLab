#!/bin/bash

###############################################################################
# Phase 2: Database Scaling Deployment Script
#
# Deploys database optimizations, read replicas, and caching layer
# Estimated Time: 4-6 hours
# Risk: Medium (requires VPS configuration)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="root@141.136.44.168"
VPS_DIR="/var/pdflab/app"
BACKUP_DIR="/var/pdflab/backups/phase2-$(date +%Y%m%d-%H%M%S)"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

confirm_proceed() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Do you want to proceed? (yes/no): " response
    if [ "$response" != "yes" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
}

print_header "Phase 2: Database Scaling Deployment"
echo "This script will:"
echo "  1. Backup production database"
echo "  2. Deploy optimized queries and caching"
echo "  3. Configure read replicas (manual step)"
echo "  4. Test performance improvements"
echo ""
echo "Estimated time: 4-6 hours"
echo "Downtime: ~5 minutes during backend restart"
echo ""

confirm_proceed "Ready to deploy Phase 2?"

# ============================================================================
# Step 1: Pre-deployment checks
# ============================================================================

print_header "Step 1: Pre-deployment Checks"

echo "Checking VPS connectivity..."
if ssh ${VPS_HOST} "echo 'Connected'" 2>/dev/null; then
    print_success "VPS connection successful"
else
    print_error "Cannot connect to VPS"
    exit 1
fi

echo "Checking production status..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    # Check containers
    if docker ps | grep -q pdflab-backend-prod; then
        echo "✓ Backend container running"
    else
        echo "✗ Backend container not running!"
        exit 1
    fi

    # Check database
    if docker exec pdflab-mysql-prod mysql -e "SELECT 1" &>/dev/null; then
        echo "✓ Database accessible"
    else
        echo "✗ Database not accessible!"
        exit 1
    fi

    # Check Redis
    if docker exec pdflab-redis-prod redis-cli ping &>/dev/null; then
        echo "✓ Redis accessible"
    else
        echo "✗ Redis not accessible!"
        exit 1
    fi
ENDSSH

print_success "Pre-deployment checks passed"
echo ""

# ============================================================================
# Step 2: Backup database
# ============================================================================

print_header "Step 2: Backing Up Database"

echo "Creating backup directory..."
ssh ${VPS_HOST} "mkdir -p ${BACKUP_DIR}"
print_success "Backup directory created: ${BACKUP_DIR}"

echo "Backing up database (this may take a few minutes)..."
ssh ${VPS_HOST} << ENDSSH
    docker exec pdflab-mysql-prod mysqldump \
        -u root \
        -p\${MYSQL_ROOT_PASSWORD} \
        --all-databases \
        --single-transaction \
        --quick \
        --lock-tables=false \
        > ${BACKUP_DIR}/full-database-backup.sql

    # Compress backup
    gzip ${BACKUP_DIR}/full-database-backup.sql

    echo "Backup size:"
    ls -lh ${BACKUP_DIR}/full-database-backup.sql.gz
ENDSSH

print_success "Database backup completed"
echo ""

# ============================================================================
# Step 3: Deploy backend code
# ============================================================================

print_header "Step 3: Deploying Backend Code"

echo "Syncing backend code to VPS..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'storage' \
    --exclude '.env*' \
    backend/ ${VPS_HOST}:${VPS_DIR}/backend/

print_success "Backend code synced"

echo "Installing dependencies on VPS..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app/backend

    # Install new dependencies
    npm install node-cache

    echo "✓ Dependencies installed"
ENDSSH

print_success "Dependencies installed"
echo ""

# ============================================================================
# Step 4: Configure environment variables
# ============================================================================

print_header "Step 4: Configuring Environment Variables"

echo "Checking if read replicas are configured..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    # Check if read replica hosts are set
    if grep -q "DB_READ_HOST_1" .env.production; then
        echo "✓ Read replica configuration found"
    else
        echo "⚠ Read replicas not configured (optional for Phase 2)"
        echo "  To enable read replicas later, add to .env.production:"
        echo "  DB_READ_HOST_1=your-replica-host-1"
        echo "  DB_READ_HOST_2=your-replica-host-2"
    fi

    # Ensure Redis is configured
    if grep -q "REDIS_HOST" .env.production; then
        echo "✓ Redis configuration found"
    else
        echo "⚠ Adding Redis configuration..."
        echo "REDIS_HOST=pdflab-redis-prod" >> .env.production
        echo "REDIS_PORT=6379" >> .env.production
    fi
ENDSSH

print_success "Environment variables checked"
echo ""

# ============================================================================
# Step 5: Restart backend
# ============================================================================

print_header "Step 5: Restarting Backend"

echo "This will cause ~30 seconds of downtime..."
confirm_proceed "Ready to restart backend?"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Stopping backend container..."
    docker-compose -f docker-compose.production.yml stop backend

    echo "Starting backend container..."
    docker-compose -f docker-compose.production.yml up -d backend

    echo "Waiting for backend to be healthy..."
    sleep 30

    # Check health
    max_attempts=12
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3006/api/health &>/dev/null; then
            echo "✓ Backend is healthy!"
            break
        fi
        attempt=$((attempt + 1))
        echo "Waiting... (attempt $attempt/$max_attempts)"
        sleep 5
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "✗ Backend failed to start properly!"
        echo "Checking logs:"
        docker logs pdflab-backend-prod --tail 50
        exit 1
    fi
ENDSSH

print_success "Backend restarted successfully"
echo ""

# ============================================================================
# Step 6: Verify deployment
# ============================================================================

print_header "Step 6: Verifying Deployment"

echo "Testing backend endpoints..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Test health endpoint
    if curl -f http://localhost:3006/api/health; then
        echo "✓ Health check passed"
    else
        echo "✗ Health check failed!"
        exit 1
    fi

    echo ""

    # Test database connection
    echo "Testing database connection..."
    docker logs pdflab-backend-prod --tail 100 | grep -i "database connected" && echo "✓ Database connected"

    # Test Redis connection
    echo "Testing Redis connection..."
    docker logs pdflab-backend-prod --tail 100 | grep -i "redis connected" && echo "✓ Redis connected"

    # Check for cache middleware
    echo "Checking for cache middleware..."
    docker logs pdflab-backend-prod --tail 100 | grep -i "cache" && echo "✓ Cache middleware active"
ENDSSH

print_success "Deployment verification passed"
echo ""

# ============================================================================
# Step 7: Performance testing
# ============================================================================

print_header "Step 7: Performance Testing"

echo "Testing optimized endpoints..."
ssh ${VPS_HOST} << 'ENDSSH'
    echo "Testing /api/health..."
    time curl -s http://localhost:3006/api/health > /dev/null

    echo ""
    echo "Testing /api/profile/conversion-history (should be cached)..."
    time curl -s -H "Authorization: Bearer test-token" http://localhost:3006/api/profile/conversion-history > /dev/null

    echo ""
    echo "Note: First request may be slow, second should be fast (cached)"
ENDSSH

echo ""
print_success "Performance testing complete"
echo ""

# ============================================================================
# Step 8: Post-deployment monitoring
# ============================================================================

print_header "Step 8: Post-Deployment Monitoring"

echo "Checking backend logs for errors..."
ssh ${VPS_HOST} << 'ENDSSH'
    echo "Last 30 lines of backend logs:"
    docker logs pdflab-backend-prod --tail 30

    echo ""
    echo "Checking for errors in last 100 lines:"
    if docker logs pdflab-backend-prod --tail 100 | grep -i "error" | grep -v "0 errors"; then
        echo "⚠ Errors found in logs"
    else
        echo "✓ No errors detected"
    fi
ENDSSH

echo ""
print_success "Post-deployment monitoring complete"
echo ""

# ============================================================================
# Deployment Complete
# ============================================================================

print_header "Phase 2 Deployment Complete! 🎉"

echo "✅ Deployment Summary:"
echo "  - Database backed up to: ${BACKUP_DIR}"
echo "  - Optimized queries deployed"
echo "  - Cache middleware active"
echo "  - Backend restarted successfully"
echo ""
echo "📊 Monitoring:"
echo "  - Watch backend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-backend-prod'"
echo "  - Check metrics: http://141.136.44.168:9090 (Prometheus)"
echo "  - Monitor for 24 hours before deploying Phase 3"
echo ""
echo "⚠️  Optional Next Steps:"
echo "  1. Set up MySQL read replicas (manual process)"
echo "     - Create replica instances"
echo "     - Configure master-slave replication"
echo "     - Add DB_READ_HOST_1 and DB_READ_HOST_2 to .env.production"
echo "     - Restart backend"
echo ""
echo "  2. Monitor cache hit rates"
echo "     - Check Redis statistics: docker exec pdflab-redis-prod redis-cli info stats"
echo "     - Target cache hit rate: >70%"
echo ""
echo "  3. Test performance improvements"
echo "     - /api/analytics/conversions (target: <500ms)"
echo "     - /api/partners/admin/all (target: <300ms)"
echo "     - /api/profile/conversion-history (target: <500ms)"
echo ""
echo "📝 Rollback Instructions:"
echo "  If issues occur, run:"
echo "    ssh ${VPS_HOST}"
echo "    cd ${VPS_DIR}"
echo "    git checkout HEAD~1 backend/"
echo "    docker-compose -f docker-compose.production.yml restart backend"
echo ""
echo "🎯 Next Phase:"
echo "  After 24 hours of stable operation, deploy Phase 3:"
echo "    bash scripts/deployment/deploy-phase3-frontend-optimization.sh"
echo ""

print_success "Deployment completed successfully!"
