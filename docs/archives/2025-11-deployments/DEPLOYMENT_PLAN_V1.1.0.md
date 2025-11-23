# PDFLab v1.1.0 Deployment Plan

**Date**: 2025-11-09
**Version**: 1.1.0
**Commit**: 18273802
**Production**: https://pdflab.pro (141.136.44.168)

---

## 📋 Deployment Strategy

We'll use a **3-phase approach**:

### Phase 1: Local Testing (Your Computer) ⚠️ SAFE
Test everything on your local machine before touching production

### Phase 2: Database Migration (VPS) ⚠️ PRODUCTION
Update the production database structure (with automatic backup)

### Phase 3: Docker Deployment (VPS) ⚠️ PRODUCTION
Deploy new Docker images with all features

---

## 🔍 Phase 1: Local Testing (DO THIS FIRST)

### Why?
- Verify migration works correctly
- Test new features in safe environment
- Catch any issues before production

### Steps:

#### 1.1 Wait for Docker builds to complete
```bash
# Check backend build status
docker images | findstr "pdflab-backend"

# Check frontend build status
docker images | findstr "pdflab-frontend"
```

Should see:
- `mkelam/pdflab-backend:v1.1.0`
- `mkelam/pdflab-frontend:v1.1.0`

#### 1.2 Run local migration + test
```bash
# Run the automated test script
test-local-docker.bat
```

This script will:
1. Stop existing containers
2. Start MySQL and Redis
3. ✅ **Run database migration on LOCAL database**
4. Start backend v1.1.0 container
5. Start frontend v1.1.0 container

#### 1.3 Test all features locally

**Test Checklist**:
- [ ] Login works (test@example.com)
- [ ] Single PDF conversion works
- [ ] **NEW: Batch processing** (upload 3-5 PDFs, get ZIP download)
- [ ] **NEW: PDF compression** (compress PDF, verify smaller size)
- [ ] **NEW: Text is editable** in converted DOCX/PPTX (not images)
- [ ] PDF merge works
- [ ] Payment flow works
- [ ] Admin panel accessible

**How to test batch processing**:
1. Login as Pro user: mmkela@gmail.com / TestPass123!
2. Click "Batch Processing" toggle
3. Upload 3 PDF files
4. Select output format (PPTX)
5. Click "Start Batch Conversion"
6. Wait for completion
7. Download ZIP file
8. Verify all 3 files converted successfully

**How to test compression**:
1. Login
2. Click "Compress" tab
3. Upload a large PDF
4. Select compression level (Recommended)
5. Wait for compression
6. Download compressed PDF
7. Verify file size is smaller

#### 1.4 Check logs for errors
```bash
# Backend logs
docker logs pdflab-backend

# Frontend logs
docker logs pdflab-frontend
```

❌ **STOP HERE IF ANYTHING FAILS!**
Fix issues locally before proceeding.

✅ **If everything works**: Proceed to Phase 2

---

## 🚀 Phase 2: VPS Database Migration (PRODUCTION)

### ⚠️ WARNING
This modifies the **LIVE PRODUCTION** database at pdflab.pro

### Prerequisites
- [x] Phase 1 completed successfully
- [x] All local tests passed
- [ ] SSH access to VPS configured
- [ ] Backup confirmed

### Steps:

#### 2.1 Run VPS migration script
```bash
# Option 1: Windows (recommended for your setup)
deploy-vps-migration.bat

# Option 2: Git Bash / WSL
bash deploy-vps-migration.sh
```

The script will:
1. Test SSH connection
2. ✅ **Create automatic backup** (`pdflab_backup_YYYYMMDD_HHMMSS.sql`)
3. Copy migration SQL to VPS
4. Verify database connection
5. Run migration on production
6. Verify `batch_jobs` table exists

**What it does to production database**:
- Creates `batch_jobs` table
- Adds `batch_job_id` column to `conversion_jobs`
- Creates indexes for performance
- Sets up foreign key constraints

**Backup location**: `/tmp/pdflab_backup_YYYYMMDD_HHMMSS.sql`

#### 2.2 Verify migration succeeded
```bash
ssh root@141.136.44.168

# Check batch_jobs table exists
mysql -u pdflab -p***REMOVED*** pdflab_production -e "DESCRIBE batch_jobs;"

# Check conversion_jobs has new column
mysql -u pdflab -p***REMOVED*** pdflab_production -e "DESCRIBE conversion_jobs;"

# Exit SSH
exit
```

❌ **If migration fails**:
```bash
# SSH to VPS
ssh root@141.136.44.168

# Restore from backup
mysql -u pdflab -p***REMOVED*** pdflab_production < /tmp/pdflab_backup_YYYYMMDD_HHMMSS.sql

# Exit
exit
```

✅ **If migration succeeded**: Proceed to Phase 3

---

## 🐳 Phase 3: Docker Deployment (PRODUCTION)

### Prerequisites
- [x] Phase 1 completed
- [x] Phase 2 completed
- [x] Database migration verified
- [ ] Docker images built (`v1.1.0`)

### Steps:

#### 3.1 Push images to Docker Hub
```bash
# Login to Docker Hub
docker login
# Username: mkelam
# Password: [your docker hub password]

# Push backend image
docker push mkelam/pdflab-backend:v1.1.0
docker push mkelam/pdflab-backend:latest

# Push frontend image
docker push mkelam/pdflab-frontend:v1.1.0
docker push mkelam/pdflab-frontend:latest
```

#### 3.2 SSH to VPS
```bash
ssh root@141.136.44.168
```

#### 3.3 Pull new images on VPS
```bash
cd /var/pdflab

# Pull new images
docker pull mkelam/pdflab-backend:v1.1.0
docker pull mkelam/pdflab-frontend:v1.1.0
```

#### 3.4 Update docker-compose (if needed)
```bash
# Check current docker-compose.production.yml
cat docker-compose.production.yml

# Images should already point to :latest
# If not, update manually
```

#### 3.5 Stop old containers
```bash
docker-compose -f docker-compose.production.yml down
```

#### 3.6 Start new containers
```bash
docker-compose -f docker-compose.production.yml up -d
```

#### 3.7 Verify containers started
```bash
docker ps

# Should see:
# - pdflab-backend-prod (running)
# - pdflab-frontend-prod (running)
# - pdflab-mysql-prod (running)
# - pdflab-redis-prod (running)
```

#### 3.8 Check backend logs
```bash
docker logs -f pdflab-backend-prod --tail 50
```

Look for:
- ✅ "Database connection established"
- ✅ "Redis client connected"
- ✅ "PDFLab API Server running"
- ✅ "Port: 3006"
- ❌ No errors about missing tables
- ❌ No Sentry warnings (expected if no DSN configured)

Press `Ctrl+C` to exit logs

#### 3.9 Check frontend logs
```bash
docker logs -f pdflab-frontend-prod --tail 50
```

Press `Ctrl+C` to exit

#### 3.10 Test production site
```bash
# Exit SSH
exit
```

Open browser and test https://pdflab.pro:

**Production Test Checklist**:
- [ ] Homepage loads
- [ ] Login works
- [ ] Single conversion works
- [ ] **Batch processing works** (Pro user: mmkela@gmail.com)
- [ ] **Compression works**
- [ ] **Text is editable** in converted docs
- [ ] Admin panel works
- [ ] Payment flow works

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### If Phase 1 fails (Local):
- Just stop containers
- Fix issues
- Rebuild Docker images
- Test again

### If Phase 2 fails (Migration):
```bash
ssh root@141.136.44.168
mysql -u pdflab -p***REMOVED*** pdflab_production < /tmp/pdflab_backup_YYYYMMDD_HHMMSS.sql
exit
```

### If Phase 3 fails (Deployment):
```bash
ssh root@141.136.44.168
cd /var/pdflab

# Stop new containers
docker-compose -f docker-compose.production.yml down

# Pull old images
docker pull mkelam/pdflab-backend:20251105
docker pull mkelam/pdflab-frontend:20251105

# Update docker-compose to use old tags
nano docker-compose.production.yml
# Change :latest to :20251105

# Start old containers
docker-compose -f docker-compose.production.yml up -d

# Verify old version running
docker ps

exit
```

---

## 📊 Deployment Checklist

### Pre-Deployment
- [x] Docker images built locally (v1.1.0)
- [x] Git commit pushed (18273802)
- [x] Migration scripts created
- [x] Backup strategy confirmed

### Phase 1: Local Testing
- [ ] Migration runs successfully
- [ ] Containers start without errors
- [ ] Batch processing works
- [ ] Compression works
- [ ] Text editability verified
- [ ] No errors in logs

### Phase 2: VPS Migration
- [ ] SSH access verified
- [ ] Database backup created
- [ ] Migration script uploaded
- [ ] Migration executed successfully
- [ ] batch_jobs table verified
- [ ] Backup location noted

### Phase 3: Docker Deployment
- [ ] Images pushed to Docker Hub
- [ ] VPS images pulled
- [ ] Old containers stopped gracefully
- [ ] New containers started
- [ ] Backend logs clean
- [ ] Frontend logs clean
- [ ] Production site accessible
- [ ] All features tested and working

### Post-Deployment
- [ ] Monitor error logs for 30 minutes
- [ ] Check user activity (conversions happening)
- [ ] Verify batch processing in production
- [ ] Test payment flow
- [ ] Update version in documentation

---

## 🆘 Support Information

### Database Credentials
**Local**:
- Host: localhost:3306
- User: pdflab
- Pass: ***REMOVED***
- DB: pdflab

**Production (VPS)**:
- Host: 141.136.44.168:3306
- User: pdflab
- Pass: ***REMOVED***
- DB: pdflab_production

### VPS Access
- IP: 141.136.44.168
- User: root
- SSH: `ssh root@141.136.44.168`

### Docker Hub
- Username: mkelam
- Backend Repo: mkelam/pdflab-backend
- Frontend Repo: mkelam/pdflab-frontend

### Useful Commands
```bash
# Check running containers
docker ps

# View logs
docker logs -f pdflab-backend-prod
docker logs -f pdflab-frontend-prod

# Restart containers
docker-compose -f docker-compose.production.yml restart

# Check database
mysql -u pdflab -p***REMOVED*** pdflab_production

# Check disk space
df -h

# Check memory
free -m
```

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ All containers running (`docker ps` shows 4 containers)
2. ✅ https://pdflab.pro loads without errors
3. ✅ Batch processing works (upload 3+ PDFs, get ZIP)
4. ✅ Compression works (PDF gets smaller)
5. ✅ Converted docs have editable text (not images)
6. ✅ Existing features still work (login, convert, pay)
7. ✅ No errors in logs
8. ✅ Admin panel accessible
9. ✅ Users can complete conversions

---

## 📝 Post-Deployment Notes

After successful deployment:

1. Update [PRODUCTION_VS_LOCAL_AUDIT.md](PRODUCTION_VS_LOCAL_AUDIT.md) status
2. Tag Git commit: `git tag v1.1.0`
3. Push tag: `git push origin v1.1.0`
4. Update [README.md](README.md) with new features
5. Consider setting up Sentry DSN for error tracking
6. Monitor for 24 hours

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Deployment Time**: _______ minutes
**Issues Encountered**: _____________
**Resolution**: _____________

---

**Generated**: 2025-11-09
**Version**: 1.1.0
**Status**: READY FOR DEPLOYMENT
