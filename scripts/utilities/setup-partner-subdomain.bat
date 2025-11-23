@echo off
REM ========================================
REM PDFLab Partner Portal - Local Development Setup
REM This script helps you test the partner portal locally
REM ========================================

echo ========================================
echo PDFLab Partner Portal - Local Setup
echo ========================================
echo.

echo This script will help you set up the partner portal for LOCAL development.
echo For PRODUCTION VPS setup, use setup-partner-subdomain.sh
echo.

echo Current Configuration:
echo   Main App:       http://localhost:3000
echo   Partner Portal: http://localhost:3001  (needs to be started)
echo   Backend API:    http://localhost:3006
echo.

echo ========================================
echo Quick Start Guide:
echo ========================================
echo.

echo 1. Start Backend (Terminal 1):
echo    cd backend
echo    npm run dev
echo.

echo 2. Start Main App (Terminal 2):
echo    npm run dev
echo.

echo 3. Start Partner Portal (Terminal 3):
echo    cd partners-portal
echo    set PORT=3001
echo    npm run dev
echo.

echo 4. Access Applications:
echo    Main App:       http://localhost:3000
echo    Partner Portal: http://localhost:3001
echo.

echo ========================================
echo For VPS Production Setup:
echo ========================================
echo.

echo 1. Upload setup-partner-subdomain.sh to your VPS
echo 2. SSH into your VPS: ssh root@141.136.44.168
echo 3. Make script executable: chmod +x setup-partner-subdomain.sh
echo 4. Run script: sudo ./setup-partner-subdomain.sh
echo 5. Follow the on-screen instructions
echo.

echo Press any key to exit...
pause > nul
