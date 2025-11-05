#!/bin/bash
# PDFLab VPS Deployment Script
# Execute this script on your VPS at: root@141.136.44.168

set -e  # Exit on error

echo "=========================================="
echo "PDFLab VPS Deployment - Senior Panel"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/7] Navigating to application directory...${NC}"
cd /var/pdflab/app

echo -e "${YELLOW}[2/7] Pulling latest Docker images...${NC}"
docker pull mkelam/pdflab-backend:latest
docker pull mkelam/pdflab-frontend:latest
echo -e "${GREEN}✓ Images pulled successfully${NC}"

echo -e "${YELLOW}[3/7] Stopping existing containers...${NC}"
docker compose -f docker-compose.production.yml down
echo -e "${GREEN}✓ Containers stopped${NC}"

echo -e "${YELLOW}[4/7] Creating environment file...${NC}"
cat > .env.production << 'EOF'
MYSQL_PASSWORD=***REMOVED***
MYSQL_ROOT_PASSWORD=***REMOVED***
EOF
echo -e "${GREEN}✓ Environment file created${NC}"

echo -e "${YELLOW}[5/7] Starting all containers...${NC}"
docker compose -f docker-compose.production.yml --env-file .env.production up -d
echo -e "${GREEN}✓ Containers started${NC}"

echo -e "${YELLOW}[6/7] Waiting 30 seconds for services to initialize...${NC}"
sleep 30

echo -e "${YELLOW}[7/7] Checking container status...${NC}"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo "=========================================="
echo -e "${YELLOW}Checking backend logs for errors...${NC}"
echo "=========================================="
docker logs pdflab-backend-prod --tail 50

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Services should be accessible at:"
echo "  Frontend: http://141.136.44.168:3000"
echo "  Backend:  http://141.136.44.168:3006"
echo "  MySQL:    141.136.44.168:3306"
echo "  Redis:    141.136.44.168:6379"
echo ""
echo "Admin Credentials:"
echo "  Email:    admin@pdflab.test"
echo "  Password: Admin123!"
echo ""
echo "To check logs:"
echo "  docker logs pdflab-backend-prod"
echo "  docker logs pdflab-frontend-prod"
echo ""
