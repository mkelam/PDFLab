# Google OAuth Deployment Checklist - November 18, 2025

## 🔍 Issue Identified

The VPS production environment is **missing the Google OAuth implementation** entirely. The following files exist locally but were never deployed:

### Missing Files on Production:
1. `backend/src/config/passport.ts` - Passport Google/LinkedIn strategies
2. `backend/src/routes/auth.google.routes.ts` - Google OAuth routes
3. `backend/dist/config/passport.js` - Compiled passport config
4. `backend/dist/routes/auth.google.routes.js` - Compiled Google routes

### Current Production State:
- ❌ No `passport.ts` in `/app/dist/config/`
- ❌ No `auth.google.routes.js` in `/app/dist/routes/`
- ✅ Backend is running (`pdflab-backend-prod` container healthy)
- ✅ Database and Redis are operational

---

## ✨ Local Changes Made (With Logging)

### 1. `backend/src/config/passport.ts`
**Added comprehensive logging:**
- `[Google OAuth] Callback received` - When Google redirects back
- `[Google OAuth] Profile ID: {id}` - Google user ID
- `[Google OAuth] Email: {email}` - User email from Google
- `[Google OAuth] User lookup: Found existing user / New user`
- `[Google OAuth] Creating new user: {email}` - When creating account
- `[Google OAuth] ✅ New user created: {id}` - Success message
- `[Google OAuth] Linking existing user to Google: {id}` - When linking
- `[Google OAuth] ✅ User linked to Google` - Link success
- `[Google OAuth] ✅ User already linked to Google` - Already linked
- `[Google OAuth] ERROR: {error}` - Any errors

### 2. `backend/src/routes/auth.google.routes.ts`
**Added comprehensive logging:**
- `[Google Routes] /auth/google route accessed` - Initial OAuth request
- `[Google Routes] Redirecting to Google OAuth...` - Before redirect
- `[Google Routes] Callback route hit` - When Google calls back
- `[Google Routes] ERROR: No user in request` - If auth failed
- `[Google Routes] User authenticated: {email}` - Auth success
- `[Google Routes] Generating JWT tokens` - Token generation start
- `[Google Routes] Tokens generated successfully` - Token success
- `[Google Routes] Last login updated` - After DB update
- `[Google Routes] Redirecting to: {url}` - Final frontend redirect

---

## 📦 Files to Deploy

### Backend Source Files:
```
backend/src/config/passport.ts                    (DEPLOY - Google OAuth strategy)
backend/src/routes/auth.google.routes.ts          (DEPLOY - Google OAuth routes)
backend/src/controllers/auth.controller.ts        (DEPLOY - Has XSS fixes too)
backend/src/utils/sanitize.utils.ts               (DEPLOY - XSS protection)
backend/src/middleware/ratelimit.middleware.ts    (DEPLOY - Rate limit fixes)
```

### Backend Dependencies (package.json):
```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "passport-oauth2": "^1.8.0",
  "axios": "^1.7.9"
}
```

### Environment Variables (.env):
```env
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://pdflab.pro
```

### Database Migration:
```sql
-- Add google_id column to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) UNIQUE;
```

---

## 🚀 Deployment Steps

### Step 1: Verify Local Build
```bash
cd backend
npm install  # Install passport dependencies if missing
npm run build  # Compile TypeScript
```

**Verify files exist:**
```bash
ls backend/dist/config/passport.js
ls backend/dist/routes/auth.google.routes.js
```

### Step 2: Check Server Registration
**File: `backend/src/server.ts`**

Ensure Google routes are registered:
```typescript
import googleAuthRoutes from './routes/auth.google.routes'
app.use('/api', googleAuthRoutes)
```

### Step 3: Upload Files to VPS
```bash
# SSH into VPS
ssh root@141.136.44.168

# Navigate to deployment directory
cd /root/pdflab-deploy  # Or wherever you deploy from

# Upload via git or scp
git pull origin master  # If using git
# OR
scp -r backend/src root@141.136.44.168:/root/pdflab-deploy/backend/src
```

### Step 4: Install Dependencies
```bash
# Inside VPS
cd /root/pdflab-deploy/backend
npm install passport passport-google-oauth20 passport-oauth2 axios
```

### Step 5: Build Backend
```bash
cd /root/pdflab-deploy/backend
npm run build
```

### Step 6: Update Environment Variables
```bash
# Edit production .env
nano /root/pdflab-deploy/backend/.env
```

Add Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
FRONTEND_URL=https://pdflab.pro
```

### Step 7: Database Migration
```bash
# Connect to production MySQL
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production

# Run migrations
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) UNIQUE;
exit
```

### Step 8: Rebuild and Restart Docker Container
```bash
# Rebuild backend image
cd /root/pdflab-deploy
docker build -t mkelam/pdflab-backend:latest -f Dockerfile.backend backend/

# Stop and restart backend
docker stop pdflab-backend-prod pdflab-worker-prod
docker rm pdflab-backend-prod pdflab-worker-prod

# Restart with docker-compose
docker-compose -f docker-compose.production.yml up -d pdflab-backend-prod pdflab-worker-prod
```

### Step 9: Verify Deployment
```bash
# Check container logs
docker logs pdflab-backend-prod --tail 50

# Verify routes exist
docker exec pdflab-backend-prod ls /app/dist/routes/ | grep google
docker exec pdflab-backend-prod ls /app/dist/config/ | grep passport

# Test OAuth endpoint
curl -I https://pdflab.pro/api/auth/google
# Should return: HTTP/1.1 302 Found (redirect to Google)
```

### Step 10: Test Google Login Flow
1. Visit: https://pdflab.pro/login
2. Click "Continue with Google"
3. Authorize with Google account
4. Check backend logs for Google OAuth logging:
   ```bash
   docker logs pdflab-backend-prod -f | grep "Google"
   ```
5. Should see:
   ```
   [Google Routes] /auth/google route accessed
   [Google Routes] Redirecting to Google OAuth...
   [Google OAuth] Callback received
   [Google OAuth] Email: {your-email}
   [Google OAuth] User lookup: Found existing user / New user
   [Google Routes] User authenticated: {your-email}
   [Google Routes] Tokens generated successfully
   [Google Routes] Redirecting to: https://pdflab.pro/auth/callback
   ```

---

## ✅ Verification Checklist

### Pre-Deployment:
- [x] Local build successful (`backend/dist/` contains Google OAuth files)
- [x] Logging added to passport.ts
- [x] Logging added to auth.google.routes.ts
- [ ] server.ts registers Google routes
- [ ] Dependencies documented (passport, passport-google-oauth20, axios)

### During Deployment:
- [ ] Files uploaded to VPS
- [ ] Dependencies installed on VPS
- [ ] Backend rebuilt on VPS
- [ ] Environment variables added to production .env
- [ ] Database migration executed
- [ ] Docker container rebuilt
- [ ] Container restarted successfully

### Post-Deployment:
- [ ] Container logs show no errors
- [ ] `/api/auth/google` endpoint returns 302 redirect
- [ ] Google login flow completes successfully
- [ ] User created in database with google_id
- [ ] Tokens generated and returned
- [ ] Dashboard loads after login
- [ ] Logs show all Google OAuth messages

---

## 🐛 Troubleshooting

### "No such file: passport.js"
- **Cause**: Passport config not built
- **Fix**: Run `npm run build` in backend directory

### "Cannot find module 'passport-google-oauth20'"
- **Cause**: Missing npm dependency
- **Fix**: `npm install passport-google-oauth20`

### "Redirect URI mismatch"
- **Cause**: Google Cloud Console doesn't have correct callback URL
- **Fix**: Add `https://pdflab.pro/api/auth/google/callback` to Google Console

### "google_id column doesn't exist"
- **Cause**: Database migration not run
- **Fix**: Run `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;`

### No logs appearing
- **Cause**: Old container still running without new code
- **Fix**: Rebuild Docker image and restart container

---

## 📊 Current Status

### Local Environment: ✅ READY
- Google OAuth code written
- Comprehensive logging added
- TypeScript compiled successfully
- Dependencies documented

### Production Environment: ❌ MISSING GOOGLE OAUTH
- No passport.ts in production
- No auth.google.routes.ts in production
- Database columns missing (google_id, linkedin_id)
- Environment variables missing

### Next Action: 🚀 DEPLOY
Follow deployment steps above to sync local changes to production.

---

**Generated**: 2025-11-18
**Status**: Local changes complete, awaiting deployment
**Priority**: High (Google login feature incomplete on production)
