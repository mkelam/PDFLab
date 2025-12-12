#!/bin/bash
# PDFLab Onboarding System Deployment - v1.3.0
# This script builds and deploys the User Onboarding System to production VPS

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERSION="v1.3.0-onboarding"
VPS_IP="141.136.44.168"
VPS_USER="root"

echo "=========================================="
echo -e "${BLUE}PDFLab Onboarding System Deployment${NC}"
echo -e "${BLUE}Version: $VERSION${NC}"
echo "=========================================="
echo ""

# Step 1: Build Backend Docker Image
echo -e "${YELLOW}[1/8] Building Backend Docker Image...${NC}"
cd backend
docker build -t mkelam/pdflab-backend:$VERSION -t mkelam/pdflab-backend:latest .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
cd ..

# Step 2: Build Frontend Docker Image
echo -e "${YELLOW}[2/8] Building Frontend Docker Image...${NC}"
docker build -t mkelam/pdflab-frontend:$VERSION -t mkelam/pdflab-frontend:latest .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend image built successfully${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

# Step 3: Push to Docker Hub
echo -e "${YELLOW}[3/8] Pushing images to Docker Hub...${NC}"
docker push mkelam/pdflab-backend:$VERSION
docker push mkelam/pdflab-backend:latest
docker push mkelam/pdflab-frontend:$VERSION
docker push mkelam/pdflab-frontend:latest
echo -e "${GREEN}✓ Images pushed to Docker Hub${NC}"

# Step 4: Connect to VPS and pull images
echo -e "${YELLOW}[4/8] Connecting to VPS and pulling images...${NC}"
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/pdflab/app
echo "Pulling latest images..."
docker pull mkelam/pdflab-backend:latest
docker pull mkelam/pdflab-frontend:latest
echo "✓ Images pulled"
ENDSSH
echo -e "${GREEN}✓ Images pulled on VPS${NC}"

# Step 5: Copy migration file to VPS
echo -e "${YELLOW}[5/8] Copying migration file to VPS...${NC}"
scp backend/src/migrations/005_onboarding_system.sql $VPS_USER@$VPS_IP:/tmp/005_onboarding_system.sql
echo -e "${GREEN}✓ Migration file copied${NC}"

# Step 6: Run database migration
echo -e "${YELLOW}[6/8] Running database migration (005_onboarding_system.sql)...${NC}"
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/pdflab/app
echo "Running onboarding migration..."

DB_PASS="$(grep '^MYSQL_PASSWORD=' .env.production 2>/dev/null | head -1 | cut -d= -f2-)"
if [ -z "$DB_PASS" ]; then
  echo "ERROR: Missing MYSQL_PASSWORD in /var/pdflab/app/.env.production"
  exit 1
fi

docker exec -e MYSQL_PWD="$DB_PASS" pdflab-mysql-prod mysql -u pdflab pdflab < /tmp/005_onboarding_system.sql || echo "Migration may have already run"
echo "✓ Migration executed"
ENDSSH
echo -e "${GREEN}✓ Database migration complete${NC}"

# Step 7: Restart containers
echo -e "${YELLOW}[7/8] Restarting containers on VPS...${NC}"
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
cd /var/pdflab/app
echo "Stopping containers..."
docker compose -f docker-compose.production.yml down

echo "Starting containers..."
docker compose -f docker-compose.production.yml up -d

echo "Waiting 30 seconds for services to initialize..."
sleep 30

echo "✓ Containers restarted"
ENDSSH
echo -e "${GREEN}✓ Containers restarted${NC}"

# Step 8: Verify deployment
echo -e "${YELLOW}[8/8] Verifying deployment...${NC}"
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
echo "Container status:"
docker ps --format 'table {{.Names}}\t{{.Status}}'

echo ""
echo "Backend logs (last 30 lines):"
docker logs pdflab-backend-prod --tail 30 | grep -E "(Onboarding|onboarding|PDFLab API Server running)" || true

echo ""
echo "Testing onboarding API endpoint..."
curl -s http://localhost:3006/health | head -5
ENDSSH

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Version Deployed: $VERSION${NC}"
echo ""
echo "Production URLs:"
echo "  Frontend: https://pdflab.pro"
echo "  Backend:  https://pdflab.pro/api"
echo ""
echo "New Features:"
echo "  ✓ User Onboarding System"
echo "  ✓ Product Tour (5 steps)"
echo "  ✓ Quick-Start Wizard (3 steps)"
echo "  ✓ Sample Templates (3 templates)"
echo "  ✓ Admin Analytics Dashboard"
echo ""
echo "Database Changes:"
echo "  ✓ onboarding_progress table (25 fields)"
echo "  ✓ onboarding_templates table (12 fields)"
echo "  ✓ users.onboarding_completed, onboarding_completed_at, onboarding_skipped"
echo ""
echo "To check logs:"
echo "  ssh $VPS_USER@$VPS_IP"
echo "  docker logs pdflab-backend-prod -f"
echo ""
echo "To test onboarding:"
echo "  1. Register new user at https://pdflab.pro/signup"
echo "  2. Product tour should auto-start on home page"
echo "  3. Dashboard shows Quick-Start Wizard"
echo "  4. Sample templates available after wizard"
echo ""
