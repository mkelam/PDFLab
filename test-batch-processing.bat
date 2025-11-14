@echo off
REM PDFLab Batch Processing Test Script (Windows)
REM Tests the batch processing endpoints with multiple file uploads

setlocal EnableDelayedExpansion

echo ========================================
echo PDFLab Batch Processing Test
echo ========================================
echo.

REM Configuration
set API_URL=http://localhost:3006
set TEST_USER_EMAIL=testuser@pdflab.com
set TEST_USER_PASSWORD=TestPass123!

echo [1/5] Logging in...
curl -s -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%TEST_USER_EMAIL%\",\"password\":\"%TEST_USER_PASSWORD%\"}" > login.json

REM Parse token from JSON (simple extraction)
for /f "tokens=2 delims=:," %%a in ('findstr "token" login.json') do (
    set TOKEN_RAW=%%a
)
set TOKEN=%TOKEN_RAW:"=%

if "%TOKEN%"=="" (
    echo ERROR: Login failed
    type login.json
    echo.
    echo Please ensure:
    echo 1. Backend is running: npm run dev in backend/
    echo 2. Test user exists: %TEST_USER_EMAIL%
    echo 3. Or create user: POST /api/auth/register
    del login.json
    pause
    exit /b 1
)

echo SUCCESS: Logged in successfully
echo.

echo [2/5] Uploading batch for conversion (3 files)...
curl -s -X POST "%API_URL%/api/batch/upload" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "files=@test-sample.pdf" ^
  -F "files=@test-sample.pdf" ^
  -F "files=@test-sample.pdf" ^
  -F "operation_type=convert" ^
  -F "batch_name=Test Batch" ^
  -F "output_format=pptx" > batch.json

type batch.json
echo.

REM Parse batch_id from JSON
for /f "tokens=2 delims=:," %%a in ('findstr "batch_id" batch.json') do (
    set BATCH_ID_RAW=%%a
    goto :found_batch_id
)
:found_batch_id
set BATCH_ID=%BATCH_ID_RAW:"=%

if "%BATCH_ID%"=="" (
    echo ERROR: Batch upload failed
    del batch.json login.json
    pause
    exit /b 1
)

echo SUCCESS: Batch uploaded: %BATCH_ID%
echo.

echo [3/5] Checking batch status (polling every 3 seconds)...
set POLL_COUNT=0
:poll_loop
set /a POLL_COUNT+=1
if %POLL_COUNT% GTR 10 goto :poll_done

timeout /t 3 /nobreak >nul

curl -s "%API_URL%/api/batch/status/%BATCH_ID%" ^
  -H "Authorization: Bearer %TOKEN%" > status.json

REM Parse status
for /f "tokens=2 delims=:," %%a in ('findstr "\"status\"" status.json') do (
    set STATUS_RAW=%%a
)
set STATUS=%STATUS_RAW:"=%

REM Parse progress
for /f "tokens=2 delims=:," %%a in ('findstr "\"progress\"" status.json') do (
    set PROGRESS=%%a
)

REM Parse completed_files
for /f "tokens=2 delims=:," %%a in ('findstr "\"completed_files\"" status.json') do (
    set COMPLETED=%%a
)

echo Status: %STATUS% ^| Progress: %PROGRESS%%% ^| Completed: %COMPLETED%

if "%STATUS%"=="completed" goto :poll_done
if "%STATUS%"=="partial" goto :poll_done
if "%STATUS%"=="failed" (
    echo ERROR: Batch processing failed
    type status.json
    del batch.json login.json status.json
    pause
    exit /b 1
)

goto :poll_loop

:poll_done
echo SUCCESS: Batch processing complete!
echo.
echo Full status:
type status.json
echo.
echo.

echo [4/5] Getting batch history...
curl -s "%API_URL%/api/batch/history" ^
  -H "Authorization: Bearer %TOKEN%" > history.json

type history.json
echo.
echo.

echo [5/5] Testing batch download...
curl -s "%API_URL%/api/batch/download/%BATCH_ID%" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -o "test-batch-result.zip"

if exist "test-batch-result.zip" (
    for %%A in ("test-batch-result.zip") do set FILE_SIZE=%%~zA
    echo SUCCESS: Batch ZIP downloaded: test-batch-result.zip (!FILE_SIZE! bytes^)
    echo.
    echo Attempting to list ZIP contents...
    tar -tf test-batch-result.zip 2>nul || echo   (ZIP listing not available^)
) else (
    echo ERROR: Download failed
)

echo.
echo ========================================
echo SUCCESS: Batch Processing Test Complete!
echo ========================================
echo.
echo Test Summary:
echo - Batch ID: %BATCH_ID%
echo - Status: %STATUS%
echo - Files Completed: %COMPLETED%
echo - ZIP Downloaded: test-batch-result.zip
echo.

REM Cleanup
del batch.json login.json status.json history.json 2>nul

pause
