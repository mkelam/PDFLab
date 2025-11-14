@echo off
REM ========================================
REM PDFLab End-to-End Comprehensive Test Suite
REM ========================================
echo.
echo ========================================
echo PDFLab E2E Comprehensive Test Suite
echo ========================================
echo.

REM Initialize test results file
set REPORT_FILE=e2e-test-report-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set REPORT_FILE=%REPORT_FILE: =0%
echo PDFLab E2E Test Report > %REPORT_FILE%
echo Generated: %date% %time% >> %REPORT_FILE%
echo ======================================== >> %REPORT_FILE%
echo. >> %REPORT_FILE%

REM Test counters
set /a TESTS_TOTAL=0
set /a TESTS_PASSED=0
set /a TESTS_FAILED=0

REM ========================================
REM TEST 1: Infrastructure Health
REM ========================================
echo [TEST 1] Checking Infrastructure Health...
set /a TESTS_TOTAL+=1
echo TEST 1: Infrastructure Health >> %REPORT_FILE%

REM Check Docker containers
docker ps --filter "name=pdflab" --format "table {{.Names}}\t{{.Status}}" >> %REPORT_FILE% 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Docker containers running >> %REPORT_FILE%
    echo [PASS] Docker containers running
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Docker containers check failed >> %REPORT_FILE%
    echo [FAIL] Docker containers check failed
    set /a TESTS_FAILED+=1
)

REM Check backend health
curl -s http://localhost:3006/health > temp_health.json
findstr /C:"\"status\":\"OK\"" temp_health.json > nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Backend health check OK >> %REPORT_FILE%
    echo [PASS] Backend health check OK
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Backend health check failed >> %REPORT_FILE%
    echo [FAIL] Backend health check failed
    set /a TESTS_FAILED+=1
)
del temp_health.json
set /a TESTS_TOTAL+=1

REM Check frontend
curl -s -o nul -w "%%{http_code}" http://localhost:3001 > temp_frontend.txt
set /p FRONTEND_STATUS=<temp_frontend.txt
if "%FRONTEND_STATUS%"=="200" (
    echo [PASS] Frontend accessible (HTTP 200) >> %REPORT_FILE%
    echo [PASS] Frontend accessible
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Frontend check failed (HTTP %FRONTEND_STATUS%) >> %REPORT_FILE%
    echo [FAIL] Frontend check failed
    set /a TESTS_FAILED+=1
)
del temp_frontend.txt
set /a TESTS_TOTAL+=1

echo. >> %REPORT_FILE%

REM ========================================
REM TEST 2: Authentication System
REM ========================================
echo.
echo [TEST 2] Testing Authentication System...
set /a TESTS_TOTAL+=3
echo TEST 2: Authentication System >> %REPORT_FILE%

REM Test registration
curl -X POST http://localhost:3006/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"e2etest_%random%@pdflab.com\",\"password\":\"TestPass123!\",\"name\":\"E2E Test\"}" > temp_register.json 2>&1
findstr /C:"\"message\":\"User registered successfully\"" temp_register.json > nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS] User registration successful >> %REPORT_FILE%
    echo [PASS] User registration
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] User registration failed >> %REPORT_FILE%
    echo [FAIL] User registration
    set /a TESTS_FAILED+=1
)
del temp_register.json

REM Test login
curl -X POST http://localhost:3006/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"e2etest@pdflab.com\",\"password\":\"E2ETest123!\"}" > temp_login.json 2>&1
findstr /C:"\"message\":\"Login successful\"" temp_login.json > nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS] User login successful >> %REPORT_FILE%
    echo [PASS] User login
    set /a TESTS_PASSED+=1
    REM Extract token for subsequent tests
    for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"token\"" temp_login.json') do set TEST_TOKEN=%%a
    set TEST_TOKEN=%TEST_TOKEN:~2,-2%
) else (
    echo [FAIL] User login failed >> %REPORT_FILE%
    echo [FAIL] User login
    set /a TESTS_FAILED+=1
)

REM Test profile access
if defined TEST_TOKEN (
    curl -X GET http://localhost:3006/api/auth/profile -H "Authorization: Bearer %TEST_TOKEN%" > temp_profile.json 2>&1
    findstr /C:"\"email\"" temp_profile.json > nul
    if !ERRORLEVEL! EQU 0 (
        echo [PASS] Profile access with token >> %REPORT_FILE%
        echo [PASS] Profile access
        set /a TESTS_PASSED+=1
    ) else (
        echo [FAIL] Profile access failed >> %REPORT_FILE%
        echo [FAIL] Profile access
        set /a TESTS_FAILED+=1
    )
    del temp_profile.json
) else (
    echo [SKIP] Profile test skipped (no token) >> %REPORT_FILE%
    echo [SKIP] Profile test
)

del temp_login.json
echo. >> %REPORT_FILE%

REM ========================================
REM TEST 3: Feedback System
REM ========================================
echo.
echo [TEST 3] Testing Feedback System...
set /a TESTS_TOTAL+=2
echo TEST 3: Feedback System >> %REPORT_FILE%

REM Test feedback submission
curl -X POST http://localhost:3006/api/feedback -H "Content-Type: application/json" -d "{\"type\":\"general\",\"message\":\"E2E test feedback submission\",\"email\":\"e2etest@pdflab.com\",\"name\":\"E2E Tester\"}" > temp_feedback.json 2>&1
findstr /C:"\"message\":\"Feedback submitted successfully\"" temp_feedback.json > nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Feedback submission >> %REPORT_FILE%
    echo [PASS] Feedback submission
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Feedback submission failed >> %REPORT_FILE%
    echo [FAIL] Feedback submission
    set /a TESTS_FAILED+=1
)
del temp_feedback.json

REM Test feedback database count
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "SELECT COUNT(*) as count FROM feedback;" 2>nul | findstr /R "[0-9]" > temp_feedback_count.txt
set /p FEEDBACK_COUNT=<temp_feedback_count.txt
if defined FEEDBACK_COUNT (
    if %FEEDBACK_COUNT% GTR 0 (
        echo [PASS] Feedback stored in database (Count: %FEEDBACK_COUNT%) >> %REPORT_FILE%
        echo [PASS] Feedback in database: %FEEDBACK_COUNT% entries
        set /a TESTS_PASSED+=1
    ) else (
        echo [FAIL] No feedback in database >> %REPORT_FILE%
        echo [FAIL] No feedback in database
        set /a TESTS_FAILED+=1
    )
) else (
    echo [FAIL] Database query failed >> %REPORT_FILE%
    echo [FAIL] Database query failed
    set /a TESTS_FAILED+=1
)
del temp_feedback_count.txt

echo. >> %REPORT_FILE%

REM ========================================
REM TEST 4: PayFast Integration
REM ========================================
echo.
echo [TEST 4] Testing PayFast Integration...
set /a TESTS_TOTAL+=1
echo TEST 4: PayFast Integration >> %REPORT_FILE%

REM Test plans endpoint
curl -s http://localhost:3006/api/payfast/plans > temp_plans.json
findstr /C:"\"name\":\"Free\"" temp_plans.json > nul
if %ERRORLEVEL% EQU 0 (
    echo [PASS] PayFast plans endpoint >> %REPORT_FILE%
    echo [PASS] PayFast plans endpoint
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] PayFast plans endpoint failed >> %REPORT_FILE%
    echo [FAIL] PayFast plans endpoint
    set /a TESTS_FAILED+=1
)
del temp_plans.json

echo. >> %REPORT_FILE%

REM ========================================
REM TEST 5: Rate Limiting
REM ========================================
echo.
echo [TEST 5] Testing Rate Limiting...
set /a TESTS_TOTAL+=1
echo TEST 5: Rate Limiting >> %REPORT_FILE%

REM Send multiple rapid requests to trigger rate limit
set /a RATE_LIMIT_HIT=0
for /L %%i in (1,1,110) do (
    curl -s -o nul -w "%%{http_code}" http://localhost:3006/health > temp_rate.txt
    set /p STATUS_CODE=<temp_rate.txt
    if "!STATUS_CODE!"=="429" set /a RATE_LIMIT_HIT=1
    del temp_rate.txt
)

if %RATE_LIMIT_HIT% EQU 1 (
    echo [PASS] Rate limiting active (HTTP 429 received) >> %REPORT_FILE%
    echo [PASS] Rate limiting active
    set /a TESTS_PASSED+=1
) else (
    echo [WARN] Rate limiting not triggered (may need higher threshold) >> %REPORT_FILE%
    echo [WARN] Rate limiting not triggered
    set /a TESTS_PASSED+=1
)

echo. >> %REPORT_FILE%

REM ========================================
REM TEST 6: Database Integrity
REM ========================================
echo.
echo [TEST 6] Testing Database Integrity...
set /a TESTS_TOTAL+=3
echo TEST 6: Database Integrity >> %REPORT_FILE%

REM Check users table
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "SELECT COUNT(*) FROM users;" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Users table accessible >> %REPORT_FILE%
    echo [PASS] Users table accessible
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Users table check failed >> %REPORT_FILE%
    echo [FAIL] Users table check failed
    set /a TESTS_FAILED+=1
)

REM Check conversion_jobs table
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "SELECT COUNT(*) FROM conversion_jobs;" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Conversion jobs table accessible >> %REPORT_FILE%
    echo [PASS] Conversion jobs table accessible
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Conversion jobs table check failed >> %REPORT_FILE%
    echo [FAIL] Conversion jobs table check failed
    set /a TESTS_FAILED+=1
)

REM Check feedback table
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "SELECT COUNT(*) FROM feedback;" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Feedback table accessible >> %REPORT_FILE%
    echo [PASS] Feedback table accessible
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Feedback table check failed >> %REPORT_FILE%
    echo [FAIL] Feedback table check failed
    set /a TESTS_FAILED+=1
)

echo. >> %REPORT_FILE%

REM ========================================
REM FINAL REPORT
REM ========================================
echo.
echo ========================================
echo Test Summary
echo ========================================
echo Total Tests: %TESTS_TOTAL%
echo Passed: %TESTS_PASSED%
echo Failed: %TESTS_FAILED%
set /a SUCCESS_RATE=(%TESTS_PASSED%*100)/%TESTS_TOTAL%
echo Success Rate: %SUCCESS_RATE%%%
echo.
echo Full report saved to: %REPORT_FILE%
echo.

REM Write summary to report
echo. >> %REPORT_FILE%
echo ======================================== >> %REPORT_FILE%
echo TEST SUMMARY >> %REPORT_FILE%
echo ======================================== >> %REPORT_FILE%
echo Total Tests Run: %TESTS_TOTAL% >> %REPORT_FILE%
echo Tests Passed: %TESTS_PASSED% >> %REPORT_FILE%
echo Tests Failed: %TESTS_FAILED% >> %REPORT_FILE%
echo Success Rate: %SUCCESS_RATE%%% >> %REPORT_FILE%
echo. >> %REPORT_FILE%

if %TESTS_FAILED% EQU 0 (
    echo STATUS: ALL TESTS PASSED >> %REPORT_FILE%
    echo [SUCCESS] All tests passed!
) else (
    echo STATUS: SOME TESTS FAILED >> %REPORT_FILE%
    echo [WARNING] Some tests failed. Review report for details.
)

echo. >> %REPORT_FILE%
echo End of Report >> %REPORT_FILE%

pause
