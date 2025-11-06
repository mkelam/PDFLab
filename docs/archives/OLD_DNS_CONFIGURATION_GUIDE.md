# 🌐 DNS Configuration Guide for pdflab.pro

## 📋 Required DNS Records

You need to configure the following DNS records with your domain registrar or DNS provider:

### A Records (IPv4)

| Type | Name | Value | TTL | Priority |
|------|------|-------|-----|----------|
| A | @ | 141.136.44.168 | 3600 | - |
| A | www | 141.136.44.168 | 3600 | - |
| A | api | 141.136.44.168 | 3600 | - |

### Alternative CNAME Setup (if preferred)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 141.136.44.168 | 3600 |
| CNAME | www | pdflab.pro | 3600 |
| CNAME | api | pdflab.pro | 3600 |

---

## 🔧 Configuration Steps by Provider

### **Namecheap**
1. Login to Namecheap Dashboard
2. Go to Domain List → Manage → Advanced DNS
3. Add the A records as shown above
4. Save changes (propagation: 5-30 minutes)

### **GoDaddy**
1. Login to GoDaddy Account
2. Go to My Products → DNS → Manage Zones
3. Add the A records for @, www, and api
4. Save (propagation: 5-60 minutes)

### **Cloudflare**
1. Login to Cloudflare Dashboard
2. Select pdflab.pro domain
3. Go to DNS → Records
4. Add A records (set Proxy Status: DNS only initially)
5. Save (propagation: 1-5 minutes)

### **Hostinger**
1. Login to Hostinger Panel
2. Go to Domains → pdflab.pro → DNS Zone
3. Add A records for each subdomain
4. Apply changes (propagation: 5-30 minutes)

---

## ✅ DNS Verification Commands

After configuring DNS, verify the records are working:

### Windows (Command Prompt)
```cmd
nslookup pdflab.pro
nslookup www.pdflab.pro
nslookup api.pdflab.pro
```

### Linux/Mac (Terminal)
```bash
dig pdflab.pro
dig www.pdflab.pro
dig api.pdflab.pro
```

### Online Tools
- https://dnschecker.org/#A/pdflab.pro
- https://whatsmydns.net/#A/pdflab.pro
- https://mxtoolbox.com/DNSLookup.aspx

---

## ⏱️ DNS Propagation Times

| Provider | Typical Time | Maximum |
|----------|-------------|---------|
| Cloudflare | 1-5 minutes | 1 hour |
| Namecheap | 5-30 minutes | 48 hours |
| GoDaddy | 5-60 minutes | 48 hours |
| Hostinger | 5-30 minutes | 24 hours |
| Generic | 15-60 minutes | 72 hours |

---

## 🚀 Quick Setup Checklist

- [ ] **Step 1**: Log into your domain registrar
- [ ] **Step 2**: Navigate to DNS management
- [ ] **Step 3**: Add A record for @ → 141.136.44.168
- [ ] **Step 4**: Add A record for www → 141.136.44.168
- [ ] **Step 5**: Add A record for api → 141.136.44.168
- [ ] **Step 6**: Save/Apply changes
- [ ] **Step 7**: Wait for propagation (5-60 minutes typical)
- [ ] **Step 8**: Verify with nslookup/dig commands
- [ ] **Step 9**: Run domain setup script on VPS

---

## 📊 Current DNS Status Check

Run this command to check current DNS status:

```bash
# Check all subdomains at once
for domain in pdflab.pro www.pdflab.pro api.pdflab.pro; do
    echo "Checking $domain..."
    nslookup $domain 8.8.8.8 | grep -A1 "Name:"
    echo "---"
done
```

Expected output when configured correctly:
```
Checking pdflab.pro...
Name:    pdflab.pro
Address: 141.136.44.168
---
Checking www.pdflab.pro...
Name:    www.pdflab.pro
Address: 141.136.44.168
---
Checking api.pdflab.pro...
Name:    api.pdflab.pro
Address: 141.136.44.168
---
```

---

## 🔐 After DNS Configuration

Once DNS is configured and propagated:

1. **SSH to your VPS**:
   ```bash
   ssh root@141.136.44.168
   ```

2. **Run the domain setup script**:
   ```bash
   cd /var/pdflab/app
   chmod +x setup-pdflab-domain.sh
   ./setup-pdflab-domain.sh
   ```

3. **Verify HTTPS is working**:
   - https://pdflab.pro ✅
   - https://www.pdflab.pro ✅
   - https://api.pdflab.pro ✅
   - https://pdflab.pro/admin ✅

---

## ⚠️ Important Notes

### SSL Certificate
- The setup script will automatically obtain Let's Encrypt SSL certificates
- Certificates are free and auto-renew every 90 days
- Requires DNS to be properly configured before running

### Frontend Environment Update
After domain setup, the frontend needs to know the new API URL:
- Current: `http://141.136.44.168:3006`
- New: `https://api.pdflab.pro`

This is handled automatically by the setup script.

### CORS Configuration
The backend is already configured to accept requests from:
- http://localhost:3000 (development)
- https://pdflab.pro (production)

---

## 🆘 Troubleshooting

### DNS Not Resolving
- Wait up to 48 hours for full propagation
- Clear local DNS cache:
  - Windows: `ipconfig /flushdns`
  - Mac: `sudo dscacheutil -flushcache`
  - Linux: `sudo systemctl restart systemd-resolved`

### SSL Certificate Fails
- Ensure DNS is fully propagated first
- Check firewall allows port 80 for verification
- Manually test: `certbot certonly --webroot -w /var/www/certbot -d pdflab.pro`

### Site Not Loading
- Check nginx status: `systemctl status nginx`
- Check Docker containers: `docker ps`
- Review nginx logs: `tail -f /var/log/nginx/error.log`

---

## 📝 Configuration Summary

| Component | Current | After DNS Setup |
|-----------|---------|----------------|
| Main URL | http://141.136.44.168:3000 | https://pdflab.pro |
| API URL | http://141.136.44.168:3006 | https://api.pdflab.pro |
| Admin URL | http://141.136.44.168:3000/admin | https://pdflab.pro/admin |
| SSL | ❌ None | ✅ Let's Encrypt |
| Ports Exposed | 3000, 3006 | 443 (HTTPS only) |

---

**Document Created**: 2025-11-05
**VPS IP**: 141.136.44.168
**Domain**: pdflab.pro