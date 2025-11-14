#!/bin/bash

###############################################################################
# PDFLab Partner Portal - VPS Deployment Script
# Deploys the partner portal to production on port 3001
###############################################################################

set -e  # Exit on any error

echo "=========================================="
echo "PDFLab Partner Portal Deployment"
echo "=========================================="
echo ""

VPS_IP="141.136.44.168"
VPS_USER="root"
APP_DIR="/root/pdflab"
PORT="3001"

# Step 1: Build production version
echo "📦 Step 1: Building production version..."
cd partners-portal
npm run build
echo "   ✅ Build complete"
echo ""

# Step 2: Upload to VPS
echo "📤 Step 2: Uploading to VPS..."
echo "   Using rsync to sync partners-portal/ directory..."
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  -e ssh ./ ${VPS_USER}@${VPS_IP}:${APP_DIR}/partners-portal/
echo "   ✅ Upload complete"
echo ""

# Step 3: Install dependencies on VPS
echo "📥 Step 3: Installing dependencies on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/pdflab/partners-portal
npm install --production
echo "   ✅ Dependencies installed"
ENDSSH
echo ""

# Step 4: Start/Restart with PM2
echo "🚀 Step 4: Starting partner portal with PM2..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/pdflab/partners-portal

# Check if already running
if pm2 list | grep -q "partners-portal"; then
  echo "   Partner portal already running, restarting..."
  pm2 restart partners-portal
else
  echo "   Starting partner portal for the first time..."
  PORT=3001 pm2 start npm --name "partners-portal" -- start
fi

# Save PM2 configuration
pm2 save
echo "   ✅ Partner portal started"
ENDSSH
echo ""

# Step 5: Verify deployment
echo "✅ Step 5: Verifying deployment..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
echo "   PM2 Status:"
pm2 list | grep partners-portal

echo ""
echo "   Port 3001 Status:"
sudo netstat -tlnp | grep 3001

echo ""
echo "   Testing URL..."
sleep 5  # Give server time to fully start
curl -I https://partners.pdflab.pro 2>&1 | head -1
ENDSSH
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Partner Portal URLs:"
echo "   Production: https://partners.pdflab.pro"
echo "   Dashboard:  https://partners.pdflab.pro/[slug]"
echo ""
echo "Useful Commands:"
echo "   View logs:    ssh ${VPS_USER}@${VPS_IP} 'pm2 logs partners-portal'"
echo "   Restart:      ssh ${VPS_USER}@${VPS_IP} 'pm2 restart partners-portal'"
echo "   Stop:         ssh ${VPS_USER}@${VPS_IP} 'pm2 stop partners-portal'"
echo "   Status:       ssh ${VPS_USER}@${VPS_IP} 'pm2 list'"
echo ""
echo "=========================================="
