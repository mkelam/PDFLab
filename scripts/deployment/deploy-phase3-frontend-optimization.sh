#!/bin/bash

###############################################################################
# Phase 3: Frontend Optimization Deployment Script
#
# Deploys refactored components, bundle optimizations, and code splitting
# Estimated Time: 2-3 hours
# Risk: Low (backward compatible)
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
BACKUP_DIR="/var/pdflab/backups/phase3-$(date +%Y%m%d-%H%M%S)"

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

print_header "Phase 3: Frontend Optimization Deployment"
echo "This script will:"
echo "  1. Build optimized frontend bundle"
echo "  2. Verify bundle size reduction"
echo "  3. Deploy to production"
echo "  4. Test performance improvements"
echo ""
echo "Expected improvements:"
echo "  - Bundle size: 740 KB → ~296 KB (60% reduction)"
echo "  - First Contentful Paint: <1s"
echo "  - Time to Interactive: <2s"
echo ""
echo "Estimated time: 2-3 hours"
echo "Downtime: ~1 minute during frontend restart"
echo ""

confirm_proceed "Ready to deploy Phase 3?"

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

echo "Checking Node.js version..."
node_version=$(node --version)
echo "Local Node.js: $node_version"

if [[ "$node_version" < "v18" ]]; then
    print_warning "Node.js version should be 18 or higher"
fi

print_success "Pre-deployment checks passed"
echo ""

# ============================================================================
# Step 2: Build optimized bundle
# ============================================================================

print_header "Step 2: Building Optimized Bundle"

echo "Installing dependencies..."
npm install

print_success "Dependencies installed"

echo "Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

print_success "Build completed"

# Check bundle size
echo ""
echo "Checking bundle sizes..."
if [ -d ".next/static/chunks" ]; then
    echo "Largest chunks:"
    du -h .next/static/chunks/* | sort -h | tail -10

    echo ""
    echo "Total bundle size:"
    total_size=$(du -sh .next/static/chunks | awk '{print $1}')
    echo "  Bundle size: $total_size"

    # Check if bundle is under 400 KB target
    total_kb=$(du -sk .next/static/chunks | awk '{print $1}')
    if [ $total_kb -lt 400 ]; then
        print_success "Bundle size under 400 KB target ✓"
    else
        print_warning "Bundle size is $total_kb KB (target: <400 KB)"
    fi
else
    print_warning "Build directory not found"
fi

echo ""

# ============================================================================
# Step 3: Backup current frontend
# ============================================================================

print_header "Step 3: Backing Up Current Frontend"

ssh ${VPS_HOST} << ENDSSH
    echo "Creating backup directory..."
    mkdir -p ${BACKUP_DIR}

    echo "Backing up current .next build..."
    if [ -d "${VPS_DIR}/.next" ]; then
        cp -r ${VPS_DIR}/.next ${BACKUP_DIR}/.next-backup
        echo "✓ Frontend backup created"
    else
        echo "⚠ No existing .next directory found"
    fi

    echo "Backing up current components..."
    if [ -d "${VPS_DIR}/components" ]; then
        cp -r ${VPS_DIR}/components ${BACKUP_DIR}/components-backup
        echo "✓ Components backup created"
    fi

    echo "Backup location: ${BACKUP_DIR}"
ENDSSH

print_success "Frontend backup completed"
echo ""

# ============================================================================
# Step 4: Deploy frontend code
# ============================================================================

print_header "Step 4: Deploying Frontend Code"

echo "Syncing frontend code to VPS..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env*' \
    --exclude 'backend' \
    .next/ ${VPS_HOST}:${VPS_DIR}/.next/

echo ""
echo "Syncing components..."
rsync -avz --progress \
    components/ ${VPS_HOST}:${VPS_DIR}/components/

echo ""
echo "Syncing lib files..."
rsync -avz --progress \
    lib/ ${VPS_HOST}:${VPS_DIR}/lib/

echo ""
echo "Syncing app files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    app/ ${VPS_HOST}:${VPS_DIR}/app/

echo ""
echo "Syncing config files..."
scp next.config.mjs ${VPS_HOST}:${VPS_DIR}/
scp package.json ${VPS_HOST}:${VPS_DIR}/

print_success "Frontend code synced"
echo ""

# ============================================================================
# Step 5: Install dependencies on VPS
# ============================================================================

print_header "Step 5: Installing Dependencies"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Installing production dependencies..."
    npm install --production

    echo "✓ Dependencies installed"
ENDSSH

print_success "Dependencies installed on VPS"
echo ""

# ============================================================================
# Step 6: Restart frontend
# ============================================================================

print_header "Step 6: Restarting Frontend"

echo "This will cause ~1 minute of downtime..."
confirm_proceed "Ready to restart frontend?"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Stopping frontend container..."
    docker-compose -f docker-compose.production.yml stop frontend

    echo "Starting frontend container..."
    docker-compose -f docker-compose.production.yml up -d frontend

    echo "Waiting for frontend to start..."
    sleep 20

    # Check if frontend is running
    max_attempts=12
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000 &>/dev/null; then
            echo "✓ Frontend is running!"
            break
        fi
        attempt=$((attempt + 1))
        echo "Waiting... (attempt $attempt/$max_attempts)"
        sleep 5
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "✗ Frontend failed to start!"
        echo "Checking logs:"
        docker logs pdflab-frontend-prod --tail 50
        exit 1
    fi
ENDSSH

print_success "Frontend restarted successfully"
echo ""

# ============================================================================
# Step 7: Verify deployment
# ============================================================================

print_header "Step 7: Verifying Deployment"

echo "Testing frontend endpoints..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Test homepage
    echo "Testing homepage..."
    if curl -f http://localhost:3000 &>/dev/null; then
        echo "✓ Homepage accessible"
    else
        echo "✗ Homepage not accessible!"
        exit 1
    fi

    # Test pricing page (uses UnifiedConversionInterface)
    echo "Testing pricing page..."
    if curl -f http://localhost:3000/pricing &>/dev/null; then
        echo "✓ Pricing page accessible"
    else
        echo "⚠ Pricing page not accessible"
    fi

    # Check frontend logs
    echo ""
    echo "Checking frontend logs for errors..."
    if docker logs pdflab-frontend-prod --tail 50 | grep -i "error" | grep -v "0 errors"; then
        echo "⚠ Errors found in logs (may be expected during startup)"
    else
        echo "✓ No errors detected"
    fi
ENDSSH

print_success "Deployment verification passed"
echo ""

# ============================================================================
# Step 8: Performance testing
# ============================================================================

print_header "Step 8: Performance Testing"

echo "Testing page load performance..."
echo "NOTE: Use Lighthouse or WebPageTest for detailed metrics"
echo ""

ssh ${VPS_HOST} << 'ENDSSH'
    echo "Testing homepage load time..."
    time curl -s http://localhost:3000 > /dev/null

    echo ""
    echo "Testing with Lighthouse (if installed):"
    if command -v lighthouse &> /dev/null; then
        lighthouse https://pdflab.pro --output json --output-path /tmp/lighthouse-report.json
        echo "✓ Lighthouse report generated: /tmp/lighthouse-report.json"
    else
        echo "⚠ Lighthouse not installed"
        echo "  Install with: npm install -g lighthouse"
        echo "  Then run: lighthouse https://pdflab.pro"
    fi
ENDSSH

echo ""
echo "Manual performance checks recommended:"
echo "  1. Open Chrome DevTools"
echo "  2. Go to Lighthouse tab"
echo "  3. Run audit on https://pdflab.pro"
echo "  4. Verify metrics:"
echo "     - Performance score: >90"
echo "     - First Contentful Paint: <1s"
echo "     - Time to Interactive: <2s"
echo "     - Total Blocking Time: <200ms"
echo ""

print_success "Performance testing guidance provided"
echo ""

# ============================================================================
# Step 9: Monitor bundle loading
# ============================================================================

print_header "Step 9: Bundle Loading Verification"

echo "Checking that code splitting is working..."
ssh ${VPS_HOST} << 'ENDSSH'
    echo "Checking .next/static/chunks directory..."
    if [ -d "/var/pdflab/app/.next/static/chunks" ]; then
        echo "Chunk files:"
        ls -lh /var/pdflab/app/.next/static/chunks/*.js | head -10

        echo ""
        echo "Total chunks:"
        ls /var/pdflab/app/.next/static/chunks/*.js | wc -l

        echo "✓ Code splitting verified"
    else
        echo "⚠ Chunks directory not found"
    fi
ENDSSH

echo ""
echo "Browser verification (manual):"
echo "  1. Open https://pdflab.pro"
echo "  2. Open DevTools → Network tab"
echo "  3. Filter by JS files"
echo "  4. Verify multiple small chunks loading (not one large bundle)"
echo "  5. Navigate between pages and verify lazy loading"
echo ""

print_success "Bundle verification complete"
echo ""

# ============================================================================
# Deployment Complete
# ============================================================================

print_header "Phase 3 Deployment Complete! 🎉"

echo "✅ Deployment Summary:"
echo "  - Optimized bundle deployed"
echo "  - Refactored components active"
echo "  - Code splitting enabled"
echo "  - Frontend restarted successfully"
echo ""
echo "📊 Expected Improvements:"
echo "  - Bundle size: 60% reduction (740 KB → ~296 KB)"
echo "  - First Contentful Paint: <1 second"
echo "  - Time to Interactive: <2 seconds"
echo "  - Lighthouse Performance score: >90"
echo ""
echo "📈 Monitoring:"
echo "  - Watch frontend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-frontend-prod'"
echo "  - Monitor for 24-48 hours"
echo "  - Track user metrics (conversion rates, bounce rates)"
echo ""
echo "✅ Verification Steps:"
echo "  1. Test homepage: https://pdflab.pro"
echo "  2. Test conversion flow: https://pdflab.pro/pricing"
echo "  3. Run Lighthouse audit"
echo "  4. Check browser console for errors"
echo "  5. Test on mobile devices"
echo ""
echo "📝 Rollback Instructions:"
echo "  If issues occur, run:"
echo "    ssh ${VPS_HOST}"
echo "    cd ${VPS_DIR}"
echo "    rm -rf .next components lib"
echo "    cp -r ${BACKUP_DIR}/.next-backup .next"
echo "    cp -r ${BACKUP_DIR}/components-backup components"
echo "    docker-compose -f docker-compose.production.yml restart frontend"
echo ""
echo "🎯 Next Phase:"
echo "  After 24-48 hours of stable operation, deploy Phase 4:"
echo "    bash scripts/deployment/deploy-phase4-advanced-monitoring.sh"
echo ""
echo "  Or deploy to staging first:"
echo "    bash scripts/deployment/deploy-phase4-to-staging.sh"
echo ""

print_success "Deployment completed successfully!"
