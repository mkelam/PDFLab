#!/bin/bash
# Deploy updated backend with path resolution fixes to VPS

echo "=== PDFLab Backend Deployment - Path Resolution Fix ==="
echo ""

# 1. Pull the updated backend image
echo "[1/4] Pulling updated backend image from Docker Hub..."
docker pull mkelam/pdflab-backend:production

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull backend image"
    exit 1
fi

echo "✓ Backend image pulled successfully"
echo ""

# 2. Stop and remove the current backend container
echo "[2/4] Stopping current backend container..."
docker stop pdflab-backend

if [ $? -eq 0 ]; then
    echo "✓ Backend container stopped"
else
    echo "⚠ Backend container may not be running"
fi

echo "[2/4] Removing current backend container..."
docker rm pdflab-backend

if [ $? -eq 0 ]; then
    echo "✓ Backend container removed"
else
    echo "⚠ Backend container may not exist"
fi

echo ""

# 3. Recreate the backend container with the updated image
echo "[3/4] Creating new backend container with fixes..."
docker run -d \
  --name pdflab-backend \
  --network pdflab_pdflab-network \
  --env-file /opt/pdflab/.env \
  -p 3006:3006 \
  -v /opt/pdflab/storage:/app/storage \
  --restart unless-stopped \
  mkelam/pdflab-backend:production

if [ $? -ne 0 ]; then
    echo "❌ Failed to create backend container"
    exit 1
fi

echo "✓ Backend container created successfully"
echo ""

# 4. Verify backend is running
echo "[4/4] Verifying backend container status..."
sleep 3

CONTAINER_STATUS=$(docker ps --filter "name=pdflab-backend" --format "{{.Status}}")

if [ -z "$CONTAINER_STATUS" ]; then
    echo "❌ Backend container is not running"
    echo ""
    echo "Last 50 lines of backend logs:"
    docker logs --tail 50 pdflab-backend
    exit 1
fi

echo "✓ Backend container is running: $CONTAINER_STATUS"
echo ""

# Show logs
echo "=== Backend Logs (last 30 lines) ==="
docker logs --tail 30 pdflab-backend
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "✓ Backend deployed with path resolution fixes"
echo ""
echo "Next steps:"
echo "1. Monitor logs: docker logs -f pdflab-backend"
echo "2. Test multiple consecutive conversions at https://pdflab.pro"
echo "3. Verify first, second, and third conversions all work"
echo ""
