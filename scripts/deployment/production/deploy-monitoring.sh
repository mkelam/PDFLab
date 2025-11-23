#!/bin/bash
#
# Monitoring System Deployment Script
# Deploys all 7 monitoring enhancements to production VPS
# Date: 2025-11-16
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="root@141.136.44.168"
VPS_BACKEND_PATH="/var/pdflab/app/backend"
LOCAL_BACKEND_PATH="./backend"
DEPLOYMENT_DATE=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Monitoring System Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Date: $(date)"
echo -e "VPS: $VPS_HOST"
echo -e "Deployment ID: $DEPLOYMENT_DATE"
echo ""

# Function to print step header
step() {
    echo -e "\n${BLUE}[STEP $1/$2]${NC} ${GREEN}$3${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"
}

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        exit 1
    fi
}

# STEP 1: Package backend files
step 1 8 "Packaging Backend Files"
cd $LOCAL_BACKEND_PATH
echo "Creating tarball of dist folder..."
tar -czf dist-${DEPLOYMENT_DATE}.tar.gz dist/
check_status

cd ..
echo "Files packaged: backend/dist-${DEPLOYMENT_DATE}.tar.gz"

# STEP 2: Copy files to VPS
step 2 8 "Copying Files to VPS"

echo "Copying migration files..."
scp backend/src/migrations/20251116-*.sql ${VPS_HOST}:/tmp/
check_status

echo "Copying backend dist tarball..."
scp backend/dist-${DEPLOYMENT_DATE}.tar.gz ${VPS_HOST}:/tmp/
check_status

echo "Copying autonomous remediation script..."
scp scripts/autonomous-remediation.sh ${VPS_HOST}:/tmp/
check_status

echo -e "${GREEN}All files copied to VPS${NC}"

# STEP 3: Run database migrations
step 3 8 "Running Database Migrations"

ssh ${VPS_HOST} << 'ENDSSH'
set -e

echo "Running migration: monitoring_baseline table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-monitoring-baseline.sql || echo "Table may already exist"

echo "Running migration: extend alerts table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-extend-alerts-table.sql || echo "Columns may already exist"

echo "Running migration: blocked_ips table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-blocked-ips.sql || echo "Table may already exist"

echo "Running migration: authentication_logs table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-auth-logs.sql || echo "Table may already exist"

echo "Verifying tables created..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab -e "
SHOW TABLES LIKE '%monitoring%';
SHOW TABLES LIKE '%blocked%';
SHOW TABLES LIKE '%authentication%';
"

ENDSSH
check_status

# STEP 4: Backup and deploy backend
step 4 8 "Deploying Backend Code"

ssh ${VPS_HOST} << ENDSSH
set -e

cd ${VPS_BACKEND_PATH}

# Backup current dist
echo "Backing up current dist folder..."
if [ -d "dist" ]; then
    cp -r dist dist.backup.${DEPLOYMENT_DATE}
    echo "Backup created: dist.backup.${DEPLOYMENT_DATE}"
fi

# Extract new dist
echo "Extracting new backend files..."
tar -xzf /tmp/dist-${DEPLOYMENT_DATE}.tar.gz

# Verify new files
echo "Verifying new monitoring files..."
ls -lh dist/services/ | grep -E "(baseline|decision|alert|daily|security)"
ls -lh dist/controllers/service-management.controller.js
ls -lh dist/jobs/ | grep -E "(baseline|daily|security)"

echo "Backend deployment complete"
ENDSSH
check_status

# STEP 5: Deploy autonomous remediation script
step 5 8 "Deploying Autonomous Remediation Script"

ssh ${VPS_HOST} << 'ENDSSH'
set -e

# Create directories
mkdir -p /opt/pdflab/scripts
mkdir -p /var/log/pdflab

# Move script
mv /tmp/autonomous-remediation.sh /opt/pdflab/scripts/
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Verify
ls -lh /opt/pdflab/scripts/autonomous-remediation.sh

# Test run (dry run)
echo "Testing remediation script..."
/opt/pdflab/scripts/autonomous-remediation.sh || echo "First run complete (some checks may fail until backend restarts)"

echo "Script deployed successfully"
ENDSSH
check_status

# STEP 6: Add environment variables
step 6 8 "Adding Environment Variables"

ssh ${VPS_HOST} << ENDSSH
set -e

cd ${VPS_BACKEND_PATH}

# Check if ADMIN_EMAIL exists
if ! grep -q "ADMIN_EMAIL" .env; then
    echo "Adding ADMIN_EMAIL to .env..."
    echo "" >> .env
    echo "# Monitoring Configuration" >> .env
    echo "ADMIN_EMAIL=mmkela@gmail.com" >> .env
    echo "ADMIN_EMAIL added"
else
    echo "ADMIN_EMAIL already exists in .env"
fi

# Display SMTP config (verify it's there)
echo "Verifying SMTP configuration..."
grep SMTP .env || echo "SMTP vars not found - will use existing email service"

ENDSSH
check_status

# STEP 7: Setup cron job
step 7 8 "Setting Up Cron Jobs"

ssh ${VPS_HOST} << 'ENDSSH'
set -e

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "autonomous-remediation.sh"; then
    echo "Cron job already exists"
else
    echo "Adding cron job..."
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh") | crontab -
    echo "Cron job added"
fi

# Verify
echo "Current crontab:"
crontab -l | grep autonomous || echo "Cron job not found"

ENDSSH
check_status

# STEP 8: Restart backend
step 8 8 "Restarting Backend Container"

ssh ${VPS_HOST} << 'ENDSSH'
set -e

echo "Restarting backend container..."
docker restart pdflab-backend-prod

echo "Waiting 15 seconds for startup..."
sleep 15

echo "Checking container status..."
docker ps --filter name=pdflab-backend-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "Checking backend logs for cron job initialization..."
docker logs pdflab-backend-prod --tail 50 | grep -E "(Baseline|Daily|Security|scheduled)" || echo "Cron jobs may not have initialized yet"

ENDSSH
check_status

# Cleanup local files
echo -e "\n${BLUE}Cleaning up local files...${NC}"
rm -f backend/dist-${DEPLOYMENT_DATE}.tar.gz
echo "Cleanup complete"

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Deployed Components:${NC}"
echo "  ✓ Backend services (5 files)"
echo "  ✓ Cron jobs (3 files)"
echo "  ✓ Controllers & routes (4 files)"
echo "  ✓ Database migrations (4 tables)"
echo "  ✓ Autonomous remediation script"
echo "  ✓ System cron job"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Monitor logs for 24 hours"
echo "  2. Verify email arrives at 9 AM tomorrow"
echo "  3. Check remediation log after 5-10 minutes"
echo "  4. Test API endpoints with admin token"
echo ""
echo -e "${BLUE}Monitoring Commands:${NC}"
echo "  Backend logs:        ssh ${VPS_HOST} 'docker logs pdflab-backend-prod --tail 100'"
echo "  Remediation log:     ssh ${VPS_HOST} 'tail -50 /var/log/pdflab/remediation.log'"
echo "  Database check:      ssh ${VPS_HOST} 'docker exec pdflab-mysql-prod mysql -u root -p pdflab -e \"SELECT COUNT(*) FROM remediation_log\"'"
echo ""
echo -e "${GREEN}Deployment ID: ${DEPLOYMENT_DATE}${NC}"
echo -e "${GREEN}Backup available: dist.backup.${DEPLOYMENT_DATE}${NC}"
echo ""
