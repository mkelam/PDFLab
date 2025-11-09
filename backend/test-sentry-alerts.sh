#!/bin/bash

# Sentry Alert Testing Script for PDFLab
# This script tests all Sentry alerts to verify they're working correctly

echo ""
echo "========================================"
echo "PDFLab Sentry Alert Testing"
echo "========================================"
echo ""

# Configuration
API_URL="http://localhost:3006"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "[1/10] Checking if backend is running..."
if ! curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${RED}ERROR: Backend not responding at ${API_URL}${NC}"
    echo "Please start the backend with: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Check Sentry status
echo "[2/10] Checking Sentry configuration..."
curl -s "${API_URL}/api/test/sentry-status" | jq '.' || echo "Install jq for formatted output: brew install jq"
echo ""
echo ""

# Test 1: Basic Error
echo "[3/10] Testing basic error capture..."
echo -e "${YELLOW}Expected: Error should appear in Sentry dashboard within 30 seconds${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-error" | jq '.'
echo ""
sleep 2

# Test 2: Error Rate Spike
echo "[4/10] Testing error rate spike alert (>10 errors in 1 minute)..."
echo -e "${YELLOW}Expected: Alert should fire in Slack #alerts-critical${NC}"
for i in {1..15}; do
    curl -s -X POST "${API_URL}/api/test/sentry-error" > /dev/null
    echo "Sent error $i/15"
done
echo ""
echo -e "${GREEN}✓ Sent 15 errors - Alert should fire if threshold is 10/minute${NC}"
echo ""
sleep 2

# Test 3: Database Connection Error
echo "[5/10] Testing database connection error..."
echo -e "${YELLOW}Expected: CRITICAL alert in Slack #alerts-critical${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-db-error" | jq '.'
echo ""
sleep 2

# Test 4: Redis Queue Error
echo "[6/10] Testing Redis queue errors (need 6 to trigger alert)..."
echo -e "${YELLOW}Expected: Alert fires when >5 errors in 1 minute${NC}"
for i in {1..6}; do
    curl -s -X POST "${API_URL}/api/test/sentry-redis-error" > /dev/null
    echo "Sent queue error $i/6"
done
echo ""
echo -e "${GREEN}✓ Sent 6 queue errors - Alert should fire${NC}"
echo ""
sleep 2

# Test 5: CloudConvert API Error
echo "[7/10] Testing CloudConvert API error..."
echo -e "${YELLOW}Expected: Alert in Slack #alerts-critical${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-cloudconvert-error" | jq '.'
echo ""
sleep 2

# Test 6: PayFast Webhook Error
echo "[8/10] Testing PayFast webhook error (REVENUE CRITICAL)..."
echo -e "${YELLOW}Expected: CRITICAL alert in #alerts-payments + email to finance${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-payfast-error" | jq '.'
echo ""
sleep 2

# Test 7: Batch Processing Error
echo "[9/10] Testing batch processing error..."
echo -e "${YELLOW}Expected: Alert in Slack${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-batch-error" | jq '.'
echo ""
sleep 2

# Test 8: Slow Performance
echo "[10/10] Testing slow performance (3 second delay)..."
echo -e "${YELLOW}Expected: Performance alert if P95 threshold exceeded${NC}"
echo -e "${YELLOW}Note: May require multiple requests to trigger P95 alert${NC}"
curl -s -X POST "${API_URL}/api/test/sentry-slow-performance" | jq '.'
echo ""

echo ""
echo "========================================"
echo "Testing Complete!"
echo "========================================"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Check Sentry Dashboard: https://pdf-lab-pro.sentry.io/issues/"
echo "2. Verify alerts in Slack channels:"
echo "   - #alerts-critical (general errors)"
echo "   - #alerts-payments (PayFast error)"
echo "   - #alerts-performance (slow requests)"
echo "3. Check email inbox for alert notifications"
echo "4. Review alert history in Sentry"
echo ""
echo -e "${YELLOW}Alert Verification Checklist:${NC}"
echo "[ ] Error Rate Spike alert fired (15 errors sent)"
echo "[ ] Database Connection alert fired"
echo "[ ] Redis Queue alert fired (6 errors sent)"
echo "[ ] CloudConvert API alert fired"
echo "[ ] PayFast Webhook alert fired (revenue-critical)"
echo "[ ] Slack notifications received"
echo "[ ] Email notifications received"
echo ""
echo -e "${YELLOW}If any alerts did not fire, check:${NC}"
echo "1. Alert rules are enabled in Sentry"
echo "2. Thresholds are configured correctly"
echo "3. Slack integration is connected"
echo "4. Email recipients are configured"
echo ""
