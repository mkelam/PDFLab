@echo off
echo ============================================
echo PDFLab Beta Launch System Deployment v1.2.0
echo ============================================
echo.

REM Version and tags
set VERSION=v1.2.0-beta
set FRONTEND_IMAGE=mkelam/pdflab-frontend:%VERSION%
set BACKEND_IMAGE=mkelam/pdflab-backend:%VERSION%
set VPS_IP=141.136.44.168
set VPS_USER=root

echo [1/6] Building Frontend Docker Image...
docker build -t %FRONTEND_IMAGE% -f Dockerfile .
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)

echo.
echo [2/6] Building Backend Docker Image...
cd backend
docker build -t %BACKEND_IMAGE% -f Dockerfile .
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed
    cd ..
    exit /b 1
)
cd ..

echo.
echo [3/6] Pushing Frontend Image to Docker Hub...
docker push %FRONTEND_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: Frontend push failed
    exit /b 1
)

echo.
echo [4/6] Pushing Backend Image to Docker Hub...
docker push %BACKEND_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: Backend push failed
    exit /b 1
)

echo.
echo [5/6] Running Database Migration on Production...
echo Creating migration script...
scp backend/src/migrations/003_beta_applications.sql %VPS_USER%@%VPS_IP%:/root/pdflab/

echo Running migration...
ssh %VPS_USER%@%VPS_IP% "docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab < /root/pdflab/003_beta_applications.sql 2>&1 | grep -v Warning || echo 'Migration completed (columns may already exist)'"

echo.
echo [6/6] Deploying to Production VPS...
ssh %VPS_USER%@%VPS_IP% "cd /root/pdflab && docker-compose pull && docker-compose up -d && docker-compose ps"

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo Frontend: https://pdflab.pro
echo Backend: https://pdflab.pro/api
echo Beta Application: https://pdflab.pro/beta
echo Admin Beta Dashboard: https://pdflab.pro/admin/beta
echo.
echo Testing deployment...
timeout /t 5 /nobreak >nul
curl -s -o nul -w "Frontend Status: %%{http_code}\n" https://pdflab.pro
curl -s -o nul -w "Backend Health: %%{http_code}\n" https://pdflab.pro/api/health
curl -s -o nul -w "Beta Page: %%{http_code}\n" https://pdflab.pro/beta

echo.
echo Deployment v1.2.0-beta completed successfully!
pause
