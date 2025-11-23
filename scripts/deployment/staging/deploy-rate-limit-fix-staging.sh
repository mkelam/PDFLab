#!/bin/bash
#
# Deploy Rate Limiting Fix to Staging
#
# This script deploys the updated rate limiting middleware to the staging environment.
#

set -e

echo "🚀 Deploying Rate Limiting Fix to Staging Environment"
echo "======================================================="

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
CONTAINER_NAME="pdflab-backend-staging"
LOCAL_FILE="backend/dist/middleware/ratelimit.middleware.js"
CONTAINER_PATH="/app/dist/middleware/ratelimit.middleware.js"

# Step 1: Build the middleware locally
echo ""
echo "📦 Step 1: Building rate limiting middleware..."
cd backend
npm run build 2>&1 | tail -5

# Step 2: Copy to VPS
echo ""
echo "📤 Step 2: Copying updated middleware to VPS..."
scp "dist/middleware/ratelimit.middleware.js" "${VPS_USER}@${VPS_IP}:/tmp/ratelimit.middleware.js"
scp "dist/middleware/ratelimit.middleware.js.map" "${VPS_USER}@${VPS_IP}:/tmp/ratelimit.middleware.js.map"

# Step 3: Copy into container
echo ""
echo "🐳 Step 3: Deploying to staging container..."
ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
docker cp /tmp/ratelimit.middleware.js pdflab-backend-staging:/app/dist/middleware/ratelimit.middleware.js
docker cp /tmp/ratelimit.middleware.js.map pdflab-backend-staging:/app/dist/middleware/ratelimit.middleware.js.map
EOF

# Step 4: Restart container
echo ""
echo "🔄 Step 4: Restarting staging container..."
ssh "${VPS_USER}@${VPS_IP}" "docker restart pdflab-backend-staging"

# Step 5: Wait for container to be healthy
echo ""
echo "⏳ Step 5: Waiting for container to become healthy..."
sleep 15

# Step 6: Verify deployment
echo ""
echo "✅ Step 6: Verifying deployment..."
ssh "${VPS_USER}@${VPS_IP}" "docker logs pdflab-backend-staging --tail 30 | grep -i 'ratelimit\|staging'"

echo ""
echo "======================================================="
echo "✅ Rate Limiting Fix Deployed Successfully!"
echo ""
echo "Next Steps:"
echo "1. Run security tests: cd tests && npx cross-env TEST_ENV=staging npx playwright test integration/api/security.test.ts"
echo "2. Verify NO 429 errors in test output"
echo "3. Confirm all rate limiting tests pass"
