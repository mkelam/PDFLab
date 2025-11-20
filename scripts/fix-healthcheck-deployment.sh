#!/bin/bash

# PDFLab Backend Healthcheck Fix Deployment Script
# This script applies the healthcheck fix to the production environment
# Date: 2025-11-16
# Issue: Backend container showing unhealthy due to missing curl

set -e  # Exit on any error

echo "============================================"
echo "PDFLab Healthcheck Fix Deployment"
echo "============================================"
echo ""

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
REMOTE_DIR="/var/pdflab/app"
LOCAL_COMPOSE="docker-compose.production.yml"

echo "📋 Step 1: Backing up current docker-compose.yml on VPS..."
ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_DIR} && cp docker-compose.production.yml docker-compose.production.yml.backup-$(date +%Y%m%d-%H%M%S)"

echo "✅ Backup created"
echo ""

echo "📤 Step 2: Uploading updated docker-compose.production.yml..."
scp ${LOCAL_COMPOSE} ${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/docker-compose.production.yml

echo "✅ File uploaded"
echo ""

echo "🔄 Step 3: Recreating containers with new healthchecks..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /var/pdflab/app

# Recreate containers (no downtime, rolling restart)
echo "Recreating backend container..."
docker-compose -f docker-compose.production.yml up -d --no-deps backend

echo "Recreating worker container..."
docker-compose -f docker-compose.production.yml up -d --no-deps worker

echo "Recreating frontend container..."
docker-compose -f docker-compose.production.yml up -d --no-deps frontend

echo "Recreating MySQL container..."
docker-compose -f docker-compose.production.yml up -d --no-deps mysql

echo "Recreating Redis container..."
docker-compose -f docker-compose.production.yml up -d --no-deps redis

echo "✅ All containers recreated"
ENDSSH

echo ""

echo "⏳ Step 4: Waiting 40 seconds for healthchecks to initialize..."
sleep 40

echo ""

echo "🏥 Step 5: Checking container health status..."
ssh ${VPS_USER}@${VPS_IP} "docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep pdflab"

echo ""

echo "✅ Step 6: Verifying backend health endpoint..."
ssh ${VPS_USER}@${VPS_IP} "curl -s http://localhost:3006/health | jq ."

echo ""

echo "============================================"
echo "✅ Healthcheck Fix Deployment Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Monitor container status: docker ps"
echo "2. Check logs: docker logs pdflab-backend-prod"
echo "3. Verify all containers show 'healthy' status"
echo ""
