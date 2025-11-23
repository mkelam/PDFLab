#!/bin/bash

###############################################################################
# PDFLab Partner Portal Subdomain Setup Script
# This script configures Nginx to serve partners.pdflab.pro on port 3001
###############################################################################

set -e  # Exit on any error

echo "=========================================="
echo "PDFLab Partner Portal Subdomain Setup"
echo "=========================================="
echo ""

# Configuration variables
DOMAIN="pdflab.pro"
SUBDOMAIN="partners.pdflab.pro"
MAIN_PORT="3000"
PARTNER_PORT="3001"
BACKEND_PORT="3006"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "📋 Configuration:"
echo "   Main App: $DOMAIN → Port $MAIN_PORT"
echo "   Partner Portal: $SUBDOMAIN → Port $PARTNER_PORT"
echo "   Backend API: Port $BACKEND_PORT"
echo ""

# Step 1: Backup existing Nginx config
echo "📦 Step 1: Backing up existing Nginx configuration..."
if [ -f "$NGINX_AVAILABLE/$DOMAIN" ]; then
    cp "$NGINX_AVAILABLE/$DOMAIN" "$NGINX_AVAILABLE/$DOMAIN.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✅ Backup created"
else
    echo "   ⚠️  No existing config found at $NGINX_AVAILABLE/$DOMAIN"
fi
echo ""

# Step 2: Create partner portal Nginx config
echo "🔧 Step 2: Creating partner portal Nginx configuration..."

cat > "$NGINX_AVAILABLE/$SUBDOMAIN" <<'EOF'
# PDFLab Partner Portal - HTTP (Port 80)
server {
    listen 80;
    listen [::]:80;
    server_name partners.pdflab.pro;

    # Redirect HTTP to HTTPS (will be configured by Certbot)
    # This line will be added automatically by Certbot

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support for Next.js hot reload
        proxy_read_timeout 86400;
    }

    # Increase client body size for file uploads
    client_max_body_size 500M;
}
EOF

echo "   ✅ Configuration file created at $NGINX_AVAILABLE/$SUBDOMAIN"
echo ""

# Step 3: Enable the site
echo "🔗 Step 3: Enabling partner portal site..."
if [ -f "$NGINX_ENABLED/$SUBDOMAIN" ]; then
    echo "   ⚠️  Site already enabled"
else
    ln -s "$NGINX_AVAILABLE/$SUBDOMAIN" "$NGINX_ENABLED/$SUBDOMAIN"
    echo "   ✅ Site enabled"
fi
echo ""

# Step 4: Test Nginx configuration
echo "🧪 Step 4: Testing Nginx configuration..."
if nginx -t; then
    echo "   ✅ Nginx configuration is valid"
else
    echo "   ❌ Nginx configuration test failed!"
    echo "   Rolling back changes..."
    rm -f "$NGINX_ENABLED/$SUBDOMAIN"
    rm -f "$NGINX_AVAILABLE/$SUBDOMAIN"
    echo "   Rollback complete. Please check your configuration."
    exit 1
fi
echo ""

# Step 5: Reload Nginx
echo "🔄 Step 5: Reloading Nginx..."
systemctl reload nginx
echo "   ✅ Nginx reloaded successfully"
echo ""

# Step 6: Display DNS instructions
echo "=========================================="
echo "✅ Nginx Configuration Complete!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Configure DNS (Go to Hostinger DNS settings):"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Type:  A"
echo "   Name:  partners"
echo "   Value: $(curl -s ifconfig.me 2>/dev/null || echo '141.136.44.168')"
echo "   TTL:   14400 (or Auto)"
echo ""
echo "2️⃣  Install SSL Certificate (run on VPS):"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   sudo certbot --nginx -d partners.pdflab.pro"
echo ""
echo "3️⃣  Start Partner Portal App (run in project directory):"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   cd partners-portal"
echo "   PORT=3001 npm run dev"
echo ""
echo "4️⃣  Verify Setup:"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Main App:      http://pdflab.pro"
echo "   Partner Portal: http://partners.pdflab.pro"
echo ""
echo "📝 Configuration files:"
echo "   Main config:    $NGINX_AVAILABLE/$DOMAIN"
echo "   Partner config: $NGINX_AVAILABLE/$SUBDOMAIN"
echo "   Backup:         $NGINX_AVAILABLE/$DOMAIN.backup.*"
echo ""
echo "🔍 Troubleshooting:"
echo "   View Nginx logs:     sudo tail -f /var/log/nginx/error.log"
echo "   Test configuration:  sudo nginx -t"
echo "   Reload Nginx:        sudo systemctl reload nginx"
echo "   Check DNS:           nslookup partners.pdflab.pro"
echo ""
echo "=========================================="
