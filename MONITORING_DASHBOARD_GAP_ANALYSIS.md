# Monitoring Dashboard Gap Analysis & Enhancement Recommendations

**Date**: 2025-11-16
**Analyzed By**: Elite Health Guardian Agent Expertise
**Current Dashboard**: https://pdflab.pro/admin/monitoring

---

## Executive Summary

The current monitoring dashboard provides **basic health visibility** but lacks **critical operational metrics and management capabilities** that the Elite Health Guardian Agent monitors autonomously. This gap analysis identifies **23 missing features** across 6 categories that should be surfaced to administrators for full observability.

**Key Finding**: The dashboard shows **"what"** (current status) but not **"why," "when," or "how to fix"** — critical gaps for production operations.

---

## Current Dashboard Capabilities ✅

### What's Already Implemented

1. **Service Health Status** (4 services)
   - Backend, Worker, MySQL, Redis
   - Binary status: healthy/unhealthy
   - Real-time status badges

2. **Configuration Drift Monitoring**
   - Drift score percentage
   - Drift level (none/minor/critical)
   - 7-day trend chart
   - Checks passed/failed counts

3. **Active Alerts Management**
   - Unacknowledged alerts count
   - Critical vs warning breakdown
   - Alert acknowledgment/resolution
   - Alert history

4. **Service Uptime Charts**
   - 7-day uptime percentage
   - Per-service bar chart (Backend, Worker, MySQL, Redis)

5. **Auto-Refresh**
   - 30-second auto-refresh toggle
   - Manual refresh button
   - Last update timestamp

---

## Critical Gaps - What's Missing 🚨

### Category 1: Resource Utilization Metrics

**What Elite Guardian Monitors:**
- Container memory usage (per service)
- Disk space utilization
- Redis cache memory levels
- Database storage growth

**Dashboard Gaps:**

| Metric | Current State | Elite Guardian | Impact |
|--------|---------------|----------------|--------|
| **Memory Usage per Container** | ❌ Not shown | ✅ Monitored every 30s | Can't predict memory leaks |
| **Disk Space** | ❌ Not shown | ✅ Auto-cleanup at 85% | Can't prevent disk full outages |
| **Redis Memory** | ❌ Not shown | ✅ Auto-clear at 80% | Can't prevent OOM kills |
| **Database Size** | ❌ Not shown | ✅ Weekly optimization | Can't plan capacity |

**Recommended Dashboard Additions:**

1. **Resource Usage Card** (top row)
   ```
   Current Disk Usage: 45% [=========>        ] 85% Warning
   Backend Memory:     62% [============>     ] 80% Warning
   Redis Memory:       38% [=======>          ] 80% Warning
   MySQL Storage:      2.3 GB / 10 GB
   ```

2. **Resource Trend Charts**
   - 24-hour memory usage per container (line chart)
   - 30-day disk space growth (area chart)
   - Redis cache hit ratio (gauge)

3. **Predictive Alerts**
   - "Disk will be full in 14 days at current rate"
   - "Backend memory increased 25% in last hour"

---

### Category 2: Auto-Remediation Activity Log

**What Elite Guardian Does Autonomously:**
- Restarts unhealthy containers
- Clears Redis cache when memory high
- Cleans up old files when disk full
- Optimizes database tables weekly
- Renews SSL certificates

**Dashboard Gaps:**

| Action | Current Visibility | Elite Guardian | Impact |
|--------|-------------------|----------------|--------|
| **Container Restarts** | ❌ Not shown | ✅ Auto-restart + email | Admin doesn't know system self-healed |
| **Cache Clears** | ❌ Not shown | ✅ Auto-clear + email | Can't correlate with performance changes |
| **Disk Cleanups** | ❌ Not shown | ✅ Auto-cleanup + email | Can't audit automated deletions |
| **DB Optimizations** | ❌ Not shown | ✅ Weekly + email | Can't verify maintenance occurred |

**Recommended Dashboard Additions:**

1. **Auto-Remediation Timeline** (new tab)
   ```
   [Timeline View - Last 7 Days]

   Nov 16, 5:06 PM  🔄 Auto-Restart      pdflab-worker-prod
                       Reason: Health check failed (unhealthy)
                       Duration: 2.3s
                       Status: ✅ Success

   Nov 16, 2:00 AM  ⚡ DB Optimization   MySQL (weekly)
                       Tables: users, conversions, subscriptions
                       Duration: 14.2s
                       Status: ✅ Success

   Nov 15, 3:42 PM  🧹 Disk Cleanup      /var/pdflab/storage
                       Freed: 1.2 GB
                       Deleted: 347 temp files (>7 days)
                       Status: ✅ Success

   Nov 14, 8:23 AM  🧹 Redis Cache Clear Cache memory exceeded 80%
                       Memory before: 82%
                       Memory after: 12%
                       Status: ✅ Success
   ```

2. **Remediation Stats Card**
   ```
   Last 7 Days:
   - Auto-restarts:      3 containers
   - Cache clears:       2 times
   - Disk cleanups:      1 time
   - DB optimizations:   1 time

   Success Rate: 100% (6/6 actions succeeded)
   ```

---

### Category 3: SSL Certificate Monitoring

**What Elite Guardian Monitors:**
- SSL certificate expiration date
- Days until renewal needed
- Auto-renewal attempts via certbot

**Dashboard Gaps:**

| Metric | Current State | Elite Guardian | Impact |
|--------|---------------|----------------|--------|
| **SSL Expiry Date** | ❌ Not shown | ✅ Checked hourly | Can't prevent HTTPS outage |
| **Days Until Expiry** | ❌ Not shown | ✅ Alert at 30/7 days | No advance warning |
| **Auto-Renewal Status** | ❌ Not shown | ✅ Auto-renew + verify | Can't confirm renewal worked |

**Recommended Dashboard Additions:**

1. **SSL Certificate Card** (top row)
   ```
   SSL Certificate Status

   Domain: pdflab.pro
   Issued: Oct 18, 2025 (Let's Encrypt)
   Expires: Jan 16, 2026
   Valid for: 61 days

   Status: ✅ Healthy (auto-renewal at 7 days)
   Last checked: 2 minutes ago
   ```

2. **SSL Alert Thresholds**
   - 🔴 Critical: < 7 days (auto-renewal triggered)
   - 🟡 Warning: < 30 days (renewal scheduled)
   - 🟢 Healthy: > 30 days

---

### Category 4: Performance & Job Processing Metrics

**What Elite Guardian Could Monitor (Future Enhancement):**
- Conversion job queue depth
- Average job processing time
- Job success vs failure rate
- Worker throughput (jobs/hour)

**Dashboard Gaps:**

| Metric | Current State | Elite Guardian | Impact |
|--------|---------------|----------------|--------|
| **Job Queue Depth** | ❌ Not shown | ⚠️  Not yet monitored | Can't detect worker bottlenecks |
| **Processing Times** | ❌ Not shown | ⚠️  Not yet monitored | Can't detect performance degradation |
| **Success Rate** | ❌ Not shown | ⚠️  Not yet monitored | Can't detect CloudConvert issues |

**Recommended Dashboard Additions:**

1. **Job Processing Metrics Card**
   ```
   Last 24 Hours:
   - Total jobs:         1,247
   - Completed:          1,198 (96.1%)
   - Failed:             49 (3.9%)
   - Average time:       12.3 seconds
   - Current queue:      8 jobs
   ```

2. **Worker Performance Chart**
   - Jobs processed per hour (bar chart)
   - Success vs failure rate (stacked area)
   - Average processing time trend (line chart)

---

### Category 5: Frontend & Partners Portal Monitoring

**What Elite Guardian Monitors:**
- Frontend container status (running/stopped)
- Partners portal container status

**Dashboard Gaps:**

| Service | Current Dashboard | Should Monitor | Impact |
|---------|------------------|----------------|--------|
| **Frontend** | ❌ Not included | ✅ Critical service | Frontend down = total outage |
| **Partners Portal** | ❌ Not included | ✅ Revenue-critical | Partner signups blocked |

**Current Issue**: Dashboard only shows 4 services (Backend, Worker, MySQL, Redis) but production has **6 critical services** including Frontend and Partners Portal.

**Recommended Dashboard Additions:**

1. **Expand Service Health Grid** (from 4 to 6 services)
   ```
   [Current: 2x2 grid]          [Proposed: 3x2 grid]

   BE | WK                       BE | WK | FE
   DB | RD                       DB | RD | PP

   Legend:
   BE = Backend
   WK = Worker
   FE = Frontend
   DB = MySQL
   RD = Redis
   PP = Partners Portal
   ```

2. **Frontend-Specific Metrics**
   - Response time (p50, p95, p99)
   - Request rate (req/s)
   - Error rate (5xx responses)
   - Active users (from analytics)

---

### Category 6: Alert Intelligence & Actionability

**What Elite Guardian Provides:**
- Email alerts with severity levels (CRITICAL, WARNING, SUCCESS, INFO)
- Contextual information (before/after metrics)
- Remediation actions taken
- HTML formatted alerts with color coding

**Dashboard Gaps:**

| Feature | Current State | Elite Guardian | Impact |
|---------|---------------|----------------|--------|
| **Alert Severity Color** | ✅ Badges shown | ✅ Email + dashboard | Good |
| **Alert Context** | ⚠️  Basic message | ✅ Full context + metrics | Hard to diagnose root cause |
| **Remediation Taken** | ❌ Not shown | ✅ Email includes action | Admin doesn't know what was fixed |
| **Alert Trends** | ❌ Not shown | ⚠️  Not tracked | Can't identify recurring issues |

**Recommended Dashboard Additions:**

1. **Enhanced Alert Details** (expand alert cards)
   ```
   [Current]
   🔴 CRITICAL - Health
   MySQL Database DOWN
   "Database connectivity check failed"
   [Acknowledge] [Resolve]

   [Proposed]
   🔴 CRITICAL - Health
   MySQL Database DOWN

   Context:
   - First detected: Nov 16, 5:03 PM
   - Check attempts: 3 (all failed)
   - Last success: Nov 16, 5:00 PM
   - Impact: Backend cannot process conversions

   Remediation Attempted:
   ✅ Container restart (5:04 PM) - Success
   ✅ Connectivity restored (5:05 PM)

   Resolution Time: 2 minutes

   [Acknowledge] [Resolve] [View Logs]
   ```

2. **Alert Frequency Chart**
   - Top 5 most frequent alerts (bar chart)
   - Alerts per day over 30 days (line chart)
   - MTTR (Mean Time To Resolution) per alert type

3. **Smart Alert Grouping**
   - Group related alerts (e.g., "Redis down" + "Worker down" = "Redis caused worker failure")
   - Show alert correlation timeline

---

## Detailed Feature Recommendations

### Priority 1: Critical Operational Visibility (Week 1)

**1.1 Resource Monitoring Dashboard Section**

**Location**: New row below current status cards

**Components**:
- **Disk Space Card** with progress bar and cleanup history
- **Memory Usage Card** with per-container breakdown
- **Redis Metrics Card** with cache hit ratio and memory

**Data Source**: New backend endpoints
```typescript
GET /api/monitoring/resources
Response:
{
  disk: { used: 45, total: 100, warning_threshold: 85 },
  memory: {
    backend: 62,
    worker: 48,
    redis: 38,
    mysql: 71
  },
  redis: {
    memory_used: 380000,
    memory_max: 1000000,
    hit_rate: 0.87,
    keys: 1247
  }
}
```

**UI Mock**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 💾 Disk Space                 🧠 Memory Usage                    │
│                                                                  │
│ 45% [=========>        ] 85%   Backend:  62% [============>     ]│
│                                Worker:   48% [=========>        ]│
│ Total: 45 GB / 100 GB          Redis:    38% [=======>          ]│
│ Available: 55 GB               MySQL:    71% [==============>   ]│
│                                                                  │
│ Last cleanup: 2 days ago       Alert threshold: 80%             │
│ Next cleanup: At 85% usage     Highest: MySQL (71%)             │
└─────────────────────────────────────────────────────────────────┘
```

---

**1.2 Auto-Remediation Activity Log**

**Location**: New tab in existing tabs section (Alerts | Health | Drift | **Remediation**)

**Features**:
- Timeline view of all automated actions
- Filter by action type (restart, cleanup, optimize, etc.)
- Success/failure indicators
- Before/after metrics
- Duration of action

**Data Source**: New table `remediation_log`
```sql
CREATE TABLE remediation_log (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  action_type ENUM('restart', 'cache_clear', 'disk_cleanup', 'db_optimize', 'ssl_renew'),
  target VARCHAR(255) NOT NULL,
  reason TEXT,
  metrics_before JSON,
  metrics_after JSON,
  duration_seconds INT,
  status ENUM('success', 'failed', 'partial'),
  error_message TEXT,
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_action_type (action_type)
);
```

**Backend Endpoint**:
```typescript
GET /api/monitoring/remediation-log?page=1&limit=50&action_type=restart
```

---

**1.3 Expand Service Monitoring to 6 Services**

**Change**: Update dashboard to include Frontend and Partners Portal

**Current Code** (app/admin/monitoring/page.tsx:290):
```typescript
// Current - Only 4 services
<p className="text-3xl font-bold">
  {dashboardData?.currentStatus.health?.services_healthy || 0}/4
</p>
```

**Proposed**:
```typescript
<p className="text-3xl font-bold">
  {dashboardData?.currentStatus.health?.services_healthy || 0}/6
</p>

// Add to service grid (line 298-314)
<div className="flex items-center gap-2">
  <Monitor className={`w-3 h-3 ${dashboardData?.currentStatus.health?.frontend_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
  <span className="text-xs">Frontend</span>
</div>
<div className="flex items-center gap-2">
  <Users className={`w-3 h-3 ${dashboardData?.currentStatus.health?.partners_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
  <span className="text-xs">Partners</span>
</div>
```

**Backend Changes** (backend/src/controllers/monitoring.admin.controller.ts):
```typescript
// Add to getCurrentHealthStatus()
const frontendHealth = await checkContainerHealth('pdflab-frontend-prod')
const partnersHealth = await checkContainerHealth('pdflab-partners-prod')

health.frontend_status = frontendHealth
health.partners_status = partnersHealth
health.services_healthy += (frontendHealth === 'running' ? 1 : 0) + (partnersHealth === 'running' ? 1 : 0)
health.services_unhealthy += (frontendHealth !== 'running' ? 1 : 0) + (partnersHealth !== 'running' ? 1 : 0)
```

---

### Priority 2: SSL & Security Monitoring (Week 2)

**2.1 SSL Certificate Status Card**

**Location**: Top row, replace one of the 3 current cards OR add as 4th card

**Features**:
- Certificate issuer (Let's Encrypt)
- Expiration date
- Days until expiry (color-coded)
- Last renewal attempt
- Auto-renewal status

**Data Source**: Elite Guardian already checks this hourly
```bash
# From elite-health-guardian.sh:152-175
monitor_ssl_certificate() {
  # Extract expiry date, calculate days remaining, alert if < 30
}
```

**Backend Endpoint**:
```typescript
GET /api/monitoring/ssl-status

Response:
{
  domain: "pdflab.pro",
  issuer: "Let's Encrypt",
  issued_date: "2025-10-18T00:00:00Z",
  expiry_date: "2026-01-16T00:00:00Z",
  days_until_expiry: 61,
  status: "healthy", // healthy | warning | critical
  auto_renewal_enabled: true,
  last_check: "2025-11-16T17:12:00Z"
}
```

**UI Mock**:
```
┌─────────────────────────────────────┐
│ 🔒 SSL Certificate                  │
│                                     │
│ pdflab.pro                          │
│ Let's Encrypt                       │
│                                     │
│ Expires: Jan 16, 2026               │
│ Valid for: 61 days 🟢               │
│                                     │
│ Auto-renewal: Enabled               │
│ Checked: 2 minutes ago              │
└─────────────────────────────────────┘
```

---

### Priority 3: Performance & Job Metrics (Week 3)

**3.1 Job Processing Dashboard**

**Location**: New tab OR new row below charts

**Features**:
- Current queue depth
- Jobs processed today/this hour
- Success vs failure rate
- Average processing time
- Top failure reasons

**Data Source**: Existing `conversions` table + new Redis queue metrics

**Backend Endpoint**:
```typescript
GET /api/monitoring/job-metrics?period=24h

Response:
{
  current_queue_depth: 8,
  period: "24h",
  total_jobs: 1247,
  completed_jobs: 1198,
  failed_jobs: 49,
  success_rate: 96.1,
  avg_processing_time_seconds: 12.3,
  top_failure_reasons: [
    { reason: "CloudConvert timeout", count: 23 },
    { reason: "File size exceeded", count: 15 },
    { reason: "Invalid PDF format", count: 11 }
  ],
  jobs_per_hour: [
    { hour: "00:00", count: 12 },
    { hour: "01:00", count: 8 },
    // ... 24 hours
  ]
}
```

**UI Components**:
- Gauge chart for success rate (96.1%)
- Line chart for jobs per hour
- Bar chart for top failure reasons
- Real-time queue depth indicator

---

### Priority 4: Enhanced Alert Intelligence (Week 4)

**4.1 Alert Context & Resolution Timeline**

**Change**: Expand alert cards to show full diagnostic context

**Current Alert Card** (line 461-498):
```typescript
// Basic: severity, type, title, message, timestamp
```

**Proposed Enhanced Alert**:
```typescript
<div className="p-6 rounded-lg border border-border/50">
  {/* Header */}
  <div className="flex items-center gap-3 mb-4">
    <Badge variant="destructive">CRITICAL</Badge>
    <Badge variant="outline">health</Badge>
    <span className="text-xs text-muted-foreground">prod</span>
  </div>

  {/* Title & Message */}
  <h3 className="text-lg font-semibold mb-2">{alert.title}</h3>
  <p className="text-sm text-muted-foreground mb-4">{alert.message}</p>

  {/* NEW: Diagnostic Context */}
  <div className="bg-background/50 rounded p-3 mb-4">
    <h4 className="text-xs font-semibold mb-2">Diagnostic Context</h4>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>First detected: {alert.first_detected}</div>
      <div>Check attempts: {alert.check_attempts}</div>
      <div>Last success: {alert.last_success}</div>
      <div>Impact: {alert.impact}</div>
    </div>
  </div>

  {/* NEW: Remediation Timeline */}
  {alert.remediation_attempts?.length > 0 && (
    <div className="bg-background/50 rounded p-3 mb-4">
      <h4 className="text-xs font-semibold mb-2">Auto-Remediation Attempts</h4>
      {alert.remediation_attempts.map(attempt => (
        <div key={attempt.id} className="flex items-center gap-2 text-xs mb-1">
          {attempt.status === 'success' ? (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
          <span>{attempt.action} ({attempt.timestamp})</span>
        </div>
      ))}
    </div>
  )}

  {/* Actions */}
  <div className="flex gap-2">
    <Button onClick={() => acknowledgeAlert(alert.id)}>Acknowledge</Button>
    <Button onClick={() => resolveAlert(alert.id)}>Resolve</Button>
    <Button variant="outline" onClick={() => viewLogs(alert.target)}>View Logs</Button>
  </div>
</div>
```

**Database Schema Update**:
```sql
ALTER TABLE monitoring_alerts
ADD COLUMN first_detected DATETIME,
ADD COLUMN check_attempts INT DEFAULT 1,
ADD COLUMN last_success DATETIME,
ADD COLUMN impact TEXT,
ADD COLUMN remediation_attempts JSON;
```

---

**4.2 Alert Frequency & Trend Analysis**

**Location**: New card in Alerts tab

**Features**:
- Top 10 most frequent alerts (last 30 days)
- Alert volume trend chart
- MTTR (Mean Time To Resolution) per alert type
- Recurring alert detection

**Backend Endpoint**:
```typescript
GET /api/monitoring/alert-analytics?period=30d

Response:
{
  top_alerts: [
    {
      title: "Redis High Memory",
      count: 12,
      avg_resolution_minutes: 3.2,
      last_occurrence: "2025-11-16T14:23:00Z"
    },
    // ...
  ],
  alert_volume_trend: [
    { date: "2025-10-17", count: 5 },
    // ... 30 days
  ],
  mttr_by_type: {
    "health": 4.5,      // minutes
    "drift": 120.3,     // minutes
    "performance": 15.7 // minutes
  },
  recurring_alerts: [
    {
      pattern: "Worker restart every 3 days",
      occurrences: 10,
      recommendation: "Investigate memory leak in worker process"
    }
  ]
}
```

---

## Implementation Roadmap

### Phase 1: Critical Visibility (Week 1) - 3 days

**Goal**: Surface metrics that Elite Guardian monitors but dashboard doesn't show

**Tasks**:
1. ✅ Add resource monitoring cards (disk, memory, redis)
   - Backend endpoint: `/api/monitoring/resources`
   - Frontend: 3 new cards below current status
   - Estimated: 4 hours

2. ✅ Expand service grid from 4 to 6 services
   - Backend: Add frontend/partners health checks
   - Frontend: Update UI grid layout
   - Estimated: 2 hours

3. ✅ Create auto-remediation log tab
   - Database: Create `remediation_log` table
   - Backend: Add logging to Elite Guardian script
   - Frontend: New tab with timeline view
   - Estimated: 6 hours

**Deliverables**:
- Dashboard shows all 6 services
- Resource usage visible (disk, memory, redis)
- Auto-remediation actions logged and visible

---

### Phase 2: SSL & Security (Week 2) - 2 days

**Goal**: Add SSL certificate monitoring and security alerts

**Tasks**:
1. ✅ Add SSL certificate status card
   - Backend: Parse SSL cert data from Elite Guardian
   - Frontend: New card with expiry countdown
   - Estimated: 3 hours

2. ✅ Add security-specific alerts
   - Failed login attempts (if auth logging exists)
   - Suspicious API usage patterns
   - Estimated: 4 hours

**Deliverables**:
- SSL expiry visible on dashboard
- Security alerts in alerts tab

---

### Phase 3: Performance Metrics (Week 3) - 3 days

**Goal**: Add job processing and performance monitoring

**Tasks**:
1. ✅ Create job metrics dashboard
   - Backend: Aggregate conversion job data
   - Frontend: New section with charts
   - Estimated: 6 hours

2. ✅ Add real-time queue depth
   - Backend: Query Redis queue
   - Frontend: Live updating gauge
   - Estimated: 2 hours

3. ✅ Add performance trend charts
   - Processing time over 7/30 days
   - Success rate trends
   - Estimated: 4 hours

**Deliverables**:
- Job processing metrics visible
- Performance trends charted
- Real-time queue monitoring

---

### Phase 4: Alert Intelligence (Week 4) - 2 days

**Goal**: Enhance alert context and trend analysis

**Tasks**:
1. ✅ Enhance alert details
   - Add diagnostic context fields
   - Show remediation timeline
   - Estimated: 4 hours

2. ✅ Add alert analytics tab
   - Top alerts chart
   - MTTR calculation
   - Recurring alert detection
   - Estimated: 5 hours

**Deliverables**:
- Alerts show full diagnostic context
- Alert trends and analytics visible
- Recurring issues identified

---

## Database Schema Changes

### New Tables

**1. remediation_log** (Priority 1)
```sql
CREATE TABLE remediation_log (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_type ENUM('restart', 'cache_clear', 'disk_cleanup', 'db_optimize', 'ssl_renew') NOT NULL,
  target VARCHAR(255) NOT NULL COMMENT 'Container name or component affected',
  reason TEXT COMMENT 'Why remediation was triggered',
  metrics_before JSON COMMENT 'State before action (e.g., memory: 82%)',
  metrics_after JSON COMMENT 'State after action (e.g., memory: 12%)',
  duration_seconds INT COMMENT 'How long the action took',
  status ENUM('success', 'failed', 'partial') NOT NULL,
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_action_type (action_type),
  INDEX idx_target (target),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**2. resource_metrics** (Priority 1)
```sql
CREATE TABLE resource_metrics (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disk_used_percent DECIMAL(5,2),
  disk_used_gb DECIMAL(10,2),
  disk_total_gb DECIMAL(10,2),
  backend_memory_percent DECIMAL(5,2),
  worker_memory_percent DECIMAL(5,2),
  redis_memory_percent DECIMAL(5,2),
  mysql_memory_percent DECIMAL(5,2),
  redis_keys INT,
  redis_hit_rate DECIMAL(5,4),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**3. ssl_certificates** (Priority 2)
```sql
CREATE TABLE ssl_certificates (
  id VARCHAR(36) PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  issuer VARCHAR(255),
  issued_date DATETIME,
  expiry_date DATETIME NOT NULL,
  auto_renewal_enabled BOOLEAN DEFAULT TRUE,
  last_renewal_attempt DATETIME,
  last_renewal_status ENUM('success', 'failed', 'pending'),
  days_until_expiry INT GENERATED ALWAYS AS (DATEDIFF(expiry_date, NOW())) STORED,
  status ENUM('healthy', 'warning', 'critical') GENERATED ALWAYS AS (
    CASE
      WHEN DATEDIFF(expiry_date, NOW()) < 7 THEN 'critical'
      WHEN DATEDIFF(expiry_date, NOW()) < 30 THEN 'warning'
      ELSE 'healthy'
    END
  ) STORED,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Table Modifications

**Extend monitoring_alerts** (Priority 4)
```sql
ALTER TABLE monitoring_alerts
ADD COLUMN first_detected DATETIME AFTER timestamp,
ADD COLUMN check_attempts INT DEFAULT 1 AFTER severity,
ADD COLUMN last_success DATETIME AFTER first_detected,
ADD COLUMN impact TEXT AFTER message,
ADD COLUMN remediation_attempts JSON AFTER impact,
ADD COLUMN mttr_minutes INT COMMENT 'Mean time to resolution' AFTER resolved_at;
```

**Extend health_checks** (Priority 1)
```sql
ALTER TABLE health_checks
ADD COLUMN frontend_status ENUM('running', 'stopped', 'unknown') DEFAULT 'unknown' AFTER redis_status,
ADD COLUMN partners_status ENUM('running', 'stopped', 'unknown') DEFAULT 'unknown' AFTER frontend_status;

-- Update services_healthy/unhealthy counts to include new services
UPDATE health_checks
SET services_healthy = (
  (CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) +
  (CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) +
  (CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) +
  (CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) +
  (CASE WHEN frontend_status = 'running' THEN 1 ELSE 0 END) +
  (CASE WHEN partners_status = 'running' THEN 1 ELSE 0 END)
);
```

---

## Backend API Endpoints to Create

### Priority 1: Resource Monitoring

```typescript
// backend/src/routes/monitoring.admin.routes.ts

/**
 * GET /api/monitoring/resources
 * Returns current resource utilization across all services
 */
router.get('/resources', monitoringController.getResourceMetrics)

/**
 * GET /api/monitoring/remediation-log
 * Returns auto-remediation action history
 * Query params: page, limit, action_type, status, target
 */
router.get('/remediation-log', monitoringController.getRemediationLog)
```

**Controller Implementation**:
```typescript
// backend/src/controllers/monitoring.admin.controller.ts

export const getResourceMetrics = async (req: Request, res: Response) => {
  try {
    // Get disk space
    const diskStats = await execPromise("df / | tail -1 | awk '{print $3, $2, $5}'")
    const [used_gb, total_gb, used_percent] = diskStats.split(' ')

    // Get container memory usage
    const backendMem = await execPromise("docker stats --no-stream --format '{{.MemPerc}}' pdflab-backend-prod | sed 's/%//'")
    const workerMem = await execPromise("docker stats --no-stream --format '{{.MemPerc}}' pdflab-worker-prod | sed 's/%//'")
    const redisMem = await execPromise("docker stats --no-stream --format '{{.MemPerc}}' 54dfd3ac119a_pdflab-redis-prod | sed 's/%//'")
    const mysqlMem = await execPromise("docker stats --no-stream --format '{{.MemPerc}}' 57d5d601930a_pdflab-mysql-prod | sed 's/%//'")

    // Get Redis stats
    const redisInfo = await execPromise("docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli INFO STATS")
    const redisKeys = await execPromise("docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE")

    // Parse hit rate from INFO STATS
    const hitRate = parseRedisHitRate(redisInfo)

    res.json({
      success: true,
      data: {
        disk: {
          used_percent: parseFloat(used_percent),
          used_gb: parseFloat(used_gb) / 1024 / 1024, // Convert KB to GB
          total_gb: parseFloat(total_gb) / 1024 / 1024,
          warning_threshold: 85,
          critical_threshold: 95
        },
        memory: {
          backend: parseFloat(backendMem),
          worker: parseFloat(workerMem),
          redis: parseFloat(redisMem),
          mysql: parseFloat(mysqlMem),
          warning_threshold: 80
        },
        redis: {
          memory_percent: parseFloat(redisMem),
          keys: parseInt(redisKeys),
          hit_rate: hitRate,
          memory_used_mb: await getRedisMemoryMB(),
          memory_max_mb: 1024 // From docker-compose limits
        },
        timestamp: new Date()
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getRemediationLog = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      action_type,
      status,
      target
    } = req.query

    let whereClause = ''
    const params: any[] = []

    if (action_type) {
      whereClause += ' AND action_type = ?'
      params.push(action_type)
    }

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    if (target) {
      whereClause += ' AND target = ?'
      params.push(target)
    }

    const offset = (Number(page) - 1) * Number(limit)

    const logs = await sequelize.query(
      `SELECT * FROM remediation_log
       WHERE 1=1 ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [...params, Number(limit), offset],
        type: QueryTypes.SELECT
      }
    )

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM remediation_log WHERE 1=1 ${whereClause}`,
      { replacements: params, type: QueryTypes.SELECT }
    )

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / Number(limit))
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

---

### Priority 2: SSL Monitoring

```typescript
/**
 * GET /api/monitoring/ssl-status
 * Returns SSL certificate information for all domains
 */
router.get('/ssl-status', monitoringController.getSSLStatus)
```

**Controller**:
```typescript
export const getSSLStatus = async (req: Request, res: Response) => {
  try {
    const cert = await sequelize.query(
      `SELECT * FROM ssl_certificates WHERE domain = 'pdflab.pro'`,
      { type: QueryTypes.SELECT }
    )

    if (cert.length === 0) {
      // First time - fetch from server
      const certInfo = await fetchSSLCertificate('pdflab.pro')
      await sequelize.query(
        `INSERT INTO ssl_certificates (id, domain, issuer, issued_date, expiry_date)
         VALUES (UUID(), ?, ?, ?, ?)`,
        { replacements: ['pdflab.pro', certInfo.issuer, certInfo.issued, certInfo.expiry] }
      )
      return res.json({ success: true, data: certInfo })
    }

    res.json({ success: true, data: cert[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

---

### Priority 3: Job Metrics

```typescript
/**
 * GET /api/monitoring/job-metrics
 * Returns job processing statistics
 * Query params: period (1h, 24h, 7d, 30d)
 */
router.get('/job-metrics', monitoringController.getJobMetrics)
```

**Controller**:
```typescript
export const getJobMetrics = async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query
    const hours = periodToHours(period) // '24h' -> 24

    // Current queue depth (from Redis)
    const queueDepth = await redisClient.llen('conversion_queue')

    // Job statistics from database
    const stats = await sequelize.query(
      `SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
        AVG(CASE WHEN status = 'completed' THEN TIMESTAMPDIFF(SECOND, created_at, updated_at) END) as avg_processing_time,
        (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
      FROM conversions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      { replacements: [hours], type: QueryTypes.SELECT }
    )

    // Top failure reasons
    const failures = await sequelize.query(
      `SELECT error_message, COUNT(*) as count
       FROM conversions
       WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       GROUP BY error_message
       ORDER BY count DESC
       LIMIT 5`,
      { replacements: [hours], type: QueryTypes.SELECT }
    )

    // Jobs per hour
    const jobsPerHour = await sequelize.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
        COUNT(*) as count
       FROM conversions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       GROUP BY hour
       ORDER BY hour ASC`,
      { replacements: [hours], type: QueryTypes.SELECT }
    )

    res.json({
      success: true,
      data: {
        current_queue_depth: queueDepth,
        period,
        ...stats[0],
        top_failure_reasons: failures,
        jobs_per_hour: jobsPerHour
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

---

## Elite Guardian Script Updates

### Log Remediation Actions to Database

**Update**: Modify `auto_restart_container()` and other remediation functions to log to `remediation_log` table

**File**: scripts/elite-health-guardian.sh

```bash
auto_restart_container() {
    local container_name="$1"
    local reason="$2"
    local action_id=$(uuidgen)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "$container_name")

    log "🔄 Auto-restarting $container_name (Reason: $reason)"

    docker restart "$container_name" >/dev/null 2>&1
    local restart_status=$?

    # Capture metrics after
    sleep 2 # Wait for container to stabilize
    local memory_after=$(check_memory_usage "$container_name")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Determine status
    local status="failed"
    if [ $restart_status -eq 0 ]; then
        status="success"
        log "✅ $container_name restarted successfully"
        send_alert "SUCCESS" "$container_name Auto-Restart Successful" "Container was restarted due to: $reason"
    else
        log "❌ Failed to restart $container_name"
        send_alert "CRITICAL" "$container_name Auto-Restart FAILED" "Failed to restart container. Manual intervention required."
    fi

    # Log to remediation_log table
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status)
        VALUES (
            '$action_id',
            NOW(),
            'restart',
            '$container_name',
            '$reason',
            '{\"memory_percent\": $memory_before}',
            '{\"memory_percent\": $memory_after}',
            $duration,
            '$status'
        );
    " 2>/dev/null

    return $restart_status
}

auto_clear_redis_cache() {
    local action_id=$(uuidgen)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod")
    local keys_before=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r')

    log "🧹 Clearing Redis cache (Memory threshold exceeded)"

    docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli FLUSHDB >/dev/null 2>&1
    local clear_status=$?

    # Capture metrics after
    sleep 1
    local memory_after=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod")
    local keys_after=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r')
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local status="failed"
    if [ $clear_status -eq 0 ]; then
        status="success"
        log "✅ Redis cache cleared successfully"
        send_alert "SUCCESS" "Redis Cache Cleared" "Cache was automatically cleared due to high memory usage. Before: ${memory_before}%, After: ${memory_after}%"
    else
        log "❌ Failed to clear Redis cache"
        send_alert "WARNING" "Redis Cache Clear FAILED" "Failed to clear cache. Manual intervention may be required."
    fi

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status)
        VALUES (
            '$action_id',
            NOW(),
            'cache_clear',
            'redis',
            'Memory exceeded 80% threshold',
            '{\"memory_percent\": $memory_before, \"keys\": $keys_before}',
            '{\"memory_percent\": $memory_after, \"keys\": $keys_after}',
            $duration,
            '$status'
        );
    " 2>/dev/null

    return $clear_status
}

# Similar updates for:
# - auto_cleanup_disk()
# - auto_optimize_database()
# - SSL renewal in monitor_ssl_certificate()
```

---

## Summary: Missing Features Checklist

### ❌ Not Monitored (23 gaps)

**Resource Metrics (5)**
- [ ] Disk space utilization & trend
- [ ] Memory usage per container
- [ ] Redis cache hit rate
- [ ] Database storage size
- [ ] Network I/O per service

**Auto-Remediation Visibility (6)**
- [ ] Container restart log
- [ ] Cache clear history
- [ ] Disk cleanup activity
- [ ] Database optimization log
- [ ] SSL renewal attempts
- [ ] Remediation success rate

**Service Coverage (2)**
- [ ] Frontend monitoring (pdflab-frontend-prod)
- [ ] Partners Portal monitoring (pdflab-partners-prod)

**Security & SSL (3)**
- [ ] SSL certificate expiry date
- [ ] Days until SSL renewal
- [ ] Auto-renewal status

**Performance Metrics (5)**
- [ ] Job queue depth (real-time)
- [ ] Jobs processed per hour
- [ ] Success vs failure rate
- [ ] Average processing time
- [ ] Top failure reasons

**Alert Intelligence (2)**
- [ ] Alert frequency trends
- [ ] Mean Time To Resolution (MTTR)

---

## Estimated Development Effort

| Phase | Features | Backend | Frontend | Database | Total Days |
|-------|----------|---------|----------|----------|------------|
| P1: Critical Visibility | Resource monitoring, Remediation log, 6 services | 8h | 6h | 2h | 2 days |
| P2: SSL & Security | SSL status, Security alerts | 4h | 3h | 1h | 1 day |
| P3: Performance | Job metrics, Queue monitoring | 8h | 6h | 1h | 2 days |
| P4: Alert Intelligence | Enhanced alerts, Analytics | 6h | 5h | 1h | 1.5 days |
| **Total** | **23 features** | **26h** | **20h** | **5h** | **6.5 days** |

---

## Conclusion

The current monitoring dashboard provides a **solid foundation** but is missing **critical operational visibility** that the Elite Health Guardian Agent monitors autonomously. By implementing these 23 enhancements across 4 priority phases, administrators will gain:

1. **Complete visibility** into resource utilization (disk, memory, cache)
2. **Auto-remediation transparency** (what actions were taken automatically)
3. **Security monitoring** (SSL certificates, renewal status)
4. **Performance insights** (job processing, queue depth, success rates)
5. **Alert intelligence** (trends, recurring issues, MTTR)

**Recommended Next Steps**:
1. ✅ Start with Phase 1 (Critical Visibility) - highest ROI
2. ✅ Create database tables (remediation_log, resource_metrics, ssl_certificates)
3. ✅ Update Elite Guardian script to log remediation actions
4. ✅ Build backend API endpoints for new metrics
5. ✅ Implement frontend UI components

**Total Effort**: ~6.5 development days
**Impact**: Transform dashboard from passive monitoring to active operations center
