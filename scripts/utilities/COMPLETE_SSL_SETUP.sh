#!/bin/bash

# Complete SSL Setup Script
# Run this to expand the certificate to include api.pdflab.pro

echo "================================================"
echo "Completing SSL Setup for api.pdflab.pro"
echo "================================================"

# Expand the certificate to include api subdomain
certbot --nginx \
    -d pdflab.pro \
    -d www.pdflab.pro \
    -d api.pdflab.pro \
    --expand \
    --non-interactive \
    --agree-tos \
    --email admin@pdflab.pro

# Update nginx configuration for full HTTPS
cat > /etc/nginx/sites-available/pdflab << 'NGINX_FULL'
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

# HTTPS - Main site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pdflab.pro www.pdflab.pro;

    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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

    client_max_body_size 500M;

    add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

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
        proxy_buffering off;
    }
}
NGINX_FULL

# Reload nginx
nginx -t && systemctl reload nginx

echo "✅ SSL certificate expanded to include api.pdflab.pro"
echo "✅ Nginx configuration updated"
echo ""
echo "Testing endpoints..."
curl -s -o /dev/null -w "Main site: %{http_code}\n" https://pdflab.pro
curl -s -o /dev/null -w "API endpoint: %{http_code}\n" https://api.pdflab.pro/api/payfast/plans
echo ""
echo "Setup complete! Your site is now fully configured with HTTPS."