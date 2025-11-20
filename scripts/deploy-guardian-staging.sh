#!/bin/bash
################################################################################
# Deploy Elite Health Guardian to STAGING VPS
# Automated deployment script for staging monitoring system
################################################################################

set -euo pipefail

# Configuration
VPS_HOST="141.136.44.168"
VPS_USER="root"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="staging"

echo "=========================================="
echo "Elite Health Guardian Deployment (STAGING)"
echo "=========================================="
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Environment: $ENVIRONMENT"
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
  mkdir -p /var/pdflab-staging/scripts
  mkdir -p /var/pdflab-staging/logs
  mkdir -p /var/pdflab-staging/backups
  mkdir -p /var/pdflab-staging/state
  echo "Directories created"
ENDSSH
success "Directories created on VPS"

# Step 3: Upload scripts
echo ""
echo "Step 3: Uploading monitoring scripts..."

SCRIPTS_TO_UPLOAD=(
  "elite-health-guardian-staging.sh"
  "send-alert-email.sh"
  "auto-restart-container.sh"
  "auto-clear-cache.sh"
  "auto-cleanup-disk.sh"
  "auto-optimize-database.sh"
  "auto-backup.sh"
)

for script in "${SCRIPTS_TO_UPLOAD[@]}"; do
  if [[ -f "$SCRIPTS_DIR/$script" ]]; then
    scp "$SCRIPTS_DIR/$script" "$VPS_USER@$VPS_HOST:/var/pdflab-staging/scripts/" > /dev/null 2>&1
    success "Uploaded $script"
  else
    warning "Script not found: $script (skipping)"
  fi
done

# Step 4: Set permissions
echo ""
echo "Step 4: Setting script permissions..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  chmod +x /var/pdflab-staging/scripts/*.sh
  echo "Permissions set"
ENDSSH
success "Script permissions configured"

# Step 5: Configure environment
echo ""
echo "Step 5: Creating monitoring environment file..."

ALERT_EMAIL="mmkela@gmail.com"

ssh "$VPS_USER@$VPS_HOST" <<ENDSSH
cat > /var/pdflab-staging/.env.monitoring <<'EOF'
# Elite Health Guardian Configuration (STAGING)
ALERT_EMAIL=$ALERT_EMAIL
ENVIRONMENT=staging

# Thresholds
CACHE_THRESHOLD=80
DISK_THRESHOLD=85
MAX_RESTARTS=3
COOLDOWN=300
EOF
chmod 600 /var/pdflab-staging/.env.monitoring
echo "Environment configured"
ENDSSH
success "Monitoring environment configured"

# Step 6: Set up cron jobs
echo ""
echo "Step 6: Setting up cron jobs..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  # Create new crontab entry for staging guardian
  (crontab -l 2>/dev/null | grep -v "elite-health-guardian-staging"; cat <<'CRON'
# Elite Health Guardian - STAGING - Monitoring every 30 seconds
* * * * * /var/pdflab-staging/scripts/elite-health-guardian-staging.sh >> /var/pdflab-staging/logs/guardian.log 2>&1
* * * * * sleep 30; /var/pdflab-staging/scripts/elite-health-guardian-staging.sh >> /var/pdflab-staging/logs/guardian.log 2>&1
CRON
) | crontab -
  echo "Cron jobs installed"
ENDSSH
success "Cron jobs configured"

# Step 7: Verify installation
echo ""
echo "Step 7: Verifying installation..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  echo "Scripts in /var/pdflab-staging/scripts:"
  ls -lh /var/pdflab-staging/scripts/*.sh 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
  echo ""
  echo "Cron jobs installed:"
  crontab -l | grep "elite-health-guardian-staging"
  echo ""
  echo "Environment file:"
  ls -lh /var/pdflab-staging/.env.monitoring 2>/dev/null || echo "  Not found"
ENDSSH
success "Installation verified"

# Step 8: Start monitoring
echo ""
echo "Step 8: Starting Elite Health Guardian..."
ssh "$VPS_USER@$VPS_HOST" <<'ENDSSH'
  # Run health check once
  /var/pdflab-staging/scripts/elite-health-guardian-staging.sh
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
echo "✓ Cron jobs running every 30 seconds"
echo "✓ Monitoring STAGING environment"
echo ""
echo "Monitor logs:"
echo "  ssh $VPS_USER@$VPS_HOST 'tail -f /var/pdflab-staging/logs/guardian.log'"
echo ""
echo "Alert emails will be sent to: $ALERT_EMAIL"
echo ""
echo "Pause guardian:"
echo "  ssh $VPS_USER@$VPS_HOST 'touch /var/pdflab-staging/.guardian-paused'"
echo ""
echo "Resume guardian:"
echo "  ssh $VPS_USER@$VPS_HOST 'rm /var/pdflab-staging/.guardian-paused'"
echo ""
echo "=========================================="

exit 0
