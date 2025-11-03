# VPS Update Guide - PDFLab Production Deployment

## Latest Updates Included

✅ **Enhanced Error Display System** - 7 error type variants with modal UI
✅ **Privacy-Conscious Messaging** - Removed all storage/retention language
✅ **TypeScript Production Fixes** - All builds pass without errors
✅ **Dashboard Improvements** - Prominent "Start Converting" button
✅ **Database Schema Fixes** - Duplicate key issues resolved

**Latest Commit:** `4f354d7` - Update dashboard with prominent conversion page link
**Docker Images:** All tagged as `:production` and `:latest` on Docker Hub

---

## Pre-Deployment Checklist

Before updating your VPS, ensure you have:

- [ ] SSH access to your VPS
- [ ] Docker and Docker Compose installed on VPS
- [ ] Environment variables configured (`.env.production`)
- [ ] Backup of current database (if applicable)
- [ ] DNS pointing to your VPS IP address

---

## Step 1: SSH into Your VPS

```bash
ssh your-username@your-vps-ip
# Or if using a key:
ssh -i /path/to/key.pem your-username@your-vps-ip
```

---

## Step 2: Navigate to Project Directory

```bash
cd /opt/pdflab
# Or wherever you've deployed PDFLab
```

---

## Step 3: Pull Latest Code (Optional)

If you want to pull the latest code from GitHub:

```bash
git pull origin master
```

**Latest commit should be:** `4f354d7`

---

## Step 4: Pull Latest Docker Images

Pull the updated Docker images from Docker Hub:

```bash
# Pull all latest images
docker pull mkelam/pdflab-frontend:production
docker pull mkelam/pdflab-backend:production
docker pull mkelam/pdflab-worker:production

# Verify images were pulled
docker images | grep pdflab
```

**Expected Output:**
```
mkelam/pdflab-frontend   production   d3f4c96e5069   X minutes ago   263MB
mkelam/pdflab-backend    production   6c4f98468c12   X minutes ago   943MB
mkelam/pdflab-worker     production   6c4f98468c12   X minutes ago   943MB
```

---

## Step 5: Stop Current Containers

```bash
# Stop and remove existing containers
docker-compose -f docker-compose.production.yml down

# Verify containers are stopped
docker ps -a
```

---

## Step 6: Start Updated Containers

```bash
# Start all services with updated images
docker-compose -f docker-compose.production.yml up -d

# Follow the logs to monitor startup
docker-compose -f docker-compose.production.yml logs -f
```

**Press Ctrl+C to exit logs when you see:**
```
✓ PDFLab API Server running
✓ Environment: production
✓ Port: 3006
```

---

## Step 7: Verify Deployment

### Check Container Status

```bash
docker ps
```

**Expected containers running:**
- `pdflab-frontend` (port 3000)
- `pdflab-backend` (port 3006)
- `pdflab-worker`
- `pdflab-mysql` (port 3306)
- `pdflab-redis` (port 6379)

### Check Container Health

```bash
docker-compose -f docker-compose.production.yml ps
```

All containers should show `Up` and `healthy` status.

### Test API Endpoints

```bash
# Test backend health
curl http://localhost:3006/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}

# Test frontend
curl http://localhost:3000

# Should return HTML content
```

### Check Application Logs

```bash
# Backend logs
docker logs pdflab-backend --tail 50

# Frontend logs
docker logs pdflab-frontend --tail 50

# Worker logs
docker logs pdflab-worker --tail 50
```

---

## Step 8: Test in Browser

1. **Open your domain:** `https://your-domain.com`
2. **Test conversion:**
   - Upload a PDF
   - Try converting to PPTX/DOCX as a guest
   - Verify error messages display correctly
3. **Test dashboard:**
   - Sign up or login
   - Check dashboard page loads
   - Click "Start Converting" button
   - Verify it navigates to home page

---

## Step 9: Database Migration (If Needed)

If you had the duplicate key issue on your VPS database:

```bash
# Copy the fix script to VPS (from your local machine)
scp backend/fix-duplicate-keys.js your-username@your-vps-ip:/opt/pdflab/

# Then on VPS:
cd /opt/pdflab
docker exec -i pdflab-backend node fix-duplicate-keys.js
```

---

## Rollback Procedure (If Something Goes Wrong)

### Quick Rollback to Previous Version

```bash
# Stop current containers
docker-compose -f docker-compose.production.yml down

# Pull previous version (if you tagged them)
docker pull mkelam/pdflab-frontend:v1.0.0
docker pull mkelam/pdflab-backend:v1.0.0
docker pull mkelam/pdflab-worker:v1.0.0

# Update docker-compose.production.yml to use :v1.0.0 tags
# Then restart:
docker-compose -f docker-compose.production.yml up -d
```

---

## Troubleshooting Common Issues

### Issue: Containers Won't Start

**Solution:**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check disk space
df -h

# Check memory
free -m
```

### Issue: Database Connection Errors

**Solution:**
```bash
# Ensure MySQL is running
docker ps | grep mysql

# Check MySQL logs
docker logs pdflab-mysql

# Restart MySQL if needed
docker restart pdflab-mysql
```

### Issue: Redis Connection Errors

**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it pdflab-redis redis-cli ping
# Should return: PONG

# Restart Redis if needed
docker restart pdflab-redis
```

### Issue: Frontend Shows Old Code

**Solution:**
```bash
# Clear browser cache
# Or try incognito/private mode

# Verify correct image is running
docker inspect pdflab-frontend | grep Image

# Should show: mkelam/pdflab-frontend:production with latest digest
```

---

## Post-Deployment Verification

### ✅ Feature Checklist

Test these features to ensure everything works:

- [ ] **Guest Conversion**: Upload PDF as guest, convert to PPTX/DOCX
- [ ] **Error Messages**: Try XLSX as guest - should see enhanced error modal
- [ ] **File Size Errors**: Upload large file - should see privacy-conscious error
- [ ] **User Login**: Login to existing account
- [ ] **Dashboard**: View dashboard, click "Start Converting"
- [ ] **User Signup**: Create new account
- [ ] **Pricing Page**: View pricing tiers
- [ ] **Conversion History**: View past conversions (logged in)
- [ ] **PDF Merge**: Merge multiple PDFs (logged in)
- [ ] **Admin Panel**: Access admin features (if admin user)

---

## Performance Optimization (Optional)

### Enable Log Rotation

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/docker-containers

# Add:
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
```

### Monitor Resource Usage

```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df

# Prune unused images (careful!)
docker image prune -a
```

---

## Maintenance Commands

### View Real-Time Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker logs -f pdflab-backend
```

### Restart Specific Service

```bash
# Restart backend only
docker restart pdflab-backend

# Restart frontend only
docker restart pdflab-frontend
```

### Update Environment Variables

```bash
# Edit .env.production
nano .env.production

# Restart containers to apply changes
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## Summary of Changes in This Update

### Frontend Changes
- ✅ Enhanced error display component (ErrorDisplay.tsx)
- ✅ Enhanced error handler (enhanced-error-handler.ts)
- ✅ Updated API client with EnhancedAPIError
- ✅ Dashboard "Start Converting" button (more prominent)
- ✅ Privacy-conscious messaging throughout

### Backend Changes
- ✅ TypeScript production build fixes
- ✅ Privacy-conscious error messages
- ✅ Database schema fix script (fix-duplicate-keys.js)
- ✅ Updated conversion controller with better errors

### Docker Images
- ✅ Frontend: `mkelam/pdflab-frontend:production` (digest: d3f4c96...)
- ✅ Backend: `mkelam/pdflab-backend:production` (digest: 6c4f984...)
- ✅ Worker: `mkelam/pdflab-worker:production` (digest: 6c4f984...)

---

## Support

If you encounter issues during deployment:

1. **Check logs:** `docker-compose logs`
2. **Check container status:** `docker ps -a`
3. **Verify environment variables:** `cat .env.production`
4. **Test database connection:** `docker exec -it pdflab-mysql mysql -u pdflab -p`
5. **Review this guide** for troubleshooting steps

---

**Deployment Date:** 2025-11-03
**Version:** Latest (commit 4f354d7)
**Docker Images:** All `:production` tags updated on Docker Hub
