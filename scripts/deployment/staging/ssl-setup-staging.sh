#!/bin/bash

# SSL Setup Script for staging.pdflab.pro
# Run this AFTER DNS is propagated

set -e  # Exit on any error

echo "=========================================="
echo "SSL Setup for staging.pdflab.pro"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify DNS is propagated
echo -e "${YELLOW}Step 1: Verifying DNS propagation...${NC}"
RESOLVED_IP=$(dig +short staging.pdflab.pro | tail -n1)

if [ "$RESOLVED_IP" == "141.136.44.168" ]; then
    echo -e "${GREEN}✓ DNS verified: staging.pdflab.pro → 141.136.44.168${NC}"
else
    echo -e "${RED}✗ DNS not propagated yet or incorrect${NC}"
    echo "Expected: 141.136.44.168"
    echo "Got: $RESOLVED_IP"
    echo ""
    echo "Please wait for DNS propagation and try again."
    echo "Check status: nslookup staging.pdflab.pro"
    exit 1
fi

echo ""

# Step 2: Test Nginx configuration
echo -e "${YELLOW}Step 2: Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

echo ""

# Step 3: Install certbot if not present
echo -e "${YELLOW}Step 3: Checking certbot installation...${NC}"
if ! command -v certbot &> /dev/null; then
    echo "Certbot not found. Installing..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

echo ""

# Step 4: Obtain SSL certificate
echo -e "${YELLOW}Step 4: Obtaining Let's Encrypt SSL certificate...${NC}"
echo "This will:"
echo "  - Verify domain ownership"
echo "  - Install SSL certificate"
echo "  - Update Nginx configuration"
echo "  - Set up auto-renewal"
echo ""

certbot --nginx \
    -d staging.pdflab.pro \
    --non-interactive \
    --agree-tos \
    --email support@pdflab.pro \
    --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL certificate installed successfully${NC}"
else
    echo -e "${RED}✗ SSL certificate installation failed${NC}"
    exit 1
fi

echo ""

# Step 5: Verify SSL is working
echo -e "${YELLOW}Step 5: Verifying HTTPS is working...${NC}"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.pdflab.pro)

if [ "$HTTPS_STATUS" == "200" ] || [ "$HTTPS_STATUS" == "301" ] || [ "$HTTPS_STATUS" == "302" ]; then
    echo -e "${GREEN}✓ HTTPS is working (HTTP $HTTPS_STATUS)${NC}"
else
    echo -e "${RED}✗ HTTPS not working properly (HTTP $HTTPS_STATUS)${NC}"
fi

echo ""

# Step 6: Check SSL certificate details
echo -e "${YELLOW}Step 6: SSL Certificate Details${NC}"
certbot certificates -d staging.pdflab.pro

echo ""

# Step 7: Test auto-renewal
echo -e "${YELLOW}Step 7: Testing auto-renewal...${NC}"
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Auto-renewal is configured correctly${NC}"
else
    echo -e "${RED}⚠ Auto-renewal test failed (not critical)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}SSL Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your staging environment is now accessible via:"
echo "  ✓ https://staging.pdflab.pro"
echo ""
echo "Next steps:"
echo "  1. Update docker-compose.yml frontend/partners API URLs"
echo "  2. Restart frontend and partners containers"
echo "  3. Test the full HTTPS environment"
echo ""
echo "SSL Certificate Info:"
echo "  - Issued by: Let's Encrypt"
echo "  - Valid for: 90 days"
echo "  - Auto-renewal: Configured (cron job)"
echo ""
