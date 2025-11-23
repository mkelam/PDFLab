@echo off
REM Deploy and run the passphrase fix on VPS
echo ========================================================================
echo  Deploying PayFast Passphrase Fix to VPS
echo ========================================================================
echo.
echo VPS: 141.136.44.168 (pdflab.pro)
echo.
echo This will:
echo   1. Upload fix script to VPS
echo   2. Execute the fix remotely
echo   3. Show results
echo.
pause

echo.
echo [1/2] Uploading fix script to VPS...
scp VPS_FIX_PASSPHRASE.sh root@141.136.44.168:/root/

echo.
echo [2/2] Executing fix on VPS...
ssh root@141.136.44.168 "chmod +x /root/VPS_FIX_PASSPHRASE.sh && /root/VPS_FIX_PASSPHRASE.sh"

echo.
echo ========================================================================
echo  Done!
echo ========================================================================
echo.
echo Now test the payment at: https://pdflab.pro/pricing
echo.
pause
