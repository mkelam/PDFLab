#!/bin/bash

# Full Deployment - Both Backend and Frontend
# Use this when both backend and frontend changed

set -e  # Exit on error

echo "======================================"
echo "PDFLab Full Deployment"
echo "Backend + Frontend"
echo "======================================"
echo ""

# Configuration
DOCKER_USER="mkelam"
BACKEND_IMAGE="pdflab-backend"
FRONTEND_IMAGE="pdflab-frontend"
TAG="latest"
VPS_HOST="root@141.136.44.168"
VPS_IP="141.136.44.168"

echo "Step 1: Building backend Docker image..."
echo "--------------------------------------"
cd backend
docker build -t ${DOCKER_USER}/${BACKEND_IMAGE}:${TAG} -f Dockerfile .

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend image built successfully"
cd ..
echo ""

echo "Step 2: Building frontend Docker image..."
echo "--------------------------------------"
docker build \
    -t ${DOCKER_USER}/${FRONTEND_IMAGE}:${TAG} \
    -f Dockerfile.frontend \
    --build-arg NEXT_PUBLIC_API_URL=http://${VPS_IP}:3006 \
    .

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend image built successfully"
echo ""

echo "Step 3: Pushing images to Docker Hub..."
echo "--------------------------------------"
echo "Pushing backend..."
docker push ${DOCKER_USER}/${BACKEND_IMAGE}:${TAG}

if [ $? -ne 0 ]; then
    echo "❌ Backend push failed!"
    exit 1
fi

echo "Pushing frontend..."
docker push ${DOCKER_USER}/${FRONTEND_IMAGE}:${TAG}

if [ $? -ne 0 ]; then
    echo "❌ Frontend push failed!"
    exit 1
fi

echo "✅ Both images pushed to Docker Hub"
echo ""

echo "Step 4: Deploying to VPS (141.136.44.168)..."
echo "--------------------------------------"

# SSH to VPS and update all containers
ssh ${VPS_HOST} << 'ENDSSH'
    set -e

    cd /var/www/pdflab

    echo "📦 Pulling latest images..."
    docker pull mkelam/pdflab-backend:latest
    docker pull mkelam/pdflab-frontend:latest

    echo "🔄 Restarting all containers..."
    docker-compose -f docker-compose.production.yml up -d --force-recreate backend frontend

    echo "⏳ Waiting for services to be healthy..."
    sleep 15

    echo ""
    echo "📊 Container status:"
    docker ps | grep pdflab

    echo ""
    echo "📊 Backend logs (last 20 lines):"
    docker logs pdflab-backend-prod --tail 20

    echo ""
    echo "📊 Frontend logs (last 10 lines):"
    docker logs pdflab-frontend-prod --tail 10
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ VPS deployment failed!"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Full Deployment Complete!"
echo "======================================"
echo ""
echo "URLs:"
echo "  - Frontend: https://pdflab.pro"
echo "  - Backend API: https://pdflab.pro/api/health"
echo "  - Pricing API: https://pdflab.pro/api/payfast/plans"
echo ""
echo "Next steps:"
echo "1. Test frontend: https://pdflab.pro/pricing"
echo "2. Test pricing API: curl https://pdflab.pro/api/payfast/plans"
echo "3. Verify USD amounts in pricing"
echo "4. Test payment flow with real user"
echo ""
