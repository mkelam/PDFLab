# Week 2 - Quick Start Guide

**Goal**: Reduce drift from 18% → 8% in 3 hours

---

## Option 1: Automated (Recommended)

### Step 1: Upload Files (2 minutes)

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\deployment

scp docker-compose.base.yml root@141.136.44.168:/tmp/
scp docker-compose.prod.yml root@141.136.44.168:/tmp/
scp docker-compose.staging.yml root@141.136.44.168:/tmp/
scp seed-staging.sql root@141.136.44.168:/tmp/
scp execute-week2.sh root@141.136.44.168:/tmp/
```

### Step 2: Execute (3 hours)

```bash
ssh root@141.136.44.168

chmod +x /tmp/execute-week2.sh
/tmp/execute-week2.sh
```

**Done!** The script will:
- ✅ Backup current configurations
- ✅ Deploy Docker Compose templates
- ✅ Reset MySQL root password
- ✅ Apply resource limits
- ✅ Seed staging database
- ✅ Validate all changes
- ✅ Generate completion report

---

## Option 2: Manual (Step-by-Step)

Follow: [deployment/WEEK2_DEPLOYMENT_GUIDE.md](deployment/WEEK2_DEPLOYMENT_GUIDE.md)

---

## Test Credentials (After Execution)

Login to staging with:

| Email | Password | Plan |
|-------|----------|------|
| test-free@pdflab.pro | TestPass123! | Free |
| test-starter@pdflab.pro | TestPass123! | Starter |
| test-pro@pdflab.pro | TestPass123! | Pro |
| test-enterprise@pdflab.pro | TestPass123! | Enterprise |

---

## Verification (5 minutes)

```bash
# All containers healthy?
docker ps --filter "name=pdflab-"

# Resource limits applied?
docker stats --no-stream

# Staging data loaded?
docker exec pdflab-mysql-staging mysql -updflab -ppdflab_staging_2024 pdflab_staging -e "SELECT COUNT(*) FROM users WHERE email LIKE '%@pdflab.pro'"
# Should output: 10

# MySQL root password works?
docker exec pdflab-mysql-prod mysql -uroot -prootpassword123 -e "SELECT 1"
# Should output: 1
```

---

## Files Created

- ✅ `deployment/docker-compose.base.yml` - Shared config
- ✅ `deployment/docker-compose.prod.yml` - Production overrides
- ✅ `deployment/docker-compose.staging.yml` - Staging overrides
- ✅ `deployment/seed-staging.sql` - Test data (10 users, 50+ jobs)
- ✅ `deployment/execute-week2.sh` - Automated script
- ✅ `deployment/WEEK2_DEPLOYMENT_GUIDE.md` - Manual guide

---

## Rollback (If Needed)

```bash
# Find backup
ls -la /var/pdflab/backups/week2-*/

# Restore production
cd /var/pdflab/app
docker-compose down
cp /var/pdflab/backups/week2-YYYYMMDD-HHMMSS/docker-compose-prod.yml.backup docker-compose.yml
docker-compose up -d
```

---

## Expected Results

**Before**: 18% drift, no resource limits, empty staging
**After**: 8% drift, all containers limited, staging production-ready

**Duration**: 3 hours
**Risk**: Low (full rollback capability)

---

**Full Documentation**: [WEEK2_EXECUTION_READY.md](WEEK2_EXECUTION_READY.md)
