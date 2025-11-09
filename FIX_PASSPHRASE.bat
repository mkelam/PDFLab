@echo off
REM ========================================================================
REM PayFast Passphrase Quick Fix Script
REM ========================================================================
REM This script fixes the PayFast signature mismatch by removing the
REM passphrase from backend/.env (to match sandbox default)
REM ========================================================================

color 0A
echo.
echo ========================================================================
echo  PayFast Passphrase Quick Fix
echo ========================================================================
echo.
echo This script will:
echo   1. Backup your current .env file
echo   2. Remove PAYFAST_PASSPHRASE (set to empty)
echo   3. Restart the backend server
echo   4. Test the signature generation
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

cd /d "%~dp0backend"

REM Check if .env exists
if not exist ".env" (
    echo.
    echo [ERROR] .env file not found in backend folder!
    echo Expected location: %CD%\.env
    echo.
    pause
    exit /b 1
)

REM Backup current .env
echo.
echo [1/5] Creating backup...
copy .env .env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul 2>&1
if errorlevel 1 (
    copy .env .env.backup >nul
)
echo      Done! Backup saved.

REM Show current passphrase
echo.
echo [2/5] Current configuration:
findstr "PAYFAST_PASSPHRASE" .env
echo.

REM Remove passphrase (set to empty)
echo [3/5] Removing passphrase...
powershell -Command "(Get-Content .env) -replace '^PAYFAST_PASSPHRASE=.*', 'PAYFAST_PASSPHRASE=' | Set-Content .env"
echo      Done! Passphrase removed.

REM Show new configuration
echo.
echo [4/5] New configuration:
findstr "PAYFAST_PASSPHRASE" .env
echo.

REM Kill existing Node.js processes on port 3006
echo [5/5] Restarting backend server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3006') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo      Existing server stopped.

REM Start new server in new window
echo      Starting new server...
start "PDFLab Backend (Fixed)" cmd /k "cd /d %CD% && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================================================
echo  Fix Applied Successfully!
echo ========================================================================
echo.
echo What was changed:
echo   - PAYFAST_PASSPHRASE is now empty (to match sandbox default)
echo   - Backend server restarted
echo   - Old .env backed up to .env.backup
echo.
echo Next steps:
echo   1. Wait 10 seconds for server to fully start
echo   2. Open browser: https://pdflab.pro/pricing
echo   3. Click "Subscribe" on Starter plan
echo   4. Click "Pay Now"
echo   5. Should redirect to PayFast (NO signature error!)
echo.
echo If it still fails:
echo   1. Check PayFast dashboard: https://sandbox.payfast.co.za
echo   2. Go to: Settings -^> Integration -^> Security
echo   3. Check if Passphrase field has a value
echo   4. If it does, copy that EXACT value to .env
echo   5. Run this script again
echo.
echo Backup location: %CD%\.env.backup
echo.
echo Press any key to test signature generation...
pause >nul

REM Test signature generation
echo.
echo ========================================================================
echo  Testing Signature Generation
echo ========================================================================
echo.

if exist "test-passphrase-scenarios.js" (
    node test-passphrase-scenarios.js
) else (
    echo [WARNING] test-passphrase-scenarios.js not found
    echo Run manually: cd backend ^&^& node test-passphrase-scenarios.js
)

echo.
echo ========================================================================
echo Script complete! Check results above.
echo ========================================================================
echo.
pause
