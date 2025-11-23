# PDFLab Backend Healthcheck Fix Deployment Script (PowerShell)
# This script applies the healthcheck fix to the production environment
# Date: 2025-11-16
# Issue: Backend container showing unhealthy due to missing curl

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PDFLab Healthcheck Fix Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VPS_IP = "141.136.44.168"
$VPS_USER = "root"
$REMOTE_DIR = "/var/pdflab/app"
$LOCAL_COMPOSE = "docker-compose.production.yml"

Write-Host "📋 Step 1: Backing up current docker-compose.yml on VPS..." -ForegroundColor Yellow
$BACKUP_NAME = "docker-compose.production.yml.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
ssh "${VPS_USER}@${VPS_IP}" "cd ${REMOTE_DIR} && cp docker-compose.production.yml ${BACKUP_NAME}"
Write-Host "✅ Backup created: ${BACKUP_NAME}" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Step 2: Uploading updated docker-compose.production.yml..." -ForegroundColor Yellow
scp $LOCAL_COMPOSE "${VPS_USER}@${VPS_IP}:${REMOTE_DIR}/docker-compose.production.yml"
Write-Host "✅ File uploaded" -ForegroundColor Green
Write-Host ""

Write-Host "🔄 Step 3: Recreating containers with new healthchecks..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" @"
cd /var/pdflab/app

# Recreate containers (no downtime, rolling restart)
echo 'Recreating backend container...'
docker-compose -f docker-compose.production.yml up -d --no-deps backend

echo 'Recreating worker container...'
docker-compose -f docker-compose.production.yml up -d --no-deps worker

echo 'Recreating frontend container...'
docker-compose -f docker-compose.production.yml up -d --no-deps frontend

echo 'Recreating MySQL container...'
docker-compose -f docker-compose.production.yml up -d --no-deps mysql

echo 'Recreating Redis container...'
docker-compose -f docker-compose.production.yml up -d --no-deps redis

echo '✅ All containers recreated'
"@
Write-Host ""

Write-Host "⏳ Step 4: Waiting 40 seconds for healthchecks to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 40
Write-Host ""

Write-Host "🏥 Step 5: Checking container health status..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep pdflab"
Write-Host ""

Write-Host "✅ Step 6: Verifying backend health endpoint..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "curl -s http://localhost:3006/health | jq ."
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "✅ Healthcheck Fix Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Monitor container status: docker ps" -ForegroundColor White
Write-Host "2. Check logs: docker logs pdflab-backend-prod" -ForegroundColor White
Write-Host "3. Verify all containers show 'healthy' status" -ForegroundColor White
Write-Host ""
