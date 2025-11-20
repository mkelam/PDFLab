#!/bin/bash
################################################################################
# Deploy Elite Health Guardian to VPS
# Automated deployment script for production monitoring system
################################################################################

set -euo pipefail

# Configuration
VPS_HOST="${VPS_HOST:-141.136.44.168}"
VPS_USER="${VPS_USER:-root}"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"

echo "=========================================="
echo "Elite Health Guardian Deployment"
echo "=========================================="
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Local Scripts: $SCRIPTS_DIR"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

# Step 1: Check SSH connection
echo "Step 1: Checking SSH connection..."
if ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
  success "SSH connection verified"
else
  error "Cannot connect to VPS. Check credentials and network."
  exit 1
fi

# Step 2: Create directories on VPS
echo ""
echo "Step 2: Creating directories on VPS..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  mkdir -p /var/pdflab/scripts
  mkdir -p /var/pdflab/logs
  mkdir -p /var/pdflab/backups
  mkdir -p /var/pdflab/state
  echo "Directories created"
ENDSSH
success "Directories created on VPS"

# Step 3: Upload scripts
echo ""
echo "Step 3: Uploading monitoring scripts..."

SCRIPTS_TO_UPLOAD=(
  "elite-health-guardian.sh"
  "autonomous-remediation.sh"
  "send-alert-email.sh"
  "auto-restart-container.sh"
  "auto-clear-cache.sh"
  "auto-cleanup-disk.sh"
  "auto-optimize-database.sh"
  "auto-backup.sh"
  "weekly-health-audit.sh"
  "health-check-enhanced.sh"
  "drift-detector.sh"
)

for script in "${SCRIPTS_TO_UPLOAD[@]}"; do
  if [[ -f "$SCRIPTS_DIR/$script" ]]; then
    scp "$SCRIPTS_DIR/$script" "$VPS_USER@$VPS_HOST:/var/pdflab/scripts/" > /dev/null 2>&1
    success "Uploaded $script"
  else
    warning "Script not found: $script (skipping)"
  fi
done

# Step 4: Set permissions
echo ""
echo "Step 4: Setting script permissions..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  chmod +x /var/pdflab/scripts/*.sh
  echo "Permissions set"
ENDSSH
success "Script permissions configured"

# Step 5: Configure environment
echo ""
echo "Step 5: Creating monitoring environment file..."

read -p "Enter your email for alerts (default: mmkela@gmail.com): " ALERT_EMAIL
ALERT_EMAIL=${ALERT_EMAIL:-mmkela@gmail.com}

read -p "Enter SMTP host (default: smtp.hostinger.com): " SMTP_HOST
SMTP_HOST=${SMTP_HOST:-smtp.hostinger.com}

read -p "Enter SMTP user (default: support@pdflab.pro): " SMTP_USER
SMTP_USER=${SMTP_USER:-support@pdflab.pro}

read -s -p "Enter SMTP password: " SMTP_PASSWORD
echo ""

ssh "$VPS_USER@$VPS_HOST" <<ENDSSH
cat > /var/pdflab/.env.monitoring <<'EOF'
# Elite Health Guardian Configuration
ALERT_EMAIL=$ALERT_EMAIL
SMTP_HOST=$SMTP_HOST
SMTP_PORT=587
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$SMTP_USER

# Thresholds
CACHE_THRESHOLD=80
DISK_THRESHOLD=85
MAX_RESTARTS=3
COOLDOWN=300
EOF
chmod 600 /var/pdflab/.env.monitoring
echo "Environment configured"
ENDSSH
success "Monitoring environment configured"

# Step 6: Test email system
echo ""
echo "Step 6: Testing email system..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  /var/pdflab/scripts/send-alert-email.sh "TEST" "Elite Guardian deployment test - $(date)"
ENDSSH
success "Test email sent - check $ALERT_EMAIL inbox"

# Step 7: Set up cron jobs
echo ""
echo "Step 7: Setting up cron jobs..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  # Backup existing crontab
  crontab -l > /tmp/crontab.backup 2>/dev/null || true

  # Create new crontab
  cat > /tmp/crontab.new <<'CRON'
# Elite Health Guardian - Monitoring every 30 seconds
* * * * * /var/pdflab/scripts/elite-health-guardian.sh >> /var/log/guardian.log 2>&1
* * * * * sleep 30; /var/pdflab/scripts/elite-health-guardian.sh >> /var/log/guardian.log 2>&1

# Daily backup at 3 AM UTC
0 3 * * * /var/pdflab/scripts/auto-backup.sh >> /var/log/backup.log 2>&1

# Weekly health audit (Sunday 2 AM UTC)
0 2 * * 0 /var/pdflab/scripts/weekly-health-audit.sh >> /var/log/audit.log 2>&1

# Daily database optimization (4 AM UTC)
0 4 * * * /var/pdflab/scripts/auto-optimize-database.sh >> /var/log/optimization.log 2>&1
CRON

  # Install new crontab
  crontab /tmp/crontab.new
  echo "Cron jobs installed"
ENDSSH
success "Cron jobs configured"

# Step 8: Verify installation
echo ""
echo "Step 8: Verifying installation..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  echo "Scripts in /var/pdflab/scripts:"
  ls -lh /var/pdflab/scripts/*.sh | awk '{print "  " $9 " (" $5 ")"}'
  echo ""
  echo "Cron jobs installed:"
  crontab -l | grep -v "^#" | grep -v "^$"
  echo ""
  echo "Environment file:"
  ls -lh /var/pdflab/.env.monitoring
ENDSSH
success "Installation verified"

# Step 9: Start monitoring
echo ""
echo "Step 9: Starting Elite Health Guardian..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  # Run health check once
  /var/pdflab/scripts/elite-health-guardian.sh
  echo "Guardian started"
ENDSSH
success "Elite Health Guardian is now running"

# Summary
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "✓ Scripts uploaded and configured"
echo "✓ Email alerts configured"
echo "✓ Cron jobs running every 30 seconds"
echo "✓ Daily backups at 3 AM UTC"
echo "✓ Weekly audits on Sunday 2 AM UTC"
echo ""
echo "Monitor logs:"
echo "  ssh $VPS_USER@$VPS_HOST 'tail -f /var/log/guardian.log'"
echo ""
echo "Check dashboard:"
echo "  https://pdflab.pro/admin/monitoring"
echo ""
echo "Alert emails will be sent to: $ALERT_EMAIL"
echo ""
echo "=========================================="

exit 0
