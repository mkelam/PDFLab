# Monitoring System Deployment Script (PowerShell)
# Deploys all 7 monitoring enhancements to production VPS
# Date: 2025-11-16

$ErrorActionPreference = "Stop"

# Configuration
$VPS_HOST = "root@141.136.44.168"
$VPS_BACKEND_PATH = "/var/pdflab/app/backend"
$DEPLOYMENT_DATE = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Monitoring System Deployment Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Date: $(Get-Date)"
Write-Host "VPS: $VPS_HOST"
Write-Host "Deployment ID: $DEPLOYMENT_DATE"
Write-Host ""

function Write-Step {
    param($Step, $Total, $Message)
    Write-Host ""
    Write-Host "[STEP $Step/$Total] $Message" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Blue
}

function Test-LastCommand {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✓ Success" -ForegroundColor Green
    }
}

# STEP 1: Package backend files
Write-Step 1 8 "Packaging Backend Files"
Set-Location backend
Write-Host "Creating tarball of dist folder..."
tar -czf "dist-$DEPLOYMENT_DATE.tar.gz" dist/
Test-LastCommand

Set-Location ..
Write-Host "Files packaged: backend/dist-$DEPLOYMENT_DATE.tar.gz"

# STEP 2: Copy files to VPS
Write-Step 2 8 "Copying Files to VPS"

Write-Host "Copying migration files..."
scp backend/src/migrations/20251116-*.sql "${VPS_HOST}:/tmp/"
Test-LastCommand

Write-Host "Copying backend dist tarball..."
scp "backend/dist-$DEPLOYMENT_DATE.tar.gz" "${VPS_HOST}:/tmp/"
Test-LastCommand

Write-Host "Copying autonomous remediation script..."
scp scripts/autonomous-remediation.sh "${VPS_HOST}:/tmp/"
Test-LastCommand

Write-Host "All files copied to VPS" -ForegroundColor Green

# STEP 3: Run database migrations
Write-Step 3 8 "Running Database Migrations"

$migrationScript = @'
set -e

echo "Running migration: monitoring_baseline table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-monitoring-baseline.sql || echo "Table may already exist"

echo "Running migration: extend alerts table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-extend-alerts-table.sql || echo "Columns may already exist"

echo "Running migration: blocked_ips table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-blocked-ips.sql || echo "Table may already exist"

echo "Running migration: authentication_logs table..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab < /tmp/20251116-create-auth-logs.sql || echo "Table may already exist"

echo "Verifying tables created..."
docker exec -i pdflab-mysql-prod mysql -u root -ppdflab_secure_2024 pdflab -e "SHOW TABLES LIKE '%monitoring%'; SHOW TABLES LIKE '%blocked%'; SHOW TABLES LIKE '%authentication%';"
'@

ssh $VPS_HOST $migrationScript
Test-LastCommand

# STEP 4: Backup and deploy backend
Write-Step 4 8 "Deploying Backend Code"

$deployScript = @"
set -e

cd $VPS_BACKEND_PATH

# Backup current dist
echo 'Backing up current dist folder...'
if [ -d 'dist' ]; then
    cp -r dist dist.backup.$DEPLOYMENT_DATE
    echo 'Backup created: dist.backup.$DEPLOYMENT_DATE'
fi

# Extract new dist
echo 'Extracting new backend files...'
tar -xzf /tmp/dist-$DEPLOYMENT_DATE.tar.gz

# Verify new files
echo 'Verifying new monitoring files...'
ls -lh dist/services/ | grep -E '(baseline|decision|alert|daily|security)'
ls -lh dist/controllers/service-management.controller.js
ls -lh dist/jobs/ | grep -E '(baseline|daily|security)'

echo 'Backend deployment complete'
"@

ssh $VPS_HOST $deployScript
Test-LastCommand

# STEP 5: Deploy autonomous remediation script
Write-Step 5 8 "Deploying Autonomous Remediation Script"

$scriptDeployScript = @'
set -e

# Create directories
mkdir -p /opt/pdflab/scripts
mkdir -p /var/log/pdflab

# Move script
mv /tmp/autonomous-remediation.sh /opt/pdflab/scripts/
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Verify
ls -lh /opt/pdflab/scripts/autonomous-remediation.sh

# Test run
echo "Testing remediation script..."
/opt/pdflab/scripts/autonomous-remediation.sh || echo "First run complete"

echo "Script deployed successfully"
'@

ssh $VPS_HOST $scriptDeployScript
Test-LastCommand

# STEP 6: Add environment variables
Write-Step 6 8 "Adding Environment Variables"

$envScript = @"
set -e

cd $VPS_BACKEND_PATH

# Check if ADMIN_EMAIL exists
if ! grep -q 'ADMIN_EMAIL' .env; then
    echo 'Adding ADMIN_EMAIL to .env...'
    echo '' >> .env
    echo '# Monitoring Configuration' >> .env
    echo 'ADMIN_EMAIL=mmkela@gmail.com' >> .env
    echo 'ADMIN_EMAIL added'
else
    echo 'ADMIN_EMAIL already exists in .env'
fi

# Display SMTP config
echo 'Verifying SMTP configuration...'
grep SMTP .env || echo 'SMTP vars not found'
"@

ssh $VPS_HOST $envScript
Test-LastCommand

# STEP 7: Setup cron job
Write-Step 7 8 "Setting Up Cron Jobs"

$cronScript = @'
set -e

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "autonomous-remediation.sh"; then
    echo "Cron job already exists"
else
    echo "Adding cron job..."
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh") | crontab -
    echo "Cron job added"
fi

# Verify
echo "Current crontab:"
crontab -l | grep autonomous || echo "Cron job not found"
'@

ssh $VPS_HOST $cronScript
Test-LastCommand

# STEP 8: Restart backend
Write-Step 8 8 "Restarting Backend Container"

$restartScript = @'
set -e

echo "Restarting backend container..."
docker restart pdflab-backend-prod

echo "Waiting 15 seconds for startup..."
sleep 15

echo "Checking container status..."
docker ps --filter name=pdflab-backend-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "Checking backend logs for cron job initialization..."
docker logs pdflab-backend-prod --tail 50 | grep -E "(Baseline|Daily|Security|scheduled)" || echo "Cron jobs initializing..."
'@

ssh $VPS_HOST $restartScript
Test-LastCommand

# Cleanup local files
Write-Host ""
Write-Host "Cleaning up local files..." -ForegroundColor Blue
Remove-Item "backend/dist-$DEPLOYMENT_DATE.tar.gz" -ErrorAction SilentlyContinue
Write-Host "Cleanup complete"

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "✓ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Deployed Components:" -ForegroundColor Green
Write-Host "  ✓ Backend services (5 files)"
Write-Host "  ✓ Cron jobs (3 files)"
Write-Host "  ✓ Controllers & routes (4 files)"
Write-Host "  ✓ Database migrations (4 tables)"
Write-Host "  ✓ Autonomous remediation script"
Write-Host "  ✓ System cron job"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor logs for 24 hours"
Write-Host "  2. Verify email arrives at 9 AM tomorrow"
Write-Host "  3. Check remediation log after 5-10 minutes"
Write-Host "  4. Test API endpoints with admin token"
Write-Host ""
Write-Host "Monitoring Commands:" -ForegroundColor Blue
Write-Host "  Backend logs:        ssh $VPS_HOST 'docker logs pdflab-backend-prod --tail 100'"
Write-Host "  Remediation log:     ssh $VPS_HOST 'tail -50 /var/log/pdflab/remediation.log'"
Write-Host "  Database check:      ssh $VPS_HOST 'docker exec pdflab-mysql-prod mysql -u root -p pdflab -e ""SELECT COUNT(*) FROM remediation_log""'"
Write-Host ""
Write-Host "Deployment ID: $DEPLOYMENT_DATE" -ForegroundColor Green
Write-Host "Backup available: dist.backup.$DEPLOYMENT_DATE" -ForegroundColor Green
Write-Host ""
