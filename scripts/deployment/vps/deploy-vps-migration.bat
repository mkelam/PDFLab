@echo off
REM PDFLab VPS Production Migration Script (Windows)
REM Runs database migration on Hostinger VPS
REM VPS IP: 141.136.44.168

setlocal EnableDelayedExpansion

echo ========================================
echo PDFLab VPS Migration - v1.1.0
echo ========================================
echo.

set VPS_IP=141.136.44.168
set VPS_USER=root
set DB_NAME=pdflab_production
set DB_USER=pdflab
set DB_PASS=***REMOVED***

echo WARNING: This will modify the PRODUCTION database!
echo.
echo VPS IP: %VPS_IP%
echo Database: %DB_NAME%
echo.

set /p confirm="Are you sure you want to continue? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Migration cancelled
    exit /b 0
)

echo.
echo [1/6] Testing SSH connection to VPS...
ssh -o ConnectTimeout=5 %VPS_USER%@%VPS_IP% "echo SSH connection successful" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to connect to VPS
    echo Make sure SSH keys are configured or use Git Bash
    pause
    exit /b 1
)
echo SUCCESS: SSH connection verified
echo.

echo [2/6] Creating backup of production database...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
for /f "tokens=1-2 delims=/: " %%a in ('time /t') do set mytime=%%a%%b
set BACKUP_FILE=pdflab_backup_%mydate%_%mytime%.sql

ssh %VPS_USER%@%VPS_IP% "mysqldump -u %DB_USER% -p%DB_PASS% %DB_NAME% > /tmp/%BACKUP_FILE%"
if errorlevel 1 (
    echo ERROR: Backup failed!
    pause
    exit /b 1
)
echo SUCCESS: Backup created at /tmp/%BACKUP_FILE%
echo.

echo [3/6] Copying migration script to VPS...
scp backend\src\migrations\001_add_batch_processing.sql %VPS_USER%@%VPS_IP%:/tmp/
if errorlevel 1 (
    echo ERROR: Failed to copy migration script
    pause
    exit /b 1
)
echo SUCCESS: Migration script copied
echo.

echo [4/6] Verifying current database state...
ssh %VPS_USER%@%VPS_IP% "mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% -e 'SHOW TABLES;'"
if errorlevel 1 (
    echo ERROR: Failed to connect to database
    pause
    exit /b 1
)
echo SUCCESS: Database connection verified
echo.

echo [5/6] Running migration on production database...
echo This may take 1-2 minutes...
ssh %VPS_USER%@%VPS_IP% "mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% < /tmp/001_add_batch_processing.sql"
if errorlevel 1 (
    echo ERROR: Migration failed!
    echo.
    echo To restore from backup:
    echo ssh %VPS_USER%@%VPS_IP%
    echo mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% ^< /tmp/%BACKUP_FILE%
    pause
    exit /b 1
)
echo SUCCESS: Migration completed
echo.

echo [6/6] Verifying migration...
ssh %VPS_USER%@%VPS_IP% "mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% -e 'DESCRIBE batch_jobs;'"
if errorlevel 1 (
    echo ERROR: Migration verification failed!
    pause
    exit /b 1
)
echo SUCCESS: batch_jobs table verified
echo.

echo ========================================
echo Migration Completed Successfully!
echo ========================================
echo.
echo Backup location: /tmp/%BACKUP_FILE%
echo.
echo Next steps:
echo 1. Push new Docker images (v1.1.0) to Docker Hub
echo 2. SSH to VPS and pull new images
echo 3. Restart containers with docker-compose
echo.
echo To rollback (if needed):
echo   ssh %VPS_USER%@%VPS_IP%
echo   mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% ^< /tmp/%BACKUP_FILE%
echo.
pause
