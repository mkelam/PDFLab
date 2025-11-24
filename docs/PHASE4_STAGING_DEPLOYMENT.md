# Phase 4: Advanced Monitoring - Staging Deployment Guide

**Deploy Phase 4 to staging environment first for safe testing**

**Staging Environment**: ✅ Available
**Recommended**: Deploy to staging → Test 24-48 hours → Deploy to production

---

## Staging Environment Overview

PDFLab has a complete staging environment running on the same VPS:

| Service | Production | Staging | Status |
|---------|-----------|---------|--------|
| **Frontend** | Port 3000 | Port 3001 | ✅ Active |
| **Backend** | Port 3006 | Port 3007 | ✅ Active |
| **MySQL** | Port 3306 | Port 3307 | ✅ Active |
| **Redis** | Port 6379 | Port 6380 | ✅ Active |

**Access URLs**:
- Frontend: `http://staging.pdflab.pro:3001` or `http://141.136.44.168:3001`
- Backend: `http://staging.pdflab.pro:3007` or `http://141.136.44.168:3007`

---

## Phase 4 Staging Deployment Steps

### Step 1: Deploy Backend to Staging (15 minutes)

#### 1.1 Update Staging Code

From your local machine:

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Sync code to staging directory on VPS
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude 'backend/node_modules' \
    --exclude 'backend/storage' \
    backend/ root@141.136.44.168:/var/pdflab-staging/app/backend/
```

Or via SSH:

```bash
# SSH to server
ssh root@141.136.44.168

# Copy latest backend code from production to staging
cp -r /var/pdflab/app/backend/src/metrics /var/pdflab-staging/app/backend/src/
```

#### 1.2 Update Backend Server Entry Point

```bash
# SSH to server
ssh root@141.136.44.168

# Edit staging server.ts
nano /var/pdflab-staging/app/backend/src/server.ts
```

Add metrics initialization:

```typescript
import { initializeMetrics } from './metrics'

// After server initialization
logger.info('[Server] Initializing advanced monitoring (STAGING)...')
const stopMetrics = initializeMetrics()
logger.info('[Server] Advanced monitoring started (STAGING)')

// Update shutdown handlers
process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received, shutting down gracefully...')
  stopMetrics()
  server.close(() => {
    logger.info('[Server] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('[Server] SIGINT received, shutting down gracefully...')
  stopMetrics()
  server.close(() => {
    logger.info('[Server] Server closed')
    process.exit(0)
  })
})
```

#### 1.3 Restart Staging Backend

```bash
cd /var/pdflab-staging/app/deployment/staging
docker-compose -f docker-compose.staging.yml restart backend-staging

# Watch logs for successful startup
docker-compose -f docker-compose.staging.yml logs -f backend-staging
```

Look for:
```
[Server] Initializing advanced monitoring (STAGING)...
[Metrics] Initializing advanced monitoring
[Metrics] Advanced monitoring initialized
[Metrics] Queue monitoring started
[Server] Advanced monitoring started (STAGING)
```

#### 1.4 Verify Metrics Endpoint

```bash
# Test metrics endpoint (from VPS)
curl http://localhost:3007/metrics | grep pdflab_

# Or from local machine
curl http://141.136.44.168:3007/metrics | grep pdflab_

# Expected output (values will be 0 initially):
# pdflab_queue_depth{queue_name="conversion",state="waiting"} 0
# pdflab_conversion_funnel_stage_total{stage="upload_initiated"} 0
# pdflab_http_errors_total{...} 0
```

---

### Step 2: Deploy Prometheus to Staging (10 minutes)

#### Option A: Separate Prometheus Instance for Staging (Recommended)

```bash
# SSH to server
ssh root@141.136.44.168

# Create staging Prometheus directory
mkdir -p /var/pdflab-staging/prometheus
cd /var/pdflab-staging/prometheus

# Create prometheus.yml for staging
nano prometheus.yml
```

**prometheus-staging.yml**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Alert rules
rule_files:
  - '/etc/prometheus/alerts/custom-alerts-staging.yml'

# Scrape configurations
scrape_configs:
  - job_name: 'pdflab-backend-staging'
    static_configs:
      - targets: ['pdflab-backend-staging:3006']  # Internal Docker network
    scrape_interval: 15s

  - job_name: 'prometheus-staging'
    static_configs:
      - targets: ['localhost:9091']  # Different port than prod

alerting:
  alertmanagers:
    - static_configs:
        - targets: []  # Optional: Add alertmanager for staging
```

**Create alert rules for staging**:
```bash
mkdir -p /var/pdflab-staging/prometheus/alerts

# Copy alert rules
cp /var/pdflab/app/prometheus/alerts/custom-alerts.yml \
   /var/pdflab-staging/prometheus/alerts/custom-alerts-staging.yml
```

**Start Prometheus for staging**:
```bash
# Run Prometheus in Docker
docker run -d \
  --name prometheus-staging \
  --network pdflab-staging-network \
  -p 9091:9090 \
  -v /var/pdflab-staging/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v /var/pdflab-staging/prometheus/alerts:/etc/prometheus/alerts \
  -v prometheus-staging-data:/prometheus \
  --restart unless-stopped \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.console.templates=/etc/prometheus/consoles
```

**Verify Prometheus is scraping**:
```bash
# Check Prometheus UI
# Navigate to: http://141.136.44.168:9091

# Or test via curl
curl http://localhost:9091/api/v1/targets | jq .
```

#### Option B: Use Production Prometheus (Simpler, but less isolated)

```bash
# SSH to server
ssh root@141.136.44.168

# Edit production prometheus.yml
nano /etc/prometheus/prometheus.yml
```

Add staging scrape target:
```yaml
scrape_configs:
  # Existing production target
  - job_name: 'pdflab-backend'
    static_configs:
      - targets: ['pdflab-backend-prod:3006']
    scrape_interval: 15s

  # NEW: Staging target
  - job_name: 'pdflab-backend-staging'
    static_configs:
      - targets: ['141.136.44.168:3007']  # External access
    scrape_interval: 15s
```

Reload Prometheus:
```bash
docker exec prometheus kill -HUP 1
```

---

### Step 3: Deploy Frontend to Staging (10 minutes)

#### 3.1 Update Staging Environment Variable

```bash
# SSH to server
ssh root@141.136.44.168

# Edit staging .env
nano /var/pdflab-staging/app/deployment/staging/.env.staging
```

Add Prometheus URL:
```env
# Prometheus
NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:9091
# Or if using production Prometheus:
# NEXT_PUBLIC_PROMETHEUS_URL=http://141.136.44.168:9090
```

#### 3.2 Sync Frontend Code

From local machine:
```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Sync frontend code
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    lib/ root@141.136.44.168:/var/pdflab-staging/app/lib/

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    components/dashboard/ root@141.136.44.168:/var/pdflab-staging/app/components/dashboard/

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    app/admin/monitoring/ root@141.136.44.168:/var/pdflab-staging/app/app/admin/monitoring/
```

#### 3.3 Rebuild and Restart Frontend

```bash
# SSH to server
ssh root@141.136.44.168

cd /var/pdflab-staging/app

# Install dependencies (if any new ones)
npm install

# Build frontend with staging env
npm run build

# Restart frontend container
cd deployment/staging
docker-compose -f docker-compose.staging.yml restart frontend-staging

# Watch logs
docker-compose -f docker-compose.staging.yml logs -f frontend-staging
```

---

### Step 4: Test on Staging (30 minutes)

#### 4.1 Backend Health Check

```bash
# SSH to server
ssh root@141.136.44.168

# Check backend logs
docker logs pdflab-backend-staging --tail 100

# Test metrics endpoint
curl http://localhost:3007/metrics | grep pdflab_ | head -20
```

#### 4.2 Prometheus Health Check

**Browser**: Navigate to `http://141.136.44.168:9091` (or 9090 if using production Prometheus)

Test queries:
```promql
# Queue depth
pdflab_queue_depth{job="pdflab-backend-staging"}

# Error rate
rate(pdflab_http_errors_total{job="pdflab-backend-staging"}[5m])

# SLO compliance
pdflab_slo_compliance_percentage{job="pdflab-backend-staging"}
```

#### 4.3 Dashboard Access Test

**Browser**: Navigate to `http://141.136.44.168:3001/admin/monitoring`

**Test Credentials** (from staging):
- Admin: `staging-admin@pdflab.test` / `Admin123!`

**Verify**:
- [ ] Page loads without errors
- [ ] Check browser console (F12) for errors
- [ ] Conversion Funnel Chart renders
- [ ] SLO Dashboard renders
- [ ] Queue Monitor renders
- [ ] Error Rate Table renders
- [ ] Components auto-refresh (wait 10-60 seconds)

#### 4.4 Generate Test Data

Create some conversions to test metrics:

```bash
# From local machine or VPS
# Upload a test PDF to staging
curl -X POST http://141.136.44.168:3007/api/conversions \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.pdf" \
  -F "outputFormat=docx"

# Repeat a few times to generate funnel data
for i in {1..10}; do
  curl -X POST http://141.136.44.168:3007/api/conversions \
    -H "Content-Type: multipart/form-data" \
    -F "file=@test.pdf" \
    -F "outputFormat=docx"
  echo "Conversion $i submitted"
  sleep 2
done
```

Wait 2-5 minutes for data to accumulate, then check dashboard again.

---

### Step 5: Load Testing on Staging (Optional, 30 minutes)

Run load tests to verify monitoring overhead:

```bash
# From local machine
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# If you have k6 installed
k6 run -e API_URL=http://141.136.44.168:3007 tests/performance/load-test.js

# Monitor backend resources during load test
ssh root@141.136.44.168
docker stats pdflab-backend-staging --no-stream
```

**Expected**:
- Memory increase: +5-10 MB (metrics overhead)
- CPU increase: <1% (metrics collection)
- All metrics still collecting successfully

---

## Troubleshooting Staging

### Issue: Metrics not showing in Prometheus

```bash
# Check if backend is accessible from Prometheus
docker exec prometheus-staging ping pdflab-backend-staging

# Check network
docker network inspect pdflab-staging-network

# Test from Prometheus container
docker exec prometheus-staging wget -O- http://pdflab-backend-staging:3006/metrics
```

### Issue: Dashboard shows "No data"

```bash
# 1. Verify NEXT_PUBLIC_PROMETHEUS_URL
docker exec pdflab-frontend-staging env | grep PROMETHEUS

# 2. Test Prometheus API
curl "http://141.136.44.168:9091/api/v1/query?query=up"

# 3. Wait longer - data needs time to accumulate (2-5 minutes)

# 4. Check browser console for CORS errors
```

### Issue: Alert rules not loading

```bash
# Check alert rules syntax
docker exec prometheus-staging promtool check rules \
  /etc/prometheus/alerts/custom-alerts-staging.yml

# Reload Prometheus
docker exec prometheus-staging kill -HUP 1
```

---

## Staging Testing Checklist

Before deploying to production, verify on staging:

### Backend ✅
- [ ] Metrics module initialized successfully
- [ ] Queue monitoring running every 10 seconds
- [ ] Metrics exported on `/metrics` endpoint
- [ ] All 4 metric types present (funnel, error, queue, slo)
- [ ] No errors in backend logs
- [ ] Performance impact minimal (<1% CPU, +10 MB RAM)

### Prometheus ✅
- [ ] Prometheus scraping backend successfully
- [ ] Target shows as UP in Prometheus UI
- [ ] Alert rules loaded (25+ rules)
- [ ] Test queries return data
- [ ] No scraping errors in Prometheus logs

### Frontend ✅
- [ ] `/admin/monitoring` page accessible
- [ ] No console errors
- [ ] All 4 dashboard components render
- [ ] Conversion funnel chart shows data
- [ ] SLO dashboard shows compliance
- [ ] Queue monitor shows queue depth
- [ ] Error rate table populates
- [ ] Auto-refresh working (watch for updates)
- [ ] Time range selectors functional

### Integration ✅
- [ ] Real conversions tracked in funnel
- [ ] Errors logged and displayed
- [ ] Queue depth updates in real-time
- [ ] SLO compliance calculates correctly
- [ ] Alert thresholds reasonable (not too sensitive)

### Performance ✅
- [ ] Backend response time unchanged
- [ ] Frontend bundle size acceptable (+5.74 kB)
- [ ] Dashboard loads in <2 seconds
- [ ] No memory leaks (monitor for 24 hours)

---

## Staging to Production Promotion

### If All Tests Pass ✅

After 24-48 hours of successful staging operation:

1. **Document any issues found** and fixes applied
2. **Update deployment plan** based on staging experience
3. **Schedule production deployment** (low-traffic time recommended)
4. **Follow production deployment guide**: [PHASE4_DEPLOYMENT_GUIDE.md](PHASE4_DEPLOYMENT_GUIDE.md)

### If Issues Found ⚠️

1. **Do NOT deploy to production**
2. **Fix issues on staging**
3. **Re-test thoroughly**
4. **Repeat staging testing checklist**
5. **Only promote when 100% confident**

---

## Quick Commands Reference

### Staging URLs
```bash
# Frontend
http://141.136.44.168:3001
http://staging.pdflab.pro:3001

# Backend
http://141.136.44.168:3007
http://staging.pdflab.pro:3007

# Prometheus (if separate)
http://141.136.44.168:9091

# Monitoring Dashboard
http://141.136.44.168:3001/admin/monitoring
```

### Staging Docker Commands
```bash
# SSH to server
ssh root@141.136.44.168

cd /var/pdflab-staging/app/deployment/staging

# View logs
docker-compose -f docker-compose.staging.yml logs -f backend-staging

# Restart services
docker-compose -f docker-compose.staging.yml restart backend-staging
docker-compose -f docker-compose.staging.yml restart frontend-staging

# Check status
docker-compose -f docker-compose.staging.yml ps

# Stop all
docker-compose -f docker-compose.staging.yml down

# Start all
docker-compose -f docker-compose.staging.yml up -d
```

### Test Credentials
```
Admin: staging-admin@pdflab.test / Admin123!
Pro User: staging-pro@pdflab.test / TestPass123!
Free User: staging-free@pdflab.test / TestPass123!
```

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Deploy backend to staging | 15 min | Pending |
| Deploy Prometheus to staging | 10 min | Pending |
| Deploy frontend to staging | 10 min | Pending |
| Initial testing | 30 min | Pending |
| Generate test data | 15 min | Pending |
| Load testing (optional) | 30 min | Optional |
| **24-hour monitoring** | 1 day | **Critical** |
| Fix issues (if any) | Variable | As needed |
| Production deployment | 30 min | After staging ✅ |

**Total**: 2 hours setup + 24-48 hours monitoring

---

## Success Criteria for Production Promotion

All must be ✅ before deploying to production:

- [x] All tests passed (Phase 4 testing complete)
- [ ] Deployed to staging successfully
- [ ] No errors in staging backend logs (24 hours)
- [ ] No errors in staging frontend console (24 hours)
- [ ] Prometheus scraping successfully (24 hours)
- [ ] Dashboard loading data correctly (24 hours)
- [ ] Performance impact acceptable (<1% CPU, <10 MB RAM)
- [ ] No memory leaks detected
- [ ] Load testing passed (optional but recommended)
- [ ] Team reviewed and approved staging deployment
- [ ] Rollback plan tested (stop metrics, restart services)

**Only proceed to production when ALL criteria are met** ✅

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Ready for staging deployment
**Next Step**: Deploy to staging → Monitor 24-48h → Deploy to production
