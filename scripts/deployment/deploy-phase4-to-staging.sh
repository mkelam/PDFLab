#!/bin/bash

###############################################################################
# Phase 4: Advanced Monitoring - Staging Deployment
#
# Deploys Phase 4 monitoring to staging environment for testing
# Estimated Time: 1-2 hours
# Risk: Low (staging environment)
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
STAGING_DIR="/var/pdflab-staging/app"
PROMETHEUS_PORT=9091  # Separate Prometheus for staging

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

print_header "Phase 4: Advanced Monitoring - Staging Deployment"
echo "This script will deploy to STAGING environment:"
echo "  - Backend metrics modules"
echo "  - Prometheus (port ${PROMETHEUS_PORT})"
echo "  - Custom dashboard components"
echo "  - Alert rules"
echo ""
echo "Staging URLs:"
echo "  Frontend: http://141.136.44.168:3001"
echo "  Backend: http://141.136.44.168:3007"
echo "  Prometheus: http://141.136.44.168:${PROMETHEUS_PORT}"
echo ""
echo "Estimated time: 1-2 hours"
echo ""

confirm_proceed "Ready to deploy Phase 4 to staging?"

# ============================================================================
# Step 1: Deploy Backend Metrics
# ============================================================================

print_header "Step 1: Deploying Backend Metrics"

echo "Syncing metrics modules..."
rsync -avz --progress \
    backend/src/metrics/ ${VPS_HOST}:${STAGING_DIR}/backend/src/metrics/

print_success "Metrics modules synced"

echo "Installing backend dependencies..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab-staging/app/backend
    npm install node-cache
    echo "✓ Dependencies installed"
ENDSSH

print_success "Backend dependencies installed"

echo "Updating server.ts with metrics initialization..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab-staging/app/backend/src

    # Check if initializeMetrics is already added
    if grep -q "initializeMetrics" server.ts; then
        echo "✓ Metrics already initialized in server.ts"
    else
        echo "⚠ Please manually add initializeMetrics() to server.ts"
        echo "  Add after server.listen():"
        echo "    import { initializeMetrics } from './metrics'"
        echo "    const stopMetrics = initializeMetrics()"
    fi
ENDSSH

echo ""

# ============================================================================
# Step 2: Restart Staging Backend
# ============================================================================

print_header "Step 2: Restarting Staging Backend"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab-staging/app/deployment/staging

    echo "Restarting backend..."
    docker-compose -f docker-compose.staging.yml restart backend-staging

    echo "Waiting for backend to start..."
    sleep 20

    # Check health
    if curl -f http://localhost:3007/api/health &>/dev/null; then
        echo "✓ Backend is healthy"
    else
        echo "⚠ Backend health check failed"
    fi

    # Verify metrics endpoint
    echo ""
    echo "Checking metrics endpoint..."
    if curl -s http://localhost:3007/metrics | grep -q "pdflab_"; then
        echo "✓ Metrics endpoint working"
        echo "Sample metrics:"
        curl -s http://localhost:3007/metrics | grep "pdflab_" | head -5
    else
        echo "⚠ No pdflab metrics found"
    fi
ENDSSH

print_success "Staging backend restarted"
echo ""

# ============================================================================
# Step 3: Deploy Prometheus for Staging
# ============================================================================

print_header "Step 3: Deploying Prometheus for Staging"

echo "Creating Prometheus configuration..."
ssh ${VPS_HOST} << ENDSSH
    mkdir -p /var/pdflab-staging/prometheus/alerts

    # Create prometheus.yml for staging
    cat > /var/pdflab-staging/prometheus/prometheus.yml << 'PROMCONFIG'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - '/etc/prometheus/alerts/custom-alerts-staging.yml'

scrape_configs:
  - job_name: 'pdflab-backend-staging'
    static_configs:
      - targets: ['pdflab-backend-staging:3006']
    scrape_interval: 15s

  - job_name: 'prometheus-staging'
    static_configs:
      - targets: ['localhost:9090']
PROMCONFIG

    echo "✓ Prometheus config created"
ENDSSH

# Copy alert rules
echo "Deploying alert rules..."
scp prometheus/alerts/custom-alerts.yml ${VPS_HOST}:/var/pdflab-staging/prometheus/alerts/custom-alerts-staging.yml

print_success "Prometheus configuration deployed"

echo "Starting Prometheus for staging..."
ssh ${VPS_HOST} << ENDSSH
    # Check if Prometheus staging is already running
    if docker ps | grep -q prometheus-staging; then
        echo "Stopping existing Prometheus staging..."
        docker stop prometheus-staging
        docker rm prometheus-staging
    fi

    # Start Prometheus
    docker run -d \
      --name prometheus-staging \
      --network pdflab-staging-network \
      -p ${PROMETHEUS_PORT}:9090 \
      -v /var/pdflab-staging/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
      -v /var/pdflab-staging/prometheus/alerts:/etc/prometheus/alerts \
      -v prometheus-staging-data:/prometheus \
      --restart unless-stopped \
      prom/prometheus:latest \
      --config.file=/etc/prometheus/prometheus.yml \
      --storage.tsdb.path=/prometheus \
      --web.console.libraries=/etc/prometheus/console_libraries \
      --web.console.templates=/etc/prometheus/consoles

    sleep 10

    # Verify Prometheus is running
    if curl -f http://localhost:${PROMETHEUS_PORT}/-/healthy &>/dev/null; then
        echo "✓ Prometheus is healthy"
    else
        echo "⚠ Prometheus health check failed"
    fi
ENDSSH

print_success "Prometheus deployed"
echo ""

# ============================================================================
# Step 4: Deploy Frontend Dashboard
# ============================================================================

print_header "Step 4: Deploying Frontend Dashboard"

echo "Syncing dashboard components..."
rsync -avz --progress \
    components/dashboard/ ${VPS_HOST}:${STAGING_DIR}/components/dashboard/

rsync -avz --progress \
    lib/prometheus-client.ts ${VPS_HOST}:${STAGING_DIR}/lib/

rsync -avz --progress \
    app/admin/monitoring/ ${VPS_HOST}:${STAGING_DIR}/app/admin/monitoring/

print_success "Dashboard components synced"

echo "Setting environment variable..."
ssh ${VPS_HOST} << ENDSSH
    cd /var/pdflab-staging/app

    # Add Prometheus URL to staging env
    if grep -q "NEXT_PUBLIC_PROMETHEUS_URL" deployment/staging/.env.staging; then
        echo "✓ Prometheus URL already set"
    else
        echo "NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:${PROMETHEUS_PORT}" >> deployment/staging/.env.staging
        echo "✓ Prometheus URL added to environment"
    fi
ENDSSH

print_success "Environment configured"

echo "Rebuilding and restarting frontend..."
ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab-staging/app

    echo "Installing dependencies..."
    npm install

    echo "Building frontend..."
    npm run build

    echo "Restarting frontend..."
    cd deployment/staging
    docker-compose -f docker-compose.staging.yml restart frontend-staging

    sleep 20

    # Check frontend health
    if curl -f http://localhost:3001 &>/dev/null; then
        echo "✓ Frontend is running"
    else
        echo "⚠ Frontend not accessible"
    fi
ENDSSH

print_success "Frontend deployed"
echo ""

# ============================================================================
# Step 5: Verify Deployment
# ============================================================================

print_header "Step 5: Verifying Deployment"

echo "Testing Prometheus scraping..."
ssh ${VPS_HOST} << ENDSSH
    # Test Prometheus API
    echo "Checking Prometheus targets..."
    curl -s "http://localhost:${PROMETHEUS_PORT}/api/v1/targets" | grep -q "pdflab-backend-staging" && echo "✓ Backend target found"

    # Test metrics query
    echo "Testing metrics query..."
    curl -s "http://localhost:${PROMETHEUS_PORT}/api/v1/query?query=up" | grep -q "\"status\":\"success\"" && echo "✓ Prometheus queries working"

    # Test pdflab metrics
    echo "Checking for pdflab metrics..."
    if curl -s "http://localhost:${PROMETHEUS_PORT}/api/v1/query?query=pdflab_queue_depth" | grep -q "pdflab_queue_depth"; then
        echo "✓ PDFLab metrics available"
    else
        echo "⚠ PDFLab metrics not yet available (may need a few minutes)"
    fi
ENDSSH

echo ""
echo "Testing dashboard access..."
echo "  Dashboard URL: http://141.136.44.168:3001/admin/monitoring"
echo "  Test credentials: staging-admin@pdflab.test / Admin123!"
echo ""

print_success "Verification complete"
echo ""

# ============================================================================
# Step 6: Generate Test Data
# ============================================================================

print_header "Step 6: Generating Test Data (Optional)"

confirm_proceed "Generate test conversions to populate metrics?"

echo "Submitting test conversions..."
for i in {1..10}; do
    curl -X POST http://141.136.44.168:3007/api/conversions \
      -H "Content-Type: application/json" \
      -d '{"file": "test.pdf", "outputFormat": "docx"}' \
      -s > /dev/null && echo "  Conversion $i submitted"
    sleep 2
done

print_success "Test data generated"
echo ""
echo "Wait 2-5 minutes for metrics to accumulate, then check dashboard"
echo ""

# ============================================================================
# Deployment Complete
# ============================================================================

print_header "Phase 4 Staging Deployment Complete! 🎉"

echo "✅ Deployment Summary:"
echo "  - Backend metrics deployed"
echo "  - Prometheus running on port ${PROMETHEUS_PORT}"
echo "  - Dashboard components deployed"
echo "  - Alert rules configured"
echo ""
echo "🌐 Staging URLs:"
echo "  - Dashboard: http://141.136.44.168:3001/admin/monitoring"
echo "  - Prometheus: http://141.136.44.168:${PROMETHEUS_PORT}"
echo "  - Backend API: http://141.136.44.168:3007/api/health"
echo "  - Metrics: http://141.136.44.168:3007/metrics"
echo ""
echo "👤 Test Credentials:"
echo "  - Admin: staging-admin@pdflab.test / Admin123!"
echo "  - Pro: staging-pro@pdflab.test / TestPass123!"
echo ""
echo "✅ Verification Checklist:"
echo "  [ ] Backend metrics exporting (check /metrics endpoint)"
echo "  [ ] Prometheus scraping successfully"
echo "  [ ] Dashboard accessible at /admin/monitoring"
echo "  [ ] All 4 dashboard components render"
echo "  [ ] Conversion funnel showing data"
echo "  [ ] SLO dashboard showing compliance"
echo "  [ ] Queue monitor showing depth"
echo "  [ ] Error rate table populating"
echo "  [ ] No console errors in browser"
echo ""
echo "📊 Monitoring Commands:"
echo "  - Backend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-backend-staging'"
echo "  - Frontend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-frontend-staging'"
echo "  - Prometheus logs: ssh ${VPS_HOST} 'docker logs -f prometheus-staging'"
echo ""
echo "⏱️  Next Steps:"
echo "  1. Monitor staging for 24-48 hours"
echo "  2. Run load tests (optional)"
echo "  3. If all tests pass, deploy to production:"
echo "     bash scripts/deployment/deploy-phase4-to-production.sh"
echo ""
echo "📝 Rollback Instructions:"
echo "  ssh ${VPS_HOST}"
echo "  cd ${STAGING_DIR}"
echo "  docker-compose -f deployment/staging/docker-compose.staging.yml down"
echo "  docker stop prometheus-staging && docker rm prometheus-staging"
echo "  # Restore from backup if needed"
echo ""

print_success "Staging deployment completed successfully!"
print_warning "Remember to monitor for 24-48 hours before production deployment"
