#!/bin/bash
# URGENT: Deploy backend to VPS to fix "Failed to fetch" error
# Run this on your VPS: root@141.136.44.168

echo "=========================================="
echo "🚨 URGENT VPS Backend Deployment"
echo "=========================================="
echo ""
echo "This will fix the 'Failed to fetch' error"
echo "by deploying the backend to your VPS"
echo ""

cd /var/pdflab/app || exit 1

# Pull latest backend image
echo "📥 Pulling latest backend image..."
docker pull mkelam/pdflab-backend:latest

# Create environment file
echo "⚙️  Creating environment configuration..."
if [ ! -f .env.production ]; then
  : "${MYSQL_PASSWORD:?set MYSQL_PASSWORD}"
  : "${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD}"

  cat > .env.production <<EOF
MYSQL_PASSWORD=$MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
EOF

  chmod 600 .env.production 2>/dev/null || true
fi

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker compose -f docker-compose.production.yml down

# Start all containers
echo "🚀 Starting all containers..."
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# Wait for services
echo "⏳ Waiting 30 seconds for services to start..."
sleep 30

# Check status
echo ""
echo "=========================================="
echo "📊 Container Status:"
echo "=========================================="
docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "=========================================="
echo "🔍 Backend Logs:"
echo "=========================================="
docker logs pdflab-backend-prod --tail 30

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Test your application at:"
echo "  http://141.136.44.168:3000"
echo ""
echo "Backend should now be accessible at:"
echo "  http://141.136.44.168:3006"
echo ""
