# Execute Monitoring Deployment - Copy/Paste Commands

**Status**: ✅ Ready to Execute
**Backend Built**: ✅ Complete
**Files Packaged**: ✅ backend/dist-deployment.tar.gz created
**Date**: 2025-11-16

---

## Quick Deployment (Copy/Paste Each Command)

### STEP 1: Copy Files to VPS (5 minutes)

```bash
# Copy migration files
scp backend/src/migrations/20251116-create-monitoring-baseline.sql root@141.136.44.168:/tmp/
scp backend/src/migrations/20251116-extend-alerts-table.sql root@141.136.44.168:/tmp/
scp backend/src/migrations/20251116-create-blocked-ips.sql root@141.136.44.168:/tmp/
scp backend/src/migrations/20251116-create-auth-logs.sql root@141.136.44.168:/tmp/

# Copy backend dist
scp backend/dist-deployment.tar.gz root@141.136.44.168:/tmp/

# Copy remediation script
scp scripts/autonomous-remediation.sh root@141.136.44.168:/tmp/
```

**Verify**:
```bash
ssh root@141.136.44.168 "ls -lh /tmp/*.sql /tmp/dist-deployment.tar.gz /tmp/autonomous-remediation.sh"
```

---

### STEP 2: Run Database Migrations (10 minutes)

```bash
# SSH into VPS
ssh root@141.136.44.168
```

Then run these commands on the VPS:

```bash
# Get MySQL password
grep DB_PASSWORD /var/pdflab/app/backend/.env.production

# Run each migration (replace PASSWORD with actual password)
docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab < /tmp/20251116-create-monitoring-baseline.sql

docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab < /tmp/20251116-extend-alerts-table.sql

docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab < /tmp/20251116-create-blocked-ips.sql

docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab < /tmp/20251116-create-auth-logs.sql
```

**Verify Tables**:
```bash
docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab -e "
SHOW TABLES LIKE '%monitoring%';
SHOW TABLES LIKE '%blocked%';
SHOW TABLES LIKE '%authentication%';
"
```

**Expected Output**:
```
monitoring_alerts
monitoring_baseline
blocked_ips
authentication_logs
```

---

### STEP 3: Deploy Backend Code (15 minutes)

Still on VPS:

```bash
cd /var/pdflab/app/backend

# Backup current dist
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Extract new dist
tar -xzf /tmp/dist-deployment.tar.gz

# Verify new files
ls -lh dist/services/ | grep -E "(baseline|decision|alert|daily|security)"
ls -lh dist/controllers/service-management.controller.js
ls -lh dist/jobs/ | grep -E "(baseline|daily|security)"
```

**Expected Output**:
```
alert.service.js
baseline.service.js
daily-report.service.js
decision-engine.service.js
security-blocker.service.js

service-management.controller.js

baseline.job.js
daily-report.job.js
security-blocker.job.js
```

---

### STEP 4: Deploy Remediation Script (10 minutes)

Still on VPS:

```bash
# Create directories
mkdir -p /opt/pdflab/scripts
mkdir -p /var/log/pdflab

# Move script
mv /tmp/autonomous-remediation.sh /opt/pdflab/scripts/
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Verify
ls -lh /opt/pdflab/scripts/autonomous-remediation.sh

# Test run
/opt/pdflab/scripts/autonomous-remediation.sh
```

**Expected Output**:
```
[2025-11-16 XX:XX:XX] Autonomous Remediation - Starting health checks
[2025-11-16 XX:XX:XX] Disk usage: XX% - OK
[2025-11-16 XX:XX:XX] All containers healthy - OK
...
```

**Check log file**:
```bash
tail -20 /var/log/pdflab/remediation.log
```

---

### STEP 5: Add Environment Variables (5 minutes)

Still on VPS:

```bash
cd /var/pdflab/app/backend

# Add ADMIN_EMAIL if not exists
if ! grep -q "ADMIN_EMAIL" .env.production; then
    echo "" >> .env.production
    echo "# Monitoring Configuration" >> .env.production
    echo "ADMIN_EMAIL=mmkela@gmail.com" >> .env.production
    echo "✓ ADMIN_EMAIL added"
else
    echo "✓ ADMIN_EMAIL already exists"
fi

# Verify SMTP config exists
grep SMTP .env.production
```

**Expected Output**:
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@pdflab.pro
SMTP_PASS=***REMOVED***
SMTP_FROM_NAME=PDFLab
SMTP_FROM_EMAIL=support@pdflab.pro
```

---

### STEP 6: Setup Cron Job (5 minutes)

Still on VPS:

```bash
# Add cron job
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh") | crontab -

# Verify
crontab -l | grep autonomous
```

**Expected Output**:
```
*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh
```

---

### STEP 7: Restart Backend (5 minutes)

Still on VPS:

```bash
# Restart backend container
docker restart pdflab-backend-prod

# Wait for startup
sleep 15

# Check container status
docker ps --filter name=pdflab-backend-prod

# Check logs for cron job initialization
docker logs pdflab-backend-prod --tail 100 | grep -E "(Baseline|Daily|Security|scheduled)"
```

**Expected Log Output**:
```
✓ Baseline calculation scheduled (daily at 2:00 AM)
✓ Daily report scheduled (daily at 9:00 AM)
✓ Security blocker scheduled (every 5 minutes)
```

**Exit VPS**:
```bash
exit
```

---

## STEP 8: Verify Deployment (10 minutes)

Back on your local machine:

### Test 1: Check Backend Health

```bash
ssh root@141.136.44.168 "docker logs pdflab-backend-prod --tail 50"
```

Look for:
- ✅ Server started on port 3006
- ✅ Database connection established
- ✅ 3 cron jobs scheduled

### Test 2: Check Remediation Log

```bash
# Wait 5-10 minutes, then check
ssh root@141.136.44.168 "tail -30 /var/log/pdflab/remediation.log"
```

Should show recent health checks.

### Test 3: Verify Database Tables

```bash
ssh root@141.136.44.168 "docker exec -i pdflab-mysql-prod mysql -u root -pPASSWORD pdflab -e 'SELECT COUNT(*) as baseline_exists FROM monitoring_baseline; SELECT COUNT(*) as remediation_logs FROM remediation_log;'"
```

### Test 4: Test API Endpoints (If you have admin token)

```bash
# Get admin token first (login to admin account)
TOKEN="<your_admin_token>"

# Test baseline endpoint
curl -H "Authorization: Bearer $TOKEN" https://pdflab.pro/api/monitoring/baseline

# Test service status endpoint
curl -H "Authorization: Bearer $TOKEN" https://pdflab.pro/api/admin/manage/services/status
```

**Expected Response**:
```json
{
  "status": "no_data",
  "message": "Baseline calculation requires 7 days of resource metrics data"
}
```
Or actual baseline data if metrics exist.

---

## Post-Deployment Checklist

After completing all steps:

- [ ] All 4 migration files executed successfully
- [ ] New backend files deployed and verified
- [ ] Autonomous remediation script executable and running
- [ ] Cron job added to crontab
- [ ] Backend restarted successfully
- [ ] Backend logs show 3 cron jobs scheduled
- [ ] Remediation log file exists and populated
- [ ] No errors in `docker logs pdflab-backend-prod`

---

## Monitoring for Next 24 Hours

### Check Remediation Log (Every 5 minutes)

```bash
ssh root@141.136.44.168 "tail -20 /var/log/pdflab/remediation.log"
```

### Check Backend Logs (Hourly)

```bash
ssh root@141.136.44.168 "docker logs pdflab-backend-prod --tail 100"
```

### Check Email (9 AM Tomorrow)

Look for email from PDFLab <support@pdflab.pro> with subject:
```
PDFLab Daily Report - MM/DD/YYYY
```

### Monitor Database Growth

```bash
ssh root@141.136.44.168 "docker exec pdflab-mysql-prod mysql -u root -pPASSWORD pdflab -e '
SELECT
  (SELECT COUNT(*) FROM monitoring_baseline) as baseline_records,
  (SELECT COUNT(*) FROM monitoring_alerts) as alerts,
  (SELECT COUNT(*) FROM remediation_log) as remediation_actions,
  (SELECT COUNT(*) FROM blocked_ips WHERE expires_at > NOW()) as blocked_ips;
'"
```

---

## Rollback (If Needed)

If issues occur:

```bash
ssh root@141.136.44.168

# Restore previous backend
cd /var/pdflab/app/backend
rm -rf dist
mv dist.backup.YYYYMMDD_HHMMSS dist  # Use your backup timestamp

# Remove cron job
crontab -e
# Delete line: */5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh

# Restart backend
docker restart pdflab-backend-prod
```

---

## Success Criteria

After 24 hours, verify:

✅ **Backend Running**: No crashes or restarts
✅ **Remediation Logs**: Entries every 5 minutes
✅ **Email Received**: Daily report at 9 AM
✅ **No Errors**: Clean backend logs
✅ **Database Growing**: remediation_log table has entries

---

## Troubleshooting

### Issue: SSH Connection Timeout

**Solution**:
```bash
# Test SSH first
ssh root@141.136.44.168 "echo 'Connection OK'"

# If timeout, check:
# 1. VPS is running (Hostinger panel)
# 2. Firewall allows SSH (port 22)
# 3. Your IP not blocked
```

### Issue: Migrations Fail "Table already exists"

**Solution**: Safe to ignore - tables created in previous attempt

### Issue: Backend Won't Start

**Check logs**:
```bash
docker logs pdflab-backend-prod --tail 200
```

Common issues:
- Missing node_modules: `docker exec pdflab-backend-prod npm install`
- Database connection: Check DB_* env vars
- Port in use: `docker restart pdflab-backend-prod`

### Issue: Email Not Sending

**Test email**:
```bash
docker exec -it pdflab-backend-prod node -e "
const emailService = require('./dist/services/email.service').default;
emailService.sendEmail({
  to: 'mmkela@gmail.com',
  subject: 'Test',
  html: '<h1>Test</h1>',
  text: 'Test'
}).then(() => console.log('✅ Sent'));
"
```

---

## Files Ready for Deployment

**On Local Machine**:
- ✅ `backend/dist-deployment.tar.gz` (packaged dist folder)
- ✅ `backend/src/migrations/20251116-*.sql` (4 migration files)
- ✅ `scripts/autonomous-remediation.sh` (remediation script)

**Deployment Tools**:
- ✅ `deploy-monitoring.sh` (Bash script - for Git Bash/WSL)
- ✅ `deploy-monitoring.ps1` (PowerShell script - has syntax issues, use manual steps)
- ✅ `EXECUTE_DEPLOYMENT_NOW.md` (This file - manual step-by-step)

---

**Total Time**: 45-60 minutes
**Difficulty**: Medium
**Rollback Available**: Yes

**Status**: ✅ READY TO EXECUTE

---

**Last Updated**: 2025-11-16
**Deployment Files**: All present and verified
**Backend Build**: Complete
**SSH**: May require troubleshooting

---

**Start with STEP 1 and work through each step sequentially.**

**Good luck with deployment!** 🚀
