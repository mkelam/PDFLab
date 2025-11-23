#!/bin/bash

# Deploy Backend Only - PayFast Multi-Currency Update
# Use this when only backend code changed (faster deployment)

set -e  # Exit on error

echo "======================================"
echo "PDFLab Backend Deployment"
echo "Deploying: PayFast Multi-Currency Fix"
echo "======================================"
echo ""

# Configuration
DOCKER_USER="mkelam"
BACKEND_IMAGE="pdflab-backend"
TAG="latest"
VPS_HOST="root@141.136.44.168"

echo "Step 1: Building backend Docker image..."
echo "--------------------------------------"
cd backend
docker build -t ${DOCKER_USER}/${BACKEND_IMAGE}:${TAG} -f Dockerfile .

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend image built successfully"
echo ""

echo "Step 2: Pushing backend image to Docker Hub..."
echo "--------------------------------------"
docker push ${DOCKER_USER}/${BACKEND_IMAGE}:${TAG}

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo "✅ Backend image pushed to Docker Hub"
echo ""

echo "Step 3: Deploying to VPS (141.136.44.168)..."
echo "--------------------------------------"

# SSH to VPS and update backend container
ssh ${VPS_HOST} << 'ENDSSH'
    set -e

    echo "📦 Pulling latest backend image..."
    docker pull mkelam/pdflab-backend:latest

    echo "🔄 Restarting backend container..."
    docker-compose -f /var/www/pdflab/docker-compose.production.yml up -d --no-deps --force-recreate backend

    echo "⏳ Waiting for backend to be healthy..."
    sleep 10

    # Check backend health
    if docker ps | grep pdflab-backend-prod | grep -q "(healthy)"; then
        echo "✅ Backend is healthy!"
    else
        echo "⚠️  Checking backend status..."
        docker ps | grep pdflab-backend-prod
    fi

    echo ""
    echo "📊 Backend logs (last 20 lines):"
    docker logs pdflab-backend-prod --tail 20
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ VPS deployment failed!"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Backend URL: https://pdflab.pro/api/health"
echo "PayFast Pricing API: https://pdflab.pro/api/payfast/plans"
echo ""
echo "Next steps:"
echo "1. Test pricing API: curl https://pdflab.pro/api/payfast/plans"
echo "2. Verify USD amounts (should show 9.99, 29.99, 99.99)"
echo "3. Test payment initialization with real user"
echo ""
