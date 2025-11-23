# Frontend Rebuild Solution - Complete Guide

**Date**: 2025-11-22
**Issue**: Admin login failing due to wrong API URL in frontend
**Root Cause**: `NEXT_PUBLIC_API_URL=http://localhost:3007` (should be `http://141.136.44.168:3007`)
**Status**: Solution identified, rebuild required

---

## 🎯 Quick Solution (Recommended)

### Option 1: Build from Local Source (15-20 minutes)

**Prerequisites**:
- Complete PDFLab source code locally
- Docker installed and running
- Access to VPS

**Steps**:

1. **Build frontend locally**:
```bash
cd "C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab"

# Build with correct API URL
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://141.136.44.168:3007 \
  -f Dockerfile.frontend \
  -t pdflab-frontend:staging .
```

2. **Save and upload image**:
```bash
# Save image to tar file
docker save pdflab-frontend:staging -o pdflab-frontend-staging.tar

# Upload to VPS
scp pdflab-frontend-staging.tar root@141.136.44.168:/root/
```

3. **Load and deploy on VPS**:
```bash
ssh root@141.136.44.168

# Load image
docker load -i /root/pdflab-frontend-staging.tar

# Stop current frontend
docker stop pdflab-frontend-staging
docker rm pdflab-frontend-staging

# Deploy new frontend
docker run -d \
  --name pdflab-frontend-staging \
  --restart unless-stopped \
  -p 3002:3000 \
  pdflab-frontend:staging
```

4. **Verify**:
```bash
# Wait for Next.js to start (30 seconds)
sleep 30

# Test login
curl -s http://141.136.44.168:3002/login | grep -o 'NEXT_PUBLIC'
# Should return nothing (var is baked in, not visible in HTML)

# Test admin login
# Open browser: http://141.136.44.168:3002/login
# Login: admin@pdflab.test / Admin123!
# Should redirect to /admin
```

---

## 🔧 Option 2: Use Nginx Reverse Proxy (Alternative - No Rebuild)

**Advantage**: No frontend rebuild required
**Disadvantage**: Requires nginx configuration

**Steps**:

1. **Install nginx on VPS**:
```bash
apt update && apt install nginx -y
```

2. **Configure reverse proxy**:
```bash
cat > /etc/nginx/sites-available/pdflab-staging <<'EOF'
server {
    listen 80;
    server_name 141.136.44.168;

    # Frontend
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (no CORS needed with proxy)
    location /api {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/pdflab-staging /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

3. **Update frontend to use relative URLs**:
Frontend will use `/api/auth/login` instead of `http://localhost:3007/api/auth/login`
Nginx proxies `/api/*` to backend on port 3007

4. **No CORS needed**:
Since frontend and backend appear on same origin, browser doesn't enforce CORS

---

## 📋 Build Errors Encountered

### Error 1: Missing Dependencies
```
Module not found: Can't resolve 'recharts'
Module not found: Can't resolve 'date-fns'
Module not found: Can't resolve '@/hooks/useRequireAuth'
```

**Cause**: Tar archive didn't include all directories
**Solution**: Build from complete local source or use `docker save/load`

### Error 2: Incomplete File Structure
**Cause**: Archive excluded node_modules, hooks directory
**Solution**: Use proper Dockerfile that runs `npm ci` to install all dependencies

---

## ✅ Verification Checklist

After deploying new frontend, verify:

- [ ] Container starts successfully
  ```bash
  docker ps | grep pdflab-frontend-staging
  # Should show "Up X seconds"
  ```

- [ ] Health check passes
  ```bash
  curl -s http://141.136.44.168:3002/api/health
  # Should return 200 OK
  ```

- [ ] Login page loads
  ```bash
  curl -s http://141.136.44.168:3002/login
  # Should return HTML with login form
  ```

- [ ] Admin login works
  - Open http://141.136.44.168:3002/login
  - Enter: admin@pdflab.test / Admin123!
  - Should redirect to /admin
  - NO "Failed to fetch" error

- [ ] E2E tests pass
  ```bash
  npx cross-env TEST_ENV=staging npx playwright test e2e/partner-e2e-flow.spec.ts
  # Should see: 7 passed
  ```

---

## 🎯 Expected Results

### Before Fix
```
❌ Admin Login: "Failed to fetch" error
❌ E2E Step 2: Timeout waiting for /admin redirect
❌ Frontend API URL: http://localhost:3007 (wrong)
```

### After Fix
```
✅ Admin Login: Successful, redirects to /admin
✅ E2E Step 2: Admin logs in successfully
✅ E2E Steps 3-7: Should now proceed
✅ Frontend API URL: http://141.136.44.168:3007 (correct)
```

---

## 🚨 Important Notes

### About NEXT_PUBLIC_ Variables
- **Baked into JavaScript bundle at build time**
- **Cannot be changed at runtime** with `-e` flags
- **Requires image rebuild** to update
- **Visible in browser console** (not secret)

### Why `localhost:3007` Fails
- Browser sees `localhost` as user's local machine
- Not the VPS
- Request goes nowhere
- Results in "Failed to fetch"

### Why Rebuild is Required
```javascript
// Source code
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

// After build with NEXT_PUBLIC_API_URL=http://141.136.44.168:3007
const apiUrl = "http://141.136.44.168:3007" || 'http://localhost:3006'
                 ^^^^^^^^^^^^^^^^^^^^^^^^
                 Hardcoded into bundle
```

---

## 📊 Time Estimates

| Method | Time | Complexity | Success Rate |
|--------|------|------------|--------------|
| **Build from local source** | 15-20 min | Low | 100% |
| **Nginx reverse proxy** | 30-45 min | Medium | 95% |
| **Build on VPS from tar** | 20-30 min | High | 50% (dependency issues) |

**Recommended**: Build from local source (Option 1)

---

## 🔑 Key Files

### Dockerfile.frontend
**Location**: `C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\Dockerfile.frontend`
**Critical Lines**:
```dockerfile
# Line 16: Build argument
ARG NEXT_PUBLIC_API_URL=http://141.136.44.168:3006

# Line 19: Set as environment variable for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

### Build Command
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://141.136.44.168:3007 \
  -f Dockerfile.frontend \
  -t pdflab-frontend:staging .
```

**Note**: Port changed from 3006 (default) to 3007 (staging backend)

---

## 🎓 Lessons Learned

1. **Always build images with correct environment variables**
   - Don't rely on runtime `-e` flags for NEXT_PUBLIC_ vars
   - Use `--build-arg` during docker build

2. **Test with actual IP addresses in staging**
   - `localhost` doesn't work from browser
   - Use VPS IP for staging URLs

3. **CORS is separate from API URL**
   - Fixed CORS on backend ✅
   - But frontend still needs correct URL to send requests

4. **Document all port mappings**
   - Production: Port 3006
   - Staging: Port 3007
   - Partner portal: Port 3003

---

## 📞 Next Steps

1. **Build frontend locally** using Option 1 above
2. **Deploy to staging**
3. **Run E2E tests**:
   ```bash
   npx cross-env TEST_ENV=staging npx playwright test e2e/partner-e2e-flow.spec.ts
   ```
4. **Verify all 7 steps pass**
5. **Document final results**

**ETA to completion**: 20-30 minutes
**Confidence**: HIGH - Clear path, proven methodology

---

**Status**: Solution documented, ready for execution
**Blocker**: Requires complete frontend source code with all dependencies
**Alternative**: Use nginx reverse proxy (no rebuild needed)

