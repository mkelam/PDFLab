@echo off
REM Sentry Alert Testing Script for PDFLab
REM This script tests all Sentry alerts to verify they're working correctly

echo.
echo ========================================
echo PDFLab Sentry Alert Testing
echo ========================================
echo.

REM Configuration
set API_URL=http://localhost:3006

REM Check if server is running
echo [1/10] Checking if backend is running...
curl -s %API_URL%/health > nul
if errorlevel 1 (
    echo ERROR: Backend not responding at %API_URL%
    echo Please start the backend with: cd backend ^&^& npm run dev
    exit /b 1
)
echo ✓ Backend is running
echo.

REM Check Sentry status
echo [2/10] Checking Sentry configuration...
curl -s %API_URL%/api/test/sentry-status
echo.
echo.

REM Test 1: Basic Error
echo [3/10] Testing basic error capture...
echo Expected: Error should appear in Sentry dashboard within 30 seconds
curl -s -X POST %API_URL%/api/test/sentry-error
echo.
echo.
timeout /t 2 /nobreak > nul

REM Test 2: Error Rate Spike
echo [4/10] Testing error rate spike alert (>10 errors in 1 minute)...
echo Expected: Alert should fire in Slack #alerts-critical
for /L %%i in (1,1,15) do (
    curl -s -X POST %API_URL%/api/test/sentry-error > nul
    echo Sent error %%i/15
)
echo.
echo ✓ Sent 15 errors - Alert should fire if threshold is 10/minute
echo.
timeout /t 2 /nobreak > nul

REM Test 3: Database Connection Error
echo [5/10] Testing database connection error...
echo Expected: CRITICAL alert in Slack #alerts-critical
curl -s -X POST %API_URL%/api/test/sentry-db-error
echo.
echo.
timeout /t 2 /nobreak > nul

REM Test 4: Redis Queue Error
echo [6/10] Testing Redis queue errors (need 6 to trigger alert)...
echo Expected: Alert fires when ^>5 errors in 1 minute
for /L %%i in (1,1,6) do (
    curl -s -X POST %API_URL%/api/test/sentry-redis-error > nul
    echo Sent queue error %%i/6
)
echo.
echo ✓ Sent 6 queue errors - Alert should fire
echo.
timeout /t 2 /nobreak > nul

REM Test 5: CloudConvert API Error
echo [7/10] Testing CloudConvert API error...
echo Expected: Alert in Slack #alerts-critical
curl -s -X POST %API_URL%/api/test/sentry-cloudconvert-error
echo.
echo.
timeout /t 2 /nobreak > nul

REM Test 6: PayFast Webhook Error
echo [8/10] Testing PayFast webhook error (REVENUE CRITICAL)...
echo Expected: CRITICAL alert in #alerts-payments + email to finance
curl -s -X POST %API_URL%/api/test/sentry-payfast-error
echo.
echo.
timeout /t 2 /nobreak > nul

REM Test 7: Batch Processing Error
echo [9/10] Testing batch processing error...
echo Expected: Alert in Slack
curl -s -X POST %API_URL%/api/test/sentry-batch-error
echo.
echo.
timeout /t 2 /nobreak > nul

REM Test 8: Slow Performance
echo [10/10] Testing slow performance (3 second delay)...
echo Expected: Performance alert if P95 threshold exceeded
echo Note: May require multiple requests to trigger P95 alert
curl -s -X POST %API_URL%/api/test/sentry-slow-performance
echo.
echo.

echo ========================================
echo Testing Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Check Sentry Dashboard: https://pdf-lab-pro.sentry.io/issues/
echo 2. Verify alerts in Slack channels:
echo    - #alerts-critical (general errors)
echo    - #alerts-payments (PayFast error)
echo    - #alerts-performance (slow requests)
echo 3. Check email inbox for alert notifications
echo 4. Review alert history in Sentry
echo.
echo Alert Verification Checklist:
echo [ ] Error Rate Spike alert fired (15 errors sent)
echo [ ] Database Connection alert fired
echo [ ] Redis Queue alert fired (6 errors sent)
echo [ ] CloudConvert API alert fired
echo [ ] PayFast Webhook alert fired (revenue-critical)
echo [ ] Slack notifications received
echo [ ] Email notifications received
echo.
echo If any alerts did not fire, check:
echo 1. Alert rules are enabled in Sentry
echo 2. Thresholds are configured correctly
echo 3. Slack integration is connected
echo 4. Email recipients are configured
echo.
pause
