# Monitoring Dashboard Authentication & API URL Fix - Complete

**Date**: 2025-11-17
**Status**: ✅ **RESOLVED AND DEPLOYED**

## Summary

Fixed two critical issues with the monitoring dashboard:
1. **Authentication Pattern Mismatch** - Dashboard using wrong auth method
2. **Hardcoded HTTP URL** - Mixed content errors blocking all API calls

---

## Issue 1: Authentication Pattern Mismatch

### Problem
The monitoring dashboard ([app/admin/monitoring/page.tsx](app/admin/monitoring/page.tsx)) was using session-based authentication (`credentials: 'include'`) instead of the JWT token pattern used by all other admin pages.

**User Feedback**:
> "the fact i have access to the admin page means i already am logged in why should i be authenticated multiple times"

### Root Cause
- Monitoring page: `credentials: 'include'` ❌
- Other admin pages: `Authorization: Bearer ${token}` ✅
- Result: 401 Unauthorized errors on all monitoring endpoints

### Solution
Updated [app/admin/monitoring/page.tsx](app/admin/monitoring/page.tsx:44-48):

```typescript
// Added helper function
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// Updated all 11 fetch calls from:
fetch(`${API_URL}/api/admin/monitoring/dashboard`, {
  credentials: 'include'  // ❌ WRONG
})

// To:
fetch(`${API_URL}/api/admin/monitoring/dashboard`, {
  headers: getAuthHeaders()  // ✅ CORRECT
})
```

**Functions Updated**:
1. `fetchDashboardData()` - Dashboard overview
2. `fetchHealthChecks()` - Health check history
3. `fetchDriftChecks()` - Drift detection history
4. `fetchAlerts()` - Active alerts
5. `acknowledgeAlert()` - Mark alert acknowledged
6. `resolveAlert()` - Mark alert resolved
7. `fetchResourceMetrics()` - CPU/Memory/Disk metrics
8. `fetchRemediationLog()` - Autonomous remediation log
9. Service management buttons:
   - Baseline calculation
   - Daily report
   - Security scan
   - IP blocking

---

## Issue 2: Hardcoded HTTP URL in Dockerfile

### Problem
Browser console showed:
```
Mixed Content: The page at 'https://pdflab.pro/login' was loaded over HTTPS,
but requested an insecure resource 'http://141.136.44.168:3006/health'.
```

All API calls failing with "Failed to fetch" due to HTTP/HTTPS mismatch.

### Root Cause
The Dockerfile had a hardcoded default value for the build argument:

**File**: `/var/pdflab/app/Dockerfile.frontend:17`
```dockerfile
ARG NEXT_PUBLIC_API_URL=http://141.136.44.168:3006  # ❌ WRONG
```

Next.js bakes environment variables at **build time**, so this hardcoded HTTP URL was being compiled into all JavaScript files, overriding the `.env.production` file.

### Solution Steps

#### Step 1: Fixed Dockerfile Default
```bash
# Changed line 17 from:
ARG NEXT_PUBLIC_API_URL=http://141.136.44.168:3006

# To:
ARG NEXT_PUBLIC_API_URL=https://pdflab.pro
```

#### Step 2: Added to .env.production
```bash
echo 'NEXT_PUBLIC_API_URL=https://pdflab.pro' >> /var/pdflab/app/.env.production
```

#### Step 3: Rebuilt Docker Image
```bash
cd /var/pdflab/app
docker build --no-cache -t mkelam/pdflab-frontend:latest -f Dockerfile.frontend .
```

#### Step 4: Recreated Container
```bash
docker stop pdflab-frontend-prod
docker rm pdflab-frontend-prod
docker run -d --name pdflab-frontend-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --network app_pdflab-network \
  mkelam/pdflab-frontend:latest
```

### Verification
```bash
# Confirmed new layout file has HTTPS URL
docker exec pdflab-frontend-prod grep -o 'https://pdflab.pro' \
  /app/.next/static/chunks/app/layout-ccab8092c1adfbdb.js

# Output: https://pdflab.pro (repeated 5 times) ✅
```

---

## Browser Cache Resolution

### Challenge
Even after deploying the fix, users saw cached JavaScript with old URLs.

### Solution
Required aggressive cache clearing:
1. **Service Worker unregistration** (Application tab → Service Workers → Unregister)
2. **Clear site data** (Application tab → Storage → Clear site data)
3. **Hard refresh** (Ctrl+Shift+R or Ctrl+F5)
4. **Alternative**: Incognito/Private window

---

## Files Modified

### Local Files
- [app/admin/monitoring/page.tsx](app/admin/monitoring/page.tsx) - Updated authentication pattern

### VPS Files
- `/var/pdflab/app/Dockerfile.frontend` - Fixed ARG default value
- `/var/pdflab/app/.env.production` - Added NEXT_PUBLIC_API_URL

---

## Deployment Details

**Container**: pdflab-frontend-prod
**Container ID**: 55aeb0fb6754
**Image**: mkelam/pdflab-frontend:latest (7da565215371)
**Build Date**: 2025-11-17 08:08:30 UTC
**Production URL**: https://pdflab.pro

---

## Testing Results

### Before Fix
❌ Mixed content errors
❌ API URL: `http://141.136.44.168:3006`
❌ All monitoring API calls: 401 Unauthorized
❌ Browser blocking HTTP requests from HTTPS page
❌ User prompted to authenticate twice

### After Fix
✅ No mixed content errors
✅ API URL: `https://pdflab.pro`
✅ All monitoring API calls: 200 OK
✅ Single sign-on - one authentication for entire admin panel
✅ All 6 monitoring tabs loading data successfully:
- Alerts
- Health Checks
- Drift Checks
- Resource Metrics (CPU, Memory, Disk, Response Time charts)
- Remediation Log
- Service Management

---

## Key Learnings

### 1. Next.js Environment Variables
- **NEXT_PUBLIC_* variables** are baked at build time
- Changes to `.env` files require rebuild
- Dockerfile ARG defaults override .env files
- Always check compiled JavaScript to verify values

### 2. Docker Build Caching
- `--no-cache` flag essential when changing env vars
- Container restart ≠ image reload
- Must recreate container to load new image

### 3. Browser Caching
- Service workers cache JavaScript aggressively
- Hard refresh may not clear service worker cache
- DevTools → Application → Clear storage is most reliable
- Incognito mode useful for verification

### 4. Authentication Patterns
- Consistency crucial across admin panel
- `localStorage` token + `Authorization` header is standard
- `credentials: 'include'` is for session-based auth (cookies)
- User expectation: single sign-on, no double auth

---

## Impact

**Before**: Monitoring dashboard completely non-functional
- All API calls blocked by browser (mixed content)
- Even if unblocked, 401 authentication errors
- Users couldn't access any monitoring features

**After**: Monitoring dashboard fully operational
- ✅ Single sign-on authentication
- ✅ Real-time health monitoring
- ✅ Resource metrics visualization
- ✅ Autonomous remediation tracking
- ✅ Manual service controls

---

## Prevention

To prevent this issue in future:

### 1. Update Dockerfile.frontend
Make the ARG value explicit:
```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://pdflab.pro}
```

### 2. Add Build Script
Create `scripts/build-frontend.sh`:
```bash
#!/bin/bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://pdflab.pro \
  -t mkelam/pdflab-frontend:latest \
  -f Dockerfile.frontend \
  .
```

### 3. CI/CD Pipeline
If using CI/CD, set build args in pipeline config:
```yaml
build:
  args:
    NEXT_PUBLIC_API_URL: https://pdflab.pro
```

### 4. Authentication Pattern Guide
Document in `docs/development/AUTHENTICATION_PATTERNS.md`:
- All admin pages must use `Authorization: Bearer ${token}`
- Never use `credentials: 'include'` in admin panel
- Always use `getAuthHeaders()` helper function

---

## Related Documentation

- [API Documentation](docs/api/API_DOCUMENTATION.md)
- [Deployment Guide](docs/deployment/PRODUCTION_DEPLOYMENT.md)
- [Monitoring System](docs/architecture/MONITORING_ARCHITECTURE.md)

---

**Status**: ✅ **PRODUCTION READY**
**Tested By**: User confirmed all issues resolved
**Deployment Verified**: 2025-11-17 10:05 UTC
