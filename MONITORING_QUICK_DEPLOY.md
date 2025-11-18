# Monitoring System - Quick Deploy Reference

**Total Time**: 45-60 minutes | **Difficulty**: Medium | **Status**: Ready

---

## Quick Deploy Commands

### 1. Copy Files to VPS (5 min)

```bash
# Migrations
scp backend/src/migrations/20251116-*.sql root@141.136.44.168:/tmp/

# Backend build
cd backend && tar -czf dist.tar.gz dist/
scp dist.tar.gz root@141.136.44.168:/tmp/

# Remediation script
scp scripts/autonomous-remediation.sh root@141.136.44.168:/tmp/
```

### 2. Run Migrations (10 min)

```bash
ssh root@141.136.44.168

# Run all 4 migrations
for file in /tmp/20251116-*.sql; do
  docker exec -i pdflab-mysql-prod mysql -u root -p pdflab < $file
done

# Verify
docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e "SHOW TABLES LIKE '%monitoring%'; SHOW TABLES LIKE '%blocked%';"
```

### 3. Deploy Backend (15 min)

```bash
cd /var/pdflab/app/backend
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
tar -xzf /tmp/dist.tar.gz
docker restart pdflab-backend-prod
docker logs pdflab-backend-prod --tail 50
```

### 4. Deploy Script & Cron (10 min)

```bash
mkdir -p /opt/pdflab/scripts /var/log/pdflab
mv /tmp/autonomous-remediation.sh /opt/pdflab/scripts/
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Add cron job
crontab -e
# Add: */5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh

# Test
/opt/pdflab/scripts/autonomous-remediation.sh
tail -20 /var/log/pdflab/remediation.log
```

### 5. Verify (10 min)

```bash
# Get token from login
TOKEN="<admin_token>"

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/monitoring/baseline
curl -H "Authorization: Bearer $TOKEN" http://141.136.44.168:3006/api/admin/manage/services/status
```

---

## Expected Logs

### Backend Startup
```
✓ Baseline calculation scheduled (daily at 2:00 AM)
✓ Daily report scheduled (daily at 9:00 AM)
✓ Security blocker scheduled (every 5 minutes)
```

### Remediation Script
```
[2025-11-16 14:30:00] Autonomous Remediation - Starting health checks
[2025-11-16 14:30:01] Disk usage: 65% - OK
[2025-11-16 14:30:02] All containers healthy - OK
```

---

## Rollback (if needed)

```bash
ssh root@141.136.44.168
cd /var/pdflab/app/backend
rm -rf dist && mv dist.backup.<timestamp> dist
crontab -e  # Remove remediation line
docker restart pdflab-backend-prod
```

---

## Post-Deployment Monitoring

**Day 1-7**: Baseline collecting data (normal to see "no_data")
**Day 8+**: Baseline calculated, anomaly detection active

**Daily at 9am**: Email digest arrives
**Every 5min**: Autonomous remediation runs (if needed)

---

## Quick Health Check

```bash
# All in one
ssh root@141.136.44.168 "
  docker ps --filter name=pdflab | grep -v NAMES;
  tail -5 /var/log/pdflab/remediation.log;
  docker logs pdflab-backend-prod | grep -E '(Baseline|Daily|Security)' | tail -3;
  docker exec -i pdflab-mysql-prod mysql -u root -p pdflab -e 'SELECT COUNT(*) FROM remediation_log WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR);'
"
```

---

## Files Created

**Backend**:
- 5 services (`baseline.service.ts`, `decision-engine.service.ts`, `alert.service.ts`, `daily-report.service.ts`, `security-blocker.service.ts`)
- 3 jobs (`baseline.job.ts`, `daily-report.job.ts`, `security-blocker.job.ts`)
- 1 controller (`service-management.controller.ts`)
- 1 route file (`service-management.routes.ts`)
- 1 middleware (`ip-blocker.middleware.ts`)
- 1 config (`logger.ts`)
- 4 migrations (SQL files)

**Scripts**:
- `autonomous-remediation.sh`

**Documentation**:
- `MONITORING_ENHANCEMENT_FOCUSED_PLAN.md` - Full implementation guide
- `COMPLETE_MONITORING_IMPLEMENTATION_GUIDE.md` - Comprehensive deployment guide
- `MONITORING_DEPLOYMENT_SCRIPT.md` - Step-by-step deployment script
- `MONITORING_QUICK_DEPLOY.md` - This quick reference

---

## API Endpoints

| **Endpoint** | **Method** | **Description** |
|-------------|-----------|----------------|
| `/api/monitoring/baseline` | GET | Get 7-day baseline metrics |
| `/api/monitoring/check-remediate` | POST | Check if remediation should run |
| `/api/monitoring/remediation-log` | GET | Get auto-remediation history |
| `/api/admin/manage/services/status` | GET | Get Docker services status |
| `/api/admin/manage/services/restart` | POST | Restart a service |
| `/api/admin/manage/cache/clear` | POST | Clear Redis cache |
| `/api/admin/manage/disk/cleanup` | POST | Run disk cleanup |
| `/api/admin/manage/database/optimize` | POST | Optimize DB tables |
| `/api/admin/manage/database/connections` | GET | View active DB connections |

---

## Cron Schedule

| **Job** | **Schedule** | **Purpose** |
|---------|--------------|-------------|
| Baseline | Daily 2am | Calculate 7-day baselines |
| Daily Report | Daily 9am | Send email digest |
| Security Blocker | Every 5min | Check & block abusive IPs |
| Remediation Script | Every 5min | Auto-fix common issues |

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Deployment Status**: ✅ Ready
