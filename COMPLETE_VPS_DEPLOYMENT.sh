#!/bin/bash
# PDFLab Complete VPS Deployment Script
# Run this on VPS: ssh root@141.136.44.168 'bash -s' < COMPLETE_VPS_DEPLOYMENT.sh

set -e  # Exit on error

echo "=========================================="
echo "PDFLab Complete VPS Deployment"
echo "Syncing latest changes from last 24 hours"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_DIR="/var/pdflab/app"
FRONTEND_URL="http://141.136.44.168:3000"
BACKEND_URL="http://141.136.44.168:3006"

echo -e "${BLUE}[1/9] Checking current directory...${NC}"
if [ ! -d "$VPS_DIR" ]; then
    echo -e "${RED}Error: $VPS_DIR does not exist!${NC}"
    exit 1
fi
cd "$VPS_DIR"
echo -e "${GREEN}✓ Working directory: $(pwd)${NC}"
echo ""

echo -e "${BLUE}[2/9] Stopping existing containers...${NC}"
docker compose -f docker-compose.production.yml down || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${BLUE}[3/9] Pulling latest Docker images from Docker Hub...${NC}"
echo "  - Backend: mkelam/pdflab-backend:latest"
echo "  - Frontend: mkelam/pdflab-frontend:latest"
docker pull mkelam/pdflab-backend:latest
docker pull mkelam/pdflab-frontend:latest
echo -e "${GREEN}✓ Latest images pulled${NC}"
echo ""

echo -e "${BLUE}[4/9] Verifying image timestamps...${NC}"
docker images mkelam/pdflab-backend:latest --format "Backend:  {{.Repository}}:{{.Tag}} - Created {{.CreatedSince}}"
docker images mkelam/pdflab-frontend:latest --format "Frontend: {{.Repository}}:{{.Tag}} - Created {{.CreatedSince}}"
echo ""

echo -e "${BLUE}[5/9] Creating environment file...${NC}"
cat > .env.production << 'EOF'
# Production Environment Variables
MYSQL_PASSWORD=***REMOVED***
MYSQL_ROOT_PASSWORD=***REMOVED***
NODE_ENV=production
EOF
echo -e "${GREEN}✓ Environment file created${NC}"
echo ""

echo -e "${BLUE}[6/9] Starting all services...${NC}"
docker compose -f docker-compose.production.yml --env-file .env.production up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${BLUE}[7/9] Waiting 30 seconds for services to initialize...${NC}"
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""
echo -e "${GREEN}✓ Wait complete${NC}"
echo ""

echo -e "${BLUE}[8/9] Checking container status...${NC}"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep pdflab || true
echo ""

echo -e "${BLUE}[9/9] Verifying deployment...${NC}"
echo ""

# Check backend health
echo -n "Backend API: "
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/payfast/plans || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Healthy (HTTP $BACKEND_STATUS)${NC}"

    # Check pricing
    PRICING=$(curl -s http://localhost:3006/api/payfast/plans | grep -o '"price":[0-9.]*' | head -3)
    echo "  Pricing check:"
    echo "    $PRICING"
else
    echo -e "${RED}✗ Unhealthy (HTTP $BACKEND_STATUS)${NC}"
fi
echo ""

# Check frontend
echo -n "Frontend:    "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Healthy (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}✗ Unhealthy (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Check admin panel
echo -n "Admin Panel: "
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin || echo "000")
if [ "$ADMIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Accessible (HTTP $ADMIN_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Check required (HTTP $ADMIN_STATUS)${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Services:"
echo "  Frontend:    $FRONTEND_URL"
echo "  Backend API: $BACKEND_URL/api"
echo "  Admin Panel: $FRONTEND_URL/admin"
echo "  Pricing:     $FRONTEND_URL/pricing"
echo ""
echo "Admin Credentials:"
echo "  Email:    mmkela@fnb.co.za"
echo "  Email:    admin@pdflab.test"
echo "  Email:    admin@pdflab.com"
echo ""
echo "Recent Updates Deployed:"
echo "  ✓ PayFast controller JSON response fix"
echo "  ✓ Payment flow Suspense boundaries"
echo "  ✓ Get-started page integration"
echo "  ✓ Docker build optimizations"
echo "  ✓ Admin panel enhancements"
echo ""
echo "View Logs:"
echo "  docker logs pdflab-backend-prod --tail 50"
echo "  docker logs pdflab-frontend-prod --tail 50"
echo ""
echo "Restart Services:"
echo "  docker compose -f docker-compose.production.yml restart"
echo ""
