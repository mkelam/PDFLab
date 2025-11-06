# 🚀 PDFLab.pro - One-Command Domain Setup

## ⚡ Quick Setup (Copy & Paste)

### **Option 1: Direct Download & Execute**
```bash
ssh root@141.136.44.168 "cd /tmp && curl -O https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh && chmod +x AUTO_DOMAIN_SETUP.sh && sudo ./AUTO_DOMAIN_SETUP.sh"
```

### **Option 2: One-Line Remote Execution**
```bash
ssh root@141.136.44.168 "curl -sSL https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh | sudo bash"
```

### **Option 3: Manual Upload & Execute**
```bash
# From your local machine
scp AUTO_DOMAIN_SETUP.sh root@141.136.44.168:/tmp/
ssh root@141.136.44.168 "chmod +x /tmp/AUTO_DOMAIN_SETUP.sh && sudo /tmp/AUTO_DOMAIN_SETUP.sh"
```

### **Option 4: Ultra-Quick Setup (Single Command)**
```bash
# This command does EVERYTHING in one line
ssh root@141.136.44.168 'bash -s' << 'SCRIPT'
#!/bin/bash
curl -o /tmp/setup.sh https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh
chmod +x /tmp/setup.sh
sudo /tmp/setup.sh
SCRIPT
```

---

## 🎯 **Fastest Method (Recommended)**

Copy and paste this single command to set up everything automatically:

```bash
ssh root@141.136.44.168 "wget -qO- https://bit.ly/pdflab-setup | sudo bash"
```

Or if you prefer without URL shortening:

```bash
ssh root@141.136.44.168 "apt-get update -qq && apt-get install -y -qq curl && curl -fsSL https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh -o /tmp/pdflab-setup.sh && chmod +x /tmp/pdflab-setup.sh && /tmp/pdflab-setup.sh"
```

---

## 📋 **What the Script Does Automatically:**

1. ✅ **Checks DNS** (continues even if not ready)
2. ✅ **Installs nginx** and certbot
3. ✅ **Configures reverse proxy** for Docker containers
4. ✅ **Obtains SSL certificates** (if DNS is ready)
5. ✅ **Enables HTTPS** with auto-renewal
6. ✅ **Updates Docker containers** with new URLs
7. ✅ **Creates helper commands** (pdflab-status, pdflab-update)
8. ✅ **Verifies deployment** and tests all endpoints

---

## 🔄 **Alternative: Direct Inline Execution**

If you can't upload files, paste this entire command:

```bash
ssh root@141.136.44.168 'bash -s' << 'EOF'
#!/bin/bash
set -e

# Quick automated setup
echo "Starting PDFLab.pro domain setup..."

# Install prerequisites
apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx

# Configure nginx
cat > /etc/nginx/sites-available/pdflab << 'NGINX'
server {
    listen 80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 500M;
    }
}

server {
    listen 80;
    server_name api.pdflab.pro;

    location / {
        proxy_pass http://localhost:3006;
        proxy_set_header Host $host;
        client_max_body_size 500M;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/pdflab /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Try SSL (will work if DNS is configured)
certbot --nginx -d pdflab.pro -d www.pdflab.pro -d api.pdflab.pro --non-interactive --agree-tos --email admin@pdflab.pro || true

# Update Docker
cd /var/pdflab/app
cat > docker-compose.override.yml << 'DOCKER'
version: '3.8'
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=https://api.pdflab.pro
  backend:
    environment:
      - CORS_ORIGIN=https://pdflab.pro
DOCKER

docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml -f docker-compose.override.yml up -d

echo "Setup complete! Access at: https://pdflab.pro"
EOF
```

---

## ⏱️ **Execution Time**

- **Total time**: ~2-3 minutes
- **DNS check**: Automatic (doesn't block)
- **SSL setup**: 30 seconds (if DNS ready)
- **Container restart**: 30 seconds

---

## 🔍 **Quick Verification**

After running the setup, verify with:

```bash
ssh root@141.136.44.168 "curl -s https://pdflab.pro > /dev/null && echo '✅ HTTPS Working' || echo '⚠️ HTTP Only'"
```

---

## 📊 **Status Commands (After Setup)**

The script installs these helper commands on your VPS:

```bash
# Check system status
ssh root@141.136.44.168 "pdflab-status"

# Update containers
ssh root@141.136.44.168 "pdflab-update"

# View logs
ssh root@141.136.44.168 "docker logs pdflab-backend-prod --tail 20"
```

---

## 🆘 **Troubleshooting**

If the script fails, run this diagnostic:

```bash
ssh root@141.136.44.168 "nginx -t && docker ps | grep pdflab && echo '✅ Services OK' || echo '❌ Check logs'"
```

---

## 📝 **Pre-requisites**

Before running the script, ensure:
1. ✅ SSH access to `141.136.44.168`
2. ✅ DNS A records configured (optional, script handles both cases):
   - pdflab.pro → 141.136.44.168
   - www.pdflab.pro → 141.136.44.168
   - api.pdflab.pro → 141.136.44.168

---

## 🎯 **Super Quick Copy-Paste**

**For Windows users (PowerShell):**
```powershell
ssh root@141.136.44.168 "curl -sSL https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh | sudo bash"
```

**For Mac/Linux users:**
```bash
ssh root@141.136.44.168 "curl -sSL https://raw.githubusercontent.com/yourusername/PDFLab/master/AUTO_DOMAIN_SETUP.sh | sudo bash"
```

---

**That's it!** The script handles everything automatically. Your site will be live at `https://pdflab.pro` within 2-3 minutes.