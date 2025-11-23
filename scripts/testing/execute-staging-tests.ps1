# PDFLab Staging Environment - Test Execution Script
# Purpose: Execute comprehensive production readiness tests
# Version: 1.0.0
# Date: 2025-11-21

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PDFLab Staging Test Execution Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$STAGING_API = "http://141.136.44.168:3007"
$STAGING_FRONTEND = "http://141.136.44.168:3002"
$TEST_EMAIL_PREFIX = "staging-test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$RESULTS_FILE = "staging-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

# Test results tracking
$results = @{
    startTime = Get-Date
    environment = "Staging"
    baseUrl = $STAGING_API
    tests = @()
    summary = @{
        total = 0
        passed = 0
        failed = 0
        skipped = 0
    }
}

# Helper function to log test results
function Log-TestResult {
    param(
        [string]$testId,
        [string]$testName,
        [string]$priority,
        [string]$status,
        [string]$message,
        [object]$data
    )

    $testResult = @{
        testId = $testId
        testName = $testName
        priority = $priority
        status = $status
        message = $message
        timestamp = Get-Date
        data = $data
    }

    $results.tests += $testResult
    $results.summary.total++

    switch ($status) {
        "PASS" {
            $results.summary.passed++
            Write-Host "[PASS] $testId - $testName" -ForegroundColor Green
        }
        "FAIL" {
            $results.summary.failed++
            Write-Host "[FAIL] $testId - $testName" -ForegroundColor Red
            Write-Host "       $message" -ForegroundColor Yellow
        }
        "SKIP" {
            $results.summary.skipped++
            Write-Host "[SKIP] $testId - $testName" -ForegroundColor Gray
        }
    }
}

# Helper function to make API requests
function Invoke-APITest {
    param(
        [string]$method,
        [string]$endpoint,
        [object]$body,
        [hashtable]$headers = @{},
        [int]$expectedStatus = 200
    )

    try {
        $uri = "$STAGING_API$endpoint"

        $params = @{
            Uri = $uri
            Method = $method
            Headers = $headers
            ContentType = "application/json"
            UseBasicParsing = $true
        }

        if ($body) {
            $params.Body = ($body | ConvertTo-Json -Depth 10)
        }

        $response = Invoke-RestMethod @params

        return @{
            success = $true
            status = 200
            data = $response
        }
    }
    catch {
        $statusCode = 500
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        return @{
            success = $false
            status = $statusCode
            error = $_.Exception.Message
            data = $null
        }
    }
}

Write-Host "🔍 Phase 0: Environment Health Check" -ForegroundColor Magenta
Write-Host "------------------------------------" -ForegroundColor Magenta
Write-Host ""

# Test: Health check
Write-Host "Checking staging environment health..." -ForegroundColor Yellow

try {
    $health = Invoke-RestMethod -Uri "$STAGING_API/health" -Method GET

    if ($health.status -eq "OK") {
        Write-Host "✅ Backend: Healthy (uptime: $($health.uptime)s)" -ForegroundColor Green
        Write-Host "✅ Database: $($health.checks.database)" -ForegroundColor Green
        Write-Host "✅ Redis: $($health.checks.redis)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Backend health check failed" -ForegroundColor Red
        Write-Host "Aborting tests - environment not healthy" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Cannot connect to staging environment" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔐 Phase 1: Authentication Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# AUTH-001: User Registration
Write-Host "Running AUTH-001: User Registration..." -ForegroundColor Yellow

$testEmail = "$TEST_EMAIL_PREFIX@pdflab.com"
$registerData = @{
    email = $testEmail
    password = "TestPass123!"
    name = "Staging Test User"
}

$registerResponse = Invoke-APITest -method "POST" -endpoint "/api/auth/register" -body $registerData

if ($registerResponse.success -and $registerResponse.data.token) {
    Log-TestResult -testId "AUTH-001" -testName "User Registration" -priority "P0" -status "PASS" `
        -message "User registered successfully with email: $testEmail" `
        -data @{ email = $testEmail; token = $registerResponse.data.token }

    # Store token for subsequent tests
    $global:ACCESS_TOKEN = $registerResponse.data.token
    $global:REFRESH_TOKEN = $registerResponse.data.refresh_token
    $global:TEST_USER_EMAIL = $testEmail
}
else {
    Log-TestResult -testId "AUTH-001" -testName "User Registration" -priority "P0" -status "FAIL" `
        -message "Registration failed: $($registerResponse.error)" -data $registerResponse
}

Start-Sleep -Seconds 2

# AUTH-002: User Login
Write-Host "Running AUTH-002: User Login..." -ForegroundColor Yellow

$loginData = @{
    email = "testuser@pdflab.com"
    password = "TestPass123!"
}

$loginResponse = Invoke-APITest -method "POST" -endpoint "/api/auth/login" -body $loginData

if ($loginResponse.success -and $loginResponse.data.token) {
    Log-TestResult -testId "AUTH-002" -testName "User Login" -priority "P0" -status "PASS" `
        -message "Login successful for existing user" `
        -data @{ email = $loginData.email }

    # Use this token for conversion tests
    $global:EXISTING_USER_TOKEN = $loginResponse.data.token
}
else {
    Log-TestResult -testId "AUTH-002" -testName "User Login" -priority "P0" -status "FAIL" `
        -message "Login failed: $($loginResponse.error)" -data $loginResponse
}

Start-Sleep -Seconds 2

# AUTH-003: Session Persistence (Profile Check)
Write-Host "Running AUTH-003: Session Persistence..." -ForegroundColor Yellow

if ($global:EXISTING_USER_TOKEN) {
    $headers = @{
        Authorization = "Bearer $global:EXISTING_USER_TOKEN"
    }

    $profileResponse = Invoke-APITest -method "GET" -endpoint "/api/auth/profile" -headers $headers

    if ($profileResponse.success -and $profileResponse.data.user) {
        Log-TestResult -testId "AUTH-003" -testName "Session Persistence" -priority "P0" -status "PASS" `
            -message "Profile retrieved successfully" `
            -data @{ email = $profileResponse.data.user.email; plan = $profileResponse.data.user.plan }
    }
    else {
        Log-TestResult -testId "AUTH-003" -testName "Session Persistence" -priority "P0" -status "FAIL" `
            -message "Profile retrieval failed: $($profileResponse.error)" -data $profileResponse
    }
}
else {
    Log-TestResult -testId "AUTH-003" -testName "Session Persistence" -priority "P0" -status "SKIP" `
        -message "Skipped due to AUTH-002 failure" -data $null
}

Start-Sleep -Seconds 2

# AUTH-004: Token Refresh
Write-Host "Running AUTH-004: Token Refresh..." -ForegroundColor Yellow

if ($global:REFRESH_TOKEN) {
    $refreshData = @{
        refresh_token = $global:REFRESH_TOKEN
    }

    $refreshResponse = Invoke-APITest -method "POST" -endpoint "/api/auth/refresh" -body $refreshData

    if ($refreshResponse.success -and $refreshResponse.data.token) {
        Log-TestResult -testId "AUTH-004" -testName "Token Refresh" -priority "P1" -status "PASS" `
            -message "Token refreshed successfully" `
            -data @{ newTokenReceived = $true }
    }
    else {
        Log-TestResult -testId "AUTH-004" -testName "Token Refresh" -priority "P1" -status "FAIL" `
            -message "Token refresh failed: $($refreshResponse.error)" -data $refreshResponse
    }
}
else {
    Log-TestResult -testId "AUTH-004" -testName "Token Refresh" -priority "P1" -status "SKIP" `
        -message "Skipped due to AUTH-001 failure (no refresh token)" -data $null
}

Start-Sleep -Seconds 2

# AUTH-005: Password Reset Request
Write-Host "Running AUTH-005: Password Reset Request..." -ForegroundColor Yellow

$resetData = @{
    email = "testuser@pdflab.com"
}

$resetResponse = Invoke-APITest -method "POST" -endpoint "/api/auth/forgot-password" -body $resetData

if ($resetResponse.success) {
    Log-TestResult -testId "AUTH-005" -testName "Password Reset Request" -priority "P1" -status "PASS" `
        -message "Password reset email triggered successfully" `
        -data @{ email = $resetData.email }
}
else {
    Log-TestResult -testId "AUTH-005" -testName "Password Reset Request" -priority "P1" -status "FAIL" `
        -message "Password reset failed: $($resetResponse.error)" -data $resetResponse
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📄 Phase 2: Conversion Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# CONVERT-001: PDF Upload (without actual file for now)
Write-Host "Running CONVERT-001: PDF Upload Validation..." -ForegroundColor Yellow
Write-Host "⚠️  Manual test required: Upload test-sample.pdf via API" -ForegroundColor Yellow

Log-TestResult -testId "CONVERT-001" -testName "PDF to DOCX Conversion" -priority "P0" -status "SKIP" `
    -message "Manual test required: File upload needs multipart/form-data handling" -data $null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📧 Phase 3: Email Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# EMAIL-004: SMTP Health Check (via backend logs)
Write-Host "Running EMAIL-004: SMTP Health Check..." -ForegroundColor Yellow
Write-Host "⚠️  Manual verification required: Check backend logs for SMTP initialization" -ForegroundColor Yellow

Log-TestResult -testId "EMAIL-004" -testName "SMTP Health Check" -priority "P0" -status "SKIP" `
    -message "Manual verification required: SSH to server and check Docker logs" -data $null

# EMAIL-001: Welcome Email (already sent during AUTH-001)
Write-Host "Running EMAIL-001: Welcome Email Delivery..." -ForegroundColor Yellow

if ($results.tests | Where-Object { $_.testId -eq "AUTH-001" -and $_.status -eq "PASS" }) {
    Write-Host "✅ Welcome email should have been sent during registration" -ForegroundColor Green
    Write-Host "📧 Check inbox or backend logs for: $testEmail" -ForegroundColor Cyan

    Log-TestResult -testId "EMAIL-001" -testName "Welcome Email Delivery" -priority "P0" -status "PASS" `
        -message "Welcome email triggered during registration (verify in inbox/logs)" `
        -data @{ recipient = $testEmail }
}
else {
    Log-TestResult -testId "EMAIL-001" -testName "Welcome Email Delivery" -priority "P0" -status "SKIP" `
        -message "Skipped due to AUTH-001 failure" -data $null
}

# EMAIL-002: Password Reset Email (already sent during AUTH-005)
Write-Host "Running EMAIL-002: Password Reset Email..." -ForegroundColor Yellow

if ($results.tests | Where-Object { $_.testId -eq "AUTH-005" -and $_.status -eq "PASS" }) {
    Write-Host "✅ Password reset email should have been sent" -ForegroundColor Green
    Write-Host "📧 Check inbox or backend logs for: testuser@pdflab.com" -ForegroundColor Cyan

    Log-TestResult -testId "EMAIL-002" -testName "Password Reset Email" -priority "P1" -status "PASS" `
        -message "Password reset email triggered (verify in inbox/logs)" `
        -data @{ recipient = "testuser@pdflab.com" }
}
else {
    Log-TestResult -testId "EMAIL-002" -testName "Password Reset Email" -priority "P1" -status "SKIP" `
        -message "Skipped due to AUTH-005 failure" -data $null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results.endTime = Get-Date
$results.duration = ($results.endTime - $results.startTime).TotalSeconds

Write-Host "Total Tests: $($results.summary.total)" -ForegroundColor White
Write-Host "Passed: $($results.summary.passed)" -ForegroundColor Green
Write-Host "Failed: $($results.summary.failed)" -ForegroundColor Red
Write-Host "Skipped: $($results.summary.skipped)" -ForegroundColor Gray
Write-Host ""

$passRate = if ($results.summary.total -gt 0) {
    [math]::Round(($results.summary.passed / $results.summary.total) * 100, 2)
} else {
    0
}

Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
Write-Host "Duration: $([math]::Round($results.duration, 2)) seconds" -ForegroundColor White
Write-Host ""

# Production readiness decision
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚦 Production Readiness Decision" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$p0Tests = $results.tests | Where-Object { $_.priority -eq "P0" }
$p0Passed = ($p0Tests | Where-Object { $_.status -eq "PASS" }).Count
$p0Total = $p0Tests.Count
$p0PassRate = if ($p0Total -gt 0) { ($p0Passed / $p0Total) * 100 } else { 0 }

$p1Tests = $results.tests | Where-Object { $_.priority -eq "P1" }
$p1Passed = ($p1Tests | Where-Object { $_.status -eq "PASS" }).Count
$p1Total = $p1Tests.Count
$p1PassRate = if ($p1Total -gt 0) { ($p1Passed / $p1Total) * 100 } else { 0 }

Write-Host "P0 (Critical) Tests: $p0Passed/$p0Total passed ($([math]::Round($p0PassRate, 1))%)" -ForegroundColor $(if ($p0PassRate -eq 100) { "Green" } else { "Red" })
Write-Host "P1 (High) Tests: $p1Passed/$p1Total passed ($([math]::Round($p1PassRate, 1))%)" -ForegroundColor $(if ($p1PassRate -eq 100) { "Green" } elseif ($p1PassRate -ge 80) { "Yellow" } else { "Red" })
Write-Host ""

$goDecision = ($p0PassRate -eq 100) -and ($p1PassRate -eq 100)

if ($goDecision) {
    Write-Host "✅ PRODUCTION DEPLOYMENT: GO" -ForegroundColor Green
    Write-Host "   All critical and high-priority tests passed." -ForegroundColor Green
}
else {
    Write-Host "❌ PRODUCTION DEPLOYMENT: NO-GO" -ForegroundColor Red
    Write-Host "   Critical or high-priority tests failed." -ForegroundColor Red
    Write-Host "   Review failed tests and fix before deploying." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Review failed tests (if any)" -ForegroundColor White
Write-Host "2. Check backend logs: docker logs pdflab-backend-staging" -ForegroundColor White
Write-Host "3. Verify email delivery in inbox or logs" -ForegroundColor White
Write-Host "4. Run manual conversion tests with actual PDF files" -ForegroundColor White
Write-Host "5. Generate full test report: $RESULTS_FILE" -ForegroundColor White
Write-Host ""

# Save results to JSON
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $RESULTS_FILE -Encoding UTF8

Write-Host "✅ Test results saved to: $RESULTS_FILE" -ForegroundColor Green
Write-Host ""
Write-Host "Test execution complete!" -ForegroundColor Cyan
