#!/bin/bash

# Force backend to reload with new passphrase
# This completely removes and recreates the container

set -e

echo "=========================================="
echo "🔄 Force Backend Reload with Passphrase"
echo "=========================================="
echo ""

VPS_HOST="root@141.136.44.168"

echo "📋 Step 1: Verify .env has passphrase..."
ssh $VPS_HOST "cat /var/pdflab/app/backend/.env.production | grep PAYFAST_PASSPHRASE"
echo ""

echo "📋 Step 2: Stop and remove old container..."
ssh $VPS_HOST "docker stop pdflab-backend-prod && docker rm pdflab-backend-prod"
echo "✅ Old container removed"
echo ""

echo "📋 Step 3: Create new container with fresh env..."
ssh $VPS_HOST "docker run -d \
  --name pdflab-backend-prod \
  --restart unless-stopped \
  -p 3006:3006 \
  --network app_pdflab-network \
  --env-file /var/pdflab/app/backend/.env.production \
  -e NODE_ENV=production \
  -e DB_HOST=8731b5f977d0_pdflab-mysql-prod \
  -e REDIS_HOST=f18c830e3d31_pdflab-redis-prod \
  -v /var/pdflab/storage:/app/storage \
  -v /var/pdflab/logs:/app/logs \
  mkelam/pdflab-backend:latest"

echo "✅ New container created"
echo ""

echo "📋 Step 4: Wait for health check..."
sleep 15

ssh $VPS_HOST "docker ps | grep pdflab-backend"
echo ""

echo "📋 Step 5: Check if passphrase loaded..."
ssh $VPS_HOST "docker exec pdflab-backend-prod sh -c 'echo PAYFAST_PASSPHRASE=\$PAYFAST_PASSPHRASE'"
echo ""

echo "📋 Step 6: View backend logs..."
ssh $VPS_HOST "docker logs pdflab-backend-prod --tail 30"
echo ""

echo "=========================================="
echo "✅ Backend redeployed with passphrase"
echo "=========================================="
echo ""
echo "Test payment at: https://pdflab.pro/pricing"
echo ""
