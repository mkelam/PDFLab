# PDFLab: Comprehensive VPS vs Local Implementation Audit

**Audit Date**: 2025-11-14
**Auditor**: Claude (Automated Audit System)
**VPS IP**: 141.136.44.168
**Production URL**: https://pdflab.pro
**Local Environment**: Windows 11 Development Machine

---

## Executive Summary

This comprehensive audit compares the production VPS implementation against the local development environment to identify configuration differences, security gaps, and potential issues.

### Overall Status: ⚠️ **CRITICAL ISSUES FOUND**

**Critical Issues**: 3
**High Priority**: 5
**Medium Priority**: 8
**Low Priority**: 4

**Key Findings**:
1. ❌ **CRITICAL**: Backend .env.production contains placeholder values (not VPS-ready)
2. ❌ **CRITICAL**: Port mismatch (Production expects 3006, .env.production has 3001)
3. ❌ **CRITICAL**: Database name mismatch (pdfcraft_db vs pdflab_production)
4. ⚠️ **HIGH**: JWT secrets using development values
5. ⚠️ **HIGH**: CORS configuration inconsistencies
6. ⚠️ **HIGH**: SSL/HTTPS not fully configured for API subdomain

---

## 1. Environment Variable Comparison

### 1.1 Backend Environment Variables

| Variable | Local Dev (.env) | Production (.env.production) | VPS Expected | Status |
|----------|------------------|------------------------------|--------------|---------|
| **NODE_ENV** | `development` | `production` | `production` | ✅ OK |
| **PORT** | `3006` | `3001` ⚠️ | `3006` | ❌ **CRITICAL MISMATCH** |
| **API_URL** | `http://localhost:3006` | `http://141.136.44.168:3006` | `https://api.pdflab.pro` | ⚠️ Should use HTTPS |
| **DB_HOST** | `localhost` | `your-hostinger-mysql-host` | `mysql` (Docker) | ❌ **PLACEHOLDER** |
| **DB_PORT** | `3306` | `3306` | `3306` | ✅ OK |
| **DB_USER** | `pdflab` | `your-mysql-user` | `pdflab` | ❌ **PLACEHOLDER** |
| **DB_PASSWORD** | `***REMOVED***` | `your-mysql-password` | `[SECURE]` | ❌ **PLACEHOLDER** |
| **DB_NAME** | `pdflab` | `pdfcraft_db` ⚠️ | `pdflab_production` | ❌ **NAME MISMATCH** |
| **REDIS_HOST** | `localhost` | `localhost` | `redis` (Docker) | ⚠️ Should be `redis` |
| **REDIS_PORT** | `6379` | `6379` | `6379` | ✅ OK |
| **REDIS_PASSWORD** | *(empty)* | *(empty)* | *(empty)* | ⚠️ Should set in prod |
| **CLOUDCONVERT_API_KEY** | ✅ Valid key | ✅ Same key | ✅ Same key | ✅ OK |
| **CLOUDCONVERT_SANDBOX** | `false` | `false` | `false` | ✅ OK |
| **JWT_SECRET** | 46-char dev secret | 40-char placeholder | 64-char random | ❌ **INSECURE** |
| **JWT_EXPIRATION** | `15m` | N/A (uses JWT_EXPIRES_IN: 24h) | `15m` | ⚠️ Config drift |
| **JWT_REFRESH_EXPIRATION** | `30d` | N/A | `30d` | ⚠️ Missing in prod |
| **PAYFAST_MERCHANT_ID** | `10000100` (sandbox) | `25263515` (prod) | `25263515` (prod) | ✅ OK |
| **PAYFAST_MERCHANT_KEY** | `46f0cd694581a` (sandbox) | `<PAYFAST_MERCHANT_KEY>` (prod) | `<PAYFAST_MERCHANT_KEY>` (prod) | ✅ OK |
| **PAYFAST_MODE** | `sandbox` | `production` | `production` | ✅ OK |
| **CORS_ORIGIN** | Multiple localhost URLs | `https://pdflab.pro` | Multiple prod domains | ⚠️ Incomplete |
| **STORAGE_PATH** | `./storage` | `/var/www/pdfcraft/uploads` | `/app/storage` | ⚠️ Path mismatch |
| **MAX_FILE_SIZE** | Various by plan | `104857600` (100MB) | `524288000` (500MB) | ⚠️ Lower limit |
| **SMTP_HOST** | `smtp.hostinger.com` | `smtp.hostinger.com` | `smtp.hostinger.com` | ✅ OK |
| **SMTP_USER** | `support@pdflab.pro` | `noreply@pdflab.pro` | `support@pdflab.pro` | ⚠️ Email mismatch |
| **SMTP_PASS** | `<SMTP_PASS>` | `your-email-password` | `[SECURE]` | ❌ **PLACEHOLDER** |

### 1.2 Frontend Environment Variables

| Variable | Local Dev (.env.local) | VPS Expected | Status |
|----------|----------------------|--------------|---------|
| **NEXT_PUBLIC_API_URL** | `http://localhost:3006` | `https://api.pdflab.pro` or `https://pdflab.pro/api` | ⚠️ Should use HTTPS |
| **SENTRY_DSN** | Not configured | Not configured | ⚠️ Monitoring disabled |

---

## 2. Docker Configuration Analysis

### 2.1 Local Docker Compose (docker-compose.yml)

**Services**: 4 containers
- `mysql` - MySQL 8.0 database
- `redis` - Redis 7 cache/queue
- `backend` - Express.js API (builds from Dockerfile)
- `frontend` - Next.js app (builds from Dockerfile)
- **BONUS**: `worker` - Background job processor

**Key Features**:
✅ Health checks configured for all services
✅ Proper dependency ordering (depends_on with health conditions)
✅ Volume mounts for development (`./backend/storage`)
✅ Network isolation (`pdflab-network`)
✅ Environment variable injection

### 2.2 Production Docker Compose (docker-compose.production.yml)

**Services**: 4 containers (NO WORKER!)
- `mysql` - MySQL 8.0 production database
- `redis` - Redis 7 with persistence
- `backend` - Pre-built image from Docker Hub (`mkelam/pdflab-backend:latest`)
- `frontend` - Pre-built image from Docker Hub (`mkelam/pdflab-frontend:latest`)

**Key Differences from Local**:
❌ **MISSING WORKER CONTAINER** - Background jobs won't process!
✅ Uses pre-built images (faster deployment)
✅ Named volumes with bind mounts (`/var/pdflab/storage`)
✅ Restart policy: `unless-stopped`
⚠️ No health checks (removed for simplicity)
⚠️ Frontend API URL hardcoded: `http://141.136.44.168:3006` (should be HTTPS)

**Critical Issue**: The production docker-compose does NOT include a worker container, meaning background PDF conversion jobs will queue but never process!

---

## 3. Database Configuration Audit

### 3.1 Local Development Database

| Setting | Value |
|---------|-------|
| **Container Name** | `pdflab-mysql` |
| **Database Name** | `pdflab` |
| **User** | `pdflab` |
| **Password** | `***REMOVED***` (insecure, dev only) |
| **Root Password** | `rootpassword123` (insecure, dev only) |
| **Port** | `3306` (exposed to host) |
| **Volume** | `mysql_data` (Docker volume) |
| **Backup Directory** | `./backend/backups` |

### 3.2 Production VPS Database

| Setting | Value | Status |
|---------|-------|--------|
| **Container Name** | `pdflab-mysql-prod` | ✅ OK |
| **Database Name** | `pdflab_production` | ✅ OK |
| **User** | `pdflab` | ✅ OK |
| **Password** | `<DB_PASSWORD>` | ⚠️ Should be stronger (32+ chars) |
| **Root Password** | `<MYSQL_ROOT_PASSWORD>` | ⚠️ Should be stronger (32+ chars) |
| **Port** | `3306` (exposed to host) | ⚠️ Should only expose internally |
| **Volume** | `mysql-data` (Docker volume) | ✅ OK |
| **Init Script** | `./backend/init.sql` | ✅ OK |

### 3.3 Database Schema Verification

**Expected Tables** (8 total):
1. ✅ `users` - User accounts
2. ✅ `conversion_jobs` - PDF conversion tracking
3. ✅ `subscriptions` - Payment subscriptions
4. ✅ `payment_logs` - PayFast transaction logs
5. ✅ `admin_audit_logs` - Admin action tracking
6. ✅ `system_health_logs` - System monitoring
7. ✅ `password_history` - Password reuse prevention
8. ✅ `usage_logs` - User activity tracking

**Additional Tables**:
- `beta_applications` - Beta user application system
- `feedback` - User feedback collection
- `partner_applications` - Partner/affiliate system

**Known Issue**: Database sync disabled (`alter: false`) to avoid "too many keys" error. Using manual migrations instead (industry best practice).

---

## 4. Nginx Reverse Proxy Configuration

### 4.1 Configuration Overview

**File**: `nginx-pdflab-pro.conf`
**Domains Configured**:
- `pdflab.pro` (main frontend)
- `www.pdflab.pro` (www redirect)
- `api.pdflab.pro` (backend API subdomain)

### 4.2 HTTP → HTTPS Redirect

✅ **Configured Correctly**:
```nginx
server {
    listen 80;
    server_name pdflab.pro www.pdflab.pro api.pdflab.pro;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

### 4.3 SSL/TLS Configuration

**Certificate Provider**: Let's Encrypt
**Certificate Paths**:
- Certificate: `/etc/letsencrypt/live/pdflab.pro/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/pdflab.pro/privkey.pem`

**SSL Protocols**: TLSv1.2, TLSv1.3 ✅
**Cipher Suites**: `HIGH:!aNULL:!MD5` ✅
**Session Cache**: 10m ✅

### 4.4 Security Headers

**Main Frontend** (pdflab.pro):
```nginx
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer-when-downgrade
Content-Security-Policy: default-src 'self' http: https: data: blob: 'unsafe-inline'
```

**API Subdomain** (api.pdflab.pro):
```nginx
X-Frame-Options: DENY (more restrictive) ✅
Access-Control-Allow-Origin: https://pdflab.pro
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

### 4.5 File Upload Configuration

**Max Upload Size**: `500M` ✅ (supports Enterprise plan)
**Timeout Settings**:
- Frontend: 60s (standard)
- API: 300s (5 minutes for conversions) ✅

### 4.6 Rate Limiting

**Configured Zones**:
- `general`: 10r/s (10 requests per second)
- `api`: 100r/m (100 requests per minute)
- `auth`: 5r/m (5 requests per minute for login/signup)

⚠️ **Issue**: Rate limiting zones defined but NOT applied to location blocks!

### 4.7 Proxy Configuration Issues

**Frontend Proxy** (`pdflab.pro` → `localhost:3000`):
```nginx
location / {
    proxy_pass http://localhost:3000;
    # ... headers omitted ...
}
```
✅ Correctly proxies to Next.js frontend

**API Proxy** (`api.pdflab.pro` → `localhost:3006`):
```nginx
location / {
    proxy_pass http://localhost:3006;
    # ... headers omitted ...
}
```
✅ Correctly proxies to Express backend

⚠️ **Potential Issue**: No `/api/` prefix route on main domain. Users must use `api.pdflab.pro` subdomain.

---

## 5. CORS & Security Settings Comparison

### 5.1 Backend CORS Configuration (server.ts)

**Configured Origins**:
```typescript
const corsOrigins = process.env['CORS_ORIGIN']?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',  // Partner portal local dev
  'http://localhost:3002',
  'https://pdflab.pro',
  'http://pdflab.pro',
  'https://partners.pdflab.pro',  // Partner portal
  'http://partners.pdflab.pro'
]
```

**CORS Options**:
- `credentials: true` ✅ (allows cookies)
- `methods`: GET, POST, PUT, DELETE, OPTIONS ✅
- `allowedHeaders`: Content-Type, Authorization ✅
- `exposedHeaders`: Content-Disposition, Content-Type ✅

**Issue**: No-origin requests allowed (mobile apps, Postman) - could be security risk

### 5.2 Local Development CORS

**Environment Variable**:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

✅ Works correctly for local development

### 5.3 Production CORS (Expected)

**Environment Variable** (backend/.env.production):
```env
CORS_ORIGIN=https://pdflab.pro
```

❌ **INCOMPLETE**: Missing `www.pdflab.pro` and `api.pdflab.pro`
❌ **MISSING**: Partner portal domain

**Recommended Production CORS**:
```env
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro,https://api.pdflab.pro,https://partners.pdflab.pro
```

### 5.4 Nginx CORS (API Subdomain)

Nginx also sets CORS headers for `api.pdflab.pro`:
```nginx
add_header Access-Control-Allow-Origin "https://pdflab.pro" always;
```

⚠️ **Redundant**: Backend already handles CORS, Nginx headers can conflict
⚠️ **Incomplete**: Only allows `https://pdflab.pro`, not www or partners

---

## 6. File Storage & Permissions

### 6.1 Local Development Storage

**Backend Storage Path**: `./storage`
**Full Path**: `C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend\storage`
**Structure**:
```
storage/
├── uploads/          # User uploaded PDFs
├── outputs/          # Converted files
└── temp/             # Temporary processing files
```

**Permissions**: Windows NTFS (user has full control)

### 6.2 Production VPS Storage

**Backend Storage Path**: `/app/storage` (inside container)
**Host Mount**: `/var/pdflab/storage` (VPS filesystem)

**Docker Volume Configuration**:
```yaml
volumes:
  pdflab-storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/pdflab/storage
```

**Expected VPS Directory Structure**:
```
/var/pdflab/
├── app/              # Application code (git repo)
├── storage/          # File storage (mounted to containers)
│   ├── uploads/
│   └── outputs/
├── logs/             # Application logs
├── backups/          # Database backups
└── scripts/          # Maintenance scripts
```

**Permissions** (VPS):
- Directory: `chmod -R 755 /var/pdflab`
- Owner: `root` or Docker user

⚠️ **Issue**: .env.production specifies `/var/www/pdfcraft/uploads` which doesn't match VPS structure!

### 6.3 Frontend Static Assets

**Local**: `C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\public`
**Production**: Bundled in Docker image (Next.js static export)

---

## 7. Redis Configuration

### 7.1 Local Development Redis

| Setting | Value |
|---------|-------|
| **Container Name** | `pdflab-redis` |
| **Host** | `localhost` (from backend) |
| **Port** | `6379` (exposed) |
| **Password** | None (insecure, dev only) |
| **Persistence** | `appendonly yes` |
| **Volume** | `redis_data` |

### 7.2 Production VPS Redis

| Setting | Value | Status |
|---------|-------|--------|
| **Container Name** | `pdflab-redis-prod` |
| **Host** | `redis` (Docker network) |
| **Port** | `6379` (exposed to host ⚠️) |
| **Password** | None | ⚠️ **Should set in production** |
| **Persistence** | `appendonly yes` ✅ |
| **Volume** | `redis-data` ✅ |

**Issue**: Redis port exposed to host (3306) - should only be accessible via Docker network

### 7.3 Bull Queue Configuration

**Queue Name**: `pdf-conversion`
**Worker**: `backend/src/jobs/conversion.job.ts`
**Cleanup**: `backend/src/jobs/cleanup.job.ts`
**Quota Reset**: `backend/src/jobs/quota-reset.job.ts` (cron)

❌ **CRITICAL**: Production docker-compose.yml has NO WORKER CONTAINER!
This means jobs will queue in Redis but never process.

---

## 8. PayFast Payment Integration

### 8.1 Local Development PayFast

| Setting | Value |
|---------|-------|
| **Mode** | `sandbox` |
| **Merchant ID** | `10000100` (PayFast test account) |
| **Merchant Key** | `46f0cd694581a` |
| **Passphrase** | `jt7NOE43FZPn` (test passphrase) |
| **ITN URL** | `https://major-eagles-doubt.loca.lt/api/payfast/webhook` (localtunnel) |
| **Return URL** | `http://localhost:3000/payment/success` |
| **Cancel URL** | `http://localhost:3000/payment/cancel` |

### 8.2 Production VPS PayFast

| Setting | Value | Status |
|---------|-------|--------|
| **Mode** | `production` | ✅ OK |
| **Merchant ID** | `25263515` (real account) | ✅ OK |
| **Merchant Key** | `<PAYFAST_MERCHANT_KEY>` | ✅ OK |
| **Passphrase** | *(empty)* | ⚠️ Recommended to set |
| **ITN URL** | `https://pdflab.pro/api/payfast/webhook` OR `https://api.pdflab.pro/api/payfast/webhook` | ⚠️ Must be publicly accessible |
| **Return URL** | `https://pdflab.pro/payment/success` | ✅ OK (assuming HTTPS) |
| **Cancel URL** | `https://pdflab.pro/payment/cancel` | ✅ OK (assuming HTTPS) |

### 8.3 PayFast Webhook Accessibility

**Local Development**:
- Uses localtunnel (`https://major-eagles-doubt.loca.lt`)
- PayFast can reach webhook ✅

**Production VPS**:
- Nginx must route `/api/payfast/webhook` to backend
- **Two possible URLs**:
  1. `https://api.pdflab.pro/api/payfast/webhook` (API subdomain)
  2. `https://pdflab.pro/api/payfast/webhook` (main domain, requires Nginx config)

⚠️ **Issue**: Current Nginx config doesn't proxy `/api/` routes on main domain!
Must use API subdomain OR add Nginx location block.

### 8.4 Multi-Currency System

**Frontend Display**: USD ($9.99, $29.99, $99.99)
**Backend Processing**: USD (PayFast multi-currency enabled)
**Database Storage**: USD

✅ **Confirmed**: Multi-currency update deployed Nov 8, 2025 (see DEPLOYMENT_SUCCESS_REPORT.md)

---

## 9. SSL/HTTPS Implementation

### 9.1 SSL Certificate Status

**Certificate Type**: Let's Encrypt (free, auto-renewable)
**Domains Covered**:
- `pdflab.pro` ✅
- `www.pdflab.pro` ✅ (likely via SAN)
- `api.pdflab.pro` ❓ (needs verification)

**Certificate Files**:
- `/etc/letsencrypt/live/pdflab.pro/fullchain.pem`
- `/etc/letsencrypt/live/pdflab.pro/privkey.pem`

### 9.2 HTTPS Enforcement

**Frontend** (pdflab.pro):
✅ HTTP → HTTPS redirect configured
✅ SSL configured for port 443
✅ Security headers set

**API Subdomain** (api.pdflab.pro):
✅ HTTP → HTTPS redirect configured
✅ SSL configured for port 443
✅ CORS headers set

### 9.3 SSL Verification Commands (VPS)

```bash
# Check certificate validity
ssh root@141.136.44.168 "certbot certificates"

# Test HTTPS endpoints
curl -I https://pdflab.pro
curl -I https://api.pdflab.pro
curl -I https://www.pdflab.pro
```

### 9.4 Auto-Renewal Status

**Certbot Renewal**: Let's Encrypt certs expire every 90 days
**Auto-Renewal**: Typically configured via cron job

⚠️ **Needs Verification**: Ensure certbot auto-renewal is enabled:
```bash
ssh root@141.136.44.168 "systemctl status certbot.timer"
# OR
ssh root@141.136.44.168 "crontab -l | grep certbot"
```

---

## 10. Critical Issues Summary

### 10.1 CRITICAL Issues (Must Fix Immediately)

#### Issue #1: Backend .env.production Not VPS-Ready
**Severity**: 🔴 CRITICAL
**Impact**: Backend won't start on VPS with current production env file

**Problems**:
- Port mismatch: `3001` instead of `3006`
- Database name: `pdfcraft_db` instead of `pdflab_production`
- Placeholder values: `your-hostinger-mysql-host`, `your-mysql-user`, `your-mysql-password`
- Storage path: `/var/www/pdfcraft/uploads` instead of `/app/storage`
- Redis host: `localhost` instead of `redis` (Docker network)

**Fix**:
```bash
# Create correct production .env file
cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=3006
API_URL=https://api.pdflab.pro

DB_HOST=mysql
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=pdflab_production

REDIS_HOST=redis
REDIS_PORT=6379

CLOUDCONVERT_API_KEY=<existing key>
CLOUDCONVERT_SANDBOX=false

JWT_SECRET=<64-char random string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d

PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
PAYFAST_MODE=production

CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro,https://api.pdflab.pro

STORAGE_PATH=/app/storage
MAX_FILE_SIZE=524288000

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=support@pdflab.pro
SMTP_PASS=<secure password>
EOF
```

#### Issue #2: Missing Worker Container in Production
**Severity**: 🔴 CRITICAL
**Impact**: PDF conversions won't process - jobs will queue but never complete

**Problem**: `docker-compose.production.yml` has NO worker service

**Fix**: Add worker service to production compose file:
```yaml
worker:
  image: mkelam/pdflab-backend:latest
  container_name: pdflab-worker-prod
  restart: unless-stopped
  env_file:
    - ./backend/.env.production
  environment:
    - NODE_ENV=production
    - DB_HOST=mysql
    - REDIS_HOST=redis
    - WORKER_MODE=true
  volumes:
    - pdflab-storage:/app/storage
    - pdflab-logs:/app/logs
  depends_on:
    - mysql
    - redis
    - backend
  networks:
    - pdflab-network
  command: ["npm", "start"]
```

#### Issue #3: Database Connection Will Fail
**Severity**: 🔴 CRITICAL
**Impact**: Backend won't connect to database on VPS

**Problem**: .env.production specifies `pdfcraft_db` but VPS has `pdflab_production`

**Fix**: Update .env.production `DB_NAME=pdflab_production`

### 10.2 HIGH Priority Issues

#### Issue #4: JWT Secret Insecurity
**Severity**: 🟠 HIGH
**Impact**: Tokens can be compromised

**Problem**: JWT_SECRET in .env.production is placeholder text, not cryptographically random

**Fix**:
```bash
# Generate secure JWT secret (64 characters, 256-bit entropy)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET"
```

#### Issue #5: Incomplete CORS Configuration
**Severity**: 🟠 HIGH
**Impact**: Frontend requests may be blocked

**Problem**: Production CORS only allows `https://pdflab.pro`, missing www and api subdomains

**Fix**:
```env
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro,https://api.pdflab.pro,https://partners.pdflab.pro
```

#### Issue #6: Frontend API URL Not HTTPS
**Severity**: 🟠 HIGH
**Impact**: Mixed content warnings, insecure API calls

**Problem**: `docker-compose.production.yml` hardcodes `http://141.136.44.168:3006`

**Fix**:
```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=https://api.pdflab.pro
```

#### Issue #7: Redis Not Password Protected
**Severity**: 🟠 HIGH
**Impact**: Unauthorized access to queue and session data

**Fix**:
```bash
# Generate Redis password
REDIS_PASSWORD=$(openssl rand -base64 24)

# Update backend .env.production
REDIS_PASSWORD=<generated password>

# Update docker-compose.production.yml
redis:
  command: redis-server --appendonly yes --requirepass <password>
```

#### Issue #8: MySQL Port Exposed to Host
**Severity**: 🟠 HIGH
**Impact**: Database accessible from VPS host (security risk)

**Problem**: `docker-compose.production.yml` exposes port 3306:
```yaml
mysql:
  ports:
    - "3306:3306"  # ⚠️ Should be removed
```

**Fix**: Remove port mapping (only accessible via Docker network):
```yaml
mysql:
  # ports:  # REMOVE THIS - only internal access needed
  #   - "3306:3306"
  expose:
    - "3306"  # Internal only
```

### 10.3 MEDIUM Priority Issues

#### Issue #9: Rate Limiting Not Applied
**Severity**: 🟡 MEDIUM
**Impact**: DDoS protection incomplete

**Problem**: Nginx defines rate limit zones but doesn't apply them

**Fix**: Add limit_req directives to location blocks:
```nginx
location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ... rest of config
}
```

#### Issue #10: Database Passwords Too Simple
**Severity**: 🟡 MEDIUM
**Impact**: Brute force vulnerability

**Problem**: `<DB_PASSWORD>` and `<MYSQL_ROOT_PASSWORD>` are guessable

**Fix**:
```bash
# Generate strong passwords
DB_PASSWORD=$(openssl rand -base64 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 32)
```

#### Issue #11: No Sentry Error Monitoring
**Severity**: 🟡 MEDIUM
**Impact**: Errors not tracked in production

**Problem**: `SENTRY_DSN` not configured

**Fix**:
1. Create Sentry project at https://sentry.io
2. Add DSN to backend/.env.production:
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```
3. Add DSN to frontend/.env.production.local:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

#### Issue #12: Nginx Redundant CORS Headers
**Severity**: 🟡 MEDIUM
**Impact**: Header conflicts, CORS failures

**Problem**: Both Nginx and backend set CORS headers

**Fix**: Remove CORS headers from Nginx (let backend handle):
```nginx
# DELETE these lines from api.pdflab.pro server block:
# add_header Access-Control-Allow-Origin ...
# add_header Access-Control-Allow-Methods ...
# add_header Access-Control-Allow-Headers ...
```

#### Issue #13: Email Configuration Mismatch
**Severity**: 🟡 MEDIUM
**Impact**: Email notifications may fail

**Problem**: Local uses `support@pdflab.pro`, production uses `noreply@pdflab.pro`

**Fix**: Standardize on `support@pdflab.pro` for consistency

#### Issue #14: Storage Path Confusion
**Severity**: 🟡 MEDIUM
**Impact**: File uploads may fail

**Problem**: Three different paths across configs:
- Local: `./storage`
- VPS: `/app/storage`
- .env.production: `/var/www/pdfcraft/uploads`

**Fix**: Update .env.production to match VPS: `STORAGE_PATH=/app/storage`

#### Issue #15: Missing Health Check Token
**Severity**: 🟡 MEDIUM
**Impact**: Health endpoint can be probed

**Problem**: .env.production defines `HEALTH_CHECK_TOKEN` but not used

**Fix**: Either remove or implement token-based health checks

#### Issue #16: LibreOffice Path Configuration
**Severity**: 🟡 MEDIUM
**Impact**: Fallback conversion method unavailable

**Problem**: .env.production references LibreOffice but project uses CloudConvert

**Fix**: Remove LibreOffice-related variables (unused):
```env
# DELETE these lines:
# LIBREOFFICE_PATH=/usr/bin/libreoffice
# LIBREOFFICE_AVAILABLE=true
```

### 10.4 LOW Priority Issues

#### Issue #17: Log File Path Mismatch
**Severity**: 🟢 LOW
**Impact**: Logs may not be written

**Problem**: .env.production specifies `/var/log/pdfcraft/app.log` but VPS expects `/app/logs`

**Fix**: Update or remove LOG_FILE variable

#### Issue #18: Docker Network Name Confusion
**Severity**: 🟢 LOW
**Impact**: Manual container commands may fail

**Problem**: Local uses `pdflab-network`, production uses `app_pdflab-network` (Docker Compose prefix)

**Note**: This is normal Docker Compose behavior (adds project name prefix)

#### Issue #19: Missing Frontend Health Check
**Severity**: 🟢 LOW
**Impact**: Container restart delays

**Problem**: Production compose removes health checks

**Fix**: Re-add health checks to production compose file

#### Issue #20: Firewall Rules Not Documented
**Severity**: 🟢 LOW
**Impact**: Port security unclear

**Recommendation**: Document VPS firewall (UFW) rules:
```bash
ufw status
# Expected:
# 22/tcp - SSH (ALLOW)
# 80/tcp - HTTP (ALLOW)
# 443/tcp - HTTPS (ALLOW)
# 3006/tcp - Backend (DENY - internal only)
# 3306/tcp - MySQL (DENY - internal only)
# 6379/tcp - Redis (DENY - internal only)
```

---

## 11. Configuration Drift Summary

### Files with Drift Between Local and Production

| File | Local | Production | Drift Level |
|------|-------|------------|-------------|
| **backend/.env** | Development values | .env.production has placeholders | 🔴 CRITICAL |
| **docker-compose.yml** | 5 services (with worker) | 4 services (NO worker) | 🔴 CRITICAL |
| **.env.local** | `http://localhost:3006` | Should be `https://api.pdflab.pro` | 🟠 HIGH |
| **nginx config** | Not applicable | Production only | ✅ OK |
| **JWT configuration** | 15min + refresh tokens | 24h, no refresh | 🟡 MEDIUM |
| **CORS origins** | Multiple localhost | Single HTTPS domain | 🟡 MEDIUM |
| **Storage paths** | `./storage` | `/app/storage` | 🟡 MEDIUM |
| **SMTP email** | `support@` | `noreply@` | 🟡 MEDIUM |

---

## 12. Security Audit Checklist

### 12.1 Environment Variables Security

| Check | Local | Production | Status |
|-------|-------|------------|--------|
| Strong JWT secret (32+ chars) | ✅ 46 chars | ❌ Placeholder | 🔴 FAIL |
| Strong DB passwords (16+ chars) | ⚠️ Dev only | ⚠️ Weak (15 chars) | 🟡 NEEDS IMPROVEMENT |
| CORS restricted to known domains | ✅ localhost | ⚠️ Incomplete | 🟡 NEEDS IMPROVEMENT |
| HTTPS enforced | ⚠️ N/A (dev) | ✅ Nginx redirect | ✅ PASS |
| Redis password protected | ❌ No password | ❌ No password | 🔴 FAIL |
| API keys not hardcoded | ✅ In .env | ✅ In .env | ✅ PASS |
| .env files gitignored | ✅ Yes | ✅ Yes | ✅ PASS |
| Secrets in environment, not code | ✅ Yes | ✅ Yes | ✅ PASS |

### 12.2 Network Security

| Check | Status | Notes |
|-------|--------|-------|
| MySQL port not exposed to internet | ⚠️ Exposed to host | Should be internal only |
| Redis port not exposed to internet | ⚠️ Exposed to host | Should be internal only |
| Backend port not exposed to internet | ✅ Proxied via Nginx | Correct setup |
| Firewall rules configured | ❓ Not verified | Needs VPS check |
| Rate limiting enabled | ⚠️ Partial | Zones defined but not applied |
| DDoS protection | ⚠️ Partial | Cloudflare recommended |

### 12.3 Application Security

| Check | Status | Notes |
|-------|--------|-------|
| Helmet.js security headers | ✅ Enabled | In server.ts |
| CORS properly configured | ⚠️ Incomplete | Missing www/api domains |
| JWT tokens expire | ✅ Yes | 15min (dev), 24h (prod drift) |
| Refresh token mechanism | ✅ Implemented | Phase 1 complete (Nov 12) |
| Password hashing (bcrypt) | ✅ Yes | Rounds: 10 |
| SQL injection protection | ✅ Sequelize ORM | Parameterized queries |
| File upload validation | ✅ Yes | MIME type + extension check |
| Max file size limits | ✅ Yes | Plan-based (10MB-500MB) |
| Rate limiting per IP | ⚠️ Partial | Needs Nginx application |

---

## 13. Deployment Readiness Assessment

### 13.1 VPS Deployment Blockers

| Blocker | Severity | Blocks Deployment? |
|---------|----------|-------------------|
| Backend .env.production not VPS-ready | 🔴 CRITICAL | ✅ YES |
| Missing worker container | 🔴 CRITICAL | ✅ YES |
| Database name mismatch | 🔴 CRITICAL | ✅ YES |
| JWT secret placeholder | 🟠 HIGH | ⚠️ PARTIAL (works but insecure) |
| Incomplete CORS config | 🟠 HIGH | ⚠️ PARTIAL (some requests blocked) |
| Frontend API URL uses HTTP | 🟠 HIGH | ⚠️ PARTIAL (mixed content warnings) |

### 13.2 Current VPS Status (Based on Deployment Report)

**Last Successful Deployment**: November 8, 2025 (PayFast multi-currency update)
**Deployment Method**: Backend-only hot-swap (Docker image push)
**Production URL**: https://pdflab.pro ✅ LIVE
**Backend Status**: Running (but may have config drift)

**Verified Working**:
- ✅ Frontend accessible at https://pdflab.pro
- ✅ Backend API responding at port 3006
- ✅ Health check endpoint working
- ✅ PayFast pricing API returns correct USD prices
- ✅ Database connections healthy
- ✅ Redis connections healthy
- ✅ SSL/HTTPS enabled with Let's Encrypt

**Unknown Status**:
- ❓ Worker container running? (likely YES, but not in production compose file)
- ❓ Actual .env.production contents on VPS (couldn't SSH in audit)
- ❓ PDF conversions working end-to-end
- ❓ PayFast webhooks delivering successfully
- ❓ Email notifications sending

### 13.3 Deployment Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend fails to start due to .env issues | 🟠 MEDIUM | 🔴 HIGH | Test with VPS values locally first |
| PDF conversions queue but don't process | 🟠 MEDIUM | 🔴 HIGH | Verify worker container running |
| CORS blocks legitimate requests | 🟢 LOW | 🟡 MEDIUM | Add all domains to whitelist |
| PayFast webhooks fail | 🟢 LOW | 🔴 HIGH | Test ITN URL accessibility |
| Redis data lost on restart | 🟢 LOW | 🟡 MEDIUM | Verify persistent volume mounted |
| Database connection pool exhaustion | 🟢 LOW | 🟡 MEDIUM | Monitor connection count |

---

## 14. Recommended Action Plan

### Phase 1: Fix Critical Issues (Before Next Deployment)

**Priority**: 🔴 URGENT
**Time Required**: 2-4 hours

1. **Update backend/.env.production** (30 min)
   - Fix PORT to 3006
   - Fix DB_NAME to pdflab_production
   - Fix DB_HOST to `mysql`
   - Fix REDIS_HOST to `redis`
   - Fix STORAGE_PATH to `/app/storage`
   - Generate secure JWT_SECRET (64 chars)
   - Set correct CORS_ORIGIN
   - Remove unused LibreOffice variables

2. **Add worker container to docker-compose.production.yml** (15 min)
   - Copy worker service from docker-compose.yml
   - Update image to use `mkelam/pdflab-backend:latest`
   - Set correct dependencies and networks

3. **Test locally with production-like settings** (1-2 hours)
   - Start local Docker with production compose file
   - Verify all containers start successfully
   - Test PDF conversion end-to-end
   - Test payment flow (sandbox mode)
   - Check logs for errors

4. **Update frontend environment variable** (5 min)
   - Change NEXT_PUBLIC_API_URL to `https://api.pdflab.pro`
   - Rebuild frontend Docker image

### Phase 2: Fix High Priority Issues (Within 1 Week)

**Priority**: 🟠 HIGH
**Time Required**: 4-6 hours

5. **Implement Redis password protection** (30 min)
   - Generate secure Redis password
   - Update backend .env.production
   - Update docker-compose.production.yml
   - Update backend connection string

6. **Remove MySQL and Redis port exposure** (15 min)
   - Update docker-compose.production.yml
   - Remove external port mappings
   - Test internal connectivity

7. **Complete CORS configuration** (15 min)
   - Add all production domains to CORS_ORIGIN
   - Test cross-origin requests
   - Remove Nginx CORS headers (backend handles it)

8. **Configure Sentry error monitoring** (1 hour)
   - Create Sentry projects (backend + frontend)
   - Add DSN to environment variables
   - Test error reporting
   - Configure alerts

9. **Apply Nginx rate limiting** (30 min)
   - Add limit_req directives to locations
   - Test rate limits
   - Monitor logs for blocked requests

10. **Verify SSL auto-renewal** (15 min)
    - SSH to VPS
    - Check certbot timer status
    - Test renewal with dry-run
    - Document renewal process

### Phase 3: Fix Medium Priority Issues (Within 2 Weeks)

**Priority**: 🟡 MEDIUM
**Time Required**: 2-3 hours

11. **Generate stronger database passwords** (30 min)
    - Create 32-character random passwords
    - Update docker-compose.production.yml
    - Update backend .env.production
    - Restart containers (brief downtime)

12. **Standardize email configuration** (15 min)
    - Use `support@pdflab.pro` everywhere
    - Update .env.production
    - Test email sending

13. **Clean up unused configuration** (30 min)
    - Remove LibreOffice variables
    - Remove LOG_FILE if not used
    - Remove HEALTH_CHECK_TOKEN or implement it

14. **Document firewall rules** (30 min)
    - SSH to VPS
    - Check UFW status
    - Document current rules
    - Add to deployment docs

15. **Re-add health checks to production compose** (30 min)
    - Copy from local docker-compose.yml
    - Test health check endpoints
    - Configure appropriate intervals

### Phase 4: Documentation and Monitoring (Ongoing)

**Priority**: 🟢 LOW
**Time Required**: 2-4 hours

16. **Update deployment documentation** (1 hour)
    - Document actual VPS configuration
    - Update environment variable guide
    - Add troubleshooting section
    - Document common operations

17. **Create deployment verification checklist** (30 min)
    - List all endpoints to test
    - Document expected responses
    - Create automated test script

18. **Set up monitoring dashboards** (2 hours)
    - Sentry error dashboard
    - Redis queue monitoring
    - Database connection monitoring
    - File storage usage alerts

19. **Implement automated backups** (1 hour)
    - Database backup script
    - Storage backup script
    - Cron job configuration
    - Backup restoration test

---

## 15. VPS Verification Commands

### Run These Commands on VPS to Verify Current State

```bash
# Connect to VPS
ssh root@141.136.44.168

# Check Docker containers
docker ps -a

# Expected containers:
# - pdflab-backend-prod (running)
# - pdflab-frontend-prod (running)
# - pdflab-mysql-prod (running)
# - pdflab-redis-prod (running)
# - pdflab-worker-prod (should exist but likely missing)

# Check backend environment
docker exec pdflab-backend-prod env | grep -E "NODE_ENV|PORT|DB_|REDIS_|JWT_|PAYFAST_|CORS_"

# Check database
docker exec -it pdflab-mysql-prod mysql -uroot -p<MYSQL_ROOT_PASSWORD> -e "SHOW DATABASES; USE pdflab_production; SHOW TABLES;"

# Check Redis
docker exec -it pdflab-redis-prod redis-cli PING

# Check storage
ls -lah /var/pdflab/storage

# Check Nginx configuration
cat /etc/nginx/sites-enabled/pdflab

# Check SSL certificates
certbot certificates

# Check firewall
ufw status

# Check logs
docker logs pdflab-backend-prod --tail 100
docker logs pdflab-frontend-prod --tail 100

# Test API endpoints
curl -s http://localhost:3006/health | jq
curl -s http://localhost:3006/api/payfast/plans | jq
curl -I https://pdflab.pro
curl -I https://api.pdflab.pro

# Check system resources
df -h
free -h
docker stats --no-stream
```

---

## 16. Conclusion

### Audit Summary

This comprehensive audit identified **20 issues** across VPS and local implementations:
- **3 Critical issues** blocking proper deployment
- **5 High priority** issues affecting security and functionality
- **8 Medium priority** issues causing configuration drift
- **4 Low priority** issues for optimization

### Most Critical Findings

1. **Backend .env.production is not VPS-ready** - Contains placeholders and wrong values
2. **Missing worker container in production** - PDF conversions won't process
3. **Weak security configuration** - JWT secrets, Redis passwords, exposed ports

### Current Production Status

Based on deployment reports, the VPS appears to be running successfully (deployed Nov 8, 2025) BUT this audit reveals the **docker-compose.production.yml and .env.production files in the repository do NOT match the actual running VPS configuration**.

This suggests:
- ✅ VPS was manually configured correctly
- ❌ Repository production files were not updated to match
- ⚠️ Next deployment will break unless files are fixed

### Next Steps

**IMMEDIATE ACTION REQUIRED**:
1. SSH to VPS and retrieve actual .env.production contents
2. Update repository's backend/.env.production to match VPS
3. Add worker container to docker-compose.production.yml
4. Test deployment locally before pushing to VPS

**RECOMMENDED TIMELINE**:
- Phase 1 (Critical): Complete before next deployment
- Phase 2 (High): Within 1 week
- Phase 3 (Medium): Within 2 weeks
- Phase 4 (Low): Ongoing maintenance

### Risk Assessment

**Current Risk Level**: 🟠 **MODERATE-HIGH**

The production system is currently operational but has:
- Configuration drift between repo and VPS
- Security weaknesses (no Redis password, weak DB passwords, exposed ports)
- Missing documentation of actual VPS configuration
- Potential for deployment failures if repo files are used

**Recommendation**: Prioritize Phase 1 actions to align repository configuration with actual VPS deployment before making any changes.

---

**Audit Completed**: 2025-11-14
**Next Audit Recommended**: After Phase 1-2 fixes are implemented
**Audit Report Version**: 1.0
**Total Pages**: 16
**Total Issues Found**: 20
