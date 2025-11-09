@echo off
echo ========================================
echo   PDFLab - Batch Jobs Migration
echo ========================================
echo.

echo Step 1: Checking Docker containers...
docker ps -a --filter "name=pdflab" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Docker Desktop is not running
    echo Please start Docker Desktop and run this script again
    echo.
    echo Alternative: Start MySQL and Redis manually:
    echo   - MySQL on port 3306
    echo   - Redis on port 6379
    echo.
    pause
    exit /b 1
)

echo Step 2: Starting MySQL and Redis containers...
docker start pdflab-mysql pdflab-redis >nul 2>&1
timeout /t 3 /nobreak >nul
echo ✓ Containers started

echo.
echo Step 3: Running batch_jobs table migration...
npx tsx src/scripts/run-migration.ts

echo.
echo ========================================
echo   Migration Complete!
echo ========================================
pause
