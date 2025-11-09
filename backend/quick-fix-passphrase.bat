@echo off
REM Quick Fix for PayFast Passphrase Issue
REM This script helps test the passphrase fix

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║   PayFast Passphrase Quick Fix - Interactive Helper          ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

echo Current .env configuration:
findstr "PAYFAST_PASSPHRASE" .env
echo.

echo.
echo What would you like to test?
echo.
echo 1. Test WITHOUT passphrase (most likely fix)
echo 2. Test WITH passphrase "jt7NOE43FZPn" (current setting)
echo 3. Test WITH custom passphrase (enter your own)
echo 4. Show diagnostic information
echo 5. Exit
echo.

set /p choice="Enter choice (1-5): "

if "%choice%"=="1" goto test_no_passphrase
if "%choice%"=="2" goto test_with_passphrase
if "%choice%"=="3" goto test_custom_passphrase
if "%choice%"=="4" goto show_diagnostic
if "%choice%"=="5" goto end

echo Invalid choice!
pause
goto end

:test_no_passphrase
echo.
echo ═══════════════════════════════════════════════════════════════
echo Testing WITHOUT passphrase
echo ═══════════════════════════════════════════════════════════════
echo.
echo This will temporarily set PAYFAST_PASSPHRASE to empty string.
echo.
echo IMPORTANT: Make sure PayFast dashboard has NO passphrase set!
echo.
pause

REM Backup current .env
copy .env .env.backup >nul
echo ✓ Backed up .env to .env.backup

REM Update passphrase to empty
powershell -Command "(Get-Content .env) -replace 'PAYFAST_PASSPHRASE=.*', 'PAYFAST_PASSPHRASE=' | Set-Content .env"
echo ✓ Set PAYFAST_PASSPHRASE to empty

echo.
echo Updated .env:
findstr "PAYFAST_PASSPHRASE" .env
echo.

echo.
echo ═══════════════════════════════════════════════════════════════
echo NEXT STEPS:
echo ═══════════════════════════════════════════════════════════════
echo 1. Restart your backend server (Ctrl+C, then npm run dev)
echo 2. Try the payment again in your browser
echo 3. If it works: Leave passphrase empty
echo 4. If it fails: Restore backup with "copy .env.backup .env"
echo.
pause
goto end

:test_with_passphrase
echo.
echo ═══════════════════════════════════════════════════════════════
echo Testing WITH passphrase "jt7NOE43FZPn"
echo ═══════════════════════════════════════════════════════════════
echo.
echo This is your CURRENT setting.
echo.
echo IMPORTANT: Make sure PayFast dashboard HAS this passphrase set:
echo   Settings → Integration → Security → Passphrase = jt7NOE43FZPn
echo.
echo No changes needed to .env
echo.
pause
goto end

:test_custom_passphrase
echo.
echo ═══════════════════════════════════════════════════════════════
echo Testing WITH custom passphrase
echo ═══════════════════════════════════════════════════════════════
echo.
set /p custom_pass="Enter the EXACT passphrase from PayFast dashboard: "
echo.

REM Backup current .env
copy .env .env.backup >nul
echo ✓ Backed up .env to .env.backup

REM Update passphrase
powershell -Command "(Get-Content .env) -replace 'PAYFAST_PASSPHRASE=.*', 'PAYFAST_PASSPHRASE=%custom_pass%' | Set-Content .env"
echo ✓ Set PAYFAST_PASSPHRASE to %custom_pass%

echo.
echo Updated .env:
findstr "PAYFAST_PASSPHRASE" .env
echo.

echo.
echo ═══════════════════════════════════════════════════════════════
echo NEXT STEPS:
echo ═══════════════════════════════════════════════════════════════
echo 1. Restart your backend server (Ctrl+C, then npm run dev)
echo 2. Try the payment again in your browser
echo 3. If it fails: Restore backup with "copy .env.backup .env"
echo.
pause
goto end

:show_diagnostic
echo.
echo ═══════════════════════════════════════════════════════════════
echo Running Diagnostic
echo ═══════════════════════════════════════════════════════════════
echo.

node test-passphrase-scenarios.js

echo.
echo.
pause
goto end

:end
echo.
echo Done!
echo.
