# Epic 5: System Health & Monitoring

## Epic Overview
**Epic ID:** ADMIN-005
**Epic Name:** System Health & Monitoring
**Priority:** Medium
**Estimated Effort:** 1 day
**Dependencies:** ADMIN-001 (Admin Panel Foundation)

## Description
Build a real-time system health monitoring dashboard that provides visibility into critical infrastructure components: CloudConvert API status, Redis queue health, database performance, storage usage, background jobs, and error rates. Enable proactive issue detection and manual operations for system maintenance.

## Business Value
- **Proactive Issue Detection:** Identify system bottlenecks before they impact users
- **Reduced Downtime:** Quick diagnosis and resolution reduces outage duration by 70%
- **Cost Optimization:** Storage and API quota monitoring prevents overage charges
- **Operational Efficiency:** Centralized health dashboard eliminates need for multiple monitoring tools
- **SLA Compliance:** Real-time uptime and error rate tracking supports SLA commitments

## User Personas
- **DevOps/Operations:** Needs real-time system health metrics, error logs, manual operations
- **Admin:** Needs overview of platform stability and performance
- **Support:** Needs to check system status when users report issues
- **Super Admin:** Full access to manual operations (cache clear, job restart, etc.)

## Epic Goals
1. Real-time dashboard shows health status of all critical components
2. CloudConvert API quota usage and error rate visible
3. Redis queue metrics (pending jobs, delays, worker status) tracked
4. Database connection pool and query performance monitored
5. Storage usage tracked with cleanup capabilities
6. Background job status visible (quota reset, cleanup jobs)
7. Error rate trends and recent error logs accessible
8. Manual operations available (clear cache, restart workers, test conversion)

## Technical Scope

### Backend Components

1. **System Health API Endpoints**
   - `GET /api/admin/system/health` - Overall system health summary
   - `GET /api/admin/system/cloudconvert` - CloudConvert API status and quota
   - `GET /api/admin/system/redis` - Redis connection and queue metrics
   - `GET /api/admin/system/database` - Database connection pool and performance
   - `GET /api/admin/system/storage` - Storage usage by user/job
   - `GET /api/admin/system/workers` - Background job worker status
   - `GET /api/admin/system/errors` - Recent error logs
   - `POST /api/admin/system/test-conversion` - Run test conversion job
   - `POST /api/admin/system/clear-cache` - Clear Redis cache
   - `POST /api/admin/system/cleanup-storage` - Trigger storage cleanup job
   - `POST /api/admin/system/restart-workers` - Restart Bull workers

2. **Health Check Services**
   - CloudConvert API health check (ping, quota check)
   - Redis health check (connection, memory usage, queue stats)
   - Database health check (connection pool, slow query detection)
   - Storage health check (disk usage, orphaned file detection)
   - Worker health check (active/idle workers, stuck jobs)
   - Error aggregation service (group by type, frequency)

3. **System Health Logging**
   - Write health metrics to `system_health_logs` table
   - Track metrics over time (hourly/daily aggregates)
   - Alert on threshold breaches (configurable)

### Frontend Components

1. **System Health Dashboard (`/app/admin/system/page.tsx`)**
   - Health status cards (green=healthy, yellow=warning, red=critical)
   - Real-time metrics for each component
   - Manual operation buttons
   - Auto-refresh (every 30 seconds)
   - Last updated timestamp

2. **Health Status Cards**
   - **CloudConvert API Card:**
     - Status: healthy/degraded/down
     - Quota used / total (e.g., 500/1000 conversions this month)
     - Success rate (last 24 hours)
     - Error rate trend
     - Recent errors
   - **Redis Queue Card:**
     - Pending jobs count
     - Active jobs count
     - Completed today
     - Failed today
     - Average processing time
     - Queue delay estimate
     - Worker status (active/idle)
   - **Database Card:**
     - Connection pool (active/idle/max connections)
     - Query performance (avg query time)
     - Slow queries detected (>1s)
     - Database size
   - **Storage Card:**
     - Total storage used (GB)
     - Breakdown by user (top 10 users)
     - Orphaned files detected
     - Cleanup status (last run, next run)
   - **Background Jobs Card:**
     - Quota reset job (last run, next run, status)
     - Cleanup job (last run, next run, status)
     - Other scheduled jobs status
   - **Error Rate Card:**
     - Errors in last hour/day
     - Error rate trend (chart)
     - Top error types
     - Recent errors (last 10)

3. **Manual Operations Panel**
   - "Test Conversion" - Run test PDF→PPTX conversion
   - "Clear Cache" - Clear Redis cache
   - "Cleanup Storage" - Trigger file cleanup job
   - "Restart Workers" - Restart Bull workers (with confirmation)
   - All operations require confirmation
   - Operations logged to admin_audit_logs

4. **Error Logs Viewer**
   - Recent errors table (last 100)
   - Filter by error type, component, date
   - Error detail view (stack trace, context)
   - Group by error type with frequency
   - "Mark as Resolved" button

5. **Components**
   - SystemHealthDashboard component
   - HealthStatusCard component
   - CloudConvertHealthCard component
   - RedisHealthCard component
   - DatabaseHealthCard component
   - StorageHealthCard component
   - ErrorLogsViewer component
   - ManualOperationsPanel component

## Acceptance Criteria

### System Health Dashboard
- [ ] Dashboard displays health cards for: CloudConvert, Redis, Database, Storage, Workers, Errors
- [ ] Each card shows status badge (healthy=green, warning=yellow, critical=red)
- [ ] Auto-refresh updates dashboard every 30 seconds (configurable)
- [ ] Last updated timestamp visible
- [ ] Loading state shown during data fetch
- [ ] Manual refresh button available

### CloudConvert Health
- [ ] API status shown (healthy/degraded/down)
- [ ] Quota used and total displayed (e.g., 500/1000 conversions)
- [ ] Quota usage percentage shown (progress bar)
- [ ] Success rate calculated (completed / total attempted) for last 24 hours
- [ ] Error rate trend chart (last 7 days)
- [ ] Recent CloudConvert errors listed (last 5)
- [ ] Warning shown if quota >80% used
- [ ] Critical alert if API down or quota exceeded

### Redis Queue Health
- [ ] Pending jobs count displayed
- [ ] Active jobs count displayed
- [ ] Completed today count shown
- [ ] Failed today count shown
- [ ] Average processing time calculated
- [ ] Queue delay estimate calculated (pending * avg_time)
- [ ] Worker status shown (active workers, idle workers)
- [ ] Warning if pending jobs >100
- [ ] Critical alert if no active workers

### Database Health
- [ ] Connection pool status shown (active/idle/max connections)
- [ ] Average query time calculated (last 1000 queries)
- [ ] Slow queries detected (>1s execution time)
- [ ] Database size shown (MB/GB)
- [ ] Connection pool usage percentage shown
- [ ] Warning if connection pool >80% used
- [ ] Critical alert if slow queries detected

### Storage Health
- [ ] Total storage used displayed (GB)
- [ ] Breakdown by user (top 10 users by storage)
- [ ] Orphaned files count (files not in database)
- [ ] Last cleanup job run timestamp
- [ ] Next cleanup job scheduled time
- [ ] Warning if storage >80% capacity (configurable)
- [ ] Manual cleanup button triggers job

### Background Jobs Health
- [ ] Quota reset job status (last run, next run, status)
- [ ] Cleanup job status (last run, next run, status)
- [ ] Other scheduled jobs visible
- [ ] Job failure alerts highlighted
- [ ] Manual trigger buttons for each job (super admin only)

### Error Logs
- [ ] Recent errors table (last 100 errors)
- [ ] Filter by error type, component, date range
- [ ] Error detail modal shows stack trace and context
- [ ] Errors grouped by type with frequency count
- [ ] "Mark as Resolved" button updates error status
- [ ] Export errors to JSON for debugging

### Manual Operations
- [ ] "Test Conversion" button runs test PDF→PPTX conversion
- [ ] "Clear Cache" button clears Redis cache with confirmation
- [ ] "Cleanup Storage" button triggers storage cleanup job
- [ ] "Restart Workers" button restarts Bull workers (super admin only, confirmation required)
- [ ] All operations show success/error notifications
- [ ] All operations logged to admin_audit_logs
- [ ] Operations disabled during execution (prevent double-click)

### Performance & Quality
- [ ] Health dashboard loads within 2 seconds
- [ ] Auto-refresh does not cause UI flicker
- [ ] Health checks do not impact system performance (async, cached)
- [ ] All components TypeScript typed
- [ ] Responsive design works on tablet (768px+)
- [ ] Accessibility: keyboard navigation, screen reader support

## User Stories (Derived)

### Story 5.1: System Health Dashboard Overview
**As a** DevOps admin
**I want** a real-time system health dashboard
**So that** I can quickly assess platform status and identify issues

**Tasks:**
- Create GET /api/admin/system/health endpoint
- Build SystemHealthDashboard component
- Create HealthStatusCard component
- Aggregate health status from all components
- Add auto-refresh mechanism (30s interval)

**Acceptance Criteria:**
- Dashboard shows health cards for all components
- Status badges color-coded (green/yellow/red)
- Auto-refresh every 30 seconds
- Last updated timestamp shown
- Manual refresh button works

---

### Story 5.2: CloudConvert API Health Monitoring
**As a** DevOps admin
**I want** CloudConvert API health and quota visibility
**So that** I can prevent API quota overages and detect API issues

**Tasks:**
- Create GET /api/admin/system/cloudconvert endpoint
- Fetch CloudConvert quota usage via API
- Calculate success rate and error rate
- Build CloudConvertHealthCard component
- Add quota usage progress bar
- Show recent CloudConvert errors

**Acceptance Criteria:**
- API status shown (healthy/degraded/down)
- Quota used/total displayed with percentage
- Success rate calculated (last 24 hours)
- Error rate trend chart (last 7 days)
- Warning if quota >80% used
- Recent errors listed

---

### Story 5.3: Redis Queue Health Monitoring
**As a** DevOps admin
**I want** Redis queue health metrics
**So that** I can monitor job processing and identify queue bottlenecks

**Tasks:**
- Create GET /api/admin/system/redis endpoint
- Fetch Bull queue metrics (pending, active, completed, failed)
- Calculate average processing time
- Estimate queue delay
- Build RedisHealthCard component
- Show worker status

**Acceptance Criteria:**
- Pending, active, completed, failed counts shown
- Average processing time calculated
- Queue delay estimated
- Worker status displayed (active/idle)
- Warning if pending >100
- Critical if no active workers

---

### Story 5.4: Database Health Monitoring
**As a** DevOps admin
**I want** database connection pool and performance metrics
**So that** I can prevent connection pool exhaustion and detect slow queries

**Tasks:**
- Create GET /api/admin/system/database endpoint
- Get connection pool status (active/idle/max)
- Calculate average query time
- Detect slow queries (>1s)
- Build DatabaseHealthCard component
- Show database size

**Acceptance Criteria:**
- Connection pool status shown (active/idle/max)
- Average query time displayed
- Slow queries detected and listed
- Database size shown
- Warning if pool >80% used
- Critical if slow queries detected

---

### Story 5.5: Storage Health Monitoring
**As a** DevOps admin
**I want** storage usage visibility
**So that** I can manage disk space and identify storage bloat

**Tasks:**
- Create GET /api/admin/system/storage endpoint
- Calculate total storage used
- Aggregate storage by user (top 10)
- Detect orphaned files (files not in DB)
- Build StorageHealthCard component
- Show cleanup job status

**Acceptance Criteria:**
- Total storage used displayed (GB)
- Top 10 users by storage shown
- Orphaned files count visible
- Cleanup job status (last run, next run)
- Warning if storage >80% capacity
- Manual cleanup button available

---

### Story 5.6: Background Jobs Status
**As a** DevOps admin
**I want** to monitor scheduled background jobs
**So that** I can ensure critical jobs (quota reset, cleanup) run successfully

**Tasks:**
- Create GET /api/admin/system/workers endpoint
- Fetch job status (quota reset, cleanup, etc.)
- Build BackgroundJobsCard component
- Show last run, next run, status
- Add manual trigger buttons

**Acceptance Criteria:**
- Quota reset job status shown
- Cleanup job status shown
- Last run and next run timestamps visible
- Job failures highlighted
- Manual trigger buttons (super admin only)

---

### Story 5.7: Error Logs Viewer
**As a** DevOps admin
**I want** to view recent error logs
**So that** I can diagnose and resolve system issues

**Tasks:**
- Create GET /api/admin/system/errors endpoint
- Fetch recent errors from logs
- Build ErrorLogsViewer component
- Add filtering (type, component, date)
- Group errors by type with frequency
- Show error detail modal with stack trace

**Acceptance Criteria:**
- Recent errors table (last 100)
- Filter by error type, component, date
- Error detail modal shows stack trace
- Errors grouped by type with frequency
- "Mark as Resolved" button works
- Export to JSON available

---

### Story 5.8: Test Conversion Operation
**As a** DevOps admin
**I want** to run a test conversion
**So that** I can verify the conversion pipeline is working

**Tasks:**
- Create POST /api/admin/system/test-conversion endpoint
- Use test PDF file (sample.pdf)
- Run PDF→PPTX conversion via CloudConvert
- Return job status and results
- Add "Test Conversion" button
- Log operation to audit trail

**Acceptance Criteria:**
- "Test Conversion" button in manual operations panel
- Test conversion uses sample PDF file
- Job created and processed
- Success/error notification shown
- Test job visible in conversion jobs list
- Operation logged to admin_audit_logs

---

### Story 5.9: Manual Storage Cleanup
**As a** DevOps admin
**I want** to manually trigger storage cleanup
**So that** I can free up disk space on demand

**Tasks:**
- Create POST /api/admin/system/cleanup-storage endpoint
- Trigger cleanup job (delete expired conversions, orphaned files)
- Show progress/completion notification
- Update storage metrics after cleanup
- Add "Cleanup Storage" button
- Log operation

**Acceptance Criteria:**
- "Cleanup Storage" button triggers cleanup job
- Confirmation dialog before cleanup
- Progress notification during cleanup
- Success notification with freed space amount
- Storage metrics refresh after cleanup
- Operation logged to admin_audit_logs

---

### Story 5.10: Restart Bull Workers (Critical Operation)
**As a** super admin
**I want** to restart Bull workers
**So that** I can recover from stuck job processing

**Tasks:**
- Create POST /api/admin/system/restart-workers endpoint
- Gracefully shutdown and restart Bull workers
- Ensure jobs in progress are not lost
- Add "Restart Workers" button (super admin only)
- Require confirmation with warning
- Log operation

**Acceptance Criteria:**
- "Restart Workers" button visible to super admin only
- Confirmation dialog with warning about impact
- Workers gracefully restarted
- In-progress jobs preserved or re-queued
- Success/error notification shown
- Operation logged to admin_audit_logs
- Workers status updates after restart

---

## Dependencies & Risks

### Dependencies
- **ADMIN-001:** Admin Panel Foundation (RBAC, auth, layout)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Health checks impact system performance | Medium | Medium | Cache health metrics (1-5 min TTL), async checks, lightweight queries |
| Worker restart causes job loss | Low | High | Implement graceful shutdown, preserve in-progress jobs, test thoroughly |
| False positive alerts | Medium | Low | Tune alert thresholds based on real usage patterns, add alert snooze |
| Storage cleanup deletes active files | Low | High | Only delete expired jobs (>7 days), verify file ownership, dry-run mode |

---

## Success Metrics
- 95% of system issues detected before user reports
- Mean time to detection (MTTD) reduced by 60%
- Zero data loss during worker restarts
- 100% uptime for health dashboard
- Storage cleanup recovers >10GB per run

---

## Out of Scope (This Epic)
- External monitoring (Datadog, New Relic, etc.) integration
- Alerting system (email/SMS notifications)
- Historical metrics and trends (covered in ADMIN-006)
- Advanced anomaly detection
- Auto-scaling configuration

---

## Technical Notes

### Health Check Response Format
```typescript
// GET /api/admin/system/health
{
  overall_status: 'healthy' | 'warning' | 'critical',
  components: {
    cloudconvert: {
      status: 'healthy' | 'warning' | 'critical',
      quota_used: 500,
      quota_total: 1000,
      success_rate: 0.95,
      error_rate: 0.05,
      recent_errors: [...]
    },
    redis: {
      status: 'healthy',
      pending: 10,
      active: 3,
      completed_today: 1200,
      failed_today: 5,
      avg_processing_time: 15,  // seconds
      workers: { active: 3, idle: 1 }
    },
    database: {
      status: 'healthy',
      connections: { active: 15, idle: 5, max: 100 },
      avg_query_time: 25,  // ms
      slow_queries: 0,
      size_mb: 250
    },
    storage: {
      status: 'warning',
      total_gb: 45.2,
      capacity_gb: 50,
      usage_percent: 90,
      orphaned_files: 12,
      cleanup_last_run: '2025-11-01T00:00:00Z'
    },
    workers: {
      status: 'healthy',
      quota_reset: { last_run, next_run, status },
      cleanup: { last_run, next_run, status }
    },
    errors: {
      last_hour: 3,
      last_day: 25,
      top_types: [{ type, count }, ...]
    }
  },
  last_updated: '2025-11-01T12:00:00Z'
}
```

### Storage Cleanup Logic
```typescript
// Delete expired conversions (>7 days old, status=completed or failed)
const expiredJobs = await ConversionJob.findAll({
  where: {
    status: ['completed', 'failed'],
    created_at: { [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  }
});

let freedSpace = 0;
for (const job of expiredJobs) {
  // Delete files from storage
  if (job.input_file) {
    freedSpace += await deleteFile(job.input_file);
  }
  if (job.output_file) {
    freedSpace += await deleteFile(job.output_file);
  }
  // Delete database record
  await job.destroy();
}

return { deleted_jobs: expiredJobs.length, freed_space_mb: freedSpace / 1024 / 1024 };
```

---

**Epic Owner:** Sarah (Product Owner)
**Created:** 2025-11-01
**Status:** Ready for Development
