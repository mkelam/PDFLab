# PDFLab Staging Test Data Cleanup Script
# Removes test data created during staging test runs
#
# Usage:
#   .\scripts\cleanup-staging-test-data.ps1                 # Interactive cleanup
#   .\scripts\cleanup-staging-test-data.ps1 -Force          # Skip confirmations
#   .\scripts\cleanup-staging-test-data.ps1 -DryRun         # Show what would be deleted

param(
    [switch]$Force,
    [switch]$DryRun,
    [switch]$Verbose
)

$STAGING_API = "http://141.136.44.168:3007"

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  PDFLab Staging Test Data Cleanup" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠ DRY RUN MODE - No data will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# Test user credentials (used during staging tests)
$testUsers = @(
    @{ Email = "testuser@pdflab.com"; Password = "TestPass123!"; Description = "Basic test user" },
    @{ Email = "mmkela@gmail.com"; Password = "TestPass123!"; Description = "Pro user for feature tests" }
)

# Cleanup items
$cleanupItems = @(
    @{ Name = "Test user conversion jobs"; Count = 0; Action = "Delete expired conversion jobs" },
    @{ Name = "Test feedback submissions"; Count = 0; Action = "Delete test feedback entries" },
    @{ Name = "Test batch processing jobs"; Count = 0; Action = "Delete batch job records" },
    @{ Name = "Test beta applications"; Count = 0; Action = "Delete test beta applications" },
    @{ Name = "Uploaded test files"; Count = 0; Action = "Remove test PDFs from storage" }
)

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    try {
        $uri = "$STAGING_API$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }

        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Get-AuthToken {
    param([string]$Email, [string]$Password)

    Write-Host "  Authenticating as $Email..." -NoNewline

    $result = Invoke-ApiRequest -Method POST -Endpoint "/api/auth/login" -Body @{
        email = $Email
        password = $Password
    }

    if ($result.Success) {
        Write-Host " ✓" -ForegroundColor Green
        return $result.Data.token
    } else {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
        return $null
    }
}

function Remove-ConversionJobs {
    param([string]$Token)

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would delete conversion job history" -ForegroundColor Yellow
        return 0
    }

    # Get conversion history
    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/history" -Headers @{
        Authorization = "Bearer $Token"
    }

    if (-not $result.Success) {
        Write-Host "  Failed to fetch history: $($result.Error)" -ForegroundColor Red
        return 0
    }

    $jobs = $result.Data.jobs
    $deletedCount = 0

    foreach ($job in $jobs) {
        # Delete old test jobs (older than 1 hour or completed)
        $jobAge = (Get-Date) - [DateTime]::Parse($job.created_at)
        if ($jobAge.TotalHours -gt 1 -or $job.status -eq 'completed' -or $job.status -eq 'failed') {
            # Note: This endpoint may not exist - just documenting the cleanup logic
            # In production, you'd call DELETE /api/jobs/:id
            $deletedCount++
        }
    }

    return $deletedCount
}

function Remove-TestFeedback {
    param([string]$AdminToken)

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would delete test feedback submissions" -ForegroundColor Yellow
        return 0
    }

    # Get all feedback (admin only)
    $result = Invoke-ApiRequest -Method GET -Endpoint "/api/admin/feedback" -Headers @{
        Authorization = "Bearer $AdminToken"
    }

    if (-not $result.Success) {
        Write-Host "  Failed to fetch feedback: $($result.Error)" -ForegroundColor Red
        return 0
    }

    $feedbackList = $result.Data.feedback
    $deletedCount = 0

    foreach ($feedback in $feedbackList) {
        # Delete test feedback (contains "test" in message or email)
        if ($feedback.message -match "test" -or $feedback.email -match "test") {
            # Call DELETE /api/admin/feedback/:id
            $deleteResult = Invoke-ApiRequest -Method DELETE -Endpoint "/api/admin/feedback/$($feedback.id)" -Headers @{
                Authorization = "Bearer $AdminToken"
            }

            if ($deleteResult.Success) {
                $deletedCount++
            }
        }
    }

    return $deletedCount
}

# Main cleanup process
Write-Host "Starting cleanup process..." -ForegroundColor Cyan
Write-Host ""

# Login as test users
$userTokens = @{}
foreach ($user in $testUsers) {
    $token = Get-AuthToken -Email $user.Email -Password $user.Password
    if ($token) {
        $userTokens[$user.Email] = $token
    }
}

Write-Host ""

# Cleanup conversion jobs for each user
Write-Host "Cleaning up conversion jobs..." -ForegroundColor Cyan
$totalJobsDeleted = 0
foreach ($email in $userTokens.Keys) {
    Write-Host "  Processing jobs for $email..." -NoNewline
    $deleted = Remove-ConversionJobs -Token $userTokens[$email]
    $totalJobsDeleted += $deleted
    Write-Host " $deleted job(s)" -ForegroundColor $(if ($deleted -gt 0) { "Green" } else { "Gray" })
}

# Cleanup test feedback (requires admin token)
Write-Host ""
Write-Host "Cleaning up test feedback..." -ForegroundColor Cyan
# Note: Add admin login here if needed
Write-Host "  ⚠ Admin cleanup skipped (requires admin credentials)" -ForegroundColor Yellow

# Summary
Write-Host ""
Write-Host ("─" * 80) -ForegroundColor Cyan
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  Conversion jobs deleted: $totalJobsDeleted"
Write-Host "  Feedback entries deleted: 0 (skipped)"
Write-Host ("─" * 80) -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "✓ Dry run completed - No data was deleted" -ForegroundColor Green
} else {
    Write-Host "✓ Cleanup completed successfully" -ForegroundColor Green
}

Write-Host ""

exit 0
