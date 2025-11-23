#!/bin/bash

# Complete Domain Deployment Script for pdflab.pro
# This script handles the full deployment with domain configuration
# Run on VPS as root

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo -e "${BLUE}PDFLab.pro Complete Domain Deployment${NC}"
echo "================================================"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Function to check DNS
check_dns() {
    local domain=$1
    local expected_ip="141.136.44.168"

    echo -e "${YELLOW}Checking DNS for $domain...${NC}"

    # Get the resolved IP
    resolved_ip=$(dig +short $domain @8.8.8.8 | tail -n1)

    if [ "$resolved_ip" = "$expected_ip" ]; then
        echo -e "${GREEN}✅ $domain resolves to $expected_ip${NC}"
        return 0
    else
        echo -e "${RED}❌ $domain resolves to: $resolved_ip (expected: $expected_ip)${NC}"
        return 1
    fi
}

# Step 1: Check DNS Configuration
echo -e "${BLUE}Step 1: Checking DNS Configuration...${NC}"
echo ""

dns_ready=true
for domain in pdflab.pro www.pdflab.pro api.pdflab.pro; do
    if ! check_dns $domain; then
        dns_ready=false
    fi
done

if [ "$dns_ready" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  DNS is not fully configured yet.${NC}"
    echo -e "${YELLOW}Please configure these DNS A records:${NC}"
    echo ""
    echo "  pdflab.pro     → 141.136.44.168"
    echo "  www.pdflab.pro → 141.136.44.168"
    echo "  api.pdflab.pro → 141.136.44.168"
    echo ""
    echo -e "${YELLOW}Do you want to continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Exiting. Please configure DNS first."
        exit 1
    fi
fi

# Step 2: Install nginx and certbot
echo ""
echo -e "${BLUE}Step 2: Installing nginx and certbot...${NC}"
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Step 3: Stop current nginx if running
echo ""
echo -e "${BLUE}Step 3: Preparing nginx...${NC}"
systemctl stop nginx || true

# Step 4: Create initial HTTP configuration
echo ""
echo -e "${BLUE}Step 4: Creating initial HTTP configuration...${NC}"

cat > /etc/nginx/sites-available/pdflab.pro << 'NGINX_CONFIG'
# Initial HTTP configuration for Let's Encrypt verification
server {
    listen 80;
    listen [::]:80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary response
    location / {
        return 200 "PDFLab.pro - Setting up SSL...";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Create necessary directories
mkdir -p /var/www/certbot
mkdir -p /var/log/nginx

# Enable site
ln -sf /etc/nginx/sites-available/pdflab.pro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Start nginx
nginx -t
systemctl start nginx

# Step 5: Obtain SSL certificates
echo ""
echo -e "${BLUE}Step 5: Obtaining SSL certificates...${NC}"

# Try to get certificates
certbot certonly --webroot \
    -w /var/www/certbot \
    -d pdflab.pro \
    -d www.pdflab.pro \
    -d api.pdflab.pro \
    --non-interactive \
    --agree-tos \
    --email admin@pdflab.pro \
    || echo -e "${YELLOW}Warning: SSL certificate generation failed. Continuing with HTTP only.${NC}"

# Check if certificates were created
if [ -f "/etc/letsencrypt/live/pdflab.pro/fullchain.pem" ]; then
    SSL_ENABLED=true
    echo -e "${GREEN}✅ SSL certificates obtained successfully${NC}"
else
    SSL_ENABLED=false
    echo -e "${YELLOW}⚠️  SSL certificates not available, configuring HTTP only${NC}"
fi

# Step 6: Create full nginx configuration
echo ""
echo -e "${BLUE}Step 6: Creating complete nginx configuration...${NC}"

if [ "$SSL_ENABLED" = true ]; then
    # Full HTTPS configuration
    cat > /etc/nginx/sites-available/pdflab.pro << 'NGINX_HTTPS'
# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main site - pdflab.pro and www.pdflab.pro
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pdflab.pro www.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API - api.pdflab.pro
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    client_max_body_size 500M;

    if ($request_method = OPTIONS) {
        return 204;
    }

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINX_HTTPS
else
    # HTTP only configuration
    cat > /etc/nginx/sites-available/pdflab.pro << 'NGINX_HTTP'
# HTTP only configuration (SSL not available)
server {
    listen 80;
    listen [::]:80;
    server_name pdflab.pro www.pdflab.pro;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.pdflab.pro;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_HTTP
fi

# Step 7: Test and reload nginx
echo ""
echo -e "${BLUE}Step 7: Testing nginx configuration...${NC}"
nginx -t

echo -e "${BLUE}Reloading nginx...${NC}"
systemctl reload nginx

# Step 8: Update Docker containers with new URLs
echo ""
echo -e "${BLUE}Step 8: Updating Docker containers...${NC}"

cd /var/pdflab/app

# Determine API URL based on SSL status
if [ "$SSL_ENABLED" = true ]; then
    API_URL="https://api.pdflab.pro"
    MAIN_URL="https://pdflab.pro"
else
    API_URL="http://api.pdflab.pro"
    MAIN_URL="http://pdflab.pro"
fi

# Update docker-compose with new API URL
cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=$API_URL

  backend:
    environment:
      - CORS_ORIGIN=$MAIN_URL
EOF

# Restart containers with new configuration
echo -e "${BLUE}Restarting Docker containers...${NC}"
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Step 9: Setup auto-renewal if SSL is enabled
if [ "$SSL_ENABLED" = true ]; then
    echo ""
    echo -e "${BLUE}Step 9: Setting up SSL auto-renewal...${NC}"
    echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal
fi

# Step 10: Verify deployment
echo ""
echo -e "${BLUE}Step 10: Verifying deployment...${NC}"

# Check services
echo -e "${YELLOW}Checking services...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test endpoints
echo ""
echo -e "${YELLOW}Testing endpoints...${NC}"

test_endpoint() {
    local url=$1
    local name=$2

    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        echo -e "${GREEN}✅ $name: $url (HTTP $response)${NC}"
    else
        echo -e "${RED}❌ $name: $url (HTTP $response)${NC}"
    fi
}

if [ "$SSL_ENABLED" = true ]; then
    test_endpoint "https://pdflab.pro" "Main Site"
    test_endpoint "https://api.pdflab.pro/api/payfast/plans" "API"
    test_endpoint "https://pdflab.pro/admin" "Admin Panel"
else
    test_endpoint "http://pdflab.pro" "Main Site"
    test_endpoint "http://api.pdflab.pro/api/payfast/plans" "API"
    test_endpoint "http://pdflab.pro/admin" "Admin Panel"
fi

# Final summary
echo ""
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""

if [ "$SSL_ENABLED" = true ]; then
    echo -e "${GREEN}✅ HTTPS enabled with Let's Encrypt${NC}"
    echo ""
    echo "Your application is now accessible at:"
    echo -e "  ${GREEN}Main Site:${NC} https://pdflab.pro"
    echo -e "  ${GREEN}WWW:${NC} https://www.pdflab.pro"
    echo -e "  ${GREEN}API:${NC} https://api.pdflab.pro"
    echo -e "  ${GREEN}Admin:${NC} https://pdflab.pro/admin"
else
    echo -e "${YELLOW}⚠️  Running on HTTP (SSL not configured)${NC}"
    echo ""
    echo "Your application is accessible at:"
    echo -e "  ${YELLOW}Main Site:${NC} http://pdflab.pro"
    echo -e "  ${YELLOW}WWW:${NC} http://www.pdflab.pro"
    echo -e "  ${YELLOW}API:${NC} http://api.pdflab.pro"
    echo -e "  ${YELLOW}Admin:${NC} http://pdflab.pro/admin"
    echo ""
    echo "To enable HTTPS later, ensure DNS is configured and run:"
    echo "  certbot --nginx -d pdflab.pro -d www.pdflab.pro -d api.pdflab.pro"
fi

echo ""
echo -e "${BLUE}Monitor logs:${NC}"
echo "  nginx: tail -f /var/log/nginx/error.log"
echo "  backend: docker logs -f pdflab-backend-prod"
echo "  frontend: docker logs -f pdflab-frontend-prod"
echo ""