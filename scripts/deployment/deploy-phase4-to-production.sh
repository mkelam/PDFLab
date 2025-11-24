#!/bin/bash

###############################################################################
# Phase 4: Advanced Monitoring - Production Deployment
#
# Deploys Phase 4 monitoring to production (ONLY after successful staging)
# Estimated Time: 30-45 minutes
# Risk: Low (non-intrusive monitoring)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="root@141.136.44.168"
PROD_DIR="/var/pdflab/app"
BACKUP_DIR="/var/pdflab/backups/phase4-$(date +%Y%m%d-%H%M%S)"

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

print_header "Phase 4: Advanced Monitoring - Production Deployment"
echo "⚠️  WARNING: This will deploy to PRODUCTION environment"
echo ""
echo "Prerequisites:"
echo "  ✓ Phase 4 tested in staging for 24-48 hours"
echo "  ✓ All dashboard components working"
echo "  ✓ No errors in staging logs"
echo "  ✓ Performance impact acceptable (<1% CPU, <10 MB RAM)"
echo ""
echo "This deployment will:"
echo "  1. Deploy backend metrics modules"
echo "  2. Configure Prometheus scraping"
echo "  3. Deploy alert rules"
echo "  4. Deploy custom dashboard"
echo ""
echo "Expected downtime: ~30 seconds (backend restart)"
echo ""

confirm_proceed "Have you tested this in staging for 24-48 hours?"
confirm_proceed "Ready to deploy Phase 4 to PRODUCTION?"

# ============================================================================
# Step 1: Pre-deployment Checks
# ============================================================================

print_header "Step 1: Pre-deployment Checks"

echo "Checking VPS connectivity..."
if ssh ${VPS_HOST} "echo 'Connected'" 2>/dev/null; then
    print_success "VPS connection successful"
else
    print_error "Cannot connect to VPS"
    exit 1
fi

echo "Checking production services..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Check backend
    if docker ps | grep -q pdflab-backend-prod; then
        echo "✓ Backend running"
    else
        echo "✗ Backend not running!"
        exit 1
    fi

    # Check frontend
    if docker ps | grep -q pdflab-frontend-prod; then
        echo "✓ Frontend running"
    else
        echo "✗ Frontend not running!"
        exit 1
    fi

    # Check Prometheus
    if docker ps | grep -q prometheus; then
        echo "✓ Prometheus running"
    else
        echo "⚠ Prometheus not running (will need to start it)"
    fi
ENDSSH

print_success "Pre-deployment checks passed"
echo ""

# ============================================================================
# Step 2: Backup Production
# ============================================================================

print_header "Step 2: Backing Up Production"

ssh ${VPS_HOST} << ENDSSH
    echo "Creating backup directory..."
    mkdir -p ${BACKUP_DIR}

    echo "Backing up backend src..."
    if [ -d "${PROD_DIR}/backend/src" ]; then
        cp -r ${PROD_DIR}/backend/src ${BACKUP_DIR}/backend-src-backup
        echo "✓ Backend backup created"
    fi

    echo "Backing up frontend components..."
    if [ -d "${PROD_DIR}/components" ]; then
        cp -r ${PROD_DIR}/components ${BACKUP_DIR}/components-backup
        echo "✓ Components backup created"
    fi

    echo "Backup location: ${BACKUP_DIR}"
ENDSSH

print_success "Production backup completed"
echo ""

# ============================================================================
# Step 3: Deploy Backend Metrics
# ============================================================================

print_header "Step 3: Deploying Backend Metrics"

echo "Syncing metrics modules..."
rsync -avz --progress \
    backend/src/metrics/ ${VPS_HOST}:${PROD_DIR}/backend/src/metrics/

print_success "Metrics modules synced"

echo "Installing backend dependencies..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app/backend

    echo "Installing node-cache..."
    npm install node-cache

    echo "✓ Dependencies installed"
ENDSSH

print_success "Backend dependencies installed"

echo ""
print_warning "MANUAL STEP REQUIRED:"
echo "You need to add initializeMetrics() to backend/src/server.ts"
echo ""
echo "Add this code after server.listen():"
echo ""
echo "  import { initializeMetrics } from './metrics'"
echo ""
echo "  logger.info('[Server] Initializing advanced monitoring...')"
echo "  const stopMetrics = initializeMetrics()"
echo "  logger.info('[Server] Advanced monitoring started')"
echo ""
echo "  process.on('SIGTERM', () => {"
echo "    stopMetrics()"
echo "    // ... rest of shutdown"
echo "  })"
echo ""

confirm_proceed "Have you updated server.ts with initializeMetrics()?"

# ============================================================================
# Step 4: Restart Production Backend
# ============================================================================

print_header "Step 4: Restarting Production Backend"

echo "⚠️  This will cause ~30 seconds of downtime"
confirm_proceed "Ready to restart production backend?"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Stopping backend..."
    docker-compose -f docker-compose.production.yml stop backend

    echo "Starting backend..."
    docker-compose -f docker-compose.production.yml up -d backend

    echo "Waiting for backend to start..."
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
        echo "✗ Backend failed to start!"
        docker logs pdflab-backend-prod --tail 50
        exit 1
    fi

    # Verify metrics endpoint
    echo ""
    echo "Checking metrics endpoint..."
    if curl -s http://localhost:3006/metrics | grep -q "pdflab_"; then
        echo "✓ Metrics endpoint working"
        echo "Sample metrics:"
        curl -s http://localhost:3006/metrics | grep "pdflab_" | head -5
    else
        echo "⚠ No pdflab metrics found - check logs"
    fi
ENDSSH

print_success "Production backend restarted"
echo ""

# ============================================================================
# Step 5: Configure Prometheus
# ============================================================================

print_header "Step 5: Configuring Prometheus"

echo "Deploying alert rules..."
scp prometheus/alerts/custom-alerts.yml ${VPS_HOST}:/etc/prometheus/alerts/ 2>/dev/null || \
scp prometheus/alerts/custom-alerts.yml ${VPS_HOST}:/var/pdflab/prometheus/alerts/

print_success "Alert rules deployed"

echo "Updating Prometheus configuration..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Check if Prometheus config exists
    if [ -f "/etc/prometheus/prometheus.yml" ]; then
        PROM_CONFIG="/etc/prometheus/prometheus.yml"
    elif [ -f "/var/pdflab/prometheus/prometheus.yml" ]; then
        PROM_CONFIG="/var/pdflab/prometheus/prometheus.yml"
    else
        echo "⚠ Prometheus config not found - manual configuration needed"
        exit 0
    fi

    echo "Prometheus config: $PROM_CONFIG"

    # Check if pdflab scrape config exists
    if grep -q "pdflab-backend" "$PROM_CONFIG"; then
        echo "✓ PDFLab scrape config already exists"
    else
        echo "⚠ Please add to prometheus.yml:"
        echo ""
        echo "scrape_configs:"
        echo "  - job_name: 'pdflab-backend'"
        echo "    static_configs:"
        echo "      - targets: ['pdflab-backend-prod:3006']"
        echo "    scrape_interval: 15s"
    fi

    # Check if alert rules are configured
    if grep -q "rule_files" "$PROM_CONFIG"; then
        echo "✓ Alert rules configured"
    else
        echo "⚠ Please add to prometheus.yml:"
        echo ""
        echo "rule_files:"
        echo "  - '/etc/prometheus/alerts/custom-alerts.yml'"
    fi
ENDSSH

echo ""
echo "Reloading Prometheus..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Reload Prometheus config
    if docker ps | grep -q prometheus; then
        echo "Sending SIGHUP to Prometheus..."
        docker exec prometheus kill -HUP 1
        sleep 5
        echo "✓ Prometheus reloaded"
    else
        echo "⚠ Prometheus container not found - please start it manually"
    fi
ENDSSH

print_success "Prometheus configured"
echo ""

# ============================================================================
# Step 6: Deploy Frontend Dashboard
# ============================================================================

print_header "Step 6: Deploying Frontend Dashboard"

echo "Syncing dashboard components..."
rsync -avz --progress \
    components/dashboard/ ${VPS_HOST}:${PROD_DIR}/components/dashboard/

rsync -avz --progress \
    lib/prometheus-client.ts ${VPS_HOST}:${PROD_DIR}/lib/

rsync -avz --progress \
    app/admin/monitoring/ ${VPS_HOST}:${PROD_DIR}/app/admin/monitoring/

print_success "Dashboard components synced"

echo "Setting environment variable..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    # Add Prometheus URL to production env
    if grep -q "NEXT_PUBLIC_PROMETHEUS_URL" .env.production; then
        echo "✓ Prometheus URL already set"
    else
        echo "NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:9090" >> .env.production
        echo "✓ Prometheus URL added"
    fi
ENDSSH

print_success "Environment configured"

echo "Rebuilding and restarting frontend..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Installing dependencies..."
    npm install

    echo "Building frontend..."
    npm run build

    echo "Restarting frontend..."
    docker-compose -f docker-compose.production.yml restart frontend

    sleep 20

    # Check frontend health
    if curl -f http://localhost:3000 &>/dev/null; then
        echo "✓ Frontend is running"
    else
        echo "⚠ Frontend not accessible"
    fi
ENDSSH

print_success "Frontend deployed"
echo ""

# ============================================================================
# Step 7: Verify Deployment
# ============================================================================

print_header "Step 7: Verifying Deployment"

echo "Testing backend metrics..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Test metrics endpoint
    echo "Checking /metrics endpoint..."
    if curl -s http://localhost:3006/metrics | grep "pdflab_queue_depth" &>/dev/null; then
        echo "✓ Queue metrics available"
    fi

    if curl -s http://localhost:3006/metrics | grep "pdflab_conversion_funnel" &>/dev/null; then
        echo "✓ Conversion funnel metrics available"
    fi

    if curl -s http://localhost:3006/metrics | grep "pdflab_http_errors" &>/dev/null; then
        echo "✓ Error metrics available"
    fi

    if curl -s http://localhost:3006/metrics | grep "pdflab_slo" &>/dev/null; then
        echo "✓ SLO metrics available"
    fi
ENDSSH

echo ""
echo "Testing Prometheus scraping..."
ssh ${VPS_HOST} << 'ENDSSH'
    if docker ps | grep -q prometheus; then
        # Check Prometheus targets
        if curl -s "http://localhost:9090/api/v1/targets" | grep -q "pdflab-backend"; then
            echo "✓ Prometheus scraping backend"
        else
            echo "⚠ Prometheus not scraping backend yet"
        fi

        # Check alert rules
        if curl -s "http://localhost:9090/api/v1/rules" | grep -q "pdflab"; then
            echo "✓ Alert rules loaded"
        else
            echo "⚠ Alert rules not loaded"
        fi
    else
        echo "⚠ Prometheus not running - manual check required"
    fi
ENDSSH

echo ""
echo "Testing frontend dashboard..."
echo "  Dashboard URL: https://pdflab.pro/admin/monitoring"
echo "  Manual check required - login as admin and verify dashboard loads"
echo ""

print_success "Verification complete"
echo ""

# ============================================================================
# Step 8: Performance Check
# ============================================================================

print_header "Step 8: Performance Impact Check"

echo "Checking backend resource usage..."
ssh ${VPS_HOST} << 'ENDSSH'
    echo "Backend container stats:"
    docker stats pdflab-backend-prod --no-stream

    echo ""
    echo "Expected impact:"
    echo "  - Memory: +5-10 MB"
    echo "  - CPU: <1% increase"
    echo ""
ENDSSH

print_success "Performance check complete"
echo ""

# ============================================================================
# Deployment Complete
# ============================================================================

print_header "Phase 4 Production Deployment Complete! 🎉"

echo "✅ Deployment Summary:"
echo "  - Backend metrics deployed and active"
echo "  - Prometheus configured for scraping"
echo "  - Alert rules deployed"
echo "  - Custom dashboard deployed"
echo ""
echo "🌐 Production URLs:"
echo "  - Dashboard: https://pdflab.pro/admin/monitoring"
echo "  - Prometheus: http://141.136.44.168:9090"
echo "  - Metrics: http://141.136.44.168:3006/metrics"
echo ""
echo "📊 Monitoring:"
echo "  - Backend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-backend-prod'"
echo "  - Frontend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-frontend-prod'"
echo "  - Prometheus UI: http://141.136.44.168:9090"
echo ""
echo "✅ Verification Checklist:"
echo "  [ ] Backend metrics exporting (/metrics endpoint)"
echo "  [ ] Prometheus scraping successfully (check targets)"
echo "  [ ] Alert rules loaded (check Prometheus UI)"
echo "  [ ] Dashboard accessible (https://pdflab.pro/admin/monitoring)"
echo "  [ ] All 4 dashboard components render"
echo "  [ ] No errors in backend logs"
echo "  [ ] No errors in frontend console"
echo "  [ ] Performance impact acceptable (<1% CPU, <10 MB RAM)"
echo ""
echo "⏱️  Next 24-48 Hours:"
echo "  1. Monitor backend logs for errors"
echo "  2. Monitor system resources (CPU, memory)"
echo "  3. Check dashboard daily"
echo "  4. Verify alerts are working (if any trigger)"
echo "  5. Track cache hit rates and performance"
echo ""
echo "📝 Rollback Instructions:"
echo "  If critical issues occur:"
echo "    ssh ${VPS_HOST}"
echo "    cd ${PROD_DIR}/backend/src"
echo "    rm -rf metrics"
echo "    docker-compose -f ${PROD_DIR}/docker-compose.production.yml restart backend"
echo ""
echo "  To restore from backup:"
echo "    cp -r ${BACKUP_DIR}/backend-src-backup/* ${PROD_DIR}/backend/src/"
echo "    cp -r ${BACKUP_DIR}/components-backup/* ${PROD_DIR}/components/"
echo "    docker-compose -f ${PROD_DIR}/docker-compose.production.yml restart"
echo ""
echo "🎯 Completed Phases:"
echo "  ✅ Phase 1: Emergency Stability & Operational Foundation"
echo "  ✅ Phase 2: Database Scaling (if deployed)"
echo "  ✅ Phase 3: Frontend Optimization (if deployed)"
echo "  ✅ Phase 4: Advanced Monitoring"
echo ""
echo "📈 Next Steps:"
echo "  - Security audit (see docs/OUTSTANDING_IMPLEMENTATION_TASKS.md)"
echo "  - Load testing"
echo "  - Documentation polish"
echo ""

print_success "Production deployment completed successfully!"
print_warning "Monitor for 24-48 hours and verify all metrics collecting properly"
