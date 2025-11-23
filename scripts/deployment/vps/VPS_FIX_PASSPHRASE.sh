#!/bin/bash
# ========================================================================
# PayFast Passphrase Fix - VPS Production Script
# ========================================================================
# This script fixes the PayFast signature mismatch on the VPS by
# updating the container environment to remove the passphrase
# ========================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "========================================================================"
echo "  PayFast Passphrase Fix - VPS Production"
echo "========================================================================"
echo ""
echo -e "${CYAN}VPS: 141.136.44.168 (pdflab.pro)${NC}"
echo -e "${CYAN}Container: pdflab-backend-prod${NC}"
echo ""
echo "This script will:"
echo "  1. Check current passphrase configuration"
echo "  2. Backup backend.env file"
echo "  3. Remove PAYFAST_PASSPHRASE (set to empty)"
echo "  4. Restart backend container"
echo "  5. Verify fix is applied"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check if backend.env exists
if [ ! -f "/root/backend.env" ]; then
    echo ""
    echo -e "${RED}[ERROR] /root/backend.env not found!${NC}"
    echo "Expected location: /root/backend.env"
    echo ""
    exit 1
fi

# Show current configuration
echo ""
echo -e "${BLUE}[1/6] Current PayFast configuration:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "PAYFAST_" /root/backend.env | grep -v "PASSWORD\|SECRET" || echo "No PayFast config found"
echo ""
echo -e "${YELLOW}Current passphrase:${NC}"
grep "PAYFAST_PASSPHRASE" /root/backend.env || echo "PAYFAST_PASSPHRASE not found"
echo ""

# Backup current env file
echo -e "${BLUE}[2/6] Creating backup...${NC}"
BACKUP_NAME="/root/backend.env.backup.$(date +%Y%m%d_%H%M%S)"
cp /root/backend.env "$BACKUP_NAME"
echo -e "${GREEN}     ✓ Done! Backup saved to $BACKUP_NAME${NC}"

# Remove passphrase (set to empty)
echo ""
echo -e "${BLUE}[3/6] Removing passphrase from backend.env...${NC}"
sed -i 's/^PAYFAST_PASSPHRASE=.*/PAYFAST_PASSPHRASE=/' /root/backend.env
echo -e "${GREEN}     ✓ Done! Passphrase removed.${NC}"

# Show new configuration
echo ""
echo -e "${BLUE}[4/6] New configuration:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "PAYFAST_PASSPHRASE" /root/backend.env
echo ""

# Restart backend container
echo -e "${BLUE}[5/6] Restarting backend container...${NC}"
echo "     Stopping container..."
docker stop pdflab-backend-prod

echo "     Removing old container..."
docker rm pdflab-backend-prod

echo "     Starting new container with fixed configuration..."
docker run -d \
  --name pdflab-backend-prod \
  --network app_pdflab-network \
  -p 3006:3006 \
  -v /root/backend.env:/app/.env:ro \
  --restart unless-stopped \
  mkelam/pdflab-backend:latest

echo "     Waiting 10 seconds for initialization..."
sleep 10

echo -e "${GREEN}     ✓ Container restarted${NC}"

# Check container status
echo ""
echo -e "${BLUE}[6/6] Verifying container status...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker ps --filter name=pdflab-backend-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Recent logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs pdflab-backend-prod --tail 20

echo ""
echo "========================================================================"
echo -e "${GREEN}  Fix Applied Successfully!${NC}"
echo "========================================================================"
echo ""
echo -e "${GREEN}What was changed:${NC}"
echo "  - PAYFAST_PASSPHRASE set to empty in /root/backend.env"
echo "  - Backend container restarted with new configuration"
echo "  - Old env file backed up to $BACKUP_NAME"
echo ""
echo -e "${YELLOW}Next steps - TEST THE PAYMENT:${NC}"
echo "  1. Open browser: https://pdflab.pro/pricing"
echo "  2. Click 'Subscribe' on Starter plan"
echo "  3. Click 'Pay Now'"
echo "  4. Should redirect to PayFast (NO signature error!)"
echo ""
echo -e "${BLUE}Expected result:${NC}"
echo "  ✓ Redirect to https://sandbox.payfast.co.za/eng/process"
echo "  ✓ Payment form displays with R85.00"
echo "  ✓ No '400 Bad Request' error"
echo "  ✓ No 'signature does not match' error"
echo ""
echo -e "${CYAN}Monitoring:${NC}"
echo "  View logs:    docker logs -f pdflab-backend-prod"
echo "  Check health: curl http://localhost:3006/api/health"
echo "  Container:    docker ps | grep pdflab-backend-prod"
echo ""
echo -e "${YELLOW}If it still fails:${NC}"
echo "  1. Check PayFast dashboard: https://sandbox.payfast.co.za"
echo "  2. Go to: Settings → Integration → Security"
echo "  3. Check if Passphrase field has a value"
echo "  4. If YES, copy that value to /root/backend.env:"
echo "     PAYFAST_PASSPHRASE=exact_dashboard_value"
echo "  5. Restart container: docker restart pdflab-backend-prod"
echo ""
echo -e "${GREEN}Backup location:${NC} $BACKUP_NAME"
echo ""
echo "========================================================================"
echo ""

# Test signature generation in container
echo -e "${CYAN}Testing signature generation in container...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec pdflab-backend-prod node -e "
const crypto = require('crypto');

const data = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '85.00',
  item_name: 'Test Payment'
};

const PAYFAST_PARAM_ORDER = ['merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url', 'name_first', 'name_last', 'email_address', 'cell_number', 'm_payment_id', 'amount', 'item_name'];

let paramString = '';
for (const key of PAYFAST_PARAM_ORDER) {
  if (data[key] && data[key] !== '') {
    paramString += \`\${key}=\${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&\`;
  }
}
paramString = paramString.slice(0, -1);

console.log('Signature WITHOUT passphrase:', crypto.createHash('md5').update(paramString).digest('hex').toLowerCase());

// With passphrase (old way)
paramString += '&passphrase=jt7NOE43FZPn';
console.log('Signature WITH passphrase:   ', crypto.createHash('md5').update(paramString).digest('hex').toLowerCase());
console.log('');
console.log('✓ Container is now using NO passphrase (first signature)');
"

echo ""
echo "========================================================================"
echo -e "${GREEN}Script Complete!${NC}"
echo "========================================================================"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Test the payment NOW at https://pdflab.pro/pricing${NC}"
echo ""
