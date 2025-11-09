#!/bin/bash
# ========================================================================
# PayFast Passphrase Quick Fix Script (Linux/Mac/Git Bash)
# ========================================================================
# This script fixes the PayFast signature mismatch by removing the
# passphrase from backend/.env (to match sandbox default)
# ========================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================================================"
echo "  PayFast Passphrase Quick Fix"
echo "========================================================================"
echo ""
echo "This script will:"
echo "  1. Backup your current .env file"
echo "  2. Remove PAYFAST_PASSPHRASE (set to empty)"
echo "  3. Restart the backend server"
echo "  4. Test the signature generation"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

cd "$(dirname "$0")/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${RED}[ERROR] .env file not found in backend folder!${NC}"
    echo "Expected location: $(pwd)/.env"
    echo ""
    exit 1
fi

# Backup current .env
echo ""
echo -e "${BLUE}[1/5] Creating backup...${NC}"
BACKUP_NAME=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_NAME"
echo -e "${GREEN}     ✓ Done! Backup saved to $BACKUP_NAME${NC}"

# Show current passphrase
echo ""
echo -e "${BLUE}[2/5] Current configuration:${NC}"
grep "PAYFAST_PASSPHRASE" .env || echo "PAYFAST_PASSPHRASE not found"
echo ""

# Remove passphrase (set to empty)
echo -e "${BLUE}[3/5] Removing passphrase...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/^PAYFAST_PASSPHRASE=.*/PAYFAST_PASSPHRASE=/' .env
else
    # Linux
    sed -i 's/^PAYFAST_PASSPHRASE=.*/PAYFAST_PASSPHRASE=/' .env
fi
echo -e "${GREEN}     ✓ Done! Passphrase removed.${NC}"

# Show new configuration
echo ""
echo -e "${BLUE}[4/5] New configuration:${NC}"
grep "PAYFAST_PASSPHRASE" .env
echo ""

# Restart backend server
echo -e "${BLUE}[5/5] Restarting backend server...${NC}"

# Find and kill existing Node.js process on port 3006
PID=$(lsof -ti:3006 2>/dev/null || true)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo -e "${GREEN}     ✓ Existing server stopped (PID: $PID)${NC}"
else
    echo -e "${YELLOW}     ⚠ No existing server found${NC}"
fi

echo ""
echo "========================================================================"
echo "  Fix Applied Successfully!"
echo "========================================================================"
echo ""
echo -e "${GREEN}What was changed:${NC}"
echo "  - PAYFAST_PASSPHRASE is now empty (to match sandbox default)"
echo "  - Backend server process killed"
echo "  - Old .env backed up to $BACKUP_NAME"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start backend server manually:"
echo "     cd backend"
echo "     npm run dev"
echo ""
echo "  2. Wait 10 seconds for server to fully start"
echo ""
echo "  3. Open browser: https://pdflab.pro/pricing"
echo "     Click 'Subscribe' on Starter plan"
echo "     Click 'Pay Now'"
echo "     Should redirect to PayFast (NO signature error!)"
echo ""
echo -e "${BLUE}If it still fails:${NC}"
echo "  1. Check PayFast dashboard: https://sandbox.payfast.co.za"
echo "  2. Go to: Settings → Integration → Security"
echo "  3. Check if Passphrase field has a value"
echo "  4. If it does, copy that EXACT value to .env"
echo "  5. Restart backend server"
echo ""
echo -e "${GREEN}Backup location:${NC} $(pwd)/$BACKUP_NAME"
echo ""

# Test signature generation
echo ""
read -p "Press Enter to test signature generation..."

echo ""
echo "========================================================================"
echo "  Testing Signature Generation"
echo "========================================================================"
echo ""

if [ -f "test-passphrase-scenarios.js" ]; then
    node test-passphrase-scenarios.js
else
    echo -e "${YELLOW}[WARNING] test-passphrase-scenarios.js not found${NC}"
    echo "Run manually: cd backend && node test-passphrase-scenarios.js"
fi

echo ""
echo "========================================================================"
echo "  Script Complete!"
echo "========================================================================"
echo ""
echo -e "${GREEN}Remember to start the backend server:${NC}"
echo "  cd backend"
echo "  npm run dev"
echo ""
