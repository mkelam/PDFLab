#!/bin/bash

# Deploy Founder's Edition - Earned Lifetime Feature
# This deploys the backend with founder edition support and runs the database migration

set -e  # Exit on error

echo "======================================"
echo "PDFLab Founder's Edition Deployment"
echo "======================================"
echo ""

# Configuration
DOCKER_USER="mkelam"
BACKEND_IMAGE="pdflab-backend"
TAG="latest"
VPS_HOST="root@141.136.44.168"

echo "Step 1: Building backend Docker image..."
echo "--------------------------------------"
cd "$(dirname "$0")/../../.." # Go to project root
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

# Copy migration file to VPS
echo "📦 Copying migration file to VPS..."
scp ../backend/src/migrations/009_add_founder_edition.sql ${VPS_HOST}:/tmp/

# SSH to VPS and run migration + update backend container
ssh ${VPS_HOST} << 'ENDSSH'
    set -e

    echo ""
    echo "📊 Running database migration..."
    # Get MySQL credentials from the running container
    MYSQL_HOST=$(docker exec pdflab-backend-prod printenv DB_HOST)
    MYSQL_USER=$(docker exec pdflab-backend-prod printenv DB_USER)
    MYSQL_PASS=$(docker exec pdflab-backend-prod printenv DB_PASSWORD)
    MYSQL_DB=$(docker exec pdflab-backend-prod printenv DB_NAME)

    # Run migration via docker exec into MySQL container
    docker exec -i pdflab-mysql-prod mysql -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} < /tmp/009_add_founder_edition.sql

    if [ $? -eq 0 ]; then
        echo "✅ Database migration completed successfully"
    else
        echo "⚠️ Migration may have already been applied or there was an error"
    fi

    echo ""
    echo "📦 Pulling latest backend image..."
    docker pull mkelam/pdflab-backend:latest

    echo "🔄 Restarting backend container..."
    docker-compose -f /var/www/pdflab/docker-compose.production.yml up -d --no-deps --force-recreate backend

    echo "⏳ Waiting for backend to be healthy..."
    sleep 15

    # Check backend health
    if docker ps | grep pdflab-backend-prod | grep -q "(healthy)"; then
        echo "✅ Backend is healthy!"
    else
        echo "⚠️  Checking backend status..."
        docker ps | grep pdflab-backend-prod
    fi

    echo ""
    echo "🧪 Testing Founder Edition API..."
    curl -s http://localhost:3001/api/founder/spots | head -100

    echo ""
    echo "📊 Backend logs (last 20 lines):"
    docker logs pdflab-backend-prod --tail 20

    # Clean up
    rm /tmp/009_add_founder_edition.sql
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ VPS deployment failed!"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Founder's Edition Deployment Complete!"
echo "======================================"
echo ""
echo "New API Endpoints:"
echo "- GET  /api/founder/spots    - Get remaining spots (public)"
echo "- GET  /api/founder/progress - Get user's progress (auth)"
echo "- POST /api/founder/feedback - Submit feedback (auth)"
echo "- GET  /api/founder/stats    - Admin statistics"
echo ""
echo "Test commands:"
echo "curl https://pdflab.pro/api/founder/spots"
echo ""
echo "Registration with founder_edition flag:"
echo 'curl -X POST https://pdflab.pro/api/auth/register -H "Content-Type: application/json" -d '\''{"email":"test@example.com","password":"Test123!","founder_edition":true}'\'''
echo ""
