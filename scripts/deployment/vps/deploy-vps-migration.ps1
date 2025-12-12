# PDFLab VPS Production Migration Script (PowerShell)
# Runs database migration on Hostinger VPS
# VPS IP: 141.136.44.168

$VPS_IP = "141.136.44.168"
$VPS_USER = "root"
$DB_NAME = "pdflab_production"
$DB_USER = "pdflab"
$DB_PASS = $env:DB_PASS
if ([string]::IsNullOrWhiteSpace($DB_PASS)) {
    throw "Missing environment variable: DB_PASS"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PDFLab VPS Migration - v1.1.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "WARNING: This will modify the PRODUCTION database!" -ForegroundColor Yellow
Write-Host ""
Write-Host "VPS IP: $VPS_IP"
Write-Host "Database: $DB_NAME"
Write-Host ""

$confirm = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Migration cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/6] Testing SSH connection to VPS..." -ForegroundColor Green
$sshTest = ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "echo 'SSH connection successful'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to connect to VPS" -ForegroundColor Red
    Write-Host "Output: $sshTest" -ForegroundColor Red
    Write-Host "Make sure SSH keys are configured or you have VPS password ready" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: $sshTest" -ForegroundColor Green
Write-Host ""

Write-Host "[2/6] Creating backup of production database..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "pdflab_backup_$timestamp.sql"

$backupCmd = "mysqldump -u $DB_USER -p'$DB_PASS' $DB_NAME > /tmp/$BACKUP_FILE 2>&1"
$backupResult = ssh "$VPS_USER@$VPS_IP" $backupCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Backup failed!" -ForegroundColor Red
    Write-Host "Output: $backupResult" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: Backup created at /tmp/$BACKUP_FILE" -ForegroundColor Green
Write-Host ""

Write-Host "[3/6] Copying migration script to VPS..." -ForegroundColor Green
$migrationFile = "backend\src\migrations\001_add_batch_processing.sql"
scp -o StrictHostKeyChecking=no "$migrationFile" "$VPS_USER@${VPS_IP}:/tmp/" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy migration script" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: Migration script copied" -ForegroundColor Green
Write-Host ""

Write-Host "[4/6] Verifying current database state..." -ForegroundColor Green
$tablesCmd = "mysql -u $DB_USER -p'$DB_PASS' $DB_NAME -e 'SHOW TABLES;' 2>&1"
$tables = ssh "$VPS_USER@$VPS_IP" $tablesCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to connect to database" -ForegroundColor Red
    Write-Host "Output: $tables" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: Database connection verified" -ForegroundColor Green
Write-Host "Current tables:"
Write-Host $tables
Write-Host ""

Write-Host "[5/6] Running migration on production database..." -ForegroundColor Green
Write-Host "This may take 1-2 minutes..." -ForegroundColor Yellow
$migrateCmd = "mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/001_add_batch_processing.sql 2>&1"
$migrateResult = ssh "$VPS_USER@$VPS_IP" $migrateCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host "Output: $migrateResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "To restore from backup:" -ForegroundColor Yellow
    Write-Host "  ssh $VPS_USER@$VPS_IP" -ForegroundColor Yellow
    Write-Host "  mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/$BACKUP_FILE" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: Migration completed" -ForegroundColor Green
Write-Host "Migration output:"
Write-Host $migrateResult
Write-Host ""

Write-Host "[6/6] Verifying migration..." -ForegroundColor Green
$verifyCmd = "mysql -u $DB_USER -p'$DB_PASS' $DB_NAME -e 'DESCRIBE batch_jobs;' 2>&1"
$verifyResult = ssh "$VPS_USER@$VPS_IP" $verifyCmd 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Migration verification failed!" -ForegroundColor Red
    Write-Host "Output: $verifyResult" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "SUCCESS: batch_jobs table verified" -ForegroundColor Green
Write-Host "Table structure:"
Write-Host $verifyResult
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Completed Successfully!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup location: /tmp/$BACKUP_FILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Push new Docker images (v1.1.0) to Docker Hub"
Write-Host "2. SSH to VPS and pull new images"
Write-Host "3. Restart containers with docker-compose"
Write-Host ""
Write-Host "To rollback (if needed):" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_IP"
Write-Host "  mysql -u $DB_USER -p'$DB_PASS' $DB_NAME < /tmp/$BACKUP_FILE"
Write-Host ""
Read-Host "Press Enter to exit"
