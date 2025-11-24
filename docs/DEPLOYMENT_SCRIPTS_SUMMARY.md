# Deployment Scripts Summary - Phases 1-4

**Created**: November 23, 2025
**Status**: ✅ All deployment scripts ready

---

## 📦 Deployment Scripts Created

I've created comprehensive deployment scripts for all phases of the PDFLab transformation. Here's what's available:

### 1. Phase 2: Database Scaling

**File**: `scripts/deployment/deploy-phase2-database-scaling.sh`

**What it does**:
- Backs up production database
- Deploys optimized queries and caching layer
- Configures read replicas (optional)
- Restarts backend with minimal downtime
- Verifies deployment and tests performance

**Time**: 4-6 hours
**Downtime**: ~5 minutes (backend restart)
**Risk**: Medium

**Usage**:
```bash
bash scripts/deployment/deploy-phase2-database-scaling.sh
```

### 2. Phase 3: Frontend Optimization

**File**: `scripts/deployment/deploy-phase3-frontend-optimization.sh`

**What it does**:
- Builds optimized frontend bundle locally
- Backs up current frontend
- Deploys refactored components
- Enables code splitting and lazy loading
- Verifies bundle size reduction

**Time**: 2-3 hours
**Downtime**: ~1 minute (frontend restart)
**Risk**: Low

**Usage**:
```bash
bash scripts/deployment/deploy-phase3-frontend-optimization.sh
```

### 3. Phase 4: Staging Deployment

**File**: `scripts/deployment/deploy-phase4-to-staging.sh`

**What it does**:
- Deploys backend metrics to staging
- Sets up Prometheus for staging (port 9091)
- Deploys dashboard components to staging
- Configures alert rules
- Generates test data for metrics

**Time**: 1-2 hours
**Downtime**: Minimal (staging only)
**Risk**: Low

**Usage**:
```bash
bash scripts/deployment/deploy-phase4-to-staging.sh
```

**Staging URLs**:
- Dashboard: `http://141.136.44.168:3001/admin/monitoring`
- Prometheus: `http://141.136.44.168:9091`
- Test credentials: `staging-admin@pdflab.test` / `Admin123!`

### 4. Phase 4: Production Deployment

**File**: `scripts/deployment/deploy-phase4-to-production.sh`

**What it does**:
- Deploys backend metrics to production
- Configures Prometheus scraping
- Deploys custom dashboard
- Verifies metrics collection
- Checks performance impact

**Time**: 30-45 minutes
**Downtime**: ~30 seconds (backend restart)
**Risk**: Low
**Prerequisite**: Must test in staging for 24-48 hours first

**Usage**:
```bash
bash scripts/deployment/deploy-phase4-to-production.sh
```

### 5. Master Orchestrator Script

**File**: `scripts/deployment/deploy-all-phases.sh`

**What it does**:
- Interactive menu system for all deployments
- Individual phase deployments
- Combined deployments (Phases 2+3, all phases)
- Deployment status viewer
- Rollback instructions viewer

**Features**:
- Color-coded output
- Progress tracking
- Confirmation prompts
- Success/error reporting
- Status checking

**Usage**:
```bash
bash scripts/deployment/deploy-all-phases.sh
```

**Menu Options**:
1. Deploy Phase 2 (Database Scaling)
2. Deploy Phase 3 (Frontend Optimization)
3. Deploy Phase 4 to Staging
4. Deploy Phase 4 to Production
5. Deploy Phases 2 + 3 (Full optimization)
6. Deploy All Phases to Staging
7. Deploy All Phases to Production
8. View Deployment Status
9. View Rollback Instructions
0. Exit

---

## 🚀 How to Use the Deployment Scripts

### Prerequisites

Before running any deployment script:

1. **SSH Access**:
   ```bash
   ssh root@141.136.44.168
   # Test connection works
   ```

2. **Local Environment**:
   ```bash
   node --version  # v18+
   npm --version   # 10.9.2+
   docker --version
   ```

3. **Navigate to Project**:
   ```bash
   cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab
   ```

### Recommended Workflow

#### Option 1: Conservative (Safest - 4 weeks)

```bash
# Week 1: Deploy Phase 2
bash scripts/deployment/deploy-phase2-database-scaling.sh
# Monitor for 7 days

# Week 2: Deploy Phase 3
bash scripts/deployment/deploy-phase3-frontend-optimization.sh
# Monitor for 7 days

# Week 3: Deploy Phase 4 to Staging
bash scripts/deployment/deploy-phase4-to-staging.sh
# Test for 7 days

# Week 4: Deploy Phase 4 to Production
bash scripts/deployment/deploy-phase4-to-production.sh
# Monitor for 7 days
```

#### Option 2: Moderate (2 weeks)

```bash
# Use the master script
bash scripts/deployment/deploy-all-phases.sh

# Select option 5: Deploy Phases 2 + 3
# Monitor for 3 days

# Select option 3: Deploy Phase 4 to Staging
# Test for 4 days

# Select option 4: Deploy Phase 4 to Production
# Monitor for 7 days
```

#### Option 3: Interactive (Flexible)

```bash
# Start the interactive menu
bash scripts/deployment/deploy-all-phases.sh

# Use menu to:
# - View deployment status
# - Deploy individual phases
# - View rollback instructions
# - Monitor progress
```

---

## 📊 What Each Phase Deploys

### Phase 2: Database Scaling

**Backend Changes**:
- Optimized queries in `backend/src/routes/*.routes.ts`
- Read replica config in `backend/src/config/database.ts`
- Cache middleware in `backend/src/middleware/cache.middleware.ts`
- node-cache dependency

**Configuration**:
- Environment variables (DB_READ_HOST_1, DB_READ_HOST_2, REDIS_*)
- Connection pool settings

**Expected Results**:
- 40-60% faster query response times
- >70% cache hit rate
- 30-40% reduced database load

### Phase 3: Frontend Optimization

**Frontend Changes**:
- Refactored components in `components/conversion/*.tsx`
- Dynamic imports in `lib/dynamic-imports.ts`
- Updated next.config.mjs for optimization
- New .next build with code splitting

**Expected Results**:
- Bundle size: 740 KB → ~296 KB (60% reduction)
- First Contentful Paint: <1 second
- Time to Interactive: <2 seconds
- Lighthouse Performance: >90

### Phase 4: Advanced Monitoring

**Backend Changes**:
- `backend/src/metrics/conversion-funnel.metrics.ts`
- `backend/src/metrics/error-rate.metrics.ts`
- `backend/src/metrics/queue.metrics.ts`
- `backend/src/metrics/slo.metrics.ts`
- `backend/src/metrics/index.ts`
- Updated `backend/src/server.ts` with initializeMetrics()

**Frontend Changes**:
- `components/dashboard/MetricCard.tsx`
- `components/dashboard/ConversionFunnelChart.tsx`
- `components/dashboard/SLODashboard.tsx`
- `components/dashboard/QueueMonitor.tsx`
- `lib/prometheus-client.ts`
- `app/admin/monitoring/page.tsx`

**Prometheus**:
- `prometheus/alerts/custom-alerts.yml` (25+ alert rules)
- Updated prometheus.yml scrape config

**Expected Results**:
- Real-time conversion funnel tracking
- Error rate monitoring by endpoint
- Queue depth visibility
- SLO compliance tracking (99.9% uptime, <200ms response)
- Automated alerts

---

## 🔧 Script Features

All scripts include:

- **Color-coded output**: Green (success), Yellow (warning), Red (error), Blue (info)
- **Pre-deployment checks**: VPS connectivity, service health, prerequisites
- **Backup creation**: Automatic backups before all changes
- **Progress indicators**: Clear step-by-step progress
- **Verification steps**: Post-deployment health checks
- **Rollback instructions**: How to revert if needed
- **Monitoring guidance**: What to watch after deployment
- **Error handling**: Exit on error with clear messages

---

## 📝 Rollback Procedures

### Quick Rollback Commands

**Phase 2**:
```bash
ssh root@141.136.44.168
cd /var/pdflab/app
# Remove read replica config from .env.production
docker-compose -f docker-compose.production.yml restart backend
```

**Phase 3**:
```bash
ssh root@141.136.44.168
cd /var/pdflab/app
# Restore from backup
BACKUP_DIR=$(ls -dt /var/pdflab/backups/phase3-* | head -1)
rm -rf .next components
cp -r $BACKUP_DIR/.next-backup .next
cp -r $BACKUP_DIR/components-backup components
docker-compose -f docker-compose.production.yml restart frontend
```

**Phase 4**:
```bash
ssh root@141.136.44.168
cd /var/pdflab/app/backend
rm -rf src/metrics
# Remove initializeMetrics() from src/server.ts
docker-compose -f ../docker-compose.production.yml restart backend
```

**Complete Rollback**:
```bash
ssh root@141.136.44.168
cd /var/pdflab/app
git log --oneline -10
git checkout <commit-before-phases>
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## 🌐 URLs for Testing

### Production
- Main: https://pdflab.pro
- Health: https://pdflab.pro/api/health
- Dashboard: https://pdflab.pro/admin/monitoring
- Prometheus: http://141.136.44.168:9090
- Metrics: http://141.136.44.168:3006/metrics

### Staging
- Main: http://141.136.44.168:3001
- Health: http://141.136.44.168:3007/api/health
- Dashboard: http://141.136.44.168:3001/admin/monitoring
- Prometheus: http://141.136.44.168:9091
- Metrics: http://141.136.44.168:3007/metrics

---

## 📋 Post-Deployment Monitoring

### After Phase 2

```bash
# Watch backend logs
ssh root@141.136.44.168 'docker logs -f pdflab-backend-prod'

# Check Redis stats
ssh root@141.136.44.168 'docker exec pdflab-redis-prod redis-cli info stats'

# Test optimized endpoints
curl https://pdflab.pro/api/analytics/conversions
curl https://pdflab.pro/api/partners/admin/all
curl https://pdflab.pro/api/profile/conversion-history

# Monitor for 24-48 hours
```

### After Phase 3

```bash
# Test frontend
open https://pdflab.pro

# Run Lighthouse audit
lighthouse https://pdflab.pro --view

# Check bundle sizes (DevTools → Network)
# Verify code splitting (multiple small chunks, not one large bundle)

# Monitor for 24-48 hours
```

### After Phase 4

```bash
# Check metrics endpoint
curl http://141.136.44.168:3006/metrics | grep pdflab_

# Verify Prometheus scraping
open http://141.136.44.168:9090/targets

# Test dashboard
open https://pdflab.pro/admin/monitoring

# Check performance impact
ssh root@141.136.44.168 'docker stats pdflab-backend-prod --no-stream'

# Monitor for 24-48 hours
```

---

## 🎯 Success Criteria

### Phase 2 Success

- [ ] Backend restarted successfully
- [ ] Health endpoint responding
- [ ] No errors in logs (24h)
- [ ] Cache hit rate >70%
- [ ] Query response times improved
- [ ] Read replicas connected (if configured)

### Phase 3 Success

- [ ] Frontend restarted successfully
- [ ] Homepage loads without errors
- [ ] Bundle size <400 KB
- [ ] Code splitting active (multiple chunks)
- [ ] First Contentful Paint <1s
- [ ] Lighthouse Performance >90

### Phase 4 Success

- [ ] Backend metrics exporting
- [ ] Prometheus scraping successfully
- [ ] Alert rules loaded
- [ ] Dashboard accessible and rendering
- [ ] All 4 components working
- [ ] No errors in logs
- [ ] Performance impact <1% CPU, <10 MB RAM

---

## 🔗 Related Documentation

- **[Phase 4 Test Results](PHASE4_TEST_RESULTS.md)** - All tests passed ✅
- **[Phase 4 Deployment Guide](PHASE4_DEPLOYMENT_GUIDE.md)** - Production deployment details
- **[Phase 4 Staging Guide](PHASE4_STAGING_DEPLOYMENT.md)** - Staging deployment details
- **[Outstanding Tasks](OUTSTANDING_IMPLEMENTATION_TASKS.md)** - What's next
- **[Phase 4 Custom Dashboard](PHASE4_CUSTOM_SOLUTION_SUMMARY.md)** - Dashboard architecture

---

## 📞 Support

### Common Issues

**"Cannot connect to VPS"**:
```bash
# Test SSH key
ssh -v root@141.136.44.168
```

**"Docker container not running"**:
```bash
ssh root@141.136.44.168
docker ps -a | grep pdflab
docker logs <container-name>
```

**"Build failed"**:
```bash
# Check Node.js version
node --version  # Must be 18+

# Clear and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**"Metrics not showing"**:
```bash
# Check if initializeMetrics() was added to server.ts
ssh root@141.136.44.168
docker exec pdflab-backend-prod cat /app/src/server.ts | grep initializeMetrics
```

---

## ✅ Deployment Checklist

Before starting any deployment:

- [ ] VPS SSH access confirmed
- [ ] Local environment ready (Node 18+, npm, docker)
- [ ] Project on latest master branch
- [ ] All tests passing (`npm test`)
- [ ] Backup strategy confirmed
- [ ] Rollback plan reviewed
- [ ] Monitoring tools ready
- [ ] Team notified (if applicable)
- [ ] Downtime window scheduled (if needed)

---

## 🎉 Summary

You now have **5 comprehensive deployment scripts** ready to use:

1. ✅ **Phase 2 Script** - Database scaling (4-6 hours)
2. ✅ **Phase 3 Script** - Frontend optimization (2-3 hours)
3. ✅ **Phase 4 Staging Script** - Test monitoring (1-2 hours)
4. ✅ **Phase 4 Production Script** - Production monitoring (30-45 min)
5. ✅ **Master Orchestrator** - Interactive deployment menu

All scripts include:
- Pre-deployment checks
- Automatic backups
- Step-by-step progress
- Post-deployment verification
- Rollback instructions
- Monitoring guidance

**Next Steps**:

1. Review the deployment scripts
2. Test in staging first
3. Choose your deployment timeline (conservative vs moderate)
4. Execute deployments using the master script
5. Monitor each phase for 24-48 hours
6. Celebrate successful transformation! 🎉

---

**Created**: November 23, 2025
**Version**: 1.0
**Status**: ✅ Ready for use
