# 🤖 Elite Health Guardian - Complete Deployment Guide

**Status**: ✅ Backend & Frontend Code Ready | 🔴 Production Deployment Pending
**Last Updated**: 2025-11-17
**Estimated Time**: 2-3 hours

---

## 📋 Overview

This guide implements the full autonomous production monitoring system across:
1. **External Monitoring** (Sentry + UptimeRobot)
2. **Elite Health Guardian** (Autonomous agent on VPS)
3. **Auto-Remediation Scripts** (Self-healing playbooks)
4. **Email Alerting** (SMTP-based notifications)

---

## Phase 1: External Monitoring Setup (30 minutes)

### Step 1: Sentry Error Tracking

**STATUS**: ✅ Code installed, ❌ DSN not configured

#### 1.1 Create Sentry Account

```bash
# Go to https://sentry.io
# Sign up with mmkela@gmail.com
# Create new project: "PDFLab-Backend" (Node.js/Express)
# Create new project: "PDFLab-Frontend" (Next.js)
```

#### 1.2 Get DSN Keys

After creating projects, you'll get:
- Backend DSN: `https://xxxxxxxxxxxxx@xxx.ingest.sentry.io/backend`
- Frontend DSN: `https://xxxxxxxxxxxxx@xxx.ingest.sentry.io/frontend`

#### 1.3 Configure Backend (.env)

```bash
# SSH to VPS
ssh root@141.136.44.168

# Edit backend .env
nano /var/www/pdflab/backend/.env

# Uncomment and add your DSN:
SENTRY_DSN=https://YOUR_BACKEND_DSN_HERE
SENTRY_DEV=false

# Save and restart backend
docker restart pdflab-backend-prod
```

#### 1.4 Configure Frontend (.env.local)

```bash
# On VPS
nano /var/www/pdflab/.env.local

# Add:
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_FRONTEND_DSN_HERE
NEXT_PUBLIC_SENTRY_DEV=false

# Save and rebuild frontend
cd /var/www/pdflab
docker-compose -f docker-compose.production.yml up -d --build frontend
```

#### 1.5 Test Sentry Integration

```bash
# Test backend error tracking
curl https://pdflab.pro/api/debug-sentry

# Check Sentry dashboard - should see error within 1 minute

# Test frontend error tracking (create test error in browser console)
# Open https://pdflab.pro
# Browser console: throw new Error("Test Sentry Frontend")
```

**Expected Result**: See errors appear in Sentry dashboard with full stack traces

---

### Step 2: UptimeRobot Monitoring

**STATUS**: ❌ Not configured
**Time**: 5 minutes

#### 2.1 Create Account

```bash
# Go to https://uptimerobot.com
# Sign up with mmkela@gmail.com
# Free tier: 50 monitors, 5-minute intervals
```

#### 2.2 Add Main Site Monitor

```
Monitor Type: HTTP(s)
Friendly Name: PDFLab Production
URL: https://pdflab.pro
Monitoring Interval: 5 minutes

Advanced Settings:
☑ Keyword to check: "PDFLab"
Timeout: 30 seconds
```

#### 2.3 Add API Health Monitor

```
Monitor Type: HTTP(s)
Friendly Name: PDFLab API Health
URL: https://pdflab.pro/health
Monitoring Interval: 5 minutes

Advanced Settings:
☑ Keyword to check: "OK"
Expected HTTP Status: 200
```

#### 2.4 Configure Alerts

```
Alert Contacts:
Email: mmkela@gmail.com

Alert When:
☑ Down (site unreachable)
☑ Up (site back online)
☑ Slow response (>5 seconds)

Alert Timing:
Wait before alert: 2 consecutive failures (10 minutes)
```

#### 2.5 Test Alerts

```bash
# SSH to VPS
ssh root@141.136.44.168

# Stop backend temporarily
docker stop pdflab-backend-prod

# Wait 10-15 minutes for UptimeRobot to detect and send alert
# Verify you receive email

# Restart backend
docker start pdflab-backend-prod

# Wait for "Up" alert
```

**Expected Result**: Receive down alert via email, then up alert when service restored

---

## Phase 2: Deploy Elite Health Guardian (1 hour)

### Step 1: Upload Scripts to VPS

**STATUS**: ✅ Scripts created locally, ❌ Not uploaded to VPS

```bash
# On your local machine (Windows PowerShell)
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Create deployment package
tar -czf guardian-scripts.tar.gz scripts/*.sh

# Upload to VPS
scp guardian-scripts.tar.gz root@141.136.44.168:/var/pdflab/

# SSH to VPS
ssh root@141.136.44.168

# Extract scripts
cd /var/pdflab
mkdir -p scripts
tar -xzf guardian-scripts.tar.gz -C /
chmod +x scripts/*.sh

# Verify scripts
ls -lh scripts/
```

**Expected Files**:
- `elite-health-guardian.sh` - Main monitoring loop
- `autonomous-remediation.sh` - Auto-fix engine
- `send-alert-email.sh` - Email alerts
- `health-check-enhanced.sh` - Health checks
- `drift-detector.sh` - Config drift
- `deployment-guardrails.sh` - Deploy safety

---

### Step 2: Configure SMTP Email

```bash
# On VPS, create monitoring environment file
nano /var/pdflab/.env.monitoring

# Add these lines:
ALERT_EMAIL=mmkela@gmail.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=support@pdflab.pro
SMTP_PASSWORD=YOUR_HOSTINGER_PASSWORD_HERE
SMTP_FROM=support@pdflab.pro
```

**Get SMTP Password**:
1. Log in to Hostinger control panel
2. Go to Email → Email Accounts
3. Find `support@pdflab.pro`
4. Click "Manage" → "Email Password"
5. Copy password to `.env.monitoring`

---

### Step 3: Test Email System

```bash
# Test email sending
/var/pdflab/scripts/send-alert-email.sh "TEST" "Elite Guardian installed successfully"

# Check mmkela@gmail.com inbox
# Should receive test email within 1 minute
```

---

### Step 4: Set Up Cron Jobs

```bash
# Edit crontab
crontab -e

# Add these lines (runs every 30 seconds):
* * * * * /var/pdflab/scripts/elite-health-guardian.sh >> /var/log/guardian.log 2>&1
* * * * * sleep 30; /var/pdflab/scripts/elite-health-guardian.sh >> /var/log/guardian.log 2>&1

# Daily backup at 3 AM
0 3 * * * /var/pdflab/scripts/auto-backup.sh >> /var/log/backup.log 2>&1

# Weekly health audit (Sunday 2 AM)
0 2 * * 0 /var/pdflab/scripts/weekly-health-audit.sh >> /var/log/audit.log 2>&1

# Save and exit
```

---

### Step 5: Verify Guardian is Running

```bash
# Check if cron job is active
ps aux | grep elite-health-guardian

# Watch logs in real-time
tail -f /var/log/guardian.log

# Check recent monitoring actions
tail -20 /var/pdflab/logs/health-guardian.log

# Query monitoring database
docker exec pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production \
  -e "SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 5;"
```

**Expected Output**:
```
=== Starting monitoring cycle at 2025-11-17 14:30:00 ===
✓ Frontend (pdflab-frontend-prod): healthy
✓ Backend (pdflab-backend-prod): healthy
✓ MySQL (pdflab-mysql-prod): healthy
✓ Redis (pdflab-redis-prod): healthy
✓ Disk usage: 45% (OK)
✓ Memory usage: 62% (OK)
=== Monitoring cycle completed at 2025-11-17 14:30:05 ===
```

---

## Phase 3: Create Auto-Remediation Scripts (2 hours)

### Script 1: auto-restart-container.sh

```bash
# Create script
nano /var/pdflab/scripts/auto-restart-container.sh

#!/bin/bash
# Auto-restart unhealthy Docker containers

source /var/pdflab/.env.monitoring

CONTAINER=$1
MAX_RESTARTS=3
COOLDOWN=300  # 5 minutes

# Check restart count in last hour
RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER" 2>/dev/null || echo 0)

if [[ $RESTART_COUNT -ge $MAX_RESTARTS ]]; then
  /var/pdflab/scripts/send-alert-email.sh "CRITICAL" "Container $CONTAINER restart loop detected. Manual intervention required."
  exit 1
fi

# Restart container
echo "$(date) - Restarting unhealthy container: $CONTAINER"
docker restart "$CONTAINER"

# Wait for health check
sleep 30

# Verify healthy
STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)
if [[ "$STATUS" == "healthy" ]]; then
  /var/pdflab/scripts/send-alert-email.sh "SUCCESS" "Container $CONTAINER restarted successfully"
  exit 0
else
  /var/pdflab/scripts/send-alert-email.sh "CRITICAL" "Container $CONTAINER restart failed. Status: $STATUS"
  exit 1
fi

# Make executable
chmod +x /var/pdflab/scripts/auto-restart-container.sh
```

---

### Script 2: auto-clear-cache.sh

```bash
nano /var/pdflab/scripts/auto-clear-cache.sh

#!/bin/bash
# Clear Redis cache when >80% full

source /var/pdflab/.env.monitoring

# Check memory usage
MEMORY_USED=$(docker exec pdflab-redis-prod redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r MB')
MEMORY_MAX=$(docker exec pdflab-redis-prod redis-cli CONFIG GET maxmemory | tail -1)

# Calculate percentage
PERCENT=$(echo "scale=0; ($MEMORY_USED * 100) / ($MEMORY_MAX / 1048576)" | bc)

if [[ $PERCENT -gt 80 ]]; then
  echo "$(date) - Redis memory at ${PERCENT}% - clearing caches"

  # Clear temp keys
  docker exec pdflab-redis-prod redis-cli --scan --pattern "temp:*" | \
    xargs docker exec pdflab-redis-prod redis-cli DEL

  # Force garbage collection
  docker exec pdflab-redis-prod redis-cli MEMORY PURGE

  /var/pdflab/scripts/send-alert-email.sh "WARNING" "Redis cache cleared - was at ${PERCENT}%"
fi

chmod +x /var/pdflab/scripts/auto-clear-cache.sh
```

---

### Script 3: auto-cleanup-disk.sh

```bash
nano /var/pdflab/scripts/auto-cleanup-disk.sh

#!/bin/bash
# Cleanup disk space when >85% full

source /var/pdflab/.env.monitoring

# Check disk usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

if [[ $DISK_USAGE -gt 85 ]]; then
  echo "$(date) - Disk at ${DISK_USAGE}% - running cleanup"

  # Docker cleanup
  docker system prune -af --filter "until=72h"

  # Old uploads
  find /var/www/pdflab/backend/storage/uploads -type f -mtime +30 -delete

  # Compress old logs
  find /var/log -name "*.log" -mtime +7 -exec gzip {} \;

  # Remove old backups (keep 7 days)
  find /var/pdflab/backups -name "*.sql.gz" -mtime +7 -delete

  NEW_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
  FREED=$((DISK_USAGE - NEW_USAGE))

  /var/pdflab/scripts/send-alert-email.sh "INFO" "Disk cleanup completed. Freed ${FREED}%. Usage: ${NEW_USAGE}%"
fi

chmod +x /var/pdflab/scripts/auto-cleanup-disk.sh
```

---

### Script 4: auto-optimize-database.sh

```bash
nano /var/pdflab/scripts/auto-optimize-database.sh

#!/bin/bash
# Optimize MySQL tables weekly

source /var/pdflab/.env.monitoring

echo "$(date) - Starting database optimization"

# Get all tables
TABLES=$(docker exec pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production \
  -e "SHOW TABLES" | tail -n +2)

COUNT=0
for TABLE in $TABLES; do
  docker exec pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production \
    -e "ANALYZE TABLE $TABLE; OPTIMIZE TABLE $TABLE;" > /dev/null 2>&1
  ((COUNT++))
done

/var/pdflab/scripts/send-alert-email.sh "INFO" "Database optimization completed. Optimized $COUNT tables."

chmod +x /var/pdflab/scripts/auto-optimize-database.sh
```

---

### Script 5: auto-backup.sh

```bash
nano /var/pdflab/scripts/auto-backup.sh

#!/bin/bash
# Daily automated backups

source /var/pdflab/.env.monitoring

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/pdflab/backups"

mkdir -p "$BACKUP_DIR"

echo "$(date) - Starting daily backup"

# MySQL backup
docker exec pdflab-mysql-prod mysqldump -updflab -p***REMOVED*** \
  --all-databases --single-transaction --quick --lock-tables=false | \
  gzip > "$BACKUP_DIR/mysql_${TIMESTAMP}.sql.gz"

# Redis backup
docker exec pdflab-redis-prod redis-cli BGSAVE
sleep 10
docker cp pdflab-redis-prod:/data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# Application files
tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" /var/www/pdflab/backend/storage/uploads

# Verify backup integrity
if gzip -t "$BACKUP_DIR/mysql_${TIMESTAMP}.sql.gz" 2>/dev/null; then
  /var/pdflab/scripts/send-alert-email.sh "SUCCESS" "Daily backup completed: $TIMESTAMP"
else
  /var/pdflab/scripts/send-alert-email.sh "CRITICAL" "Backup verification FAILED: $TIMESTAMP"
fi

chmod +x /var/pdflab/scripts/auto-backup.sh
```

---

## Phase 4: Monitoring Dashboard Access

### Access URLs

- **Main Monitoring Dashboard**: https://pdflab.pro/admin/monitoring
- **Service Management**: https://pdflab.pro/admin/monitoring → Service Management tab
- **System Health**: https://pdflab.pro/admin/system

### Admin Login

```
Email: admin@pdflab.pro
Password: <your_admin_password>
```

---

## Verification Checklist

### ✅ External Monitoring
- [ ] Sentry capturing backend errors
- [ ] Sentry capturing frontend errors
- [ ] UptimeRobot monitoring pdflab.pro
- [ ] UptimeRobot monitoring /health endpoint
- [ ] Email alerts working (test with down alert)

### ✅ Elite Guardian
- [ ] Scripts uploaded to VPS
- [ ] Cron jobs running every 30 seconds
- [ ] Email alerts configured
- [ ] Guardian logging to /var/log/guardian.log
- [ ] Monitoring data in MySQL database

### ✅ Auto-Remediation
- [ ] auto-restart-container.sh created
- [ ] auto-clear-cache.sh created
- [ ] auto-cleanup-disk.sh created
- [ ] auto-optimize-database.sh created
- [ ] auto-backup.sh running daily at 3 AM

### ✅ Dashboard Access
- [ ] Can access /admin/monitoring
- [ ] Can see health checks history
- [ ] Can see alerts
- [ ] Can manually restart services
- [ ] Can view database connections

---

## Expected Email Alerts

Once deployed, you should receive:

### Daily (9 AM UTC)
- Daily health report summary
- Resource usage trends
- Auto-remediation actions taken

### As Needed
- 🔴 CRITICAL: Site down, database unreachable
- 🟡 WARNING: High memory, disk >85%
- 🟢 SUCCESS: Auto-restart successful, backup completed
- 🔵 INFO: Database optimized, cache cleared

---

## Troubleshooting

### Guardian Not Running

```bash
# Check cron jobs
crontab -l

# Check logs
tail -f /var/log/guardian.log

# Run manually
/var/pdflab/scripts/elite-health-guardian.sh
```

### Email Not Sending

```bash
# Test SMTP
/var/pdflab/scripts/send-alert-email.sh "TEST" "Test message"

# Check .env.monitoring
cat /var/pdflab/.env.monitoring

# Verify SMTP credentials in Hostinger
```

### Sentry Not Capturing Errors

```bash
# Check DSN configured
grep SENTRY backend/.env

# Test error endpoint
curl https://pdflab.pro/api/debug-sentry

# Check Sentry dashboard
```

---

## Success Metrics (After 7 Days)

- **Uptime**: 99.9%+
- **Auto-remediations**: 2-10 container restarts
- **Alerts sent**: 5-20 emails
- **Manual interventions**: <2
- **Mean Time to Recovery**: <5 minutes

---

## Next Steps

After successful deployment:

1. Monitor for 7 days
2. Adjust alert thresholds
3. Add predictive maintenance (Phase 4)
4. Implement SSL cert auto-renewal
5. Add security scanning (Trivy)

---

**Deployment Status**: 🟡 READY FOR EXECUTION
**Approver**: mmkela@gmail.com
**Support**: Check dashboard at https://pdflab.pro/admin/monitoring
