# Partner Portal Deployment - Summary & Quick Start

**Created**: 2025-11-14
**Status**: ✅ READY TO DEPLOY (After Phase 1)
**Estimated Time**: 3-4 hours
**Risk Level**: 🟡 LOW-MEDIUM

---

## Quick Start (TL;DR)

```bash
# 1. Run deployment script
chmod +x scripts/deploy-partner-portal.sh
./scripts/deploy-partner-portal.sh

# 2. Configure nginx (manual step)
scp nginx-pdflab-pro-with-partners.conf root@141.136.44.168:/etc/nginx/sites-available/pdflab.pro
ssh root@141.136.44.168 'sudo nginx -t && sudo systemctl reload nginx'

# 3. Get SSL certificate
ssh root@141.136.44.168 'sudo certbot --nginx -d partners.pdflab.pro'

# 4. Test
open https://partners.pdflab.pro
```

---

## What Was Created

### 📦 New Files Created

| File | Purpose | Status |
|------|---------|--------|
| **PARTNER_PORTAL_DEPLOYMENT_PLAN.md** | Comprehensive deployment plan (16-page guide) | ✅ Complete |
| **partners-portal/Dockerfile** | Containerize partner portal for production | ✅ Complete |
| **partners-portal/next.config.js** | Updated with `output: 'standalone'` for Docker | ✅ Updated |
| **nginx-pdflab-pro-with-partners.conf** | Nginx config with partners subdomain | ✅ Complete |
| **scripts/deploy-partner-portal.sh** | Automated deployment script | ✅ Complete |
| **PARTNER_PORTAL_DEPLOYMENT_SUMMARY.md** | This file (quick reference) | ✅ Complete |

### 🔧 Files Modified

| File | Changes | Impact |
|------|---------|--------|
| **docker-compose.production.yml** | Added `partners` service (port 3001) | New container added |
| **partners-portal/next.config.js** | Added `output: 'standalone'` | Required for Docker |

---

## Architecture

### Container Map

```
┌─────────────────────────────────────────────────┐
│            Internet (HTTPS)                     │
└───────────────────┬─────────────────────────────┘
                    │
             ┌──────┴──────┐
             │   Nginx     │ (80/443)
             │ Reverse     │
             │ Proxy       │
             └──────┬──────┘
                    │
      ┌─────────────┼─────────────┬──────────┐
      │             │             │          │
┌─────▼────┐  ┌────▼─────┐  ┌────▼────┐ ┌──▼─────┐
│ Frontend │  │ Partners │  │ Backend │ │ Worker │
│Port 3000 │  │Port 3001 │  │Port 3006│ │   -    │
│pdflab.   │  │partners. │  │  api.   │ │  Jobs  │
│pro       │  │pdflab.pro│  │pdflab.  │ │        │
│          │  │  (NEW)   │  │pro      │ │        │
└──────────┘  └──────────┘  └────┬────┘ └────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                   ┌────▼───┐       ┌────▼───┐
                   │ MySQL  │       │ Redis  │
                   │ 3306   │       │ 6379   │
                   └────────┘       └────────┘
```

### Domain Mapping

| Domain | Port | Container | Purpose |
|--------|------|-----------|---------|
| pdflab.pro | 3000 | pdflab-frontend-prod | Main customer app |
| partners.pdflab.pro | 3001 | pdflab-partners-prod | **NEW** Partner dashboard |
| api.pdflab.pro | 3006 | pdflab-backend-prod | Shared API |
| *(internal)* | N/A | pdflab-worker-prod | Background jobs |
| *(internal)* | 3306 | pdflab-mysql-prod | Database |
| *(internal)* | 6379 | pdflab-redis-prod | Queue/cache |

---

## Deployment Checklist

### Prerequisites

- [ ] Phase 1 deployed successfully
- [ ] Docker Hub account accessible
- [ ] SSH access to VPS (root@141.136.44.168)
- [ ] Hostinger DNS access (for A record)
- [ ] 3-4 hours available for deployment

### Pre-Deployment

- [ ] Review [PARTNER_PORTAL_DEPLOYMENT_PLAN.md](PARTNER_PORTAL_DEPLOYMENT_PLAN.md) (full details)
- [ ] Backup current VPS state (script does this automatically)
- [ ] Notify team/partners (if applicable)
- [ ] Choose low-traffic deployment window

### Deployment Steps

- [ ] **Step 1**: Build Docker image (`docker build -t mkelam/pdflab-partners:latest`)
- [ ] **Step 2**: Push to Docker Hub (`docker push mkelam/pdflab-partners:latest`)
- [ ] **Step 3**: Add DNS A record (Hostinger: `partners` → `141.136.44.168`)
- [ ] **Step 4**: Pull code on VPS (`git pull origin master`)
- [ ] **Step 5**: Start partner container (`docker compose up -d partners`)
- [ ] **Step 6**: Update nginx config (copy `nginx-pdflab-pro-with-partners.conf`)
- [ ] **Step 7**: Obtain SSL cert (`sudo certbot --nginx -d partners.pdflab.pro`)
- [ ] **Step 8**: Test https://partners.pdflab.pro

### Post-Deployment

- [ ] Verify partner portal loads
- [ ] Test partner dashboard with slug
- [ ] Verify API calls work (check browser console)
- [ ] Test main app (regression check)
- [ ] Check all container logs for errors
- [ ] Update documentation with deployment date

---

## Key Configuration Details

### Docker Compose (partners service)

```yaml
partners:
  image: mkelam/pdflab-partners:latest
  container_name: pdflab-partners-prod
  restart: unless-stopped
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
    - NEXT_PUBLIC_API_URL=https://pdflab.pro
    - PORT=3001
  networks:
    - pdflab-network
  depends_on:
    - backend
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 40s
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name partners.pdflab.pro;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;

    # Proxy to partner portal
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        # ... other headers ...
    }
}
```

### DNS Configuration

```
Type: A
Name: partners
Value: 141.136.44.168
TTL: 14400 (4 hours)
```

---

## Testing & Verification

### Automated Tests (in deployment script)

The `deploy-partner-portal.sh` script automatically checks:
- ✅ SSH connectivity
- ✅ Phase 1 deployment status
- ✅ Docker build success
- ✅ Docker push success
- ✅ DNS resolution
- ✅ Container running
- ✅ Port 3001 listening
- ✅ HTTP accessibility
- ✅ Main app still works (regression)

### Manual Tests

After deployment, manually test:

1. **Landing Page**
   ```bash
   curl -I https://partners.pdflab.pro
   # Expected: 200 OK
   ```

2. **Partner Dashboard** (with test slug)
   ```bash
   open https://partners.pdflab.pro/test-slug
   # Should show partner dashboard UI
   ```

3. **API Integration**
   - Open browser console
   - Navigate to partner portal
   - Check for CORS errors (should be none)
   - Verify API calls to backend work

4. **Main App Regression**
   ```bash
   curl -I https://pdflab.pro
   # Expected: 200 OK (unchanged)
   ```

---

## Troubleshooting Quick Reference

### Issue: Container won't start

```bash
# Check logs
ssh root@141.136.44.168 'docker logs pdflab-partners-prod'

# Check if port in use
ssh root@141.136.44.168 'netstat -tlnp | grep 3001'

# Restart container
ssh root@141.136.44.168 'docker restart pdflab-partners-prod'
```

### Issue: 502 Bad Gateway

```bash
# Verify container running
ssh root@141.136.44.168 'docker ps | grep partners'

# Check nginx config
ssh root@141.136.44.168 'sudo nginx -t'

# Check nginx logs
ssh root@141.136.44.168 'sudo tail -f /var/log/nginx/partners-error.log'
```

### Issue: SSL certificate failed

```bash
# Check DNS first
nslookup partners.pdflab.pro

# Retry certbot with debug
ssh root@141.136.44.168 'sudo certbot --nginx -d partners.pdflab.pro --debug'
```

### Issue: CORS errors

```bash
# Verify backend CORS includes partners subdomain
ssh root@141.136.44.168 'docker exec pdflab-backend-prod env | grep CORS'

# Should show: partners.pdflab.pro in CORS_ORIGIN

# Restart backend if needed
ssh root@141.136.44.168 'docker restart pdflab-backend-prod'
```

---

## Rollback Procedure

If deployment fails or causes issues:

```bash
# 1. Stop partner container
ssh root@141.136.44.168 'docker stop pdflab-partners-prod && docker rm pdflab-partners-prod'

# 2. Revert docker-compose
ssh root@141.136.44.168 'cd /var/pdflab/app && git checkout HEAD~1 docker-compose.production.yml'

# 3. Revert nginx config
ssh root@141.136.44.168 'sudo cp /var/pdflab/backups/<timestamp>/nginx-pdflab.pro.backup /etc/nginx/sites-available/pdflab.pro'

# 4. Reload nginx
ssh root@141.136.44.168 'sudo nginx -t && sudo systemctl reload nginx'

# 5. Verify main app works
curl -I https://pdflab.pro
```

---

## Success Criteria

Deployment is successful when:

- ✅ DNS resolves: `nslookup partners.pdflab.pro` → `141.136.44.168`
- ✅ Container healthy: `docker ps | grep partners` shows "(healthy)"
- ✅ HTTPS works: `curl -I https://partners.pdflab.pro` → `200 OK`
- ✅ Partner landing page loads in browser
- ✅ Partner dashboard works with slug
- ✅ API calls successful (no CORS errors)
- ✅ Main app unchanged: `curl https://pdflab.pro` → `200 OK`
- ✅ Zero critical errors in logs

---

## Files Reference

### Documentation

- **Full Deployment Plan**: [PARTNER_PORTAL_DEPLOYMENT_PLAN.md](PARTNER_PORTAL_DEPLOYMENT_PLAN.md) (comprehensive guide)
- **Partner Portal Code**: Already built in `partners-portal/` directory
- **Original Setup Guide**: [PARTNER_SUBDOMAIN_SETUP.md](PARTNER_SUBDOMAIN_SETUP.md)
- **Partner Portal Completion**: [PARTNER_PORTAL_COMPLETE.md](PARTNER_PORTAL_COMPLETE.md)

### Configuration Files

- **Dockerfile**: `partners-portal/Dockerfile` (NEW)
- **Docker Compose**: `docker-compose.production.yml` (UPDATED)
- **Nginx Config**: `nginx-pdflab-pro-with-partners.conf` (NEW)
- **Next.js Config**: `partners-portal/next.config.js` (UPDATED)

### Scripts

- **Deployment Script**: `scripts/deploy-partner-portal.sh` (NEW - automated)
- **Manual Setup Script**: `setup-partner-subdomain.sh` (EXISTING - nginx only)

---

## Timeline Estimate

| Phase | Duration | Can Run Concurrently? |
|-------|----------|-----------------------|
| **Preparation** (build, push image) | 1 hour | No |
| **DNS Setup** (add A record) | 10 min + 30 min propagation | Yes (while waiting) |
| **VPS Deployment** (pull, start container) | 15 min | No |
| **Nginx Config** (update, reload) | 15 min | No |
| **SSL Certificate** (certbot) | 5 min | No |
| **Verification & Testing** | 30 min | No |
| **Documentation** | 15 min | Yes |

**Total Active Work**: ~2.5 hours
**Total Elapsed Time**: ~3-4 hours (including DNS propagation)

---

## Important Notes

### Backend CORS

✅ **Already Configured** in Phase 1 fixes:
```env
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro,https://api.pdflab.pro,https://partners.pdflab.pro
```

No backend changes needed for partner portal deployment!

### Partner Portal Features

The partner portal includes:
- 🎨 Professional landing page with benefits grid
- 📊 Commission tiers (Bronze/Silver/Gold/Platinum)
- 💰 Earning potential calculator
- 📈 Partner dashboard (at `/[slug]`)
- 🎯 Call-to-action for applications

### Future Enhancements (Not in This Deployment)

The current deployment includes the **frontend UI only**. Future enhancements will add:
- Backend partner API integration
- Real conversion tracking
- Commission calculations
- Payout management
- Partner application system

---

## Support & Resources

### Documentation Links

- **Comprehensive Plan**: [PARTNER_PORTAL_DEPLOYMENT_PLAN.md](PARTNER_PORTAL_DEPLOYMENT_PLAN.md)
- **VPS Audit Report**: [VPS_LOCAL_IMPLEMENTATION_AUDIT.md](VPS_LOCAL_IMPLEMENTATION_AUDIT.md)
- **Phase 1 Report**: [PHASE_1_FIXES_IMPLEMENTATION_REPORT.md](PHASE_1_FIXES_IMPLEMENTATION_REPORT.md)

### Useful Commands

```bash
# View partner portal logs
ssh root@141.136.44.168 'docker logs -f pdflab-partners-prod'

# Check all containers
ssh root@141.136.44.168 'docker ps'

# Check nginx logs
ssh root@141.136.44.168 'sudo tail -f /var/log/nginx/partners-error.log'

# Check SSL certificate
ssh root@141.136.44.168 'sudo certbot certificates'

# Restart partner portal
ssh root@141.136.44.168 'docker restart pdflab-partners-prod'
```

### Contact

- **VPS**: 141.136.44.168
- **Domain**: partners.pdflab.pro
- **Port**: 3001
- **Container**: pdflab-partners-prod

---

## Next Steps After Deployment

### Immediate (Same Day)

1. Test end-to-end functionality
2. Monitor logs for first few hours
3. Update main documentation with deployment date
4. Notify partners (if any exist) of new URL

### Short-term (Week 1)

1. Set up monitoring/uptime checks for partners subdomain
2. Add partner portal to sitemap
3. Test on various devices and browsers
4. Collect feedback from initial users

### Medium-term (Month 1)

1. Implement backend partner analytics
2. Create partner application workflow
3. Set up automated partner onboarding
4. Add partner resources section

---

## Deployment Decision

### Deploy Partner Portal?

**YES** - If you want:
- ✅ Separate professional subdomain for partners
- ✅ Better branding and partner experience
- ✅ Independent scaling from main app
- ✅ Easier maintenance and updates

**WAIT** - If:
- ⏳ Phase 1 not yet deployed to VPS
- ⏳ No partners/affiliates to use it yet
- ⏳ Want to focus on Phase 2 security first

**Recommendation**: Deploy after Phase 1 is stable (1-2 weeks), before Phase 2.

---

**Document Version**: 1.0
**Created**: 2025-11-14
**Last Updated**: 2025-11-14
**Status**: ✅ READY FOR DEPLOYMENT
**Priority**: MEDIUM (After Phase 1)
