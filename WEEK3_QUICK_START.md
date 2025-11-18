# Week 3: Automation & Guardrails - Quick Start Guide

**Goal**: Set up automated drift detection, pre-deployment validation, and monitoring
**Duration**: 2.5 hours
**Current Drift**: 8% → Target: <2%

---

## Prerequisites

✅ Week 1 & 2 complete
✅ SSH access to VPS (141.136.44.168)
✅ All containers healthy

---

## Quick Execution Steps

### Step 1: Upload Scripts to VPS (10 minutes)

```bash
# From local machine (Windows)
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Upload all automation scripts
scp scripts/pre-deployment-validation.sh root@141.136.44.168:/tmp/
scp scripts/health-check-enhanced.sh root@141.136.44.168:/tmp/
scp scripts/deployment-guardrails.sh root@141.136.44.168:/tmp/
scp scripts/run-pre-deployment-tests.sh root@141.136.44.168:/tmp/
scp scripts/safe-deploy.sh root@141.136.44.168:/tmp/

# SSH to VPS
ssh root@141.136.44.168

# Create scripts directory
mkdir -p /usr/local/bin/pdflab-scripts

# Move scripts and make executable
mv /tmp/*.sh /usr/local/bin/pdflab-scripts/
chmod +x /usr/local/bin/pdflab-scripts/*.sh

# Verify scripts
ls -lh /usr/local/bin/pdflab-scripts/
```

---

### Step 2: Set Up Automated Monitoring (15 minutes)

```bash
# SSH to VPS (if not already connected)
ssh root@141.136.44.168

# Create log directory
mkdir -p /var/log/pdflab
chmod 755 /var/log/pdflab

# Set up cron jobs
crontab -e

# Add these lines to crontab:
# Drift detection - hourly
0 * * * * /usr/local/bin/pdflab-scripts/drift-detector.sh >> /var/log/pdflab/drift-detector.log 2>&1

# Health checks - every 5 minutes
*/5 * * * * /usr/local/bin/pdflab-scripts/health-check-enhanced.sh production >> /var/log/pdflab/health-check.log 2>&1

# Save and exit (:wq in vi/vim, or Ctrl+X in nano)

# Verify cron jobs
crontab -l

# Test scripts manually
/usr/local/bin/pdflab-scripts/pre-deployment-validation.sh production
/usr/local/bin/pdflab-scripts/health-check-enhanced.sh production
/usr/local/bin/pdflab-scripts/drift-detector.sh
```

**Expected Output**:
```
[PASS] Backend and worker images match
[PASS] All 5 critical environment variables present
[PASS] Database connection successful
...
ALL CHECKS PASSED - Deployment approved
```

---

### Step 3: Test Safe Deployment (20 minutes)

```bash
# SSH to VPS
ssh root@141.136.44.168

# Test safe deployment script (dry-run)
/usr/local/bin/pdflab-scripts/safe-deploy.sh staging --skip-tests

# If successful, you'll see:
# ✓ Pre-deployment validation passed
# ✓ Backup created
# ✓ All containers healthy
# ✓ DEPLOYMENT SUCCESSFUL
```

---

### Step 4: Enable Deployment Guardrails (OPTIONAL) (10 minutes)

⚠️ **WARNING**: This will block direct `docker-compose up` commands

```bash
# SSH to VPS
ssh root@141.136.44.168

# Check current status
/usr/local/bin/pdflab-scripts/deployment-guardrails.sh status

# Enable guardrails (OPTIONAL - blocks manual docker-compose)
/usr/local/bin/pdflab-scripts/deployment-guardrails.sh enforce

# Test that guardrails work
docker-compose up -d  # Should be blocked with helpful message

# If you need to disable guardrails later:
/usr/local/bin/pdflab-scripts/deployment-guardrails.sh disable
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Scripts uploaded to `/usr/local/bin/pdflab-scripts/`
- [ ] All scripts executable (`chmod +x`)
- [ ] Cron jobs installed (`crontab -l` shows 2 jobs)
- [ ] Log files created in `/var/log/pdflab/`
- [ ] Pre-deployment validation passes
- [ ] Health check passes
- [ ] Drift detector runs successfully
- [ ] Safe deployment script works

---

## Daily Operations

### Deploying to Production

```bash
# ALWAYS use the safe deployment script
ssh root@141.136.44.168
/usr/local/bin/pdflab-scripts/safe-deploy.sh production

# This will:
# 1. Run 12-point validation checklist
# 2. Run automated tests (P0 + integration)
# 3. Create backup
# 4. Deploy with health checks
# 5. Verify deployment success
```

### Deploying to Staging

```bash
ssh root@141.136.44.168
/usr/local/bin/pdflab-scripts/safe-deploy.sh staging
```

### Skipping Tests (faster deployment)

```bash
# Use --skip-tests flag (not recommended for production)
/usr/local/bin/pdflab-scripts/safe-deploy.sh staging --skip-tests
```

---

## Monitoring

### View Drift Detection Logs

```bash
ssh root@141.136.44.168
tail -50 /var/log/pdflab/drift-detector.log

# Real-time monitoring
tail -f /var/log/pdflab/drift-detector.log
```

### View Health Check Logs

```bash
ssh root@141.136.44.168
tail -50 /var/log/pdflab/health-check.log

# Check for failures
grep "FAIL" /var/log/pdflab/health-check.log
```

### Manual Checks

```bash
# Run drift detection manually
/usr/local/bin/pdflab-scripts/drift-detector.sh

# Run health check manually
/usr/local/bin/pdflab-scripts/health-check-enhanced.sh production

# Run pre-deployment validation
/usr/local/bin/pdflab-scripts/pre-deployment-validation.sh production
```

---

## Troubleshooting

### Script Not Found

```bash
# Check if script exists
ls -lh /usr/local/bin/pdflab-scripts/

# Re-upload if missing
scp scripts/*.sh root@141.136.44.168:/usr/local/bin/pdflab-scripts/
ssh root@141.136.44.168 "chmod +x /usr/local/bin/pdflab-scripts/*.sh"
```

### Cron Jobs Not Running

```bash
# Check cron service is running
systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Verify crontab
crontab -l
```

### Deployment Blocked

```bash
# Review validation failures
/usr/local/bin/pdflab-scripts/pre-deployment-validation.sh production

# Fix issues and retry
# Common fixes:
# - Image drift: docker pull mkelam/pdflab-backend:latest
# - Redis not persistent: Add --appendonly yes to docker-compose
# - Missing env vars: Check backend/.env file
```

### Rollback Deployment

```bash
# Backups are in /var/pdflab-backups/YYYYMMDD-HHMMSS/
ls -lh /var/pdflab-backups/

# Find latest backup
LATEST=$(ls -t /var/pdflab-backups/ | head -1)

# Restore configuration
cd /var/pdflab/app  # or /var/pdflab-staging/app
cp /var/pdflab-backups/$LATEST/docker-compose.yml .

# Redeploy
docker-compose up -d
```

---

## Success Metrics

**Before Week 3**:
- Manual deployment (error-prone)
- No automated validation
- Drift detected after incidents
- No monitoring between deployments

**After Week 3**:
- ✅ Automated 12-point validation
- ✅ Hourly drift detection
- ✅ 5-minute health checks
- ✅ Safe deployment with rollback
- ✅ Comprehensive logging
- ✅ <2% drift (proactive prevention)

---

## Next Steps

1. **Monitor for 24 hours** - Let automation run and verify logs
2. **Test deployment** - Deploy a small change using safe-deploy.sh
3. **Review metrics** - Check drift trends over time
4. **Optimize alerts** - Add Slack/email notifications if needed
5. **Week 4 Planning** - CI/CD integration, advanced monitoring

---

**Last Updated**: November 16, 2025
**Status**: Ready for execution
**Estimated Time**: 2.5 hours
**Risk Level**: Low (all scripts are non-destructive)
