# Google OAuth - Quick Deployment Guide

## 🎯 What's Missing on Production

The VPS **does NOT have Google OAuth code** at all. These files need to be deployed:

### Missing Files:
```
✅ Local (exists)          ❌ Production (missing)
backend/src/config/passport.ts → /app/dist/config/passport.js
backend/src/routes/auth.google.routes.ts → /app/dist/routes/auth.google.routes.js
```

### Logging Added (Local):
- ✅ `[Google OAuth]` logs in passport.ts (user creation, linking, errors)
- ✅ `[Google Routes]` logs in auth.google.routes.ts (route access, tokens, redirects)

---

## 🚀 Quick Deploy (Copy-Paste Commands)

### 1. Connect to VPS
```bash
ssh root@141.136.44.168
```

### 2. Navigate to Project
```bash
cd /root/pdflab-deploy
# OR find your deployment directory:
# docker inspect pdflab-backend-prod | grep -i "workingdir"
```

### 3. Pull Latest Code (if using git)
```bash
git pull origin master
```

### 4. Install Missing Dependencies
```bash
cd backend
npm install passport passport-google-oauth20 passport-oauth2 axios
```

### 5. Build Backend
```bash
npm run build
```

### 6. Verify Files Built
```bash
ls dist/config/passport.js     # Should exist now
ls dist/routes/auth.google.routes.js  # Should exist now
```

### 7. Update Environment (.env)
```bash
nano .env
```

Add these lines:
```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback
FRONTEND_URL=https://pdflab.pro
```

Save (Ctrl+O, Enter, Ctrl+X)

### 8. Database Migration
```bash
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE; ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) UNIQUE;"
```

### 9. Rebuild Docker Image
```bash
cd /root/pdflab-deploy
docker build -t mkelam/pdflab-backend:latest -f Dockerfile.backend backend/
```

### 10. Restart Backend
```bash
docker-compose -f docker-compose.production.yml restart pdflab-backend-prod pdflab-worker-prod
```

### 11. Watch Logs for Errors
```bash
docker logs pdflab-backend-prod -f
```

Press Ctrl+C when you see "Server running on port 3006"

### 12. Test Google OAuth Endpoint
```bash
curl -I https://pdflab.pro/api/auth/google
```

Should return:
```
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?...
```

---

## ✅ Verification

### Test Full Login Flow:
1. Open: https://pdflab.pro/login
2. Click "Continue with Google"
3. Authorize with Google
4. Should redirect to dashboard

### Check Logs:
```bash
docker logs pdflab-backend-prod | grep "Google"
```

Should see:
```
[Google Routes] /auth/google route accessed
[Google Routes] Redirecting to Google OAuth...
[Google OAuth] Callback received
[Google OAuth] Email: your-email@gmail.com
[Google OAuth] User lookup: New user (or Found existing user)
[Google Routes] User authenticated: your-email@gmail.com
[Google Routes] Tokens generated successfully
[Google Routes] Redirecting to: https://pdflab.pro/auth/callback
```

---

## 🐛 Common Issues

### "Cannot find module 'passport'"
```bash
cd /root/pdflab-deploy/backend
npm install
```

### "Column google_id doesn't exist"
```bash
docker exec -it pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;"
```

### "Redirect URI mismatch"
- Google Cloud Console must have: `https://pdflab.pro/api/auth/google/callback`
- Check at: https://console.cloud.google.com/apis/credentials

### No logs appearing
```bash
# Rebuild and restart completely
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## 📊 Summary

**Problem**: Google OAuth code exists locally but never deployed to production
**Solution**: Deploy passport.ts + auth.google.routes.ts + dependencies + env vars
**Time**: ~10 minutes
**Downtime**: <2 minutes (during restart)

**Status**: Ready to deploy ✅

---

Generated: 2025-11-18
See full checklist: GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md
