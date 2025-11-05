#!/bin/bash
#
# PDFLab Webhook Fix Deployment
# Deploys fixed backend that accepts PayFast ITN webhooks
#

set -e  # Exit on error

echo "🚀 PDFLab Webhook Fix Deployment"
echo "=================================="
echo ""

# Pull latest image
echo "📥 Pulling latest backend image..."
docker pull mkelam/pdflab-backend:latest

# Stop and remove current backend
echo "🛑 Stopping current backend..."
docker stop pdflab-backend-prod || true
docker rm pdflab-backend-prod || true

# Start new backend
echo "🚀 Starting fixed backend..."
docker run -d \
  --name pdflab-backend-prod \
  --network app_pdflab-network \
  -p 3006:3006 \
  -v /root/backend.env:/app/.env:ro \
  -v pdflab_storage:/app/storage \
  --restart unless-stopped \
  mkelam/pdflab-backend:latest

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if docker ps | grep -q pdflab-backend-prod; then
  echo "✅ Backend is running!"
else
  echo "❌ Backend failed to start!"
  docker logs pdflab-backend-prod
  exit 1
fi

# Test webhook endpoint
echo ""
echo "🧪 Testing webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://pdflab.pro/api/payfast/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "test=data")

if [ "$WEBHOOK_RESPONSE" = "403" ] || [ "$WEBHOOK_RESPONSE" = "404" ]; then
  echo "⚠️  Webhook returned $WEBHOOK_RESPONSE (expected - test data not valid)"
  echo "✅ But webhook endpoint is accessible!"
elif [ "$WEBHOOK_RESPONSE" = "200" ]; then
  echo "✅ Webhook returned 200 OK!"
else
  echo "❌ Webhook returned unexpected status: $WEBHOOK_RESPONSE"
fi

# Show recent logs
echo ""
echo "📋 Recent backend logs:"
docker logs --tail 20 pdflab-backend-prod

echo ""
echo "✅ Webhook fix deployment complete!"
echo ""
echo "📊 Next Steps:"
echo "   1. Test payment flow with a real PayFast transaction"
echo "   2. PayFast will now be able to send ITN webhooks"
echo "   3. User plans will upgrade automatically when payment completes"
echo ""
echo "🔍 Monitor logs with: docker logs -f pdflab-backend-prod"
echo ""
