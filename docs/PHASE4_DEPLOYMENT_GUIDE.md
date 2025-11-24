# Phase 4: Advanced Monitoring - Deployment Guide

**Status**: Ready for deployment
**Estimated Time**: 30-45 minutes
**Complexity**: Medium
**Risk Level**: Low (no breaking changes)

---

## Prerequisites

- [x] All tests passed (see [PHASE4_TEST_RESULTS.md](PHASE4_TEST_RESULTS.md))
- [ ] Production server access (SSH)
- [ ] Prometheus running on port 9090
- [ ] Backend running on port 3006
- [ ] Frontend running on port 3000

---

## Deployment Steps

### Step 1: Backend Integration (15 minutes)

#### 1.1 Update Server Entry Point

Add metrics initialization to your backend server:

**File**: `backend/src/server.ts`

```typescript
import { initializeMetrics } from './metrics'

// After server initialization (after app.listen())
logger.info('[Server] Initializing advanced monitoring...')
const stopMetrics = initializeMetrics()
logger.info('[Server] Advanced monitoring started')

// Update shutdown handlers
process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received, shutting down gracefully...')
  stopMetrics() // Stop metrics collection
  server.close(() => {
    logger.info('[Server] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('[Server] SIGINT received, shutting down gracefully...')
  stopMetrics() // Stop metrics collection
  server.close(() => {
    logger.info('[Server] Server closed')
    process.exit(0)
  })
})
```

**What this does**:
- Starts queue monitoring (every 10 seconds)
- Exports metrics on `/metrics` endpoint (already handled by prom-client)
- Returns cleanup function for graceful shutdown

#### 1.2 Test Locally

```bash
# Start backend
cd backend
npm run dev

# In another terminal, verify metrics endpoint
curl http://localhost:3006/metrics | grep pdflab_

# You should see metrics like:
# pdflab_queue_depth{queue_name="conversion",state="waiting"} 0
# pdflab_conversion_funnel_stage_total{stage="upload_initiated"} 0
# pdflab_http_errors_total{method="GET",route="/api/test",status_code="500"} 0
```

#### 1.3 Deploy to Production

```bash
# SSH into production server
ssh root@141.136.44.168

# Navigate to backend directory
cd /var/pdflab/app/backend

# Pull latest changes
git pull origin master

# Install dependencies (if any new ones)
npm install

# Restart backend
docker restart pdflab-backend-prod

# Verify metrics endpoint
docker exec pdflab-backend-prod curl http://localhost:3006/metrics | grep pdflab_
```

---

### Step 2: Prometheus Configuration (10 minutes)

#### 2.1 Deploy Alert Rules

**Local Machine**:
```bash
# Copy alert rules to production server
scp prometheus/alerts/custom-alerts.yml root@141.136.44.168:/etc/prometheus/alerts/

# Or if running Prometheus in Docker, copy to volume
scp prometheus/alerts/custom-alerts.yml root@141.136.44.168:/var/pdflab/prometheus/alerts/
```

**Production Server**:
```bash
# Verify alert rules file
cat /etc/prometheus/alerts/custom-alerts.yml

# Update Prometheus config to include alert rules
# Edit /etc/prometheus/prometheus.yml
nano /etc/prometheus/prometheus.yml
```

**Add to `prometheus.yml`**:
```yaml
# Alert rules
rule_files:
  - '/etc/prometheus/alerts/custom-alerts.yml'

# Scrape PDFLab backend metrics
scrape_configs:
  - job_name: 'pdflab-backend'
    static_configs:
      - targets: ['pdflab-backend-prod:3006']  # Docker container name
    scrape_interval: 15s
```

**Reload Prometheus**:
```bash
# If running in Docker
docker exec prometheus kill -HUP 1

# Or restart container
docker restart prometheus

# Verify alerts loaded
curl http://localhost:9090/api/v1/rules | jq .
```

#### 2.2 Verify Prometheus Scraping

**Check Prometheus UI**: http://your-server:9090

1. Go to **Status** → **Targets**
2. Verify `pdflab-backend` target is **UP**
3. Go to **Alerts**
4. Verify custom alerts are loaded
5. Go to **Graph**
6. Try query: `pdflab_queue_depth{state="waiting"}`

---

### Step 3: Frontend Deployment (15 minutes)

#### 3.1 Set Environment Variable

**Production Server**:
```bash
# Add to frontend .env.production
echo "NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:9090" >> /var/pdflab/app/.env.production

# Or update existing .env file
nano /var/pdflab/app/.env.production
```

**Add**:
```env
NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:9090
```

**Security Note**: If Prometheus is not publicly accessible, you may need to:
- Set up a reverse proxy (recommended)
- Or use Prometheus within the same Docker network
- Or expose Prometheus on a specific port with authentication

#### 3.2 Build and Deploy Frontend

```bash
# On production server
cd /var/pdflab/app

# Pull latest changes
git pull origin master

# Install dependencies
npm install

# Build production bundle
npm run build

# Restart frontend
docker restart pdflab-frontend-prod

# Or if not using Docker
pm2 restart pdflab-frontend
```

#### 3.3 Verify Dashboard Access

1. Navigate to: `http://your-domain.com/admin/monitoring`
2. Check browser console for errors
3. Wait 1-2 minutes for data to accumulate
4. Verify components are loading:
   - Conversion Funnel Chart
   - SLO Dashboard
   - Queue Monitor
   - Error Rate Table

---

### Step 4: Post-Deployment Validation (10 minutes)

#### 4.1 Backend Health Check

```bash
# Check backend logs
docker logs pdflab-backend-prod --tail 100

# Look for:
# [Metrics] Initializing advanced monitoring
# [Metrics] Advanced monitoring initialized
# [Metrics] Queue monitoring started

# Verify metrics are being exported
curl http://localhost:3006/metrics | grep pdflab_ | head -20
```

#### 4.2 Prometheus Health Check

**Prometheus UI**: http://your-server:9090

```promql
# Test queries
pdflab_queue_depth{state="waiting"}
rate(pdflab_http_errors_total[5m])
pdflab_slo_compliance_percentage{slo_type="uptime"}
```

**Expected**: All queries return data (may be zero initially)

#### 4.3 Frontend Health Check

**Browser Console** (F12):
```javascript
// Should see no errors

// Network tab should show successful requests to:
// - http://your-prometheus:9090/api/v1/query
// - http://your-prometheus:9090/api/v1/query_range
```

#### 4.4 Alert Testing (Optional)

Trigger a test alert to verify alert manager integration:

```bash
# Simulate queue backup (if using test environment)
# Add 150 jobs to queue to trigger QueueBackup alert
curl -X POST http://localhost:3006/api/conversions \
  -H "Content-Type: application/json" \
  -d '{"file": "test.pdf"}' \
  -s | jq . &

# Repeat 150 times or use a loop
for i in {1..150}; do
  curl -X POST http://localhost:3006/api/conversions \
    -H "Content-Type: application/json" \
    -d '{"file": "test'$i'.pdf"}' &
done

# Check Prometheus alerts after 5 minutes
curl http://localhost:9090/api/v1/alerts | jq .
```

---

## Rollback Plan (If Issues Occur)

### Backend Rollback

```bash
# On production server
cd /var/pdflab/app/backend

# Revert to previous commit
git log --oneline -5
git revert HEAD --no-edit

# Rebuild and restart
docker restart pdflab-backend-prod
```

### Frontend Rollback

```bash
# On production server
cd /var/pdflab/app

# Revert to previous commit
git revert HEAD --no-edit

# Rebuild and restart
npm run build
docker restart pdflab-frontend-prod
```

### Prometheus Rollback

```bash
# Remove alert rules
rm /etc/prometheus/alerts/custom-alerts.yml

# Remove scrape config from prometheus.yml
nano /etc/prometheus/prometheus.yml
# (manually remove pdflab-backend scrape config)

# Reload Prometheus
docker exec prometheus kill -HUP 1
```

**Impact of Rollback**: None - monitoring is non-intrusive and won't affect core functionality.

---

## Troubleshooting

### Issue: Backend metrics not showing

**Symptoms**: `/metrics` endpoint returns empty or no `pdflab_*` metrics

**Solutions**:
```bash
# 1. Check if metrics module initialized
docker logs pdflab-backend-prod | grep "Metrics"

# 2. Verify prom-client is installed
docker exec pdflab-backend-prod npm list prom-client

# 3. Test metrics endpoint
docker exec pdflab-backend-prod curl http://localhost:3006/metrics | grep pdflab_

# 4. Check for errors in logs
docker logs pdflab-backend-prod --tail 200 | grep -i error
```

### Issue: Prometheus not scraping

**Symptoms**: Prometheus UI shows `pdflab-backend` target as **DOWN**

**Solutions**:
```bash
# 1. Check if backend is accessible from Prometheus container
docker exec prometheus ping pdflab-backend-prod

# 2. Verify network connectivity
docker network inspect pdflab-network

# 3. Test metrics endpoint from Prometheus container
docker exec prometheus wget -O- http://pdflab-backend-prod:3006/metrics

# 4. Check Prometheus logs
docker logs prometheus --tail 100 | grep pdflab
```

### Issue: Dashboard not loading data

**Symptoms**: Dashboard shows "Loading..." or "No data available"

**Solutions**:
```bash
# 1. Check browser console for CORS errors
# (Open browser DevTools → Console)

# 2. Verify NEXT_PUBLIC_PROMETHEUS_URL is set correctly
docker exec pdflab-frontend-prod env | grep PROMETHEUS

# 3. Test Prometheus API from browser
# Navigate to: http://your-prometheus:9090/api/v1/query?query=up

# 4. Check if data has accumulated (wait 2-5 minutes after deployment)
curl "http://localhost:9090/api/v1/query?query=pdflab_queue_depth" | jq .
```

### Issue: Alerts not firing

**Symptoms**: Prometheus shows alerts loaded but never firing

**Solutions**:
```bash
# 1. Check alert rules syntax
docker exec prometheus promtool check rules /etc/prometheus/alerts/custom-alerts.yml

# 2. Verify metrics exist
curl "http://localhost:9090/api/v1/query?query=pdflab_queue_depth{state='waiting'}" | jq .

# 3. Check alert evaluation time
# Alerts need time to evaluate (for: 5m means wait 5 minutes)

# 4. Lower thresholds temporarily for testing
# Edit custom-alerts.yml and change:
# pdflab_queue_depth{state="waiting"} > 100  →  > 0
```

---

## Monitoring the Monitoring System

After deployment, monitor these metrics to ensure Phase 4 is working:

### Key Metrics to Watch

```promql
# Queue monitoring working?
up{job="pdflab-backend"}

# Queue depth being collected?
pdflab_queue_depth{state="waiting"}

# Conversion funnel tracking?
rate(pdflab_conversion_funnel_stage_total[5m])

# SLO tracking?
pdflab_slo_compliance_percentage{slo_type="uptime"}

# Error tracking?
rate(pdflab_http_errors_total[5m])
```

### Expected Values (First Hour)

- `up{job="pdflab-backend"}` = 1 (backend is up)
- `pdflab_queue_depth` = 0-10 (normal operation)
- `pdflab_conversion_funnel_stage_total` = increasing over time
- `pdflab_slo_compliance_percentage` = 99-100%
- `pdflab_http_errors_total` = 0 or very low

---

## Performance Impact Assessment

Monitor these system metrics after deployment:

```bash
# Memory usage
docker stats pdflab-backend-prod --no-stream

# CPU usage
docker stats pdflab-backend-prod --no-stream

# Network I/O (Prometheus scraping overhead)
docker stats prometheus --no-stream
```

**Expected Impact**:
- Memory: +5-10 MB
- CPU: <1% increase
- Network: ~50 KB/scrape (every 15s = ~200 KB/min)

**Alert Thresholds**:
- If memory increases by >50 MB, investigate
- If CPU increases by >5%, investigate
- If network I/O increases by >1 MB/min, investigate

---

## Success Criteria

After 24 hours of running in production, verify:

- [ ] Backend uptime: 100%
- [ ] Metrics collection: Active
- [ ] Dashboard accessible: Yes
- [ ] Data visualization: Working
- [ ] Alerts evaluated: Yes (check Prometheus UI)
- [ ] No performance degradation: CPU/memory stable
- [ ] No errors in logs: Backend/frontend logs clean

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor dashboard daily for first week
- [ ] Tune alert thresholds if needed (too many/too few alerts)
- [ ] Train team on using the dashboard
- [ ] Document common queries for team

### Week 2
- [ ] Review 7-day SLO compliance reports
- [ ] Analyze conversion funnel drop-off rates
- [ ] Set up alert notifications (email/Slack/PagerDuty)
- [ ] Create runbooks for common alert scenarios

### Week 3
- [ ] Full security audit (Phase 5)
- [ ] Load testing with monitoring active
- [ ] Optimize dashboard performance if needed
- [ ] Plan Phase 6 enhancements

---

## Getting Help

### Documentation
- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

### Internal Documentation
- [PHASE4_CUSTOM_DASHBOARD_SOLUTION.md](docs/PHASE4_CUSTOM_DASHBOARD_SOLUTION.md) - Custom dashboard architecture
- [PHASE4_CUSTOM_SOLUTION_SUMMARY.md](PHASE4_CUSTOM_SOLUTION_SUMMARY.md) - Implementation summary
- [PHASE4_TEST_RESULTS.md](PHASE4_TEST_RESULTS.md) - Test results and validation

### Support Contacts
- Backend issues: Check `backend/src/metrics/` module logs
- Frontend issues: Check browser console and Next.js logs
- Prometheus issues: Check `/var/log/prometheus/` or `docker logs prometheus`

---

## Deployment Checklist

Print this checklist and mark items as completed:

### Pre-Deployment
- [x] All tests passed
- [ ] Team notified of deployment
- [ ] Backup database taken
- [ ] Rollback plan reviewed

### Backend Deployment
- [ ] Updated `backend/src/server.ts` with `initializeMetrics()`
- [ ] Deployed to production server
- [ ] Verified metrics endpoint
- [ ] Checked logs for errors

### Prometheus Deployment
- [ ] Deployed alert rules
- [ ] Updated `prometheus.yml` scrape config
- [ ] Reloaded Prometheus
- [ ] Verified targets are UP
- [ ] Verified alerts loaded

### Frontend Deployment
- [ ] Set `NEXT_PUBLIC_PROMETHEUS_URL` environment variable
- [ ] Built production bundle
- [ ] Deployed to production
- [ ] Verified dashboard accessible
- [ ] Checked browser console for errors

### Post-Deployment Validation
- [ ] Backend metrics exporting
- [ ] Prometheus scraping successfully
- [ ] Dashboard loading data
- [ ] No performance degradation
- [ ] Team training completed

### Week 1 Monitoring
- [ ] Daily dashboard checks
- [ ] Alert threshold tuning
- [ ] Performance monitoring
- [ ] User feedback collection

---

**Deployment Owner**: _____________
**Deployment Date**: _____________
**Deployment Time**: _____________
**Sign-off**: _____________

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Ready for deployment
