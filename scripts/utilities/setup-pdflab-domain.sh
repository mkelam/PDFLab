#!/bin/bash

# PDFLab.pro Domain Setup Script
# This script configures nginx and SSL for pdflab.pro domain
# Run this on your VPS as root or with sudo

set -e

echo "============================================"
echo "PDFLab.pro Domain Configuration Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Installing required packages...${NC}"
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo -e "${GREEN}Step 2: Stopping nginx temporarily...${NC}"
systemctl stop nginx || true

echo -e "${GREEN}Step 3: Creating nginx configuration for pdflab.pro...${NC}"

# Create the nginx configuration
cat > /etc/nginx/sites-available/pdflab.pro << 'EOF'
# Temporary HTTP configuration for Let's Encrypt
server {
    listen 80;
    listen [::]:80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary root
    location / {
        return 200 "PDFLab.pro - SSL Setup in Progress";
        add_header Content-Type text/plain;
    }
}
EOF

# Create certbot directory
mkdir -p /var/www/certbot

# Enable the site
ln -sf /etc/nginx/sites-available/pdflab.pro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}Step 4: Starting nginx for Let's Encrypt verification...${NC}"
nginx -t
systemctl start nginx

echo -e "${GREEN}Step 5: Obtaining SSL certificates from Let's Encrypt...${NC}"
echo -e "${YELLOW}Please make sure DNS is pointing to this server (141.136.44.168)${NC}"
echo ""

# Get SSL certificates
certbot certonly --webroot \
    -w /var/www/certbot \
    -d pdflab.pro \
    -d www.pdflab.pro \
    -d api.pdflab.pro \
    --non-interactive \
    --agree-tos \
    --email admin@pdflab.pro

echo -e "${GREEN}Step 6: Creating full nginx configuration with SSL...${NC}"

# Create the complete nginx configuration with SSL
cat > /etc/nginx/sites-available/pdflab.pro << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# HTTP redirect to HTTPS
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

# Main application - pdflab.pro and www.pdflab.pro
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pdflab.pro www.pdflab.pro;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/pdflab-access.log;
    error_log /var/log/nginx/pdflab-error.log;

    # Max upload size
    client_max_body_size 500M;

    # Proxy to frontend container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# API subdomain - api.pdflab.pro
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.pdflab.pro;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CORS headers
    add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight
    if ($request_method = OPTIONS) {
        return 204;
    }

    # Logging
    access_log /var/log/nginx/api-pdflab-access.log;
    error_log /var/log/nginx/api-pdflab-error.log;

    # Max upload size
    client_max_body_size 500M;

    # Proxy to backend container
    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeouts for file processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
EOF

echo -e "${GREEN}Step 7: Testing nginx configuration...${NC}"
nginx -t

echo -e "${GREEN}Step 8: Reloading nginx with new configuration...${NC}"
systemctl reload nginx

echo -e "${GREEN}Step 9: Setting up automatic SSL renewal...${NC}"
# Create renewal cron job
echo "0 0,12 * * * root certbot renew --quiet --no-self-upgrade --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal

echo -e "${GREEN}Step 10: Updating Docker containers with new URLs...${NC}"
cd /var/pdflab/app

# Update frontend container with new API URL
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d \
    -e NEXT_PUBLIC_API_URL=https://api.pdflab.pro

echo ""
echo "============================================"
echo -e "${GREEN}Domain Setup Complete!${NC}"
echo "============================================"
echo ""
echo "Your application is now accessible at:"
echo -e "${GREEN}✅ Main Site: https://pdflab.pro${NC}"
echo -e "${GREEN}✅ WWW: https://www.pdflab.pro${NC}"
echo -e "${GREEN}✅ API: https://api.pdflab.pro${NC}"
echo -e "${GREEN}✅ Admin Panel: https://pdflab.pro/admin${NC}"
echo ""
echo "SSL certificates have been installed and auto-renewal configured."
echo ""
echo -e "${YELLOW}Please verify DNS settings:${NC}"
echo "  A record: pdflab.pro → 141.136.44.168"
echo "  A record: www.pdflab.pro → 141.136.44.168"
echo "  A record: api.pdflab.pro → 141.136.44.168"
echo ""