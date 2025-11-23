# PDFLab Staging Test Runner (PowerShell)
# Runs all 52 staging-compatible tests against staging environment
#
# Usage:
#   .\scripts\run-staging-tests.ps1                    # Run all tests
#   .\scripts\run-staging-tests.ps1 -Quick             # P0 only (critical)
#   .\scripts\run-staging-tests.ps1 -E2EOnly           # E2E only
#   .\scripts\run-staging-tests.ps1 -ApiOnly           # API integration only
#   .\scripts\run-staging-tests.ps1 -SkipPerformance   # Skip k6 tests
#   .\scripts\run-staging-tests.ps1 -Report            # Generate HTML report

param(
    [switch]$Quick,
    [switch]$E2EOnly,
    [switch]$ApiOnly,
    [switch]$SkipPerformance,
    [switch]$Report,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$env:TEST_ENV = "staging"

# Colors
$colors = @{
    Reset = "`e[0m"
    Red = "`e[31m"
    Green = "`e[32m"
    Yellow = "`e[33m"
    Blue = "`e[34m"
    Magenta = "`e[35m"
    Cyan = "`e[36m"
    Bright = "`e[1m"
}

# Test results
$results = @{
    StartTime = Get-Date
    TotalTests = 0
    PassedTests = 0
    FailedTests = 0
    SkippedTests = 0
    Suites = @()
}

function Write-ColorText {
    param([string]$Text, [string]$Color = "Reset")
    Write-Host $Text -ForegroundColor $Color -NoNewline
}

function Write-Header {
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  PDFLab Staging Test Runner" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  Staging Environment: " -NoNewline
    Write-Host "http://141.136.44.168" -ForegroundColor Yellow
    Write-Host "  Test Mode: " -NoNewline
    Write-Host $(if ($Quick) { "Quick (P0 only)" } else { "Full Suite" }) -ForegroundColor Yellow
    Write-Host "  Started: " -NoNewline
    Write-Host (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -ForegroundColor Yellow
    Write-Host ("─" * 80) -ForegroundColor Cyan
    Write-Host ""
}

function Invoke-TestCommand {
    param(
        [string]$Command,
        [string]$TestName
    )

    Write-Host "▶ Running: " -NoNewline -ForegroundColor Blue
    Write-Host $TestName -ForegroundColor Cyan

    if ($Verbose) {
        Write-Host "  Command: $Command" -ForegroundColor Yellow
    }

    $startTime = Get-Date

    try {
        if ($Verbose) {
            Invoke-Expression $Command
            $exitCode = $LASTEXITCODE
        } else {
            $output = Invoke-Expression $Command 2>&1
            $exitCode = $LASTEXITCODE
        }

        $duration = ((Get-Date) - $startTime).TotalSeconds

        if ($exitCode -eq 0) {
            Write-Host "✓ " -NoNewline -ForegroundColor Green
            Write-Host "$TestName " -NoNewline
            Write-Host "PASSED " -NoNewline -ForegroundColor Green
            Write-Host "($([math]::Round($duration, 2))s)"
            return @{ Success = $true; Duration = $duration; TestName = $TestName }
        } else {
            Write-Host "✗ " -NoNewline -ForegroundColor Red
            Write-Host "$TestName " -NoNewline
            Write-Host "FAILED " -NoNewline -ForegroundColor Red
            Write-Host "($([math]::Round($duration, 2))s)"
            return @{ Success = $false; Duration = $duration; TestName = $TestName; ExitCode = $exitCode }
        }
    } catch {
        Write-Host "✗ " -NoNewline -ForegroundColor Red
        Write-Host "$TestName " -NoNewline
        Write-Host "ERROR: " -NoNewline -ForegroundColor Red
        Write-Host $_.Exception.Message
        return @{ Success = $false; Error = $_.Exception.Message; TestName = $TestName }
    }
}

function Test-K6Installed {
    try {
        $null = k6 version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Define test suites
$testSuites = @(
    @{
        Name = "P0: Critical Security & Payments"
        Priority = 0
        Enabled = $true
        Tests = @(
            @{ Name = "Security Tests"; Command = "npx playwright test tests/integration/api/security.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 3 },
            @{ Name = "Payment Integration"; Command = "npx playwright test tests/integration/payments --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 },
            @{ Name = "CloudConvert Service"; Command = "npx playwright test tests/integration/services/cloudconvert.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 }
        )
    },
    @{
        Name = "P1: High Priority API Tests"
        Priority = 1
        Enabled = -not $Quick
        Tests = @(
            @{ Name = "Backend Endpoints"; Command = "npx playwright test tests/integration/api/backend-endpoints.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 4 },
            @{ Name = "Error Handling"; Command = "npx playwright test tests/integration/api/error-handling.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 },
            @{ Name = "Refresh Token Flow"; Command = "npx playwright test tests/integration/api/refresh-token.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 },
            @{ Name = "Email Service"; Command = "npx playwright test tests/integration/services/email.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 1 }
        )
    },
    @{
        Name = "P2: Medium Priority Features"
        Priority = 2
        Enabled = -not $Quick
        Tests = @(
            @{ Name = "Beta User System"; Command = "npx playwright test tests/integration/api/beta-user-system.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 },
            @{ Name = "Batch Processing API"; Command = "npx playwright test tests/integration/api/batch-processing-api.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 3 },
            @{ Name = "Feedback System"; Command = "npx playwright test tests/integration/api/feedback-system.test.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 }
        )
    },
    @{
        Name = "E2E: User Flows"
        Priority = 3
        Enabled = -not $ApiOnly
        Tests = @(
            @{ Name = "Authentication Flow"; Command = "npx playwright test e2e/auth.spec.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 },
            @{ Name = "Conversion Interface"; Command = "npx playwright test e2e/conversion.spec.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 3 },
            @{ Name = "Batch Processing UI"; Command = "npx playwright test e2e/batch-processing.spec.ts --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 }
        )
    },
    @{
        Name = "Accessibility: WCAG Compliance"
        Priority = 4
        Enabled = (-not $Quick) -and (-not $ApiOnly)
        Tests = @(
            @{ Name = "WCAG 2.1 AA Compliance"; Command = "npx playwright test tests/accessibility --config=tests/e2e/playwright.config.staging.ts"; EstimatedTime = 2 }
        )
    },
    @{
        Name = "Performance: Load & Stress Tests"
        Priority = 5
        Enabled = (-not $Quick) -and (-not $SkipPerformance) -and (-not $E2EOnly) -and (-not $ApiOnly)
        RequiresK6 = $true
        Tests = @(
            @{ Name = "Load Test (100 VUs)"; Command = "k6 run tests/performance/load-test.js --env API_URL=http://141.136.44.168:3007"; EstimatedTime = 5 },
            @{ Name = "Stress Test (500 VUs)"; Command = "k6 run tests/performance/stress-test.js --env API_URL=http://141.136.44.168:3007"; EstimatedTime = 8 },
            @{ Name = "Spike Test"; Command = "k6 run tests/performance/spike-test.js --env API_URL=http://141.136.44.168:3007"; EstimatedTime = 3 },
            @{ Name = "Soak Test (30 min)"; Command = "k6 run tests/performance/soak-test.js --env API_URL=http://141.136.44.168:3007"; EstimatedTime = 30 }
        )
    }
)

# Main execution
Write-Header

# Check k6 if needed
if (-not $SkipPerformance) {
    $k6Available = Test-K6Installed
    if (-not $k6Available) {
        Write-Host "⚠ k6 not installed. Skipping performance tests." -ForegroundColor Yellow
        Write-Host "  Install k6: https://k6.io/docs/getting-started/installation/" -ForegroundColor Cyan
        Write-Host ""
        $testSuites | Where-Object { $_.RequiresK6 } | ForEach-Object { $_.Enabled = $false }
    }
}

# Run test suites
foreach ($suite in ($testSuites | Sort-Object Priority)) {
    if (-not $suite.Enabled) {
        Write-Host "⊘ Skipping: " -NoNewline -ForegroundColor Blue
        Write-Host $suite.Name -ForegroundColor Yellow
        $results.SkippedTests += $suite.Tests.Count
        Write-Host ""
        continue
    }

    Write-Host ""
    Write-Host "▶ Test Suite: " -NoNewline -ForegroundColor Magenta
    Write-Host $suite.Name -ForegroundColor White
    $totalEstTime = ($suite.Tests | Measure-Object -Property EstimatedTime -Sum).Sum
    Write-Host "  $($suite.Tests.Count) test(s) | Est. $totalEstTime min"
    Write-Host ""

    $suiteResult = @{
        Name = $suite.Name
        Tests = @()
        StartTime = Get-Date
    }

    foreach ($test in $suite.Tests) {
        $results.TotalTests++
        $testResult = Invoke-TestCommand -Command $test.Command -TestName $test.Name

        $suiteResult.Tests += @{ Test = $test; Result = $testResult }

        if ($testResult.Success) {
            $results.PassedTests++
        } else {
            $results.FailedTests++
        }
    }

    $suiteResult.EndTime = Get-Date
    $suiteResult.Duration = ($suiteResult.EndTime - $suiteResult.StartTime).TotalSeconds
    $results.Suites += $suiteResult
}

# Print summary
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$totalDuration = ((Get-Date) - $results.StartTime).TotalMinutes
$passRate = if ($results.TotalTests -gt 0) { ($results.PassedTests / $results.TotalTests) * 100 } else { 0 }

Write-Host "  Total Tests: $($results.TotalTests)"
Write-Host "  ✓ Passed: " -NoNewline
Write-Host $results.PassedTests -ForegroundColor Green
Write-Host "  ✗ Failed: " -NoNewline
Write-Host $results.FailedTests -ForegroundColor Red
Write-Host "  ⊘ Skipped: " -NoNewline
Write-Host $results.SkippedTests -ForegroundColor Blue
Write-Host "  Pass Rate: $([math]::Round($passRate, 1))%"
Write-Host "  Duration: $([math]::Round($totalDuration, 2)) minutes"
Write-Host ("─" * 80) -ForegroundColor Cyan

# Show failed tests
if ($results.FailedTests -gt 0) {
    Write-Host ""
    Write-Host "Failed Tests:" -ForegroundColor Red
    foreach ($suite in $results.Suites) {
        foreach ($testItem in $suite.Tests) {
            if (-not $testItem.Result.Success) {
                Write-Host "  ✗ $($suite.Name) → $($testItem.Test.Name)" -ForegroundColor Red
            }
        }
    }
}

Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

# Save JSON report
$reportPath = "test-results\staging-test-results.json"
$reportDir = Split-Path -Parent $reportPath

if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportData = @{
    StartTime = $results.StartTime
    EndTime = Get-Date
    Duration = $totalDuration
    TotalTests = $results.TotalTests
    PassedTests = $results.PassedTests
    FailedTests = $results.FailedTests
    SkippedTests = $results.SkippedTests
    PassRate = [math]::Round($passRate, 1)
    Environment = "staging"
    StagingUrl = "http://141.136.44.168"
    Suites = $results.Suites
}

$reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "✓ Test results saved to: " -NoNewline -ForegroundColor Green
Write-Host $reportPath -ForegroundColor Cyan
Write-Host ""

# Generate HTML report if requested
if ($Report) {
    Write-Host "ℹ Generating HTML report..." -ForegroundColor Cyan
    npx playwright show-report playwright-report-staging
}

# Exit with appropriate code
exit $(if ($results.FailedTests -gt 0) { 1 } else { 0 })
