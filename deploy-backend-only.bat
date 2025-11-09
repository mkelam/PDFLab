@echo off
REM Deploy Backend Only - PayFast Multi-Currency Update
REM Use this when only backend code changed (faster deployment)

setlocal enabledelayedexpansion

echo ======================================
echo PDFLab Backend Deployment
echo Deploying: PayFast Multi-Currency Fix
echo ======================================
echo.

REM Configuration
set DOCKER_USER=mkelam
set BACKEND_IMAGE=pdflab-backend
set TAG=latest
set VPS_HOST=root@141.136.44.168

echo Step 1: Building backend Docker image...
echo --------------------------------------
cd backend

docker build -t %DOCKER_USER%/%BACKEND_IMAGE%:%TAG% -f Dockerfile .

if errorlevel 1 (
    echo ❌ Backend build failed!
    exit /b 1
)

echo ✅ Backend image built successfully
echo.

cd ..

echo Step 2: Pushing backend image to Docker Hub...
echo --------------------------------------
docker push %DOCKER_USER%/%BACKEND_IMAGE%:%TAG%

if errorlevel 1 (
    echo ❌ Docker push failed!
    exit /b 1
)

echo ✅ Backend image pushed to Docker Hub
echo.

echo Step 3: Deploying to VPS (141.136.44.168)...
echo --------------------------------------

ssh %VPS_HOST% "cd /var/www/pdflab && docker pull mkelam/pdflab-backend:latest && docker-compose -f docker-compose.production.yml up -d --no-deps --force-recreate backend && sleep 10 && docker ps | grep pdflab-backend-prod && docker logs pdflab-backend-prod --tail 20"

if errorlevel 1 (
    echo ❌ VPS deployment failed!
    exit /b 1
)

echo.
echo ======================================
echo ✅ Deployment Complete!
echo ======================================
echo.
echo Backend URL: https://pdflab.pro/api/health
echo PayFast Pricing API: https://pdflab.pro/api/payfast/plans
echo.
echo Next steps:
echo 1. Test pricing API: curl https://pdflab.pro/api/payfast/plans
echo 2. Verify USD amounts (should show 9.99, 29.99, 99.99)
echo 3. Test payment initialization with real user
echo.

pause
