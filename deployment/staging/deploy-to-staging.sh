#!/bin/bash

###############################################################################
# Deploy to Staging Script
#
# Deploys latest code from your local machine to staging server
# Usage: bash deploy-to-staging.sh
###############################################################################

set -e

echo "🚀 Deploying to Staging Environment"
echo "===================================="
echo ""

# Configuration
SERVER="root@141.136.44.168"
STAGING_DIR="/var/pdflab-staging/app"
LOCAL_DIR="."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Step 1: Build locally
echo "Step 1: Building application locally..."
npm run build
print_success "Build complete"

# Step 2: Sync files to staging server
echo ""
echo "Step 2: Syncing files to staging server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'backend/node_modules' \
    --exclude 'backend/storage' \
    --exclude '.env*' \
    ${LOCAL_DIR}/ ${SERVER}:${STAGING_DIR}/

print_success "Files synced to staging"

# Step 3: Install dependencies and restart on server
echo ""
echo "Step 3: Installing dependencies and restarting services..."
ssh ${SERVER} << 'ENDSSH'
cd /var/pdflab-staging/app

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install --production

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Restart staging containers
echo "Restarting staging containers..."
cd deployment/staging
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml up -d --build

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Check health
echo "Checking service health..."
docker-compose -f docker-compose.staging.yml ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Staging URLs:"
echo "  Frontend: http://staging.pdflab.pro:3001"
echo "  Backend:  http://staging.pdflab.pro:3007/api/health"
echo ""
ENDSSH

print_success "Deployment to staging complete!"

# Step 4: Run smoke tests against staging
echo ""
echo "Step 4: Running smoke tests against staging..."
export API_URL=http://staging.pdflab.pro:3007
npm run test:production

print_success "Smoke tests passed!"

echo ""
echo "=========================================="
echo "🎉 Staging Deployment Successful!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test manually: http://staging.pdflab.pro:3001"
echo "2. Run full test suite:"
echo "   npm run test:e2e"
echo "   npm run test:integration"
echo "3. If tests pass, deploy to production"
echo ""
