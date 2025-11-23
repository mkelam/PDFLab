#!/bin/bash

echo "========================================="
echo "VPS LOGIN VERIFICATION SCRIPT"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VPS_IP="141.136.44.168"

echo "Step 1: Checking VPS frontend environment configuration..."
echo "----------------------------------------"
ssh root@$VPS_IP 'cat /var/pdflab/app/.env.production.local 2>/dev/null || echo "No .env.production.local found"'
echo ""

echo "Step 2: Verifying containers are running..."
echo "----------------------------------------"
ssh root@$VPS_IP 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep pdflab'
echo ""

echo "Step 3: Testing backend health directly..."
echo "----------------------------------------"
curl -s http://$VPS_IP:3006/health | python -m json.tool || echo -e "${RED}Backend health check failed${NC}"
echo ""

echo "Step 4: Testing login endpoint directly..."
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST http://$VPS_IP:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pdflab.test","password":"Admin123!"}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_STATUS:.*//')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Direct API login successful (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY" | python -m json.tool 2>/dev/null | head -5
else
    echo -e "${RED}✗ Direct API login failed (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

echo "Step 5: Testing frontend-to-backend connection..."
echo "----------------------------------------"
echo "Please open your browser and try:"
echo -e "${YELLOW}http://$VPS_IP:3000/login${NC}"
echo ""
echo "Login credentials:"
echo "  Email: admin@pdflab.test"
echo "  Password: Admin123!"
echo ""

echo "Step 6: Checking recent backend logs for login attempts..."
echo "----------------------------------------"
ssh root@$VPS_IP 'docker logs pdflab-backend-prod --tail 20 | grep -E "(POST|GET).*(login|auth)" || echo "No recent login attempts in logs"'
echo ""

echo "========================================="
echo "DIAGNOSIS SUMMARY:"
echo "========================================="

# Check if backend is accessible
if curl -s http://$VPS_IP:3006/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is accessible${NC}"
else
    echo -e "${RED}✗ Backend API is NOT accessible${NC}"
fi

# Check if frontend is accessible
if curl -s http://$VPS_IP:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${RED}✗ Frontend is NOT accessible${NC}"
fi

# Check environment config
ENV_CHECK=$(ssh root@$VPS_IP 'grep -q "141.136.44.168:3006" /var/pdflab/app/.env.production.local 2>/dev/null && echo "OK" || echo "FAIL"')
if [ "$ENV_CHECK" = "OK" ]; then
    echo -e "${GREEN}✓ Frontend configured with correct backend URL${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may be using wrong backend URL${NC}"
    echo "  Run the fix command first:"
    echo '  ssh root@141.136.44.168 '"'"'echo "NEXT_PUBLIC_API_URL=http://141.136.44.168:3006" > /var/pdflab/app/.env.production.local && docker restart pdflab-frontend-prod'"'"
fi

echo ""
echo "========================================="
echo "If login still fails after running fix:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Try incognito/private browsing mode"
echo "3. Check browser console for errors (F12)"
echo "========================================="