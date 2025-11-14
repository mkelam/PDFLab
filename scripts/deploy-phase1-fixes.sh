#!/bin/bash
# PDFLab Phase 1 Fixes Deployment Script
# Date: 2025-11-14
# Purpose: Deploy Phase 1 critical fixes to VPS
# VPS: 141.136.44.168 (root@141.136.44.168)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
APP_DIR="/var/pdflab/app"
BACKUP_DIR="/var/pdflab/backups/phase1-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDFLab Phase 1 Fixes Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Step 1: Pre-deployment checks
echo -e "${BLUE}Step 1: Pre-deployment checks${NC}"
echo "------------------------------"

# Check if SSH access works
if ssh -o ConnectTimeout=5 ${VPS_USER}@${VPS_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
    print_status "SSH connection to VPS successful"
else
    print_error "Cannot connect to VPS via SSH"
    exit 1
fi

# Check if git repo is clean
if [[ -n $(git status -s) ]]; then
    print_warning "Working directory has uncommitted changes"
    echo "   Modified files:"
    git status -s | sed 's/^/   /'
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status "Git working directory is clean"
fi

echo ""

# Step 2: Create backup on VPS
echo -e "${BLUE}Step 2: Create backup on VPS${NC}"
echo "------------------------------"

ssh ${VPS_USER}@${VPS_IP} << ENDSSH
    set -e
    echo "Creating backup directory..."
    mkdir -p ${BACKUP_DIR}

    echo "Backing up current configuration..."
    cp ${APP_DIR}/backend/.env.production ${BACKUP_DIR}/.env.production.backup 2>/dev/null || echo "No .env.production to backup"
    cp ${APP_DIR}/docker-compose.production.yml ${BACKUP_DIR}/docker-compose.production.yml.backup

    echo "Exporting current container environment..."
    docker exec pdflab-backend-prod env > ${BACKUP_DIR}/backend-env.txt 2>/dev/null || echo "Backend container not running"

    echo "Saving container list..."
    docker ps -a > ${BACKUP_DIR}/containers-before.txt

    echo "Backup created at: ${BACKUP_DIR}"
ENDSSH

print_status "Backup created on VPS"
echo ""

# Step 3: Commit changes to git (if needed)
echo -e "${BLUE}Step 3: Commit changes to git${NC}"
echo "------------------------------"

if [[ -n $(git status -s) ]]; then
    print_info "Uncommitted changes detected. Creating commit..."

    git add backend/.env.production docker-compose.production.yml
    git add VPS_LOCAL_IMPLEMENTATION_AUDIT.md PHASE_1_FIXES_IMPLEMENTATION_REPORT.md

    git commit -m "Fix Phase 1 critical issues - VPS config sync

- Fix backend .env.production (port, DB name, paths, JWT secret)
- Add worker container to docker-compose.production.yml
- Remove exposed MySQL/Redis ports for security
- Update CORS to include all production domains
- Fix frontend API URL to use HTTPS

Resolves critical deployment blockers identified in VPS audit.
See: VPS_LOCAL_IMPLEMENTATION_AUDIT.md
See: PHASE_1_FIXES_IMPLEMENTATION_REPORT.md"

    print_status "Changes committed to git"

    # Push to remote
    read -p "Push to remote repository? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin master
        print_status "Changes pushed to remote"
    else
        print_warning "Skipped push to remote (manual push required later)"
    fi
else
    print_status "No new changes to commit"
fi

echo ""

# Step 4: Deploy to VPS
echo -e "${BLUE}Step 4: Deploy to VPS${NC}"
echo "------------------------------"

print_warning "This will update production environment and restart containers"
print_warning "Users will be logged out due to JWT secret change"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    set -e
    cd /var/pdflab/app

    echo "Pulling latest code from git..."
    git pull origin master

    echo "Pulling latest Docker images..."
    docker compose -f docker-compose.production.yml pull

    echo "Stopping current containers..."
    docker compose -f docker-compose.production.yml down

    echo "Starting containers with new configuration..."
    docker compose -f docker-compose.production.yml up -d

    echo "Waiting for containers to start..."
    sleep 10

    echo "Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
ENDSSH

print_status "Deployment completed"
echo ""

# Step 5: Verify deployment
echo -e "${BLUE}Step 5: Verify deployment${NC}"
echo "------------------------------"

sleep 5  # Wait for services to stabilize

# Check container count
CONTAINER_COUNT=$(ssh ${VPS_USER}@${VPS_IP} "docker ps | grep pdflab | wc -l")
if [[ $CONTAINER_COUNT -eq 5 ]]; then
    print_status "All 5 containers running (backend, worker, frontend, mysql, redis)"
else
    print_error "Expected 5 containers, found $CONTAINER_COUNT"
fi

# Check worker container specifically
if ssh ${VPS_USER}@${VPS_IP} "docker ps | grep pdflab-worker-prod" > /dev/null 2>&1; then
    print_status "Worker container running (CRITICAL FIX VERIFIED)"
else
    print_error "Worker container NOT running"
fi

# Check health endpoint
if curl -s https://pdflab.pro/api/health | grep -q "OK"; then
    print_status "Backend health check passed"
else
    print_warning "Backend health check failed or slow to respond"
fi

# Check frontend
if curl -I -s https://pdflab.pro | grep -q "200 OK"; then
    print_status "Frontend responding"
else
    print_warning "Frontend health check failed"
fi

echo ""

# Step 6: Post-deployment summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
print_info "Backup location: ${BACKUP_DIR}"
print_info "Production URL: https://pdflab.pro"
print_info "API Health: https://pdflab.pro/api/health"
echo ""

echo -e "${YELLOW}IMPORTANT POST-DEPLOYMENT NOTES:${NC}"
echo "1. All users have been logged out (JWT secret changed)"
echo "2. Test PDF conversion to verify worker container"
echo "3. Test payment flow to verify PayFast webhooks"
echo "4. Monitor logs for errors:"
echo "   ssh ${VPS_USER}@${VPS_IP} 'docker logs -f pdflab-backend-prod'"
echo "   ssh ${VPS_USER}@${VPS_IP} 'docker logs -f pdflab-worker-prod'"
echo ""

echo -e "${GREEN}Phase 1 Deployment Complete!${NC}"
echo ""

# Optional: Show recent logs
read -p "Show recent backend logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Recent backend logs:${NC}"
    echo "-------------------"
    ssh ${VPS_USER}@${VPS_IP} "docker logs pdflab-backend-prod --tail 20"
fi

echo ""
read -p "Show recent worker logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Recent worker logs:${NC}"
    echo "-------------------"
    ssh ${VPS_USER}@${VPS_IP} "docker logs pdflab-worker-prod --tail 20"
fi

echo ""
echo -e "${GREEN}Deployment script completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test critical user flows (login, upload, conversion, payment)"
echo "2. Review Phase 2 recommendations in VPS_LOCAL_IMPLEMENTATION_AUDIT.md"
echo "3. Schedule Phase 2 security enhancements (Redis password, Sentry, etc.)"
echo ""
