#!/bin/bash

# Auto-Executing Domain Setup for pdflab.pro
# This script runs completely automatically without user intervention
# Just run: curl -sSL https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh | sudo bash

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
CYAN='\033[0;36m'
NC='\033[0m'

# Logging
LOG_FILE="/var/log/pdflab-domain-setup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "================================================"
echo -e "${CYAN}PDFLab.pro Automatic Domain Setup${NC}"
echo -e "${CYAN}Started: $(date)${NC}"
echo "================================================"
echo ""

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root. Please use sudo."
    exit 1
fi

# Function to check and wait for DNS
wait_for_dns() {
    local domain=$1
    local max_attempts=60  # 30 minutes (30 seconds * 60)
    local attempt=1

    print_status "Checking DNS for $domain..."

    while [ $attempt -le $max_attempts ]; do
        resolved_ip=$(dig +short $domain @8.8.8.8 | tail -n1)

        if [ "$resolved_ip" = "$VPS_IP" ]; then
            print_success "$domain resolves to $VPS_IP"
            return 0
        fi

        if [ $attempt -eq 1 ]; then
            print_warning "DNS not ready yet. Will check every 30 seconds..."
            print_warning "Expected: $domain → $VPS_IP"
            print_warning "Current: $domain → ${resolved_ip:-'No record'}"
        fi

        sleep 30
        attempt=$((attempt + 1))
    done

    return 1
}

# Step 1: Update system and install dependencies
print_status "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

print_status "Installing required packages..."
apt-get install -y -qq nginx certbot python3-certbot-nginx curl dig

# Step 2: Check if Docker containers are running
print_status "Checking Docker containers..."
if ! docker ps | grep -q "pdflab-frontend-prod"; then
    print_warning "Docker containers not running. Starting them..."
    cd /var/pdflab/app
    docker compose -f docker-compose.production.yml up -d
    sleep 10
fi

# Step 3: Check DNS (but continue anyway)
print_status "Checking DNS configuration..."
dns_ready=true

for subdomain in "" "www" "api"; do
    if [ -z "$subdomain" ]; then
        check_domain="$DOMAIN"
    else
        check_domain="$subdomain.$DOMAIN"
    fi

    resolved_ip=$(dig +short $check_domain @8.8.8.8 | tail -n1)
    if [ "$resolved_ip" = "$VPS_IP" ]; then
        print_success "$check_domain → $resolved_ip"
    else
        print_warning "$check_domain → ${resolved_ip:-'Not configured'} (Expected: $VPS_IP)"
        dns_ready=false
    fi
done

# Step 4: Configure nginx (initial HTTP only)
print_status "Configuring nginx..."

# Stop nginx if running
systemctl stop nginx || true

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create initial HTTP configuration
cat > /etc/nginx/sites-available/pdflab << 'NGINX_HTTP'
server {
    listen 80;
    listen [::]:80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    # For Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect to HTTPS (will be uncommented after SSL)
    # location / {
    #     return 301 https://$server_name$request_uri;
    # }

    # Temporary HTTP service
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
NGINX_HTTP

# Create directories
mkdir -p /var/www/certbot
mkdir -p /var/log/nginx

# Enable site
ln -sf /etc/nginx/sites-available/pdflab /etc/nginx/sites-enabled/

# Test and start nginx
nginx -t
systemctl start nginx
systemctl enable nginx

print_success "nginx configured and started"

# Step 5: Attempt SSL certificate (if DNS is ready)
if [ "$dns_ready" = true ]; then
    print_status "Obtaining SSL certificates..."

    certbot certonly --webroot \
        -w /var/www/certbot \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d api.$DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --no-eff-email 2>/dev/null && SSL_SUCCESS=true || SSL_SUCCESS=false

    if [ "$SSL_SUCCESS" = true ]; then
        print_success "SSL certificates obtained"

        # Update nginx with HTTPS configuration
        print_status "Updating nginx for HTTPS..."

        cat > /etc/nginx/sites-available/pdflab << 'NGINX_HTTPS'
# Rate limiting
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

# HTTPS - Main site and www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pdflab.pro www.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

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

# HTTPS - API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

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
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINX_HTTPS

        # Reload nginx
        nginx -t && systemctl reload nginx
        print_success "HTTPS enabled"

        # Setup auto-renewal
        echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal
        print_success "SSL auto-renewal configured"

        PROTOCOL="https"
    else
        print_warning "SSL certificate generation failed. Running on HTTP only."
        PROTOCOL="http"
    fi
else
    print_warning "DNS not configured. Running on HTTP only."
    print_warning "To enable HTTPS later, run: certbot --nginx"
    PROTOCOL="http"
fi

# Step 6: Update Docker containers with correct API URL
print_status "Updating Docker containers..."

cd /var/pdflab/app

# Create override file with new environment
cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=${PROTOCOL}://api.${DOMAIN}

  backend:
    environment:
      - CORS_ORIGIN=${PROTOCOL}://${DOMAIN}
      - API_URL=${PROTOCOL}://api.${DOMAIN}
EOF

# Restart containers
print_status "Restarting Docker containers..."
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d

# Wait for services
print_status "Waiting for services to start..."
sleep 15

# Step 7: Verify deployment
print_status "Verifying deployment..."

# Check Docker containers
for container in frontend backend mysql redis; do
    if docker ps | grep -q "pdflab-${container}-prod"; then
        print_success "Container pdflab-${container}-prod is running"
    else
        print_error "Container pdflab-${container}-prod is not running"
    fi
done

# Test endpoints
print_status "Testing endpoints..."

test_endpoint() {
    local url=$1
    local name=$2
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 $url)
    if [[ "$response" =~ ^(200|301|302)$ ]]; then
        print_success "$name: $url (HTTP $response)"
        return 0
    else
        print_error "$name: $url (HTTP $response)"
        return 1
    fi
}

test_endpoint "${PROTOCOL}://${DOMAIN}" "Main Site"
test_endpoint "${PROTOCOL}://api.${DOMAIN}/api/payfast/plans" "API Endpoint"
test_endpoint "${PROTOCOL}://${DOMAIN}/admin" "Admin Panel"

# Step 8: Create helper scripts
print_status "Creating helper scripts..."

# Create status check script
cat > /usr/local/bin/pdflab-status << 'EOF'
#!/bin/bash
echo "PDFLab Status Check"
echo "=================="
echo ""
echo "Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep pdflab
echo ""
echo "Nginx:"
systemctl status nginx --no-pager | head -5
echo ""
echo "Disk Usage:"
df -h /var/pdflab
echo ""
echo "Recent Logs:"
docker logs pdflab-backend-prod --tail 5 2>&1 | head -5
EOF

chmod +x /usr/local/bin/pdflab-status

# Create update script
cat > /usr/local/bin/pdflab-update << 'EOF'
#!/bin/bash
cd /var/pdflab/app
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d
echo "PDFLab updated successfully"
EOF

chmod +x /usr/local/bin/pdflab-update

print_success "Helper scripts created"

# Final summary
echo ""
echo "================================================"
echo -e "${GREEN}Automatic Setup Complete!${NC}"
echo "================================================"
echo ""

if [ "$PROTOCOL" = "https" ]; then
    echo -e "${GREEN}✅ FULLY CONFIGURED WITH HTTPS${NC}"
    echo ""
    echo "Your application is now live at:"
    echo -e "  ${GREEN}Main Site:${NC} https://${DOMAIN}"
    echo -e "  ${GREEN}API:${NC} https://api.${DOMAIN}"
    echo -e "  ${GREEN}Admin:${NC} https://${DOMAIN}/admin"
else
    echo -e "${YELLOW}⚠️  CONFIGURED WITH HTTP ONLY${NC}"
    echo ""
    echo "Your application is accessible at:"
    echo -e "  ${YELLOW}Main Site:${NC} http://${DOMAIN}"
    echo -e "  ${YELLOW}API:${NC} http://api.${DOMAIN}"
    echo -e "  ${YELLOW}Admin:${NC} http://${DOMAIN}/admin"
    echo ""
    echo "To enable HTTPS after DNS is configured:"
    echo "  certbot --nginx"
fi

echo ""
echo "Helper commands available:"
echo "  pdflab-status  - Check system status"
echo "  pdflab-update  - Update containers"
echo ""
echo "Logs saved to: $LOG_FILE"
echo ""
echo -e "${CYAN}Setup completed at $(date)${NC}"
echo "================================================"

# Create completion marker
touch /var/pdflab/.domain-setup-complete

exit 0