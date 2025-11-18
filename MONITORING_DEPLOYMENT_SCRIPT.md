# Monitoring System Deployment Script
**Date**: 2025-11-16
**Status**: Ready for Execution
**Estimated Time**: 45-60 minutes

---

## Prerequisites

- SSH access to VPS (root@141.136.44.168)
- MySQL root password
- Backend built locally (`npm run build` completed)

---

## STEP 1: Copy Migration Files (5 minutes)

```bash
# On local machine
cd c:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Copy all migration files to VPS
scp backend/src/migrations/20251116-*.sql root@141.136.44.168:/tmp/

# Verify files copied
ssh root@141.136.44.168 "ls -lh /tmp/202511*.sql"
```

**Expected Output**: 5 migration files listed

---

## STEP 2: Run Database Migrations (10 minutes)

```bash
# SSH into VPS
ssh root@141.136.44.168

# Get MySQL password (if needed)
grep DB_PASSWORD /var/pdflab/app/backend/.env

# Run each migration
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab < /tmp/20251116-create-monitoring-baseline.sql
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab < /tmp/20251116-extend-alerts-table.sql
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab < /tmp/20251116-create-blocked-ips.sql
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab < /tmp/20251116-create-auth-logs.sql

# Verify tables created
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "
SHOW TABLES LIKE '%monitoring%';
SHOW TABLES LIKE '%blocked%';
SHOW TABLES LIKE '%authentication%';
SHOW TABLES LIKE '%remediation%';
"
```

**Expected Output**:
```
+-----------------------------------+
| Tables_in_pdflab (%monitoring%)  |
+-----------------------------------+
| monitoring_alerts                 |
| monitoring_baseline               |
+-----------------------------------+
```

---

## STEP 3: Deploy Backend Code (15 minutes)

```bash
# On local machine
cd c:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend

# Create tarball of dist folder
tar -czf dist.tar.gz dist/

# Copy to VPS
scp dist.tar.gz root@141.136.44.168:/tmp/

# SSH into VPS
ssh root@141.136.44.168

# Backup current dist folder
cd /var/pdflab/app/backend
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Extract new dist
tar -xzf /tmp/dist.tar.gz -C /var/pdflab/app/backend/

# Verify new files exist
ls -lh dist/services/ | grep -E "(baseline|decision|alert|daily|security)"
ls -lh dist/controllers/service-management.*
ls -lh dist/jobs/ | grep -E "(baseline|daily|security)"
```

**Expected Output**: All new service/controller/job files listed

---

## STEP 4: Deploy Autonomous Remediation Script (10 minutes)

```bash
# On local machine
scp scripts/autonomous-remediation.sh root@141.136.44.168:/tmp/

# SSH into VPS
ssh root@141.136.44.168

# Create scripts directory if it doesn't exist
mkdir -p /opt/pdflab/scripts
mkdir -p /var/log/pdflab

# Move script and make executable
mv /tmp/autonomous-remediation.sh /opt/pdflab/scripts/
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Verify script
ls -lh /opt/pdflab/scripts/autonomous-remediation.sh

# Test script manually (dry run)
/opt/pdflab/scripts/autonomous-remediation.sh

# Check log file created
tail -20 /var/log/pdflab/remediation.log
```

**Expected Output**: Script runs successfully, log entries created

---

## STEP 5: Set Up Cron Jobs (5 minutes)

```bash
# On VPS (already SSH'd in)
crontab -e

# Add these lines to crontab:
# Autonomous remediation (every 5 minutes)
*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh

# Save and exit (:wq in vim)

# Verify crontab
crontab -l | grep remediation
```

**Expected Output**: Cron job listed

**NOTE**: The backend cron jobs (baseline calculation, daily reports, security blocker) are initialized automatically by `server.ts` when the backend starts.

---

## STEP 6: Restart Backend (5 minutes)

```bash
# On VPS
docker restart pdflab-backend-prod

# Wait 10 seconds for startup
sleep 10

# Check logs for successful startup
docker logs pdflab-backend-prod --tail 100 | grep -E "(Baseline|Daily report|Security blocker|scheduled)"
```

**Expected Log Output**:
```
✓ Baseline calculation scheduled (daily at 2:00 AM)
✓ Daily report scheduled (daily at 9:00 AM)
✓ Security blocker scheduled (every 5 minutes)
```

---

## STEP 7: Verify Endpoints (10 minutes)

```bash
# Get admin auth token first
TOKEN="<your_admin_token>"  # Get from production login

# Test baseline endpoint
curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/monitoring/baseline

# Test decision engine endpoint
curl -X POST http://141.136.44.168:3006/api/monitoring/check-remediate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"metricName": "cpu", "currentValue": 95, "actionType": "restart"}'

# Test service management endpoints
curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/admin/manage/services/status

curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/admin/manage/database/connections
```

**Expected Responses**: JSON responses with data (not errors)

---

## STEP 8: Verify Cron Jobs Running (Wait 5-10 minutes)

```bash
# Wait for cron jobs to execute
# Baseline job: 2:00 AM daily
# Daily report: 9:00 AM daily
# Security blocker: Every 5 minutes (should run soon)
# Autonomous remediation: Every 5 minutes (should run soon)

# Check remediation log after 5-10 minutes
tail -50 /var/log/pdflab/remediation.log

# Check backend logs for cron job execution
docker logs pdflab-backend-prod | grep -E "(Baseline|Daily|Security blocker)" | tail -20

# Check database for security blocker activity
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "
SELECT COUNT(*) as blocked_ips FROM blocked_ips WHERE expires_at > NOW();
SELECT COUNT(*) as auth_logs FROM authentication_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
"
```

---

## STEP 9: Manual Testing (10 minutes)

### Test 1: Trigger Baseline Calculation (Optional)

```bash
# On VPS
docker exec -it pdflab-backend-prod node -e "
const { BaselineService } = require('./dist/services/baseline.service');
BaselineService.calculateBaseline().then(() => console.log('Baseline calculated'));
"

# Check database
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "SELECT * FROM monitoring_baseline;"
```

### Test 2: Restart a Service via API

```bash
# On local machine or VPS
TOKEN="<your_admin_token>"

curl -X POST http://141.136.44.168:3006/api/admin/manage/services/restart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "pdflab-redis-prod"}'

# Check remediation log
ssh root@141.136.44.168 "docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e 'SELECT * FROM remediation_log ORDER BY timestamp DESC LIMIT 5;'"
```

### Test 3: Check Disk Cleanup (will run automatically if >85%)

```bash
# Check current disk usage
ssh root@141.136.44.168 "df -h /"

# If below 85%, the autonomous script will NOT trigger cleanup
# Wait until 2am or 9am for baseline/daily report cron jobs
```

---

## POST-DEPLOYMENT CHECKLIST

- [ ] All 4 migration files executed successfully
- [ ] New backend files deployed and verified
- [ ] Autonomous remediation script executable and running
- [ ] Cron job added to crontab
- [ ] Backend restarted successfully
- [ ] Baseline endpoint returns data (or "no_data" message)
- [ ] Decision engine endpoint responds correctly
- [ ] Service management endpoints require admin auth
- [ ] Remediation log file exists and populated
- [ ] Backend logs show 3 cron jobs scheduled
- [ ] No errors in `docker logs pdflab-backend-prod`

---

## MONITORING POST-DEPLOYMENT

### Daily Checks (for 7 days)

1. **Check email at 9:00 AM** - Daily digest report should arrive
2. **Monitor `/var/log/pdflab/remediation.log`** - Auto-remediation actions logged
3. **Check database tables** - Baseline, alerts, remediation log growing
4. **Review backend logs** - No errors from cron jobs

### Weekly Checks

```bash
# Check baseline has been calculated (after 7 days of data)
curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/monitoring/baseline

# Review remediation statistics
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "
SELECT action_type, COUNT(*) as total, SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as successful
FROM remediation_log
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY action_type;
"

# Check alert summary
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "
SELECT severity, COUNT(*) as count
FROM monitoring_alerts
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY severity;
"
```

---

## ROLLBACK PROCEDURE (if issues occur)

```bash
# On VPS
ssh root@141.136.44.168

# Restore previous backend dist folder
cd /var/pdflab/app/backend
rm -rf dist
mv dist.backup.<timestamp> dist

# Remove cron job
crontab -e
# Delete the line: */5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh

# Restart backend
docker restart pdflab-backend-prod

# Optionally rollback database (use backups if available)
# WARNING: This will lose data from monitoring tables
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "
DROP TABLE IF EXISTS monitoring_baseline;
DROP TABLE IF EXISTS blocked_ips;
DROP TABLE IF EXISTS authentication_logs;
"
```

---

## TROUBLESHOOTING

### Issue: "Table already exists" error during migration

**Solution**: Table was created in previous attempt. Safe to ignore.

### Issue: Baseline endpoint returns {"status": "no_data"}

**Solution**: Normal - needs 7 days of data in `resource_metrics` table. Baseline will calculate automatically at 2:00 AM daily.

### Issue: Cron job not executing

**Check**:
```bash
# Verify cron service running
systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Check script permissions
ls -lh /opt/pdflab/scripts/autonomous-remediation.sh  # Should be -rwxr-xr-x
```

### Issue: Email alerts not sending

**Check**:
```bash
# Verify email service config in backend/.env
grep SMTP /var/pdflab/app/backend/.env

# Test email manually
docker exec -it pdflab-backend-prod node -e "
const emailService = require('./dist/services/email.service').default;
emailService.sendEmail('mmkela@gmail.com', 'Test', 'Test message');
"
```

### Issue: Backend won't start after deployment

**Check logs**:
```bash
docker logs pdflab-backend-prod --tail 200

# Common issues:
# - Missing node_modules (run: docker exec pdflab-backend-prod npm install)
# - Database connection error (check DB_* env vars)
# - Port already in use (restart Docker)
```

---

## SUCCESS METRICS (Track after 7 days)

| **Metric** | **Target** | **How to Check** |
|------------|-----------|------------------|
| Auto-remediation success rate | >95% | `SELECT SUM(status='success')/COUNT(*) FROM remediation_log` |
| System uptime | >99% | Check daily digest emails |
| Baseline calculated | Yes | GET /api/monitoring/baseline returns data |
| Daily reports received | 7/7 | Check email inbox |
| No critical errors | 0 | Review backend logs |

---

## NEXT STEPS (Optional)

1. **Implement Frontend UI** (Enhancement 7 - Service Management)
   - Follow implementation guide in `MONITORING_ENHANCEMENT_FOCUSED_PLAN.md` Section 7.3
   - Add management card to `/admin/monitoring` page

2. **Tune Thresholds** (After 7 days of data)
   - Review false positive rate
   - Adjust decision engine thresholds if needed
   - Update email alert batching if too noisy

3. **Add Custom Metrics**
   - Extend `resource_metrics` table with app-specific metrics
   - Update baseline service to include new metrics
   - Configure autonomous remediation for new scenarios

---

**Deployment By**: _________________
**Date**: _________________
**Notes**:
___________________________________________
___________________________________________

**Verified By**: _________________
**Date**: _________________

---

**Status**: ✅ Ready for Production Deployment
**Last Updated**: 2025-11-16
**Deployment Guide Version**: 1.0
