@echo off
REM One-line fix for PayFast passphrase issue
cd /d "%~dp0backend"
copy .env .env.backup >nul 2>&1
powershell -Command "(Get-Content .env) -replace '^PAYFAST_PASSPHRASE=.*', 'PAYFAST_PASSPHRASE=' | Set-Content .env"
echo.
echo ✓ Passphrase removed from .env
echo ✓ Backup saved to .env.backup
echo.
echo Now restart your backend server:
echo   1. Press Ctrl+C in the terminal running "npm run dev"
echo   2. Run: npm run dev
echo   3. Test payment at https://pdflab.pro/pricing
echo.
pause
