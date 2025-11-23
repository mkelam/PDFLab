# Quick Nginx Setup for Partner Subdomain

## You're already SSH'd into your VPS. Follow these steps:

---

## Step 1: Create the Nginx Configuration

Copy and paste this entire block into your VPS terminal:

```bash
sudo tee /etc/nginx/sites-available/partners.pdflab.pro > /dev/null <<'EOF'
# PDFLab Partner Portal - HTTP (Port 80)
server {
    listen 80;
    listen [::]:80;
    server_name partners.pdflab.pro;

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
```

---

## Step 2: Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/partners.pdflab.pro /etc/nginx/sites-enabled/
```

---

## Step 3: Test Configuration

```bash
sudo nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## Step 5: Configure DNS (Do this on Hostinger website)

1. Go to Hostinger → Domains → pdflab.pro → DNS Management
2. Add A Record:
   - **Type:** A
   - **Name:** partners
   - **Value:** 141.136.44.168
   - **TTL:** 14400 (or Auto)
3. Click "Add Record"

---

## Step 6: Wait for DNS Propagation (5-10 minutes)

Check if DNS is ready:

```bash
nslookup partners.pdflab.pro
```

Should return: `141.136.44.168`

---

## Step 7: Install SSL Certificate

**ONLY run this AFTER DNS has propagated (Step 6 shows correct IP):**

```bash
sudo certbot --nginx -d partners.pdflab.pro
```

Follow prompts:
1. Enter email (if first time)
2. Agree to terms: `Y`
3. Redirect HTTP to HTTPS: `2` (recommended)

---

## Step 8: Verify Everything Works

```bash
# Check Nginx status
sudo systemctl status nginx

# Check if config is active
sudo nginx -t

# View any errors
sudo tail -20 /var/log/nginx/error.log
```

---

## Done!

Your subdomain is now configured:
- **Main App:** https://pdflab.pro → Port 3000
- **Partner Portal:** https://partners.pdflab.pro → Port 3001

Next: Create the partner portal app and start it on port 3001
