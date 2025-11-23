#!/bin/bash

# Copy and paste this ENTIRE command into your terminal:
# ssh root@141.136.44.168 'bash -s' << 'SETUP_SCRIPT'

set -e

# Configuration
DOMAIN="pdflab.pro"
VPS_IP="141.136.44.168"
EMAIL="admin@pdflab.pro"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo -e "${BLUE}PDFLab.pro Domain Setup${NC}"
echo "================================================"

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Install packages
echo -e "${BLUE}Installing nginx and certbot...${NC}"
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

# Stop nginx
systemctl stop nginx || true

# Create nginx config
echo -e "${BLUE}Configuring nginx...${NC}"
cat > /etc/nginx/sites-available/pdflab << 'NGINX'
server {
    listen 80;
    server_name pdflab.pro www.pdflab.pro;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 500M;
    }
}

server {
    listen 80;
    server_name api.pdflab.pro;

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 500M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINX

# Create directories
mkdir -p /var/www/certbot
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/pdflab /etc/nginx/sites-enabled/

# Start nginx
nginx -t
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# Check DNS
echo -e "${BLUE}Checking DNS...${NC}"
DNS_READY=true
for subdomain in "" "www" "api"; do
    if [ -z "$subdomain" ]; then
        check_domain="$DOMAIN"
    else
        check_domain="$subdomain.$DOMAIN"
    fi

    resolved_ip=$(dig +short $check_domain @8.8.8.8 | tail -n1)
    if [ "$resolved_ip" = "$VPS_IP" ]; then
        echo -e "${GREEN}✅ $check_domain → $resolved_ip${NC}"
    else
        echo -e "${YELLOW}⚠️  $check_domain not configured${NC}"
        DNS_READY=false
    fi
done

# Try SSL if DNS is ready
if [ "$DNS_READY" = true ]; then
    echo -e "${BLUE}Getting SSL certificates...${NC}"
    certbot certonly --webroot \
        -w /var/www/certbot \
        -d pdflab.pro \
        -d www.pdflab.pro \
        -d api.pdflab.pro \
        --non-interactive \
        --agree-tos \
        --email admin@pdflab.pro \
        --no-eff-email && SSL_OK=true || SSL_OK=false

    if [ "$SSL_OK" = true ]; then
        echo -e "${GREEN}✅ SSL certificates obtained${NC}"

        # Update nginx for HTTPS
        cat > /etc/nginx/sites-available/pdflab << 'NGINX_SSL'
# HTTP redirect
server {
    listen 80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Main
server {
    listen 443 ssl http2;
    server_name pdflab.pro www.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 500M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS API
server {
    listen 443 ssl http2;
    server_name api.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 500M;

    add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    if ($request_method = OPTIONS) {
        return 204;
    }

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINX_SSL

        nginx -t && systemctl reload nginx
        PROTOCOL="https"

        # Auto-renewal
        echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal
    else
        echo -e "${YELLOW}⚠️  SSL setup failed, using HTTP${NC}"
        PROTOCOL="http"
    fi
else
    echo -e "${YELLOW}⚠️  DNS not ready, using HTTP${NC}"
    PROTOCOL="http"
fi

# Update Docker
echo -e "${BLUE}Updating Docker containers...${NC}"
cd /var/pdflab/app

cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=${PROTOCOL}://api.pdflab.pro
  backend:
    environment:
      - CORS_ORIGIN=${PROTOCOL}://pdflab.pro
EOF

docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d

echo -e "${GREEN}✅ Docker updated${NC}"

# Wait and test
sleep 10

echo ""
echo "================================================"
if [ "$PROTOCOL" = "https" ]; then
    echo -e "${GREEN}✅ Setup Complete with HTTPS!${NC}"
    echo ""
    echo "Access your site at:"
    echo "  https://pdflab.pro"
    echo "  https://api.pdflab.pro"
    echo "  https://pdflab.pro/admin"
else
    echo -e "${YELLOW}Setup Complete with HTTP${NC}"
    echo ""
    echo "Access your site at:"
    echo "  http://pdflab.pro"
    echo "  http://api.pdflab.pro"
    echo "  http://pdflab.pro/admin"
    echo ""
    echo "To enable HTTPS after DNS is ready:"
    echo "  certbot --nginx"
fi
echo "================================================"

# SETUP_SCRIPT