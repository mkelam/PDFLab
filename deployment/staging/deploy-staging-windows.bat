@echo off
REM ============================================================================
REM PDFLab Staging Deployment Script (Windows)
REM
REM Deploys code from Windows machine to staging server
REM Usage: deploy-staging-windows.bat
REM ============================================================================

echo.
echo ========================================
echo   PDFLab Staging Deployment (Windows)
echo ========================================
echo.

REM Configuration
set SERVER=root@141.136.44.168
set STAGING_DIR=/var/pdflab-staging/app
set LOCAL_DIR=.

echo Step 1: Building application...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

echo Step 2: Uploading files to staging server...
echo This may take a few minutes...
echo.

REM Use SCP to upload files (requires ssh/scp in PATH)
scp -r "%LOCAL_DIR%" "%SERVER%:%STAGING_DIR%/"
if errorlevel 1 (
    echo [ERROR] File upload failed
    echo Make sure you have SSH/SCP installed and configured
    pause
    exit /b 1
)
echo [OK] Files uploaded
echo.

echo Step 3: Restarting staging services...
ssh %SERVER% "cd %STAGING_DIR%/deployment/staging && docker-compose -f docker-compose.staging.yml down && docker-compose -f docker-compose.staging.yml up -d --build"
if errorlevel 1 (
    echo [ERROR] Service restart failed
    pause
    exit /b 1
)
echo [OK] Services restarted
echo.

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Staging URLs:
echo   Frontend: http://staging.pdflab.pro:3001
echo   Backend:  http://staging.pdflab.pro:3007
echo   API:      http://staging.pdflab.pro:3007/api/health
echo.
echo Next steps:
echo 1. Test manually in browser
echo 2. Run automated tests:
echo    npm run test:e2e
echo 3. If tests pass, deploy to production
echo.
pause
