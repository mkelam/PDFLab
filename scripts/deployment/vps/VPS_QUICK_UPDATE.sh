#!/bin/bash
# PDFLab VPS Quick Update Script
# Run this on your VPS to update to latest Docker images
# Usage: bash VPS_QUICK_UPDATE.sh

set -e  # Exit on error

echo "================================================"
echo "PDFLab VPS Update Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Warning: Running as root. Consider using a non-root user with sudo."
    echo ""
fi

# Navigate to project directory
echo "📁 Navigating to project directory..."
cd /opt/pdflab || { echo "❌ Error: /opt/pdflab not found. Update the path in this script."; exit 1; }
echo "✓ Current directory: $(pwd)"
echo ""

# Pull latest code (optional - comment out if not using git on VPS)
echo "📥 Pulling latest code from GitHub..."
git pull origin master || { echo "⚠️  Git pull failed. Skipping..."; }
echo ""

# Pull latest Docker images
echo "🐋 Pulling latest Docker images from Docker Hub..."
echo "   - Frontend..."
docker pull mkelam/pdflab-frontend:production
echo "   - Backend..."
docker pull mkelam/pdflab-backend:production
echo "   - Worker..."
docker pull mkelam/pdflab-worker:production
echo "✓ All images pulled"
echo ""

# Stop current containers
echo "🛑 Stopping current containers..."
docker-compose -f docker-compose.production.yml down
echo "✓ Containers stopped"
echo ""

# Start updated containers
echo "🚀 Starting updated containers..."
docker-compose -f docker-compose.production.yml up -d
echo "✓ Containers started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30
echo ""

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.production.yml ps
echo ""

# Test health endpoints
echo "🏥 Health Check:"
echo "   - Backend API..."
curl -s http://localhost:3006/health | jq . || echo "   ⚠️  Backend not responding yet"
echo ""
echo "   - Frontend..."
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:3000
echo ""

# Show recent logs
echo "📋 Recent Backend Logs (last 20 lines):"
docker logs pdflab-backend --tail 20
echo ""

echo "================================================"
echo "✅ Update Complete!"
echo "================================================"
echo ""
echo "🔍 Next Steps:"
echo "   1. Test your application: https://your-domain.com"
echo "   2. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   3. Check health: curl http://localhost:3006/health"
echo ""
echo "📖 For detailed instructions, see VPS_UPDATE_GUIDE.md"
echo ""
