# 🛡️ DOCKER DEPLOYMENT GUARDIAN - GOOGLE OAUTH SCAN RESULTS
**Generated**: 2025-11-18 | **Mission**: Deploy Google OAuth with Zero Downtime

═══════════════════════════════════════════════
## 📊 SCAN SCOPE
═══════════════════════════════════════════════

- **Dockerfile**: `backend/Dockerfile` (Alpine Linux multi-stage)
- **Compose**: `docker-compose.production.yml` (VPS deployment)
- **Stack**: Node.js 20 + Express + TypeScript + Passport.js
- **Services**: Backend API, Worker, MySQL, Redis
- **New Dependencies**: passport, passport-google-oauth20, passport-oauth2, axios

═══════════════════════════════════════════════
## 🚨 CRITICAL FINDINGS: 2
═══════════════════════════════════════════════

### CRITICAL #1: Missing Static Assets (passport.js, auth.google.routes.js)
**What's Wrong:**
The production backend container is **missing the Google OAuth implementation entirely**.

**Evidence from VPS:**
```bash
# Production container inspection:
$ docker exec pdflab-backend-prod ls /app/dist/config/
✅ database.js
✅ logger.js
✅ redis.js
❌ passport.js  # MISSING - Required for Google OAuth

$ docker exec pdflab-backend-prod ls /app/dist/routes/
✅ auth.routes.js
❌ auth.google.routes.js  # MISSING - Google OAuth routes
❌ auth.linkedin.routes.js  # MISSING - LinkedIn OAuth routes
```

**Why It's Dangerous:**
- **Historical Incident**: Missing views folder caused 100% production outage (Nov 2025)
- Users clicking "Sign in with Google" will get 404 or crash
- No error logging because routes don't exist to fail
- Silent failure - frontend shows button, backend has no handler

**How to Fix:**
The files exist locally but were never deployed. This is a **deployment sync issue**, not a build issue.

```bash
# Step 1: Verify local build includes files
ls backend/dist/config/passport.js       # ✅ Should exist
ls backend/dist/routes/auth.google.routes.js  # ✅ Should exist

# Step 2: Rebuild Docker image with new files
cd /root/pdflab-deploy
git pull origin master  # Get latest code
cd backend
npm install passport passport-google-oauth20 passport-oauth2 axios
npm run build  # Rebuild TypeScript

# Step 3: Rebuild Docker container
cd ..
docker build -t mkelam/pdflab-backend:latest -f backend/Dockerfile backend/

# Step 4: Restart with zero downtime
docker-compose -f docker-compose.production.yml up -d pdflab-backend-prod
```

---

### CRITICAL #2: Native Module Rebuild - Passport Dependencies
**What's Wrong:**
Adding new dependencies (passport, passport-google-oauth20) that may contain native bindings requires explicit rebuild on Alpine Linux.

**Current Dockerfile:**
```dockerfile
# Line 31-33: Production stage
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt && \  # ✅ Only rebuilds bcrypt
    npm cache clean --force
```

**Why It's Dangerous:**
- **Historical Failure**: bcrypt native bindings failed in production (Nov 5, 2025) - caused 100% authentication failure
- Passport dependencies might have native modules that need Alpine-specific compilation
- `--ignore-scripts` prevents post-install compilation
- Currently only rebuilding `bcrypt`, not checking for other native modules

**How to Fix:**
```dockerfile
# ✅ IMPROVED: Check all new dependencies for native bindings
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm rebuild passport --build-from-source && \
    npm rebuild passport-google-oauth20 --build-from-source && \
    npm cache clean --force

# ✅ VERIFICATION: Test all native modules load
RUN node -e "
  require('bcrypt');
  require('passport');
  require('passport-google-oauth20');
  console.log('✅ All native modules OK');
"
```

**Post-Build Verification (MANDATORY):**
```bash
# Test in running container BEFORE deployment
docker run --rm mkelam/pdflab-backend:latest node -e "
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
console.log('✅ passport OK');
console.log('✅ passport-google-oauth20 OK');
console.log('✅ bcrypt OK');
"

# Expected output:
# ✅ passport OK
# ✅ passport-google-oauth20 OK
# ✅ bcrypt OK

# If you see "Cannot find module" → REBUILD REQUIRED
```

═══════════════════════════════════════════════
## ⚠️  HIGH PRIORITY: 3
═══════════════════════════════════════════════

### HIGH #1: Environment Variable Validation
**What's Wrong:**
Google OAuth requires 3 new environment variables that are **NOT** currently in production .env:

```env
# MISSING in production:
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
FRONTEND_URL=https://pdflab.pro  # Needed for OAuth redirects
```

**Red Flags:**
- ❌ No validation that GOOGLE_CLIENT_ID is set
- ❌ passport.ts uses fallback: `process.env.GOOGLE_CLIENT_ID || ''`
- ❌ Silent failure - will redirect to Google with empty client ID

**How to Fix:**
```bash
# Step 1: Add to production .env
ssh root@141.136.44.168
nano /root/pdflab-deploy/backend/.env

# Add these lines:
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
FRONTEND_URL=https://pdflab.pro

# Step 2: Restart container to load new env vars
docker-compose -f docker-compose.production.yml restart pdflab-backend-prod
```

**Startup Validation (Add to server.ts):**
```typescript
// Add at server startup
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_HOST',
  'REDIS_HOST',
  'GOOGLE_CLIENT_ID',  // NEW
  'GOOGLE_CLIENT_SECRET',  // NEW
  'GOOGLE_CALLBACK_URL'  // NEW
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ CRITICAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

---

### HIGH #2: Database Schema Migration
**What's Wrong:**
Users table needs 2 new columns for OAuth IDs:

```sql
-- MISSING columns in production database:
google_id VARCHAR(255) UNIQUE
linkedin_id VARCHAR(255) UNIQUE
```

**Evidence:**
- Local code references `user.google_id` (passport.ts:34, 38)
- Production database schema was checked Nov 16, doesn't have these columns
- Will cause **runtime SQL errors** when Google OAuth tries to save user

**Why It's Dangerous:**
- User signs in with Google → backend creates user → SQL error "Unknown column 'google_id'"
- No rollback - user thinks they're signed up but record isn't saved
- Error logged but user gets generic "authentication failed" message

**How to Fix:**
```bash
# Step 1: Connect to production MySQL
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production

# Step 2: Add columns (idempotent - won't fail if exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE;

# Step 3: Verify columns exist
DESCRIBE users;
# Should show: google_id, linkedin_id

# Step 4: Exit MySQL
exit;
```

**Verification:**
```bash
# Check columns were added
docker exec pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e "DESCRIBE users" | grep "google_id\|linkedin_id"

# Expected output:
# google_id       varchar(255)    YES             NULL
# linkedin_id     varchar(255)    YES             NULL
```

---

### HIGH #3: Health Check Validation
**What's Wrong:**
Current health check only tests basic HTTP response, doesn't verify Google OAuth routes exist.

**Current Health Check:**
```dockerfile
# Line 45-46: Basic health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

**Issue:**
- Container marked "healthy" even if Google OAuth routes are missing
- Health endpoint (`/health`) doesn't test Passport.js initialization
- Won't detect if `passport.js` failed to load

**How to Fix:**
Create comprehensive health check that validates OAuth readiness:

```typescript
// backend/src/routes/health.routes.ts (NEW or ENHANCED)
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'OK',
      redis: 'OK',
      passport: 'UNKNOWN',
      googleOAuth: 'UNKNOWN'
    }
  };

  // Check if Passport is loaded
  try {
    const passport = require('../config/passport');
    health.checks.passport = passport ? 'OK' : 'FAILED';
  } catch (error) {
    health.checks.passport = 'FAILED';
    health.status = 'DEGRADED';
  }

  // Check if Google OAuth routes are registered
  try {
    const googleRoutes = require('../routes/auth.google.routes');
    health.checks.googleOAuth = googleRoutes ? 'OK' : 'FAILED';
  } catch (error) {
    health.checks.googleOAuth = 'FAILED';
    health.status = 'DEGRADED';
  }

  res.status(health.status === 'OK' ? 200 : 503).json(health);
});
```

═══════════════════════════════════════════════
## 💡 OPTIMIZATIONS: 4
═══════════════════════════════════════════════

### OPTIMIZATION #1: Logging Enhancement (Already Done ✅)
**What Was Added:**
- `[Google OAuth]` logs in passport.ts (10+ statements)
- `[Google Routes]` logs in auth.google.routes.ts (8+ statements)
- Comprehensive flow tracking from initial request → user creation → token generation → redirect

**Value:**
- Faster debugging when issues occur
- Real-time monitoring of Google OAuth usage
- Pattern detection for optimization opportunities

---

### OPTIMIZATION #2: Build Cache Optimization
**Current Issue:**
Multi-stage build installs dependencies twice (builder stage + production stage)

**Optimization:**
```dockerfile
# ✅ OPTIMIZED: Share dependency installation
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++  # Install once
COPY package*.json ./

FROM base AS builder
RUN npm ci  # All deps
COPY tsconfig.json src ./
RUN npm run build

FROM base AS production
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcrypt
COPY --from=builder /app/dist ./dist
```

**Benefit:**
- Faster builds (reuses base layer)
- Consistent environment between builder and production
- Build tools installed once

---

### OPTIMIZATION #3: Deployment Monitoring
**Add Post-Deployment Verification:**

```bash
#!/bin/bash
# deploy-google-oauth.sh

set -e  # Exit on error

echo "🚀 Starting Google OAuth Deployment..."

# Step 1: Build new image
docker build -t mkelam/pdflab-backend:google-oauth -f backend/Dockerfile backend/

# Step 2: Test Google OAuth in new image
echo "🧪 Testing Google OAuth in new image..."
docker run --rm mkelam/pdflab-backend:google-oauth node -e "
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
console.log('✅ Google OAuth modules loaded');
" || { echo "❌ Module test failed"; exit 1; }

# Step 3: Tag as latest
docker tag mkelam/pdflab-backend:google-oauth mkelam/pdflab-backend:latest

# Step 4: Restart with zero downtime
echo "🔄 Deploying to production..."
docker-compose -f docker-compose.production.yml up -d pdflab-backend-prod

# Step 5: Wait for health check
echo "⏳ Waiting for health check..."
sleep 40

# Step 6: Verify Google OAuth endpoint
echo "✅ Verifying Google OAuth endpoint..."
response=$(curl -I https://pdflab.pro/api/auth/google 2>&1)
if echo "$response" | grep -q "302"; then
  echo "✅ Google OAuth endpoint responding (302 redirect to Google)"
else
  echo "❌ Google OAuth endpoint not working"
  echo "$response"
  exit 1
fi

# Step 7: Check logs for errors
echo "📋 Checking logs for errors..."
errors=$(docker logs pdflab-backend-prod --since 2m 2>&1 | grep -i "error\|fatal\|exception" | wc -l)
if [ "$errors" -gt 5 ]; then
  echo "⚠️  Warning: $errors errors found in logs"
  docker logs pdflab-backend-prod --since 2m 2>&1 | grep -i "error\|fatal\|exception"
else
  echo "✅ No critical errors in logs"
fi

echo "🎉 Deployment complete!"
```

---

### OPTIMIZATION #4: Rollback Plan
**Create Automated Rollback:**

```bash
#!/bin/bash
# rollback-google-oauth.sh

set -e

echo "🔙 Rolling back Google OAuth deployment..."

# Get previous stable image
PREVIOUS_IMAGE=$(docker images mkelam/pdflab-backend --format "{{.ID}}" | sed -n '2p')

if [ -z "$PREVIOUS_IMAGE" ]; then
  echo "❌ No previous image found"
  exit 1
fi

echo "📦 Rolling back to image: $PREVIOUS_IMAGE"

# Tag previous image as latest
docker tag "$PREVIOUS_IMAGE" mkelam/pdflab-backend:latest

# Restart container
docker-compose -f docker-compose.production.yml up -d pdflab-backend-prod

# Wait for health check
sleep 40

# Verify rollback
if docker ps | grep -q "pdflab-backend-prod.*healthy"; then
  echo "✅ Rollback successful - container healthy"
else
  echo "❌ Rollback failed - container unhealthy"
  exit 1
fi

echo "🎉 Rollback complete"
```

═══════════════════════════════════════════════
## FINAL VERDICT
═══════════════════════════════════════════════

**Production Ready**: ❌ **BLOCKED**
**Risk Level**: **HIGH** (2 critical issues)
**Estimated Fix Time**: 15-20 minutes
**Downtime Required**: <2 minutes (container restart)

### BLOCKERS (Must Fix Before Deployment):
1. ❌ **CRITICAL**: Deploy passport.js and auth.google.routes.js to production
2. ❌ **CRITICAL**: Add database columns (google_id, linkedin_id)
3. ⚠️  **HIGH**: Add environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.)

### RECOMMENDED (Fix During Deployment):
4. ⚠️  Add startup environment validation
5. ⚠️  Enhance health check to test OAuth routes
6. 💡 Add deployment monitoring script

═══════════════════════════════════════════════
## NEXT ACTIONS
═══════════════════════════════════════════════

### Phase 1: Pre-Deployment (Local) - 5 min
```bash
# 1. Verify local build has Google OAuth files
cd backend
npm install passport passport-google-oauth20 passport-oauth2 axios
npm run build
ls dist/config/passport.js  # ✅ Should exist
ls dist/routes/auth.google.routes.js  # ✅ Should exist

# 2. Test native modules locally
node -e "require('./dist/config/passport'); console.log('✅ Passport loads')"
```

### Phase 2: VPS Preparation - 5 min
```bash
# 1. SSH to VPS
ssh root@141.136.44.168

# 2. Update code
cd /root/pdflab-deploy
git pull origin master

# 3. Install dependencies
cd backend
npm install

# 4. Add environment variables
nano .env
# Add: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, FRONTEND_URL

# 5. Database migration
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e "
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE;
"
```

### Phase 3: Deployment - 5 min
```bash
# 1. Build new image
cd /root/pdflab-deploy
docker build -t mkelam/pdflab-backend:latest -f backend/Dockerfile backend/

# 2. Test native modules in new image
docker run --rm mkelam/pdflab-backend:latest node -e "
require('passport');
require('passport-google-oauth20');
require('bcrypt');
console.log('✅ All modules OK');
"

# 3. Restart production (zero downtime)
docker-compose -f docker-compose.production.yml up -d pdflab-backend-prod pdflab-worker-prod

# 4. Wait for health check
sleep 40
docker ps | grep pdflab-backend-prod  # Should show "healthy"
```

### Phase 4: Verification - 3 min
```bash
# 1. Test Google OAuth endpoint
curl -I https://pdflab.pro/api/auth/google
# Expected: HTTP/1.1 302 Found (redirect to Google)

# 2. Check logs for Google OAuth initialization
docker logs pdflab-backend-prod | grep -i "google\|passport"

# 3. Manual browser test
# Visit: https://pdflab.pro/login
# Click: "Continue with Google"
# Should redirect to Google OAuth consent screen

# 4. Monitor logs during login attempt
docker logs pdflab-backend-prod -f | grep "Google"
# Should see:
# [Google Routes] /auth/google route accessed
# [Google Routes] Redirecting to Google OAuth...
# [Google OAuth] Callback received
# [Google OAuth] Email: test@example.com
# [Google Routes] User authenticated: test@example.com
```

═══════════════════════════════════════════════
## PRODUCTION READINESS SCORE: 4/10
═══════════════════════════════════════════════

✅ Native module rebuild configured (bcrypt)
✅ Multi-stage Docker build
✅ Health checks configured
✅ Alpine Linux optimization
⚠️  Logging added (local only, not deployed)
⚠️  Environment variables documented
⚠️  Database migration documented
❌ **CRITICAL**: Google OAuth files not deployed
❌ **CRITICAL**: Database schema not updated
❌ **HIGH**: Environment variables not in production

**Status**: Ready for deployment after fixing critical blockers

═══════════════════════════════════════════════

**Generated by Docker Deployment Guardian** | **Nov 18, 2025**
