#!/bin/bash
# Deploy Frontend to VPS - Linux/Mac Bash Script
# Deploys updated Next.js frontend with UX improvements to production

echo "========================================"
echo "PDFLab Frontend Deployment to VPS"
echo "========================================"
echo ""

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
DOCKER_IMAGE="mkelam/pdflab-frontend"
CONTAINER_NAME="pdflab-frontend-prod"
VERSION="v1.1.2-ux"

echo "Step 1: Building Next.js frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed!"
    exit 1
fi
echo "✓ Frontend build completed successfully"
echo ""

echo "Step 2: Building Docker image..."
docker build -t ${DOCKER_IMAGE}:${VERSION} -t ${DOCKER_IMAGE}:latest .
if [ $? -ne 0 ]; then
    echo "ERROR: Docker build failed!"
    exit 1
fi
echo "✓ Docker image built: ${DOCKER_IMAGE}:${VERSION}"
echo ""

echo "Step 3: Pushing Docker image to Docker Hub..."
docker push ${DOCKER_IMAGE}:${VERSION}
docker push ${DOCKER_IMAGE}:latest
if [ $? -ne 0 ]; then
    echo "ERROR: Docker push failed!"
    exit 1
fi
echo "✓ Docker image pushed to Docker Hub"
echo ""

echo "Step 4: Deploying to VPS..."
echo "Connecting to ${VPS_IP}..."

ssh ${VPS_USER}@${VPS_IP} "docker pull ${DOCKER_IMAGE}:${VERSION} && \
    docker stop ${CONTAINER_NAME} || true && \
    docker rm ${CONTAINER_NAME} || true && \
    docker run -d --name ${CONTAINER_NAME} \
        --network app_pdflab-network \
        --restart unless-stopped \
        -p 3000:3000 \
        -e NODE_ENV=production \
        -e NEXT_PUBLIC_API_URL=https://pdflab.pro \
        ${DOCKER_IMAGE}:${VERSION}"

if [ $? -ne 0 ]; then
    echo "ERROR: VPS deployment failed!"
    exit 1
fi
echo "✓ Deployed to VPS"
echo ""

echo "Step 5: Verifying deployment..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://pdflab.pro)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Frontend is responding (HTTP $HTTP_CODE)"
else
    echo "WARNING: Frontend returned HTTP $HTTP_CODE"
fi
echo ""

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo "Version: ${VERSION}"
echo "URL: https://pdflab.pro"
echo ""
echo "Next steps:"
echo "1. Open https://pdflab.pro in browser"
echo "2. Test output format selection (Step 2)"
echo "3. Verify icons are larger when selected"
echo "4. Check Excel warning background is dark"
echo ""
