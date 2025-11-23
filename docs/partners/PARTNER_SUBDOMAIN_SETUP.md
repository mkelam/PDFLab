# Partner Portal Subdomain Setup Guide

Complete guide to setting up `partners.pdflab.pro` subdomain for the PDFLab partner portal.

## Overview

This setup will configure:
- **Main App**: `pdflab.pro` → Port 3000
- **Partner Portal**: `partners.pdflab.pro` → Port 3001
- **Backend API**: Shared on Port 3006

**Total Cost**: $0 (subdomain is free with your existing domain)

---

## Step 1: DNS Configuration (5 minutes)

### Go to Hostinger DNS Management:

1. Log in to [Hostinger](https://www.hostinger.com)
2. Go to **Domains** → Select `pdflab.pro`
3. Click **DNS / Name Servers** → **DNS Zone Editor**

### Add A Record for Partner Subdomain:

```
┌─────────────────────────────────────────┐
│ Type:  A                                │
│ Name:  partners                         │
│ Value: 141.136.44.168                   │
│ TTL:   14400 (or Auto)                  │
└─────────────────────────────────────────┘
```

**Click "Add Record"**

### Verify DNS (after 5-10 minutes):

```bash
nslookup partners.pdflab.pro
# Should return: 141.136.44.168
```

---

## Step 2: Nginx Configuration (10 minutes)

### Option A: Automated Script (Recommended)

1. **Upload script to VPS:**
   ```bash
   # From your local machine
   scp setup-partner-subdomain.sh root@141.136.44.168:/root/
   ```

2. **SSH into VPS:**
   ```bash
   ssh root@141.136.44.168
   ```

3. **Run the script:**
   ```bash
   chmod +x setup-partner-subdomain.sh
   sudo ./setup-partner-subdomain.sh
   ```

The script will:
- ✅ Backup existing Nginx config
- ✅ Create partner portal config
- ✅ Enable the site
- ✅ Test configuration
- ✅ Reload Nginx
- ✅ Display next steps

### Option B: Manual Configuration

If you prefer manual setup or the script doesn't work:

1. **SSH into VPS:**
   ```bash
   ssh root@141.136.44.168
   ```

2. **Create Nginx config file:**
   ```bash
   sudo nano /etc/nginx/sites-available/partners.pdflab.pro
   ```

3. **Paste this configuration:**
   ```nginx
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
   ```

4. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/partners.pdflab.pro /etc/nginx/sites-enabled/
   ```

5. **Test Nginx configuration:**
   ```bash
   sudo nginx -t
   ```

   Should output:
   ```
   nginx: configuration file /etc/nginx/nginx.conf test is successful
   ```

6. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## Step 3: SSL Certificate (5 minutes)

Install Let's Encrypt SSL for the partner subdomain:

```bash
# On VPS
sudo certbot --nginx -d partners.pdflab.pro
```

**Follow prompts:**
1. Enter email address (if first time)
2. Agree to terms
3. Choose: **2** (Redirect HTTP to HTTPS - recommended)

**Certbot will automatically:**
- ✅ Obtain SSL certificate
- ✅ Update Nginx config with HTTPS
- ✅ Configure auto-renewal
- ✅ Reload Nginx

---

## Step 4: Verify Setup

### Check Nginx Status:
```bash
sudo systemctl status nginx
# Should show: active (running)
```

### Check DNS Resolution:
```bash
nslookup partners.pdflab.pro
# Should return: 141.136.44.168
```

### Test HTTP Access:
```bash
curl -I http://partners.pdflab.pro
# Should return: 502 Bad Gateway (expected - app not running yet)
```

### Check Nginx Logs:
```bash
# Error log
sudo tail -f /var/log/nginx/error.log

# Access log
sudo tail -f /var/log/nginx/access.log
```

---

## Step 5: Start Partner Portal App

Once the partner portal app is created (next step), start it on port 3001:

```bash
# On VPS
cd /root/pdflab/partners-portal
PORT=3001 npm run dev

# Or for production:
PORT=3001 npm run build && PORT=3001 npm start
```

---

## Testing Checklist

- [ ] DNS resolves: `nslookup partners.pdflab.pro` → `141.136.44.168`
- [ ] HTTP redirects to HTTPS: `curl -I http://partners.pdflab.pro`
- [ ] HTTPS works: `curl -I https://partners.pdflab.pro`
- [ ] Main app still works: `https://pdflab.pro`
- [ ] Backend API works: `curl http://localhost:3006/health`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Internet                         │
└─────────────────────┬───────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    pdflab.pro              partners.pdflab.pro
         │                         │
         ↓                         ↓
    ┌────────────┐          ┌────────────┐
    │   Nginx    │          │   Nginx    │
    │  Port 80   │          │  Port 80   │
    │  Port 443  │          │  Port 443  │
    └─────┬──────┘          └─────┬──────┘
          │                       │
          ↓                       ↓
    ┌────────────┐          ┌────────────┐
    │  Next.js   │          │  Next.js   │
    │  Port 3000 │          │  Port 3001 │
    │ (Main App) │          │ (Partners) │
    └─────┬──────┘          └─────┬──────┘
          │                       │
          └───────────┬───────────┘
                      ↓
              ┌───────────────┐
              │   Express.js  │
              │   Port 3006   │
              │ (Backend API) │
              └───────────────┘
```

---

## Port Configuration Summary

| Application       | Port | URL                        |
|-------------------|------|----------------------------|
| Main Next.js App  | 3000 | https://pdflab.pro         |
| Partner Portal    | 3001 | https://partners.pdflab.pro|
| Backend API       | 3006 | Internal (localhost only)  |
| MySQL Database    | 3306 | Internal (Docker)          |
| Redis Queue       | 6379 | Internal (Docker)          |

---

## Troubleshooting

### Issue: DNS not resolving

**Solution:**
```bash
# Check DNS propagation
nslookup partners.pdflab.pro

# If not working, wait 10-30 minutes for DNS propagation
# Clear local DNS cache (Windows):
ipconfig /flushdns

# Clear local DNS cache (Mac/Linux):
sudo dscacheutil -flushcache
```

### Issue: 502 Bad Gateway

**Cause:** Partner portal app not running on port 3001

**Solution:**
```bash
# Check if app is running
sudo netstat -tlnp | grep 3001

# If not running, start it
cd /root/pdflab/partners-portal
PORT=3001 npm run dev
```

### Issue: Nginx configuration test fails

**Solution:**
```bash
# Check syntax errors
sudo nginx -t

# View detailed error
sudo tail -f /var/log/nginx/error.log

# Common fixes:
# - Missing semicolon
# - Wrong file path
# - Duplicate server_name
```

### Issue: SSL certificate fails

**Solution:**
```bash
# Ensure DNS is propagated first
nslookup partners.pdflab.pro

# Ensure port 80/443 are open
sudo ufw status

# Retry certbot
sudo certbot --nginx -d partners.pdflab.pro --debug
```

---

## Rollback Procedure

If something goes wrong:

```bash
# 1. Disable partner portal site
sudo rm /etc/nginx/sites-enabled/partners.pdflab.pro

# 2. Remove config file
sudo rm /etc/nginx/sites-available/partners.pdflab.pro

# 3. Restore backup (if exists)
sudo cp /etc/nginx/sites-available/pdflab.pro.backup.* /etc/nginx/sites-available/pdflab.pro

# 4. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Next Steps

After Nginx is configured:

1. **Create Partner Portal App** (see separate guide)
2. **Configure Partner Authentication** (separate JWT strategy)
3. **Update Backend CORS** to allow `partners.pdflab.pro`
4. **Deploy Partner Portal** to VPS
5. **Test End-to-End** (signup → login → dashboard)

---

## Security Notes

- ✅ Partner portal uses separate port (3001)
- ✅ SSL/HTTPS enforced by Certbot
- ✅ Nginx reverse proxy hides internal ports
- ✅ Same firewall rules apply (only 80, 443, 22 open)
- ⚠️ Future: Implement separate auth tokens for partners vs customers

---

## Useful Commands

```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (graceful, no downtime)
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log

# Check SSL certificate expiry
sudo certbot certificates

# Renew SSL certificate (manual)
sudo certbot renew

# List all Nginx sites
ls -la /etc/nginx/sites-enabled/

# Check which process is using port 3001
sudo netstat -tlnp | grep 3001
```

---

## Support

**Documentation:**
- Nginx: https://nginx.org/en/docs/
- Certbot: https://certbot.eff.org/
- Let's Encrypt: https://letsencrypt.org/

**Logs Location:**
- Nginx errors: `/var/log/nginx/error.log`
- Nginx access: `/var/log/nginx/access.log`
- Certbot: `/var/log/letsencrypt/letsencrypt.log`

**Config Files:**
- Main app: `/etc/nginx/sites-available/pdflab.pro`
- Partner portal: `/etc/nginx/sites-available/partners.pdflab.pro`
- Nginx main: `/etc/nginx/nginx.conf`

---

**Last Updated:** 2025-11-14
**Author:** PDFLab DevOps
**Version:** 1.0.0
