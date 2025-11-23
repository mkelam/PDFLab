# Week 2 Drift Remediation - Deployment Guide

**Date**: November 15, 2025
**Goal**: Reduce drift from 18% → 8%
**Duration**: 3 hours

---

## Prerequisites

- ✅ Week 1 complete (all P0 tasks resolved)
- ✅ SSH access to VPS (141.136.44.168)
- ✅ Docker Compose files prepared locally

---

## Task 2.1: Deploy Standardized Docker Compose (45 minutes)

### Step 1: Upload New Docker Compose Files

```bash
# From local machine (Windows)
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\deployment

# Create deployment directory on VPS
ssh root@141.136.44.168 "mkdir -p /var/pdflab/compose-templates"

# Upload base configuration
scp docker-compose.base.yml root@141.136.44.168:/var/pdflab/compose-templates/

# Upload production overrides
scp docker-compose.prod.yml root@141.136.44.168:/var/pdflab/compose-templates/

# Upload staging overrides
scp docker-compose.staging.yml root@141.136.44.168:/var/pdflab/compose-templates/
```

### Step 2: Backup Current Configurations

```bash
# SSH to VPS
ssh root@141.136.44.168

# Backup production
cd /var/pdflab/app
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

# Backup staging
cd /var/pdflab-staging/app/deployment/staging
cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 3: Deploy New Production Configuration

```bash
# Production
cd /var/pdflab/app

# Copy new files
cp /var/pdflab/compose-templates/docker-compose.base.yml .
cp /var/pdflab/compose-templates/docker-compose.prod.yml .

# Test configuration (dry-run)
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml config

# If no errors, deploy
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d

# Verify all containers running
docker ps --filter "name=pdflab-*-prod"
```

### Step 4: Deploy New Staging Configuration

```bash
# Staging
cd /var/pdflab-staging/app/deployment/staging

# Copy new files
cp /var/pdflab/compose-templates/docker-compose.base.yml .
cp /var/pdflab/compose-templates/docker-compose.staging.yml .

# Test configuration
docker-compose -f docker-compose.base.yml -f docker-compose.staging.yml config

# Deploy
docker-compose -f docker-compose.base.yml -f docker-compose.staging.yml up -d

# Verify
docker ps --filter "name=pdflab-*-staging"
```

### Step 5: Verify Resource Limits Applied

```bash
# Check production backend
docker stats pdflab-backend-prod --no-stream

# Check worker
docker stats pdflab-worker-prod --no-stream

# Verify limits in docker inspect
docker inspect pdflab-backend-prod | jq '.[0].HostConfig.Memory'
docker inspect pdflab-backend-prod | jq '.[0].HostConfig.NanoCpus'
```

**Expected Output**:
- Backend: Memory = 2147483648 (2GB), NanoCpus = 2000000000 (2.0 CPUs)
- Worker: Memory = 4294967296 (4GB), NanoCpus = 2000000000 (2.0 CPUs)
- MySQL: Memory = 2147483648 (2GB), NanoCpus = 1000000000 (1.0 CPU)
- Redis: Memory = 536870912 (512MB), NanoCpus = 500000000 (0.5 CPU)

---

## Task 2.2: Fix MySQL Root Password (15 minutes)

### Step 1: Reset Production MySQL Root Password

```bash
# SSH to VPS
ssh root@141.136.44.168

# Access MySQL without password
docker exec -it pdflab-mysql-prod mysql -uroot

# In MySQL shell:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rootpassword123';
ALTER USER 'root'@'%' IDENTIFIED BY 'rootpassword123';
FLUSH PRIVILEGES;
EXIT;
```

### Step 2: Test Root Access

```bash
# Test from host
docker exec -it pdflab-mysql-prod mysql -uroot -prootpassword123 -e "SELECT 1 AS test"

# Should output:
# +------+
# | test |
# +------+
# |    1 |
# +------+
```

### Step 3: Document Credentials

```bash
# Add to password manager or secure location
# Production MySQL Root: rootpassword123
# Staging MySQL Root: rootpassword123
```

---

## Task 2.3: Resource Limits (Already Applied in 2.1)

✅ Resource limits were applied when deploying the new docker-compose templates in Task 2.1.

**Verification**:
```bash
# Verify all containers have limits
for container in pdflab-backend-prod pdflab-worker-prod pdflab-mysql-prod pdflab-redis-prod; do
  echo "=== $container ==="
  docker inspect $container | jq '.[0].HostConfig | {Memory, NanoCpus}'
done
```

---

## Task 2.4: Populate Staging with Test Data (60 minutes)

### Step 1: Create Seed Script Locally

Already created at: `deployment/seed-staging.sql`

### Step 2: Upload Seed Script

```bash
# From local machine
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\deployment

scp seed-staging.sql root@141.136.44.168:/tmp/
```

### Step 3: Execute Seed Script

```bash
# SSH to VPS
ssh root@141.136.44.168

# Load seed data into staging database
docker exec -i pdflab-mysql-staging mysql -updflab -ppdflab_staging_2024 pdflab_staging < /tmp/seed-staging.sql

# Verify users created
docker exec pdflab-mysql-staging mysql -updflab -ppdflab_staging_2024 pdflab_staging -e "SELECT id, email, name, plan, conversions_used, conversions_limit FROM users"

# Verify jobs created
docker exec pdflab-mysql-staging mysql -updflab -ppdflab_staging_2024 pdflab_staging -e "SELECT COUNT(*) AS total_jobs, status, COUNT(*) AS count FROM conversion_jobs GROUP BY status"
```

### Step 4: Test Staging Login

```bash
# Test credentials:
# Email: test-free@pdflab.pro
# Password: TestPass123!

# Use staging frontend to log in and verify:
# - Dashboard shows conversion history
# - Quota display is correct
# - Can upload and convert a test PDF
```

---

## Week 2 Final Validation

### Drift Check

```bash
# Run drift detector
ssh root@141.136.44.168

# Compare image digests (should match)
PROD_BACKEND=$(docker inspect pdflab-backend-prod --format '{{.Image}}')
PROD_WORKER=$(docker inspect pdflab-worker-prod --format '{{.Image}}')
STAGING_BACKEND=$(docker inspect pdflab-backend-staging --format '{{.Image}}')
STAGING_WORKER=$(docker inspect pdflab-worker-staging --format '{{.Image}}')

echo "Production Backend: $PROD_BACKEND"
echo "Production Worker:  $PROD_WORKER"
echo "Staging Backend:    $STAGING_BACKEND"
echo "Staging Worker:     $STAGING_WORKER"

# All should be identical
```

### Container Health Check

```bash
# All containers should show "healthy" or "running"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}"

# Expected:
# pdflab-backend-prod    Up 10 minutes (healthy)   running
# pdflab-worker-prod     Up 10 minutes (healthy)   running
# pdflab-mysql-prod      Up 10 minutes (healthy)   running
# pdflab-redis-prod      Up 10 minutes (healthy)   running
# pdflab-backend-staging Up 10 minutes (healthy)   running
# pdflab-worker-staging  Up 10 minutes (healthy)   running
# pdflab-mysql-staging   Up 10 minutes (healthy)   running
# pdflab-redis-staging   Up 10 minutes (healthy)   running
```

### Resource Limits Verification

```bash
# Check memory usage is within limits
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}"

# None should exceed their configured limits
```

---

## Completion Checklist

- [ ] Docker Compose base template created
- [ ] Production using templated configuration
- [ ] Staging using templated configuration
- [ ] MySQL root password reset (production & staging)
- [ ] Resource limits applied to all 8 containers
- [ ] Staging database has 10+ test users
- [ ] Staging database has 50+ conversion jobs
- [ ] All containers healthy
- [ ] Drift reduced from 18% → 8%

---

## Rollback Procedure

If anything goes wrong:

```bash
# Restore production
cd /var/pdflab/app
docker-compose down
cp docker-compose.yml.backup-YYYYMMDD-HHMMSS docker-compose.yml
docker-compose up -d

# Restore staging
cd /var/pdflab-staging/app/deployment/staging
docker-compose down
cp docker-compose.yml.backup-YYYYMMDD-HHMMSS docker-compose.yml
docker-compose up -d
```

---

## Success Metrics

**Before Week 2**:
- Drift: 18%
- No resource limits
- Staging database empty
- No MySQL root access

**After Week 2**:
- Drift: 8%
- All containers have resource limits
- Staging has production-representative data
- MySQL admin access restored
- Templated configuration system in place

**Time Investment**: 3 hours
**Risk Reduction**: Resource exhaustion (40% → 10%), Configuration drift (18% → 8%)
**Next**: Week 3 - Automation & Guardrails

---

**Status**: Ready for execution
**Prerequisites**: ✅ Week 1 complete
**Estimated Duration**: 3 hours
**Risk Level**: Low (all changes have rollback procedures)
