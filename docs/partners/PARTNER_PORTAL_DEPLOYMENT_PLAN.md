# Partner Portal Deployment Plan (Phase 1.5)

**Date**: 2025-11-14
**Deployment Type**: New Subdomain + Container
**Priority**: MEDIUM (After Phase 1 Core Fixes)
**Estimated Time**: 3-4 hours
**Risk Level**: 🟡 LOW-MEDIUM

---

## Executive Summary

This plan outlines the deployment of the PDFLab Partner Portal as a separate Next.js application running on `partners.pdflab.pro`. The partner portal is already built and tested locally but not yet deployed to the VPS.

### Deployment Strategy

**Approach**: Containerized deployment using Docker Compose alongside existing services.

**Timeline**:
- **Phase 1 (Core Fixes)**: ✅ COMPLETE (Main app, backend, database fixes)
- **Phase 1.5 (Partner Portal)**: ⏳ THIS PLAN (Add partner subdomain)
- **Phase 2 (Security)**: ⏳ NEXT (Redis password, Sentry, rate limiting)

---

## Current State Analysis

### What Exists

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Partner Portal Code** | ✅ Built | `partners-portal/` | Complete Next.js 14 app |
| **Partner Landing Page** | ✅ Complete | `/app/page.tsx` | Hero, benefits, tiers |
| **Partner Dashboard** | ✅ Complete | `/app/[slug]/page.tsx` | Analytics, earnings, referrals |
| **UI Components** | ✅ Ready | `/components/ui/` | Shadcn components |
| **Backend API Routes** | ✅ Deployed | `/api/partners/*` | Already on VPS |
| **Backend CORS** | ✅ Configured | `backend/.env.production` | Allows `partners.pdflab.pro` |
| **Setup Documentation** | ✅ Written | Various .md files | Comprehensive guides |

### What's Missing on VPS

| Component | Status | Required | Priority |
|-----------|--------|----------|----------|
| **Docker Image** | ❌ Not built | Dockerfile for partner portal | 🔴 CRITICAL |
| **Docker Compose Config** | ❌ Not added | Add to production compose | 🔴 CRITICAL |
| **Nginx Configuration** | ❌ Not configured | Reverse proxy for port 3001 | 🔴 CRITICAL |
| **SSL Certificate** | ❌ Not obtained | Let's Encrypt for subdomain | 🟠 HIGH |
| **DNS A Record** | ❓ Unknown | `partners.pdflab.pro` → `141.136.44.168` | 🟠 HIGH |
| **Environment Variables** | ❌ Not set | `.env.production` for partner portal | 🟡 MEDIUM |

---

## Architecture Overview

### Before Partner Portal Deployment

```
┌─────────────────────────────────────────┐
│          Internet (HTTPS)               │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │    Nginx    │ (Port 80/443)
        │ Reverse     │
        │ Proxy       │
        └──────┬──────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐      ┌─────▼────┐
│ Frontend │      │ Backend  │
│ Port 3000│      │ Port 3006│
│(pdflab.pro)     │(api.pdflab.pro)
└──────────┘      └─────┬────┘
                        │
               ┌────────┴────────┐
               │                 │
          ┌────▼───┐       ┌────▼───┐
          │ MySQL  │       │ Redis  │
          │ (Docker)│       │ (Docker)│
          └────────┘       └────────┘
```

### After Partner Portal Deployment

```
┌─────────────────────────────────────────────┐
│          Internet (HTTPS)                   │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴──────┐
        │    Nginx    │ (Port 80/443)
        │ Reverse     │
        │ Proxy       │
        └──────┬──────┘
               │
     ┌─────────┼─────────┬──────────┐
     │         │         │          │
┌────▼─────┐ ┌▼─────────▼┐   ┌─────▼────┐
│ Frontend │ │Partner    │   │ Backend  │
│ Port 3000│ │Portal     │   │ Port 3006│
│(pdflab.  │ │Port 3001  │   │(api.     │
│ pro)     │ │(partners. │   │ pdflab.  │
│          │ │ pdflab.pro)│   │ pro)     │
└──────────┘ └───────────┘   └─────┬────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                     ┌────▼───┐       ┌────▼───┐
                     │ MySQL  │       │ Redis  │
                     │(Docker)│       │(Docker)│
                     └────────┘       └────────┘
```

### Container Architecture

| Container | Port | Domain | Purpose |
|-----------|------|--------|---------|
| `pdflab-frontend-prod` | 3000 | pdflab.pro | Main customer app |
| `pdflab-partners-prod` | 3001 | partners.pdflab.pro | **NEW** Partner portal |
| `pdflab-backend-prod` | 3006 | Internal | Shared API server |
| `pdflab-worker-prod` | N/A | Internal | Background jobs |
| `pdflab-mysql-prod` | 3306 | Internal | Database |
| `pdflab-redis-prod` | 6379 | Internal | Queue/cache |

---

## Deployment Steps

### Prerequisites

- ✅ Phase 1 deployment completed successfully
- ✅ VPS accessible via SSH
- ✅ Docker and Docker Compose installed
- ✅ Nginx installed and running
- ✅ Domain DNS managed (Hostinger)

### Step 1: Create Partner Portal Dockerfile

**File**: `partners-portal/Dockerfile`

**Purpose**: Containerize the partner portal for production deployment.

**Dependencies**: None (standalone Next.js app)

**Estimated Time**: 15 minutes

### Step 2: Update Docker Compose Production

**File**: `docker-compose.production.yml`

**Changes**:
- Add `partners` service
- Configure port 3001
- Share storage volumes
- Set environment variables

**Estimated Time**: 15 minutes

### Step 3: Create Partner Portal Production Environment

**File**: `partners-portal/.env.production`

**Variables**:
- `NEXT_PUBLIC_API_URL=https://pdflab.pro/api` or `https://api.pdflab.pro`
- Any partner-specific configuration

**Estimated Time**: 10 minutes

### Step 4: Configure DNS A Record

**Platform**: Hostinger DNS Management

**Configuration**:
```
Type: A
Name: partners
Value: 141.136.44.168
TTL: 14400 (4 hours)
```

**Verification**:
```bash
nslookup partners.pdflab.pro
# Should return: 141.136.44.168
```

**Estimated Time**: 10 minutes (+ 10-30 min propagation)

### Step 5: Update Nginx Configuration

**File**: `/etc/nginx/sites-available/pdflab.pro` (or create new file)

**Changes**:
- Add server block for `partners.pdflab.pro`
- Proxy to `localhost:3001`
- HTTP → HTTPS redirect
- SSL configuration (after certbot)

**Estimated Time**: 15 minutes

### Step 6: Obtain SSL Certificate

**Tool**: Certbot (Let's Encrypt)

**Command**:
```bash
sudo certbot --nginx -d partners.pdflab.pro
```

**Result**: HTTPS enabled with auto-renewal

**Estimated Time**: 5 minutes

### Step 7: Build and Push Docker Images

**Commands**:
```bash
# Build partner portal image
cd partners-portal
docker build -t mkelam/pdflab-partners:latest -f Dockerfile .

# Push to Docker Hub
docker push mkelam/pdflab-partners:latest
```

**Estimated Time**: 30 minutes (build + push)

### Step 8: Deploy to VPS

**Commands**:
```bash
# SSH to VPS
ssh root@141.136.44.168

# Navigate to app directory
cd /var/pdflab/app

# Pull latest code (includes partner portal config)
git pull origin master

# Pull Docker images
docker compose -f docker-compose.production.yml pull

# Start all services (including new partner portal)
docker compose -f docker-compose.production.yml up -d

# Verify all containers running
docker ps
```

**Estimated Time**: 20 minutes

### Step 9: Verification & Testing

**Tests**:
1. DNS resolution
2. HTTP redirects to HTTPS
3. HTTPS loads partner landing page
4. Partner dashboard works (test with slug)
5. API calls work (CORS check)
6. Main app still works (no regression)

**Estimated Time**: 15 minutes

---

## Detailed Configuration Files

### 1. Partner Portal Dockerfile

**File**: `partners-portal/Dockerfile`

```dockerfile
# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

### 2. Partner Portal next.config.js Update

**File**: `partners-portal/next.config.js`

Add `output: 'standalone'` for Docker deployment:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
```

### 3. Docker Compose Update

**File**: `docker-compose.production.yml`

Add after the `frontend` service:

```yaml
  # Partner Portal (Influencer Dashboard)
  partners:
    image: mkelam/pdflab-partners:latest
    container_name: pdflab-partners-prod
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://pdflab.pro
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

### 4. Partner Portal Environment File

**File**: `partners-portal/.env.production`

```env
# Partner Portal Production Environment
# Last Updated: 2025-11-14

# API Configuration
NEXT_PUBLIC_API_URL=https://pdflab.pro

# Deployment Info
NODE_ENV=production
PORT=3001

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 5. Nginx Configuration Addition

**Option A**: Add to existing `/etc/nginx/sites-available/pdflab.pro`

```nginx
# Partner Portal Subdomain (HTTP)
server {
    listen 80;
    listen [::]:80;
    server_name partners.pdflab.pro;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Partner Portal Subdomain (HTTPS)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name partners.pdflab.pro;

    # SSL certificates (generated by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdflab.pro/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logging
    access_log /var/log/nginx/partners-access.log;
    error_log /var/log/nginx/partners-error.log;

    # Max upload size
    client_max_body_size 50M;

    # Partner Portal proxy
    location / {
        proxy_pass http://localhost:3001;
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

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Option B**: Create separate file `/etc/nginx/sites-available/partners.pdflab.pro`

(Same content as above, but in dedicated file)

---

## Automated Deployment Script

**File**: `scripts/deploy-partner-portal.sh`

```bash
#!/bin/bash
# Partner Portal Deployment Script
# Deploys partner portal to VPS after Phase 1

set -e

# Configuration
VPS_IP="141.136.44.168"
VPS_USER="root"
APP_DIR="/var/pdflab/app"

echo "========================================="
echo "Partner Portal Deployment (Phase 1.5)"
echo "========================================="
echo ""

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."
if ! ssh ${VPS_USER}@${VPS_IP} "docker --version" > /dev/null 2>&1; then
    echo "ERROR: Docker not found on VPS"
    exit 1
fi
echo "✓ Prerequisites check passed"
echo ""

# Step 2: Build Docker image locally
echo "Step 2: Building partner portal Docker image..."
cd partners-portal
docker build -t mkelam/pdflab-partners:latest -f Dockerfile .
echo "✓ Docker image built"
echo ""

# Step 3: Push to Docker Hub
echo "Step 3: Pushing image to Docker Hub..."
docker push mkelam/pdflab-partners:latest
echo "✓ Image pushed"
echo ""

# Step 4: Check DNS
echo "Step 4: Checking DNS resolution..."
if nslookup partners.pdflab.pro | grep -q "141.136.44.168"; then
    echo "✓ DNS configured correctly"
else
    echo "⚠ WARNING: DNS not configured or not propagated"
    echo "  Add A record: partners → 141.136.44.168"
    read -p "  Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 5: Deploy to VPS
echo "Step 5: Deploying to VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /var/pdflab/app

    echo "Pulling latest code..."
    git pull origin master

    echo "Pulling Docker images..."
    docker compose -f docker-compose.production.yml pull partners

    echo "Starting partner portal container..."
    docker compose -f docker-compose.production.yml up -d partners

    echo "Waiting for container to start..."
    sleep 10

    echo "Container status:"
    docker ps | grep partners
ENDSSH
echo "✓ Deployed to VPS"
echo ""

# Step 6: Configure Nginx (if not done)
echo "Step 6: Checking Nginx configuration..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    if ! grep -q "partners.pdflab.pro" /etc/nginx/sites-available/pdflab.pro; then
        echo "⚠ Nginx not configured for partners subdomain"
        echo "  Run: sudo nano /etc/nginx/sites-available/pdflab.pro"
        echo "  Add partner portal server block (see PARTNER_PORTAL_DEPLOYMENT_PLAN.md)"
    else
        echo "✓ Nginx configuration found"
    fi
ENDSSH
echo ""

# Step 7: SSL Certificate
echo "Step 7: Checking SSL certificate..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    if ! sudo certbot certificates | grep -q "partners.pdflab.pro"; then
        echo "⚠ SSL certificate not found"
        echo "  Run: sudo certbot --nginx -d partners.pdflab.pro"
    else
        echo "✓ SSL certificate installed"
    fi
ENDSSH
echo ""

# Step 8: Verification
echo "Step 8: Running verification tests..."
sleep 5

# Test DNS
if nslookup partners.pdflab.pro > /dev/null 2>&1; then
    echo "✓ DNS resolves"
else
    echo "✗ DNS resolution failed"
fi

# Test container
if ssh ${VPS_USER}@${VPS_IP} "docker ps | grep partners" > /dev/null 2>&1; then
    echo "✓ Partner portal container running"
else
    echo "✗ Partner portal container not running"
fi

# Test HTTP (will fail if SSL not set up)
if curl -I -s http://partners.pdflab.pro | grep -q "HTTP"; then
    echo "✓ HTTP accessible"
else
    echo "⚠ HTTP not accessible (may need SSL setup)"
fi

echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo ""
echo "Partner Portal URL: https://partners.pdflab.pro"
echo "Container: pdflab-partners-prod"
echo "Port: 3001"
echo ""
echo "Manual Steps Remaining (if needed):"
echo "1. Add Nginx configuration (see deployment plan)"
echo "2. Run: sudo certbot --nginx -d partners.pdflab.pro"
echo "3. Test: https://partners.pdflab.pro"
echo ""
echo "Logs:"
echo "  Docker: ssh root@141.136.44.168 'docker logs pdflab-partners-prod'"
echo "  Nginx: ssh root@141.136.44.168 'tail -f /var/log/nginx/partners-error.log'"
echo ""
```

---

## Verification Checklist

After deployment, verify each of these:

### DNS Verification

```bash
# Check DNS resolution
nslookup partners.pdflab.pro

# Expected output:
# Name: partners.pdflab.pro
# Address: 141.136.44.168
```

### Container Verification

```bash
# SSH to VPS
ssh root@141.136.44.168

# Check partner portal container
docker ps | grep partners

# Expected output:
# pdflab-partners-prod   Up X minutes (healthy)   0.0.0.0:3001->3001/tcp
```

### Nginx Verification

```bash
# Test Nginx configuration
sudo nginx -t

# Check if partners.pdflab.pro is configured
sudo grep -r "partners.pdflab.pro" /etc/nginx/sites-available/

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate Verification

```bash
# Check SSL certificate
sudo certbot certificates

# Expected output:
# Certificate Name: partners.pdflab.pro
#   Domains: partners.pdflab.pro
#   Expiry Date: [date]
#   Certificate Path: /etc/letsencrypt/live/partners.pdflab.pro/fullchain.pem
```

### HTTP/HTTPS Verification

```bash
# Test HTTP redirect to HTTPS
curl -I http://partners.pdflab.pro

# Expected: 301 redirect to https://

# Test HTTPS
curl -I https://partners.pdflab.pro

# Expected: 200 OK
```

### Application Verification

```bash
# Test partner portal landing page
curl -s https://partners.pdflab.pro | grep "PDFLab Partners"

# Test health endpoint (if implemented)
curl https://partners.pdflab.pro/health

# Test partner dashboard with slug
curl -I https://partners.pdflab.pro/test-slug
```

### API Integration Verification

```bash
# Test CORS (from partner portal to backend)
curl -H "Origin: https://partners.pdflab.pro" \
     -I https://pdflab.pro/api/partners/stats

# Expected: Access-Control-Allow-Origin header present
```

### Main App Regression Check

```bash
# Ensure main app still works
curl -I https://pdflab.pro

# Expected: 200 OK

# Ensure backend still works
curl https://pdflab.pro/api/health

# Expected: {"status":"OK"}
```

---

## Rollback Procedure

If deployment fails or causes issues:

### Step 1: Stop Partner Portal Container

```bash
ssh root@141.136.44.168
docker stop pdflab-partners-prod
docker rm pdflab-partners-prod
```

### Step 2: Remove from Docker Compose

```bash
# On VPS
cd /var/pdflab/app
git checkout HEAD~1 docker-compose.production.yml
docker compose -f docker-compose.production.yml up -d
```

### Step 3: Revert Nginx Configuration

```bash
# Remove partner portal configuration
sudo nano /etc/nginx/sites-available/pdflab.pro
# Delete partner portal server blocks

# Or restore from backup
sudo cp /etc/nginx/sites-available/pdflab.pro.backup /etc/nginx/sites-available/pdflab.pro

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Remove SSL Certificate (Optional)

```bash
# Only if you want to completely remove
sudo certbot delete --cert-name partners.pdflab.pro
```

### Step 5: Verify Main App Works

```bash
curl -I https://pdflab.pro
# Should return 200 OK
```

---

## Risk Assessment

### Deployment Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DNS propagation delay | 🟢 LOW | 🟡 MEDIUM | Wait 30 min, use direct IP for testing |
| Port 3001 conflict | 🟢 LOW | 🟡 MEDIUM | Check `netstat` before deployment |
| Nginx misconfiguration | 🟡 MEDIUM | 🟠 HIGH | Test with `nginx -t` before reload |
| SSL certificate failure | 🟡 MEDIUM | 🟠 HIGH | Ensure DNS resolves first, use `--debug` |
| CORS issues | 🟡 MEDIUM | 🟡 MEDIUM | Already configured in Phase 1 |
| Main app downtime | 🟢 LOW | 🔴 CRITICAL | Test in isolation, deploy during low traffic |
| Docker build failure | 🟡 MEDIUM | 🟡 MEDIUM | Test build locally first |
| Resource exhaustion | 🟢 LOW | 🟠 HIGH | Monitor CPU/RAM during deployment |

### Mitigation Strategies

1. **Test locally before VPS deployment**
   - Build Docker image locally
   - Test on local port 3001
   - Verify API calls work

2. **Deploy during low-traffic window**
   - Evening/night deployment
   - Weekend deployment preferred

3. **Incremental deployment**
   - Deploy Nginx config first (test with static page)
   - Then deploy Docker container
   - Finally configure SSL

4. **Monitoring during deployment**
   - Watch `docker logs -f pdflab-partners-prod`
   - Monitor Nginx error logs
   - Check main app still works

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)

- [ ] Verify partner portal loads at https://partners.pdflab.pro
- [ ] Test partner dashboard with real slug
- [ ] Verify API calls work (check browser console)
- [ ] Test main app (no regression)
- [ ] Check all container logs for errors
- [ ] Update documentation with actual deployment date

### Short-term (Within 1 Week)

- [ ] Set up monitoring for partner portal (Sentry, if not done)
- [ ] Add partner portal to uptime monitoring
- [ ] Create test partner account and verify end-to-end
- [ ] Update partner application flow to use new subdomain
- [ ] Add partner portal to sitemap
- [ ] Test on mobile devices

### Medium-term (Within 1 Month)

- [ ] Implement partner analytics dashboard backend
- [ ] Set up automated backups for partner data
- [ ] Create partner portal staging environment
- [ ] Document partner portal deployment process
- [ ] Train team on partner portal management

---

## Success Metrics

### Deployment Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| DNS resolves | < 30 min | ⏳ |
| SSL certificate obtained | First try | ⏳ |
| Partner portal loads | < 3 seconds | ⏳ |
| API calls successful | 100% | ⏳ |
| Container healthy | Within 1 min | ⏳ |
| Main app unchanged | No downtime | ⏳ |
| Nginx reload | < 1 second | ⏳ |
| Zero critical errors | 0 errors | ⏳ |

### Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| Partner portal load time | < 2s | Lighthouse |
| API response time | < 500ms | Network tab |
| Container startup time | < 30s | Docker logs |
| Memory usage | < 512MB | `docker stats` |
| CPU usage | < 10% idle | `docker stats` |

---

## Dependencies

### External Dependencies

- ✅ Hostinger DNS (for A record)
- ✅ Let's Encrypt / Certbot (for SSL)
- ✅ Docker Hub (for image hosting)
- ✅ VPS (141.136.44.168)
- ✅ Nginx (reverse proxy)

### Internal Dependencies

- ✅ Phase 1 deployment (backend, frontend, database)
- ✅ Backend partner API routes (`/api/partners/*`)
- ✅ Backend CORS configuration (includes `partners.pdflab.pro`)
- ⏳ Partner portal Docker image (to be built)
- ⏳ Docker Compose configuration (to be updated)
- ⏳ Nginx configuration (to be added)

---

## Timeline

### Estimated Deployment Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Preparation** | Create Dockerfile, update configs | 30 min | None |
| **Local Testing** | Build image, test locally | 30 min | Dockerfile complete |
| **Image Build** | Build and push to Docker Hub | 30 min | Local testing passed |
| **DNS Setup** | Add A record in Hostinger | 10 min (+ 30 min propagation) | None |
| **VPS Deployment** | Pull image, start container | 15 min | Image pushed |
| **Nginx Config** | Add server block, reload | 15 min | Container running |
| **SSL Setup** | Run certbot | 5 min | DNS propagated |
| **Verification** | Run all checks | 20 min | SSL complete |
| **Documentation** | Update deployment docs | 15 min | Verification passed |

**Total Estimated Time**: 3 hours (active work) + 30 min (DNS propagation)

### Recommended Deployment Window

**Best Time**:
- **Day**: Saturday or Sunday
- **Time**: 10:00 PM - 1:00 AM (low traffic)
- **Duration**: 3-4 hours (with buffer)

**Avoid**:
- Weekday business hours (9 AM - 5 PM)
- Monday mornings (high traffic)
- During active payment processing

---

## Communication Plan

### Pre-Deployment

**Notify** (if applicable):
- Team members (1 day before)
- Active partners (via email, if any exist)

**Message Template**:
```
Subject: PDFLab Partner Portal Upgrade

Hi [Name],

We're upgrading the partner portal on [date] at [time].
Expected downtime: < 30 minutes

New URL: https://partners.pdflab.pro
(Your unique dashboard link will remain the same)

Thanks!
PDFLab Team
```

### During Deployment

- Update status page (if exists)
- Post in team Slack/Discord (if applicable)
- Monitor logs and metrics

### Post-Deployment

**Announcement**:
```
✅ Partner portal successfully deployed!

New features:
- Faster loading times
- Improved dashboard UI
- Better analytics

Access: https://partners.pdflab.pro
```

---

## Troubleshooting Guide

### Issue: Container Won't Start

**Symptoms**: `docker ps` doesn't show `pdflab-partners-prod`

**Diagnosis**:
```bash
docker logs pdflab-partners-prod
docker inspect pdflab-partners-prod
```

**Solutions**:
1. Check port 3001 not in use: `netstat -tlnp | grep 3001`
2. Check image exists: `docker images | grep partners`
3. Check environment variables: `docker exec pdflab-partners-prod env`
4. Rebuild image if corrupted

### Issue: 502 Bad Gateway

**Symptoms**: Nginx returns 502 when accessing partners.pdflab.pro

**Diagnosis**:
```bash
# Check container is running
docker ps | grep partners

# Check port is accessible
curl http://localhost:3001

# Check Nginx error logs
tail -f /var/log/nginx/partners-error.log
```

**Solutions**:
1. Restart container: `docker restart pdflab-partners-prod`
2. Check proxy_pass URL in Nginx config
3. Verify container health: `docker inspect pdflab-partners-prod | grep Health`

### Issue: SSL Certificate Failed

**Symptoms**: Certbot fails to obtain certificate

**Diagnosis**:
```bash
# Check DNS
nslookup partners.pdflab.pro

# Check port 80 accessible
curl -I http://partners.pdflab.pro

# Check certbot logs
tail -f /var/log/letsencrypt/letsencrypt.log
```

**Solutions**:
1. Wait for DNS propagation (30 minutes)
2. Ensure port 80 allowed in firewall
3. Check Nginx listening on port 80
4. Use `--debug` flag: `certbot --nginx -d partners.pdflab.pro --debug`

### Issue: CORS Errors

**Symptoms**: Browser console shows CORS errors

**Diagnosis**:
```bash
# Check backend CORS config
docker exec pdflab-backend-prod env | grep CORS

# Test CORS manually
curl -H "Origin: https://partners.pdflab.pro" \
     -I https://pdflab.pro/api/partners/stats
```

**Solutions**:
1. Verify `partners.pdflab.pro` in backend CORS_ORIGIN
2. Restart backend: `docker restart pdflab-backend-prod`
3. Check Nginx not blocking CORS headers

### Issue: Main App Broken

**Symptoms**: https://pdflab.pro returns errors after partner portal deployment

**Diagnosis**:
```bash
# Check all containers
docker ps

# Check backend logs
docker logs pdflab-backend-prod

# Check frontend logs
docker logs pdflab-frontend-prod

# Check Nginx config
nginx -t
```

**Solutions**:
1. **IMMEDIATE**: Rollback (see Rollback Procedure above)
2. Check for port conflicts
3. Verify Docker network connectivity
4. Review recent Nginx config changes

---

## Next Steps After Deployment

### Phase 2: Security Enhancements

As outlined in [VPS_LOCAL_IMPLEMENTATION_AUDIT.md](VPS_LOCAL_IMPLEMENTATION_AUDIT.md):

1. **Redis Password Protection** (30 min)
2. **Sentry Error Monitoring** (1 hour) - Add partner portal
3. **Nginx Rate Limiting** (30 min)
4. **Stronger Database Passwords** (30 min)

### Phase 3: Partner Portal Features

1. **Partner Application System**
   - Application form at `/apply`
   - Admin review dashboard
   - Auto-provisioning approved partners

2. **Analytics Backend**
   - Real conversion tracking
   - Commission calculations
   - Payout management

3. **Partner Resources**
   - Marketing materials download
   - API documentation (if offering API)
   - Best practices guides

---

## Conclusion

This deployment plan provides a comprehensive roadmap for deploying the PDFLab Partner Portal to production. The partner portal is already built and tested locally, requiring only infrastructure setup on the VPS.

**Key Benefits**:
- ✅ Separate subdomain for professional branding
- ✅ Independent scaling from main app
- ✅ Isolated codebase for easier maintenance
- ✅ Enhanced partner experience

**Risk Level**: 🟡 LOW-MEDIUM (well-documented, tested locally)

**Recommended Timing**: After Phase 1 core fixes are deployed and verified stable.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Author**: PDFLab DevOps Team
**Review Date**: Before deployment
**Status**: ⏳ READY FOR IMPLEMENTATION
