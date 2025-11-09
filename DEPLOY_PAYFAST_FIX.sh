#!/bin/bash
# ========================================================================
# PDFLab PayFast Signature Fix - VPS Deployment Script
# ========================================================================
# This script deploys the PayFast signature fix to production VPS
#
# What it fixes:
# - PayFast signature mismatch error
# - Wrong parameter ordering (was alphabetical, now PayFast-specific)
# - Missing name_last field
# - Currency handling (USD display, ZAR processing)
#
# Commit: 2acdcaf3 "Fix PayFast signature mismatch"
# ========================================================================

set -e

echo "=========================================="
echo "PDFLab PayFast Signature Fix Deployment"
echo "=========================================="
echo ""

VPS_HOST="root@141.136.44.168"
VPS_PATH="/root/pdflab-backend"

echo "✓ Deploying to: $VPS_HOST"
echo "✓ Target path: $VPS_PATH"
echo "✓ Commit: 2acdcaf3"
echo ""

# Step 1: Copy fixed TypeScript files to VPS
echo "📦 Step 1: Copying fixed source files..."
scp backend/src/services/payfast.service.ts "$VPS_HOST:$VPS_PATH/src/services/" || {
  echo "❌ Failed to copy payfast.service.ts"
  exit 1
}

scp backend/src/controllers/payfast.controller.ts "$VPS_HOST:$VPS_PATH/src/controllers/" || {
  echo "❌ Failed to copy payfast.controller.ts"
  exit 1
}

echo "✅ Source files copied successfully"
echo ""

# Step 2: Rebuild TypeScript on VPS
echo "🔨 Step 2: Rebuilding TypeScript on VPS..."
ssh "$VPS_HOST" << 'ENDSSH' || {
  echo "❌ Failed to rebuild TypeScript"
  exit 1
}
cd /root/pdflab-backend

echo "Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ TypeScript build successful"
else
  echo "❌ TypeScript build failed"
  exit 1
fi
ENDSSH

echo ""

# Step 3: Restart backend container
echo "🔄 Step 3: Restarting backend container..."
ssh "$VPS_HOST" << 'ENDSSH' || {
  echo "❌ Failed to restart container"
  exit 1
}
echo "Stopping backend container..."
docker stop pdflab-backend-prod

echo "Starting backend container..."
docker start pdflab-backend-prod

echo "Waiting 5 seconds for container to initialize..."
sleep 5
ENDSSH

echo "✅ Backend container restarted"
echo ""

# Step 4: Verify deployment
echo "🔍 Step 4: Verifying deployment..."
ssh "$VPS_HOST" << 'ENDSSH'
echo "Container status:"
docker ps --filter name=pdflab-backend-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Recent logs:"
docker logs pdflab-backend-prod --tail 20

echo ""
echo "Health check:"
curl -s http://localhost:3006/api/health | jq . || echo "Health endpoint not responding"
ENDSSH

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test payment flow at https://pdflab.pro/pricing"
echo "2. Use test account (NOT merchant account): testbuyer@example.com"
echo "3. Try Starter plan (R85.00)"
echo "4. Verify signature validation succeeds"
echo ""
echo "Expected results:"
echo "✅ Payment form loads without errors"
echo "✅ Amount shows R85.00 (not $4.55)"
echo "✅ PayFast accepts signature"
echo "✅ ITN webhook processes successfully"
echo "✅ User plan upgrades to 'starter'"
echo ""
echo "Troubleshooting:"
echo "- View logs: ssh $VPS_HOST 'docker logs pdflab-backend-prod --tail 100'"
echo "- Check health: curl https://pdflab.pro/api/health"
echo "- Manual restart: ssh $VPS_HOST 'docker restart pdflab-backend-prod'"
echo ""
echo "Documentation: PAYFAST_SIGNATURE_FIX_COMPLETE.md"
echo "=========================================="
