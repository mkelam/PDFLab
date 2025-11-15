#!/bin/bash
# Partner Portal Deployment Script (Phase 1.5)
# Deploys partner portal to partners.pdflab.pro after Phase 1

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
APP_DIR="/var/pdflab/app"
BACKUP_DIR="/var/pdflab/backups/partner-portal-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Partner Portal Deployment (Phase 1.5)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Functions
print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Step 1: Pre-deployment checks
echo -e "${BLUE}Step 1: Pre-deployment checks${NC}"
echo "------------------------------"

# Check SSH
if ssh -o ConnectTimeout=5 ${VPS_USER}@${VPS_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
    print_status "SSH connection successful"
else
    print_error "Cannot connect to VPS via SSH"
    exit 1
fi

# Check if Phase 1 is deployed
if ssh ${VPS_USER}@${VPS_IP} "docker ps | grep pdflab-worker-prod" > /dev/null 2>&1; then
    print_status "Phase 1 deployment detected (worker container running)"
else
    print_warning "Phase 1 worker container not found"
    echo "   This script assumes Phase 1 is already deployed."
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check git status
if [[ -n $(git status -s) ]]; then
    print_warning "Working directory has uncommitted changes"
    git status -s | sed 's/^/   /'
    echo ""
    read -p "   Commit changes before deploying? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add partners-portal/Dockerfile partners-portal/next.config.js docker-compose.production.yml nginx-pdflab-pro-with-partners.conf
        git commit -m "Add partner portal deployment configuration

- Add partners-portal/Dockerfile for containerization
- Update docker-compose.production.yml with partners service
- Add nginx configuration for partners.pdflab.pro subdomain
- Configure next.config.js with standalone output for Docker

Part of Phase 1.5 deployment plan."
        print_status "Changes committed"
    fi
fi

echo ""

# Step 2: Build Docker image
echo -e "${BLUE}Step 2: Building partner portal Docker image${NC}"
echo "------------------------------"

cd partners-portal

if docker build -t mkelam/pdflab-partners:latest -f Dockerfile .; then
    print_status "Docker image built successfully"
else
    print_error "Docker build failed"
    exit 1
fi

cd ..
echo ""

# Step 3: Push to Docker Hub
echo -e "${BLUE}Step 3: Pushing image to Docker Hub${NC}"
echo "------------------------------"

if docker push mkelam/pdflab-partners:latest; then
    print_status "Image pushed to Docker Hub"
else
    print_error "Docker push failed"
    exit 1
fi

echo ""

# Step 4: Check DNS
echo -e "${BLUE}Step 4: Checking DNS configuration${NC}"
echo "------------------------------"

if nslookup partners.pdflab.pro 2>/dev/null | grep -q "141.136.44.168"; then
    print_status "DNS configured correctly"
else
    print_warning "DNS not configured or not propagated"
    echo ""
    echo "   ${YELLOW}ACTION REQUIRED:${NC}"
    echo "   1. Log in to Hostinger (https://hostinger.com)"
    echo "   2. Go to Domains → pdflab.pro → DNS Zone Editor"
    echo "   3. Add A Record:"
    echo "      Type: A"
    echo "      Name: partners"
    echo "      Value: 141.136.44.168"
    echo "      TTL: 14400"
    echo "   4. Wait 10-30 minutes for DNS propagation"
    echo ""
    read -p "   DNS configured? Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Run this script again after DNS is configured."
        exit 0
    fi
fi

echo ""

# Step 5: Create backup
echo -e "${BLUE}Step 5: Creating backup on VPS${NC}"
echo "------------------------------"

ssh ${VPS_USER}@${VPS_IP} << ENDSSH
    mkdir -p ${BACKUP_DIR}
    echo "Backing up current Docker Compose..."
    cp ${APP_DIR}/docker-compose.production.yml ${BACKUP_DIR}/docker-compose.production.yml.backup 2>/dev/null || true
    echo "Backing up current Nginx config..."
    cp /etc/nginx/sites-available/pdflab.pro ${BACKUP_DIR}/nginx-pdflab.pro.backup 2>/dev/null || true
    echo "Saving container list..."
    docker ps -a > ${BACKUP_DIR}/containers-before.txt
    echo "Backup location: ${BACKUP_DIR}"
ENDSSH

print_status "Backup created on VPS"
echo ""

# Step 6: Deploy to VPS
echo -e "${BLUE}Step 6: Deploying to VPS${NC}"
echo "------------------------------"

print_warning "This will pull latest code and start partner portal container"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Pulling latest code from git..."
    git pull origin master

    echo "Pulling latest Docker images..."
    docker compose -f docker-compose.production.yml pull partners

    echo "Starting partner portal container..."
    docker compose -f docker-compose.production.yml up -d partners

    echo "Waiting for container to start..."
    sleep 10

    echo "Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAMES|partners"
ENDSSH

print_status "Partner portal container deployed"
echo ""

# Step 7: Check Nginx configuration
echo -e "${BLUE}Step 7: Nginx configuration${NC}"
echo "------------------------------"

NGINX_CONFIGURED=$(ssh ${VPS_USER}@${VPS_IP} "grep -q 'partners.pdflab.pro' /etc/nginx/sites-available/pdflab.pro && echo 'yes' || echo 'no'")

if [[ "$NGINX_CONFIGURED" == "yes" ]]; then
    print_status "Nginx already configured for partners subdomain"
else
    print_warning "Nginx not configured for partners subdomain"
    echo ""
    echo "   ${YELLOW}MANUAL STEP REQUIRED:${NC}"
    echo "   1. Copy nginx-pdflab-pro-with-partners.conf to VPS"
    echo "   2. Replace /etc/nginx/sites-available/pdflab.pro"
    echo "   3. Test: sudo nginx -t"
    echo "   4. Reload: sudo systemctl reload nginx"
    echo ""
    echo "   Or run this command:"
    echo "   ${BLUE}scp nginx-pdflab-pro-with-partners.conf root@141.136.44.168:/etc/nginx/sites-available/pdflab.pro${NC}"
    echo "   ${BLUE}ssh root@141.136.44.168 'sudo nginx -t && sudo systemctl reload nginx'${NC}"
    echo ""
    read -p "   Nginx configured? (y/n) " -n 1 -r
    echo
fi

echo ""

# Step 8: SSL certificate
echo -e "${BLUE}Step 8: SSL certificate${NC}"
echo "------------------------------"

SSL_INSTALLED=$(ssh ${VPS_USER}@${VPS_IP} "sudo certbot certificates 2>/dev/null | grep -q 'partners.pdflab.pro' && echo 'yes' || echo 'no'")

if [[ "$SSL_INSTALLED" == "yes" ]]; then
    print_status "SSL certificate already installed"
else
    print_warning "SSL certificate not found for partners.pdflab.pro"
    echo ""
    echo "   ${YELLOW}MANUAL STEP REQUIRED:${NC}"
    echo "   Run on VPS:"
    echo "   ${BLUE}sudo certbot --nginx -d partners.pdflab.pro${NC}"
    echo ""
    echo "   This will:"
    echo "   - Obtain Let's Encrypt certificate"
    echo "   - Configure HTTPS redirect automatically"
    echo "   - Set up auto-renewal"
    echo ""
fi

echo ""

# Step 9: Verification
echo -e "${BLUE}Step 9: Running verification tests${NC}"
echo "------------------------------"

sleep 5

# Test DNS
if nslookup partners.pdflab.pro > /dev/null 2>&1; then
    print_status "DNS resolves"
else
    print_error "DNS resolution failed"
fi

# Test container
if ssh ${VPS_USER}@${VPS_IP} "docker ps | grep pdflab-partners-prod" > /dev/null 2>&1; then
    print_status "Partner portal container running"
else
    print_error "Partner portal container not running"
fi

# Test port
if ssh ${VPS_USER}@${VPS_IP} "netstat -tlnp | grep 3001" > /dev/null 2>&1; then
    print_status "Port 3001 in use (partner portal listening)"
else
    print_warning "Port 3001 not listening"
fi

# Test HTTP
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://partners.pdflab.pro 2>/dev/null || echo "000")
if [[ "$HTTP_STATUS" =~ ^(200|301|302)$ ]]; then
    print_status "HTTP accessible (status: $HTTP_STATUS)"
else
    print_warning "HTTP not accessible (status: $HTTP_STATUS)"
fi

# Test main app (regression check)
MAIN_APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pdflab.pro 2>/dev/null || echo "000")
if [[ "$MAIN_APP_STATUS" == "200" ]]; then
    print_status "Main app still working (no regression)"
else
    print_error "Main app may be affected (status: $MAIN_APP_STATUS)"
fi

echo ""

# Step 10: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

print_info "Backup location: ${BACKUP_DIR}"
print_info "Partner Portal URL: https://partners.pdflab.pro"
print_info "Container: pdflab-partners-prod"
print_info "Port: 3001"
echo ""

echo -e "${YELLOW}Manual Steps Remaining:${NC}"
echo "1. Configure Nginx (if not done):"
echo "   scp nginx-pdflab-pro-with-partners.conf root@141.136.44.168:/etc/nginx/sites-available/pdflab.pro"
echo "   ssh root@141.136.44.168 'sudo nginx -t && sudo systemctl reload nginx'"
echo ""
echo "2. Obtain SSL certificate:"
echo "   ssh root@141.136.44.168 'sudo certbot --nginx -d partners.pdflab.pro'"
echo ""
echo "3. Test partner portal:"
echo "   https://partners.pdflab.pro"
echo ""

echo -e "${GREEN}Useful Commands:${NC}"
echo "View logs:"
echo "  ssh root@141.136.44.168 'docker logs -f pdflab-partners-prod'"
echo ""
echo "Check container:"
echo "  ssh root@141.136.44.168 'docker ps | grep partners'"
echo ""
echo "Check nginx:"
echo "  ssh root@141.136.44.168 'sudo tail -f /var/log/nginx/partners-error.log'"
echo ""

echo -e "${GREEN}Partner Portal Deployment Complete!${NC}"
echo ""
