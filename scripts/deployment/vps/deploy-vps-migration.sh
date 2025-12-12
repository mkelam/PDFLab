#!/bin/bash

# PDFLab VPS Production Migration Script
# Runs database migration on Hostinger VPS
# VPS IP: 141.136.44.168

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDFLab VPS Migration - v1.1.0${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# VPS Details
VPS_IP="141.136.44.168"
VPS_USER="root"
DB_NAME="pdflab_production"
DB_USER="pdflab"
: "${DB_PASS:?Set DB_PASS (MySQL password)}"
MYSQL_CONTAINER="8731b5f977d0_pdflab-mysql-prod"

echo -e "${YELLOW}⚠️  WARNING: This will modify the PRODUCTION database!${NC}"
echo ""
echo "VPS IP: $VPS_IP"
echo "Database: $DB_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}[1/6] Testing SSH connection to VPS...${NC}"
ssh -o ConnectTimeout=5 $VPS_USER@$VPS_IP "echo 'SSH connection successful'" || {
    echo -e "${RED}❌ Failed to connect to VPS${NC}"
    exit 1
}
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

echo -e "${BLUE}[2/6] Creating backup of production database...${NC}"
BACKUP_FILE="pdflab_backup_$(date +%Y%m%d_%H%M%S).sql"
ssh $VPS_USER@$VPS_IP "docker exec $MYSQL_CONTAINER mysqldump -u $DB_USER -p'$DB_PASS' $DB_NAME > /tmp/$BACKUP_FILE 2>&1" || {
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backup created: /tmp/$BACKUP_FILE${NC}"
echo ""

echo -e "${BLUE}[3/6] Copying migration script to VPS...${NC}"
scp backend/src/migrations/001_add_batch_processing.sql $VPS_USER@$VPS_IP:/tmp/ || {
    echo -e "${RED}❌ Failed to copy migration script${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migration script copied${NC}"
echo ""

echo -e "${BLUE}[4/6] Verifying current database state...${NC}"
ssh $VPS_USER@$VPS_IP "docker exec $MYSQL_CONTAINER mysql -u $DB_USER -p'$DB_PASS' $DB_NAME -e 'SHOW TABLES;' 2>&1" || {
    echo -e "${RED}❌ Failed to connect to database${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database connection verified${NC}"
echo ""

echo -e "${BLUE}[5/6] Running migration on production database...${NC}"
echo -e "${YELLOW}This may take 1-2 minutes...${NC}"
ssh $VPS_USER@$VPS_IP "docker exec -i $MYSQL_CONTAINER mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/001_add_batch_processing.sql 2>&1" || {
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}To restore from backup:${NC}"
    echo "ssh $VPS_USER@$VPS_IP"
    echo "docker exec -i $MYSQL_CONTAINER mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/$BACKUP_FILE"
    exit 1
}
echo -e "${GREEN}✅ Migration completed successfully${NC}"
echo ""

echo -e "${BLUE}[6/6] Verifying migration...${NC}"
ssh $VPS_USER@$VPS_IP "docker exec $MYSQL_CONTAINER mysql -u $DB_USER -p'$DB_PASS' $DB_NAME -e 'DESCRIBE batch_jobs;' 2>&1" || {
    echo -e "${RED}❌ Migration verification failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ batch_jobs table verified${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migration Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Backup location: /tmp/$BACKUP_FILE${NC}"
echo ""
echo "Next steps:"
echo "1. Push new Docker images (v1.1.0) to Docker Hub"
echo "2. SSH to VPS and pull new images"
echo "3. Restart containers with docker-compose"
echo ""
echo "To rollback (if needed):"
echo "ssh $VPS_USER@$VPS_IP"
echo "docker exec -i $MYSQL_CONTAINER mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/$BACKUP_FILE"
echo ""
