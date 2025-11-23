#!/bin/bash

# Domain Verification Script for pdflab.pro
# This script verifies the domain configuration and SSL setup

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo -e "${BLUE}PDFLab.pro Domain Verification${NC}"
echo "================================================"
echo ""

# Function to check DNS
check_dns() {
    local domain=$1
    local expected_ip="141.136.44.168"

    echo -e "${YELLOW}DNS Check for $domain:${NC}"
    resolved_ip=$(dig +short $domain @8.8.8.8 | tail -n1)

    if [ "$resolved_ip" = "$expected_ip" ]; then
        echo -e "  ${GREEN}✅ Resolves to: $resolved_ip${NC}"
        return 0
    elif [ -z "$resolved_ip" ]; then
        echo -e "  ${RED}❌ No DNS record found${NC}"
        return 1
    else
        echo -e "  ${YELLOW}⚠️  Resolves to: $resolved_ip (expected: $expected_ip)${NC}"
        return 1
    fi
}

# Function to check HTTP/HTTPS
check_url() {
    local url=$1
    local name=$2

    echo -e "${YELLOW}Testing $name:${NC}"
    echo -e "  URL: $url"

    # Get HTTP status code
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 $url 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo -e "  ${GREEN}✅ HTTP $response - OK${NC}"
        return 0
    elif [ "$response" = "301" ] || [ "$response" = "302" ]; then
        echo -e "  ${GREEN}✅ HTTP $response - Redirect (OK)${NC}"
        return 0
    elif [ "$response" = "404" ]; then
        echo -e "  ${YELLOW}⚠️  HTTP $response - Not Found${NC}"
        return 1
    elif [ "$response" = "000" ]; then
        echo -e "  ${RED}❌ Connection failed${NC}"
        return 1
    else
        echo -e "  ${YELLOW}⚠️  HTTP $response${NC}"
        return 1
    fi
}

# Function to check SSL certificate
check_ssl() {
    local domain=$1

    echo -e "${YELLOW}SSL Certificate for $domain:${NC}"

    # Check if certificate exists
    cert_info=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ $? -eq 0 ]; then
        expiry=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
        echo -e "  ${GREEN}✅ Valid SSL certificate${NC}"
        echo -e "  Expires: $expiry"
        return 0
    else
        echo -e "  ${YELLOW}⚠️  No SSL certificate found${NC}"
        return 1
    fi
}

# Function to check nginx
check_nginx() {
    echo -e "${YELLOW}Nginx Status:${NC}"

    if systemctl is-active nginx >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Nginx is running${NC}"

        # Check if pdflab.pro is configured
        if [ -f "/etc/nginx/sites-enabled/pdflab.pro" ]; then
            echo -e "  ${GREEN}✅ pdflab.pro site enabled${NC}"
        else
            echo -e "  ${YELLOW}⚠️  pdflab.pro site not found in nginx${NC}"
        fi
    else
        echo -e "  ${RED}❌ Nginx is not running${NC}"
    fi
}

# Function to check Docker containers
check_docker() {
    echo -e "${YELLOW}Docker Containers:${NC}"

    containers=("pdflab-frontend-prod" "pdflab-backend-prod" "pdflab-mysql-prod" "pdflab-redis-prod")

    for container in "${containers[@]}"; do
        if docker ps | grep -q $container; then
            status=$(docker ps --format "{{.Status}}" --filter "name=$container")
            echo -e "  ${GREEN}✅ $container: $status${NC}"
        else
            echo -e "  ${RED}❌ $container: Not running${NC}"
        fi
    done
}

# Main verification
echo "================================================"
echo -e "${BLUE}1. DNS Configuration${NC}"
echo "================================================"

dns_ok=true
for domain in pdflab.pro www.pdflab.pro api.pdflab.pro; do
    check_dns $domain || dns_ok=false
    echo ""
done

echo "================================================"
echo -e "${BLUE}2. Web Services${NC}"
echo "================================================"

# Check if HTTPS is available
https_available=false
check_url "https://pdflab.pro" "HTTPS Main Site" && https_available=true
echo ""

if [ "$https_available" = true ]; then
    # Test HTTPS endpoints
    check_url "https://www.pdflab.pro" "HTTPS WWW"
    echo ""
    check_url "https://api.pdflab.pro/api/payfast/plans" "HTTPS API"
    echo ""
    check_url "https://pdflab.pro/admin" "HTTPS Admin Panel"
else
    # Test HTTP endpoints
    echo -e "${YELLOW}HTTPS not available, testing HTTP...${NC}"
    echo ""
    check_url "http://pdflab.pro" "HTTP Main Site"
    echo ""
    check_url "http://www.pdflab.pro" "HTTP WWW"
    echo ""
    check_url "http://api.pdflab.pro/api/payfast/plans" "HTTP API"
    echo ""
    check_url "http://pdflab.pro/admin" "HTTP Admin Panel"
fi
echo ""

echo "================================================"
echo -e "${BLUE}3. SSL Certificates${NC}"
echo "================================================"

if [ "$https_available" = true ]; then
    check_ssl "pdflab.pro"
else
    echo -e "${YELLOW}⚠️  HTTPS not configured${NC}"
fi
echo ""

echo "================================================"
echo -e "${BLUE}4. System Services${NC}"
echo "================================================"

check_nginx
echo ""
check_docker
echo ""

echo "================================================"
echo -e "${BLUE}5. API Health Check${NC}"
echo "================================================"

# Determine API URL
if [ "$https_available" = true ]; then
    API_URL="https://api.pdflab.pro"
else
    API_URL="http://api.pdflab.pro"
fi

echo -e "${YELLOW}Testing API endpoints:${NC}"

# Test pricing API
echo -e "\nPricing Plans:"
prices=$(curl -s $API_URL/api/payfast/plans 2>/dev/null | grep -o '"price":[0-9.]*' | head -3)
if [ ! -z "$prices" ]; then
    echo "$prices" | while read line; do
        price=$(echo $line | cut -d':' -f2)
        echo -e "  ${GREEN}✅ Plan price: \$$price${NC}"
    done
else
    echo -e "  ${RED}❌ Could not fetch pricing${NC}"
fi

echo ""

# Summary
echo "================================================"
echo -e "${BLUE}Verification Summary${NC}"
echo "================================================"
echo ""

if [ "$dns_ok" = true ] && [ "$https_available" = true ]; then
    echo -e "${GREEN}✅ FULLY CONFIGURED${NC}"
    echo ""
    echo "Your application is live at:"
    echo -e "  ${GREEN}Main:${NC} https://pdflab.pro"
    echo -e "  ${GREEN}API:${NC} https://api.pdflab.pro"
    echo -e "  ${GREEN}Admin:${NC} https://pdflab.pro/admin"
elif [ "$dns_ok" = true ] && [ "$https_available" = false ]; then
    echo -e "${YELLOW}⚠️  PARTIALLY CONFIGURED${NC}"
    echo ""
    echo "DNS is configured but HTTPS is not enabled."
    echo "Your application is accessible via HTTP:"
    echo -e "  ${YELLOW}Main:${NC} http://pdflab.pro"
    echo -e "  ${YELLOW}API:${NC} http://api.pdflab.pro"
    echo ""
    echo "To enable HTTPS, run:"
    echo "  ./setup-pdflab-domain.sh"
else
    echo -e "${RED}❌ CONFIGURATION INCOMPLETE${NC}"
    echo ""
    echo "DNS is not properly configured."
    echo "Please set up these DNS A records:"
    echo "  pdflab.pro     → 141.136.44.168"
    echo "  www.pdflab.pro → 141.136.44.168"
    echo "  api.pdflab.pro → 141.136.44.168"
    echo ""
    echo "Current access via IP:"
    echo "  http://141.136.44.168:3000"
fi

echo ""
echo "================================================"
echo -e "Verification completed: $(date)"
echo "================================================"