# Monitoring Dashboard Enhancement - Execution Plan

**Start Date**: 2025-11-16
**Based On**: [MONITORING_DASHBOARD_GAP_ANALYSIS.md](MONITORING_DASHBOARD_GAP_ANALYSIS.md)
**Total Estimated Time**: 6.5 development days
**Approach**: Phased implementation with testing after each phase

---

## Phase 1: Critical Operational Visibility (Days 1-3)

**Goal**: Surface the most critical metrics that Elite Guardian monitors but dashboard doesn't show

**Priority**: 🔴 CRITICAL
**Estimated Time**: 3 days (24 hours)
**Dependencies**: None

---

### Task 1.1: Database Schema Setup

**Time**: 2 hours
**Status**: ⏳ Pending

#### Subtasks:

**1.1.1** Create `remediation_log` table
```sql
-- File: backend/src/migrations/20251116-create-remediation-log.sql

CREATE TABLE IF NOT EXISTS remediation_log (
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

**1.1.2** Create `resource_metrics` table
```sql
-- File: backend/src/migrations/20251116-create-resource-metrics.sql

CREATE TABLE IF NOT EXISTS resource_metrics (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disk_used_percent DECIMAL(5,2),
  disk_used_gb DECIMAL(10,2),
  disk_total_gb DECIMAL(10,2),
  backend_memory_percent DECIMAL(5,2),
  worker_memory_percent DECIMAL(5,2),
  redis_memory_percent DECIMAL(5,2),
  mysql_memory_percent DECIMAL(5,2),
  frontend_memory_percent DECIMAL(5,2),
  partners_memory_percent DECIMAL(5,2),
  redis_keys INT,
  redis_hit_rate DECIMAL(5,4),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**1.1.3** Extend `health_checks` table for 6 services
```sql
-- File: backend/src/migrations/20251116-extend-health-checks.sql

ALTER TABLE health_checks
ADD COLUMN frontend_status ENUM('running', 'stopped', 'unknown') DEFAULT 'unknown' AFTER redis_status,
ADD COLUMN partners_status ENUM('running', 'stopped', 'unknown') DEFAULT 'unknown' AFTER frontend_status;

-- Note: Don't auto-update services_healthy/unhealthy - will be calculated in backend
```

**Testing**:
- [ ] Run migrations on local development database
- [ ] Verify tables created with correct schema
- [ ] Test inserting sample data into each table
- [ ] Run migrations on VPS production database

---

### Task 1.2: Update Elite Guardian Script

**Time**: 3 hours
**Status**: ⏳ Pending
**Dependencies**: Task 1.1 (database tables must exist)

#### Subtasks:

**1.2.1** Add remediation logging to `auto_restart_container()`

Update: `scripts/elite-health-guardian.sh`

```bash
auto_restart_container() {
    local container_name="$1"
    local reason="$2"
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "$container_name" 2>/dev/null || echo "0")

    log "🔄 Auto-restarting $container_name (Reason: $reason)"

    docker restart "$container_name" >/dev/null 2>&1
    local restart_status=$?

    # Capture metrics after
    sleep 2
    local memory_after=$(check_memory_usage "$container_name" 2>/dev/null || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Determine status
    local status="failed"
    local error_msg=""
    if [ $restart_status -eq 0 ]; then
        status="success"
        log "✅ $container_name restarted successfully"
        send_alert "SUCCESS" "$container_name Auto-Restart Successful" "Container was restarted due to: $reason. Duration: ${duration}s"
    else
        status="failed"
        error_msg="Docker restart command failed with exit code $restart_status"
        log "❌ Failed to restart $container_name"
        send_alert "CRITICAL" "$container_name Auto-Restart FAILED" "Failed to restart container. Manual intervention required."
    fi

    # Escape single quotes in reason and error_msg for SQL
    local reason_escaped=$(echo "$reason" | sed "s/'/''/g")
    local error_msg_escaped=$(echo "$error_msg" | sed "s/'/''/g")

    # Log to remediation_log table
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status, error_message)
        VALUES (
            '$action_id',
            NOW(),
            'restart',
            '$container_name',
            '$reason_escaped',
            '{\"memory_percent\": $memory_before}',
            '{\"memory_percent\": $memory_after}',
            $duration,
            '$status',
            '$error_msg_escaped'
        );
    " 2>/dev/null

    return $restart_status
}
```

**1.2.2** Add remediation logging to `auto_clear_redis_cache()`

```bash
auto_clear_redis_cache() {
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local memory_before=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod" 2>/dev/null || echo "0")
    local keys_before=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")

    log "🧹 Clearing Redis cache (Memory threshold exceeded)"

    docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli FLUSHDB >/dev/null 2>&1
    local clear_status=$?

    # Capture metrics after
    sleep 1
    local memory_after=$(check_memory_usage "54dfd3ac119a_pdflab-redis-prod" 2>/dev/null || echo "0")
    local keys_after=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local status="failed"
    local error_msg=""
    if [ $clear_status -eq 0 ]; then
        status="success"
        log "✅ Redis cache cleared successfully"
        send_alert "SUCCESS" "Redis Cache Cleared" "Cache automatically cleared. Memory: ${memory_before}% → ${memory_after}%. Keys: ${keys_before} → ${keys_after}"
    else
        status="failed"
        error_msg="Redis FLUSHDB command failed with exit code $clear_status"
        log "❌ Failed to clear Redis cache"
        send_alert "WARNING" "Redis Cache Clear FAILED" "Failed to clear cache. Manual intervention may be required."
    fi

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status, error_message)
        VALUES (
            '$action_id',
            NOW(),
            'cache_clear',
            'redis',
            'Memory exceeded 80% threshold',
            '{\"memory_percent\": $memory_before, \"keys\": $keys_before}',
            '{\"memory_percent\": $memory_after, \"keys\": $keys_after}',
            $duration,
            '$status',
            '$error_msg'
        );
    " 2>/dev/null

    return $clear_status
}
```

**1.2.3** Add remediation logging to `auto_cleanup_disk()`

```bash
auto_cleanup_disk() {
    local action_id=$(docker exec 57d5d601930a_pdflab-mysql-prod mysql -N -updflab -p***REMOVED*** -e "SELECT UUID()" 2>/dev/null)
    local start_time=$(date +%s)

    # Capture metrics before
    local disk_before=$(check_disk_space)

    log "🧹 Starting automatic disk cleanup"

    # Delete temp files >7 days
    local temp_deleted=$(find /var/pdflab/storage/temp -type f -mtime +7 2>/dev/null | wc -l)
    find /var/pdflab/storage/temp -type f -mtime +7 -delete 2>/dev/null

    # Delete old conversion jobs >30 days
    local output_deleted=$(find /var/pdflab/storage/outputs -type f -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab/storage/outputs -type f -mtime +30 -delete 2>/dev/null

    # Compress old logs
    find /var/pdflab/logs -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null

    # Delete compressed logs >30 days
    local logs_deleted=$(find /var/pdflab/logs -name "*.log.gz" -mtime +30 2>/dev/null | wc -l)
    find /var/pdflab/logs -name "*.log.gz" -mtime +30 -delete 2>/dev/null

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Capture metrics after
    local disk_after=$(check_disk_space)
    local files_deleted=$((temp_deleted + output_deleted + logs_deleted))

    log "✅ Disk cleanup complete. Usage: ${disk_before}% → ${disk_after}%. Deleted: $files_deleted files"
    send_alert "SUCCESS" "Disk Cleanup Completed" "Disk usage reduced from ${disk_before}% to ${disk_after}%. Deleted $files_deleted files."

    # Log to database
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status)
        VALUES (
            '$action_id',
            NOW(),
            'disk_cleanup',
            '/var/pdflab/storage',
            'Disk usage exceeded 85% threshold',
            '{\"disk_percent\": $disk_before, \"files_found\": $files_deleted}',
            '{\"disk_percent\": $disk_after, \"files_deleted\": $files_deleted}',
            $duration,
            'success'
        );
    " 2>/dev/null
}
```

**1.2.4** Add resource metrics collection to main loop

Add new function to collect and store resource metrics:

```bash
# Add this new function after monitor_database()
collect_resource_metrics() {
    # Get disk stats
    local disk_stats=$(df / | tail -1 | awk '{print $5, $3, $2}')
    local disk_percent=$(echo "$disk_stats" | awk '{print $1}' | sed 's/%//')
    local disk_used_kb=$(echo "$disk_stats" | awk '{print $2}')
    local disk_total_kb=$(echo "$disk_stats" | awk '{print $3}')
    local disk_used_gb=$(echo "scale=2; $disk_used_kb / 1024 / 1024" | bc)
    local disk_total_gb=$(echo "scale=2; $disk_total_kb / 1024 / 1024" | bc)

    # Get memory usage per container
    local backend_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-backend-prod 2>/dev/null | sed 's/%//' || echo "0")
    local worker_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-worker-prod 2>/dev/null | sed 's/%//' || echo "0")
    local redis_mem=$(docker stats --no-stream --format '{{.MemPerc}}' 54dfd3ac119a_pdflab-redis-prod 2>/dev/null | sed 's/%//' || echo "0")
    local mysql_mem=$(docker stats --no-stream --format '{{.MemPerc}}' 57d5d601930a_pdflab-mysql-prod 2>/dev/null | sed 's/%//' || echo "0")
    local frontend_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-frontend-prod 2>/dev/null | sed 's/%//' || echo "0")
    local partners_mem=$(docker stats --no-stream --format '{{.MemPerc}}' pdflab-partners-prod 2>/dev/null | sed 's/%//' || echo "0")

    # Get Redis stats
    local redis_keys=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli DBSIZE 2>/dev/null | tr -d '\r' || echo "0")

    # Calculate Redis hit rate from INFO STATS
    local redis_hits=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli INFO STATS 2>/dev/null | grep keyspace_hits | cut -d: -f2 | tr -d '\r' || echo "0")
    local redis_misses=$(docker exec 54dfd3ac119a_pdflab-redis-prod redis-cli INFO STATS 2>/dev/null | grep keyspace_misses | cut -d: -f2 | tr -d '\r' || echo "0")
    local redis_hit_rate="0"
    if [ "$redis_hits" != "0" ] || [ "$redis_misses" != "0" ]; then
        redis_hit_rate=$(echo "scale=4; $redis_hits / ($redis_hits + $redis_misses)" | bc 2>/dev/null || echo "0")
    fi

    # Insert into resource_metrics table
    docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** "$METRICS_DB" -e "
        INSERT INTO resource_metrics (
            id, timestamp,
            disk_used_percent, disk_used_gb, disk_total_gb,
            backend_memory_percent, worker_memory_percent, redis_memory_percent, mysql_memory_percent,
            frontend_memory_percent, partners_memory_percent,
            redis_keys, redis_hit_rate
        ) VALUES (
            UUID(), NOW(),
            $disk_percent, $disk_used_gb, $disk_total_gb,
            $backend_mem, $worker_mem, $redis_mem, $mysql_mem,
            $frontend_mem, $partners_mem,
            $redis_keys, $redis_hit_rate
        );
    " 2>/dev/null
}

# Update main execution to call this function
main() {
    check_pause

    log "🤖 Elite Health Guardian - Running health checks"

    monitor_backend
    monitor_worker
    monitor_database
    monitor_redis

    # NEW: Collect resource metrics every run
    collect_resource_metrics

    # ... rest of main function
}
```

**Testing**:
- [ ] Upload updated script to VPS
- [ ] Manually trigger a container restart to test logging
- [ ] Verify remediation_log table has new entry
- [ ] Check resource_metrics table is being populated
- [ ] Monitor for 5 minutes to ensure no errors

---

### Task 1.3: Backend API Endpoints

**Time**: 8 hours
**Status**: ⏳ Pending
**Dependencies**: Task 1.1, 1.2

#### Subtasks:

**1.3.1** Create resource monitoring controller

File: `backend/src/controllers/monitoring.admin.controller.ts`

Add new function:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * GET /api/monitoring/resources
 * Returns current resource utilization across all services
 */
export const getResourceMetrics = async (req: Request, res: Response) => {
  try {
    // Get latest resource metrics from database
    const latestMetrics = await sequelize.query(
      `SELECT * FROM resource_metrics ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as any[];

    if (latestMetrics.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No resource metrics available yet'
      });
    }

    const metrics = latestMetrics[0];

    // Get 24-hour trends
    const trends = await sequelize.query(
      `SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
        AVG(disk_used_percent) as avg_disk,
        AVG(backend_memory_percent) as avg_backend_mem,
        AVG(worker_memory_percent) as avg_worker_mem,
        AVG(redis_memory_percent) as avg_redis_mem,
        AVG(mysql_memory_percent) as avg_mysql_mem
      FROM resource_metrics
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY hour
      ORDER BY hour ASC`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        current: {
          disk: {
            used_percent: parseFloat(metrics.disk_used_percent) || 0,
            used_gb: parseFloat(metrics.disk_used_gb) || 0,
            total_gb: parseFloat(metrics.disk_total_gb) || 0,
            warning_threshold: 85,
            critical_threshold: 95
          },
          memory: {
            backend: parseFloat(metrics.backend_memory_percent) || 0,
            worker: parseFloat(metrics.worker_memory_percent) || 0,
            redis: parseFloat(metrics.redis_memory_percent) || 0,
            mysql: parseFloat(metrics.mysql_memory_percent) || 0,
            frontend: parseFloat(metrics.frontend_memory_percent) || 0,
            partners: parseFloat(metrics.partners_memory_percent) || 0,
            warning_threshold: 80
          },
          redis: {
            memory_percent: parseFloat(metrics.redis_memory_percent) || 0,
            keys: parseInt(metrics.redis_keys) || 0,
            hit_rate: parseFloat(metrics.redis_hit_rate) || 0
          }
        },
        trends: trends,
        timestamp: metrics.timestamp
      }
    });
  } catch (error: any) {
    console.error('Resource metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

**1.3.2** Create remediation log controller

Add to same file:

```typescript
/**
 * GET /api/monitoring/remediation-log
 * Returns auto-remediation action history
 * Query params: page, limit, action_type, status, target
 */
export const getRemediationLog = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      action_type,
      status,
      target
    } = req.query;

    let whereClause = '1=1';
    const params: any[] = [];

    if (action_type) {
      whereClause += ' AND action_type = ?';
      params.push(action_type);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (target) {
      whereClause += ' AND target LIKE ?';
      params.push(`%${target}%`);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const logs = await sequelize.query(
      `SELECT * FROM remediation_log
       WHERE ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [...params, Number(limit), offset],
        type: QueryTypes.SELECT
      }
    );

    const totalCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM remediation_log WHERE ${whereClause}`,
      {
        replacements: params,
        type: QueryTypes.SELECT
      }
    ) as any[];

    // Get statistics
    const stats = await sequelize.query(
      `SELECT
        COUNT(*) as total_actions,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration_seconds) as avg_duration,
        action_type,
        COUNT(*) as count
      FROM remediation_log
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY action_type`,
      { type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: logs,
      statistics: stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Remediation log error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

**1.3.3** Update existing health check to include 6 services

Modify `getCurrentHealthStatus()` in same file:

```typescript
export const getCurrentHealthStatus = async (req: Request, res: Response) => {
  try {
    // Get most recent health check
    const latestHealth = await sequelize.query(
      `SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 1`,
      { type: QueryTypes.SELECT }
    ) as any[];

    if (latestHealth.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No health checks available'
      });
    }

    const health = latestHealth[0];

    // Calculate services healthy/unhealthy including frontend and partners
    const servicesHealthy =
      (health.backend_status === 'healthy' ? 1 : 0) +
      (health.worker_status === 'healthy' ? 1 : 0) +
      (health.mysql_status === 'healthy' ? 1 : 0) +
      (health.redis_status === 'healthy' ? 1 : 0) +
      (health.frontend_status === 'running' ? 1 : 0) +
      (health.partners_status === 'running' ? 1 : 0);

    const servicesUnhealthy = 6 - servicesHealthy;

    res.json({
      success: true,
      data: {
        ...health,
        services_healthy: servicesHealthy,
        services_unhealthy: servicesUnhealthy,
        total_services: 6
      }
    });
  } catch (error: any) {
    console.error('Health status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

**1.3.4** Add routes

File: `backend/src/routes/monitoring.admin.routes.ts`

```typescript
// Add these new routes
router.get('/resources', monitoringController.getResourceMetrics);
router.get('/remediation-log', monitoringController.getRemediationLog);
```

**Testing**:
- [ ] Test `/api/monitoring/resources` endpoint
- [ ] Test `/api/monitoring/remediation-log` endpoint
- [ ] Verify JSON response format matches frontend expectations
- [ ] Test with different query parameters (filters, pagination)

---

### Task 1.4: Frontend UI Components

**Time**: 6 hours
**Status**: ⏳ Pending
**Dependencies**: Task 1.3

#### Subtasks:

**1.4.1** Create Resource Monitoring Cards

File: `app/admin/monitoring/page.tsx`

Add below line 381 (after Active Alerts card):

```typescript
{/* Resource Usage Cards - NEW */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  {/* Disk Space Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        Disk Space
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">
              {resourceMetrics?.current.disk.used_percent.toFixed(1)}%
            </span>
            <Badge variant={
              resourceMetrics?.current.disk.used_percent >= 95 ? 'destructive' :
              resourceMetrics?.current.disk.used_percent >= 85 ? 'secondary' : 'default'
            }>
              {resourceMetrics?.current.disk.used_gb.toFixed(1)} / {resourceMetrics?.current.disk.total_gb.toFixed(1)} GB
            </Badge>
          </div>
          <div className="w-full bg-border/50 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                resourceMetrics?.current.disk.used_percent >= 95 ? 'bg-red-500' :
                resourceMetrics?.current.disk.used_percent >= 85 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${resourceMetrics?.current.disk.used_percent || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Warning: 85%</span>
            <span>Critical: 95%</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Memory Usage Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Memory Usage
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {/* Backend */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> Backend
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.backend.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.backend >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.backend || 0}%` }}
            />
          </div>
        </div>

        {/* Worker */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" /> Worker
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.worker.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.worker >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.worker || 0}%` }}
            />
          </div>
        </div>

        {/* MySQL */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" /> MySQL
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.mysql.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.mysql >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.mysql || 0}%` }}
            />
          </div>
        </div>

        {/* Redis */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> Redis
            </span>
            <span className="font-semibold">{resourceMetrics?.current.memory.redis.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                resourceMetrics?.current.memory.redis >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${resourceMetrics?.current.memory.redis || 0}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Warning threshold: 80%</p>
    </CardContent>
  </Card>

  {/* Redis Metrics Card */}
  <Card className="glass-strong border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        Redis Cache
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Cache Hit Rate</p>
          <p className="text-2xl font-bold">
            {((resourceMetrics?.current.redis.hit_rate || 0) * 100).toFixed(1)}%
          </p>
          <div className="w-full bg-border/50 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(resourceMetrics?.current.redis.hit_rate || 0) * 100}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Total Keys</p>
            <p className="font-semibold text-lg">{(resourceMetrics?.current.redis.keys || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Memory</p>
            <p className="font-semibold text-lg">{resourceMetrics?.current.redis.memory_percent.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

**1.4.2** Update service health grid to 6 services

Modify the Current Health card (around line 279):

```typescript
{/* Current Health */}
<Card className="glass-strong border-border/50">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      <Activity className="w-4 h-4" />
      Current Health
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-3xl font-bold">
          {dashboardData?.currentStatus.health?.services_healthy || 0}/6
        </p>
        <p className="text-xs text-muted-foreground mt-1">Services Healthy</p>
      </div>
      <Badge variant={getStatusVariant(dashboardData?.currentStatus.health?.overall_status || 'unknown')} className="text-lg px-4 py-2 capitalize">
        {dashboardData?.currentStatus.health?.overall_status || 'Unknown'}
      </Badge>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="flex items-center gap-2">
        <Server className={`w-3 h-3 ${dashboardData?.currentStatus.health?.backend_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">Backend</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className={`w-3 h-3 ${dashboardData?.currentStatus.health?.worker_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">Worker</span>
      </div>
      <div className="flex items-center gap-2">
        <Monitor className={`w-3 h-3 ${dashboardData?.currentStatus.health?.frontend_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">Frontend</span>
      </div>
      <div className="flex items-center gap-2">
        <Database className={`w-3 h-3 ${dashboardData?.currentStatus.health?.mysql_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">MySQL</span>
      </div>
      <div className="flex items-center gap-2">
        <HardDrive className={`w-3 h-3 ${dashboardData?.currentStatus.health?.redis_status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">Redis</span>
      </div>
      <div className="flex items-center gap-2">
        <Users className={`w-3 h-3 ${dashboardData?.currentStatus.health?.partners_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
        <span className="text-xs">Partners</span>
      </div>
    </div>
  </CardContent>
</Card>
```

**1.4.3** Add state management and data fetching

Add at top of component (around line 95):

```typescript
const [resourceMetrics, setResourceMetrics] = useState<any>(null);
const [remediationLog, setRemediationLog] = useState<any[]>([]);

// Fetch resource metrics
const fetchResourceMetrics = async () => {
  try {
    const response = await fetch(`${API_URL}/api/monitoring/resources`);
    if (!response.ok) throw new Error('Failed to fetch resource metrics');
    const data = await response.json();
    setResourceMetrics(data.data);
  } catch (err: any) {
    console.error('Resource metrics fetch error:', err);
  }
};

// Fetch remediation log
const fetchRemediationLog = async (page = 1, limit = 20) => {
  try {
    const response = await fetch(
      `${API_URL}/api/monitoring/remediation-log?page=${page}&limit=${limit}`
    );
    const data = await response.json();
    setRemediationLog(data.data || []);
  } catch (err: any) {
    console.error('Remediation log fetch error:', err);
  }
};

// Update useEffect to include new fetches
useEffect(() => {
  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchHealthChecks(),
      fetchDriftChecks(),
      fetchAlerts(),
      fetchResourceMetrics(),  // NEW
      fetchRemediationLog()    // NEW
    ]);
    setIsLoading(false);
  };
  fetchAllData();
}, []);

// Update auto-refresh
useEffect(() => {
  if (!autoRefresh) return;

  const interval = setInterval(() => {
    fetchDashboardData();
    fetchHealthChecks();
    fetchDriftChecks();
    fetchAlerts();
    fetchResourceMetrics();  // NEW
    fetchRemediationLog();   // NEW
  }, 30000);

  return () => clearInterval(interval);
}, [autoRefresh]);
```

**1.4.4** Add Remediation Log Tab

Add new tab to Tabs section (around line 437):

```typescript
<Tabs defaultValue="alerts" className="space-y-6">
  <TabsList className="glass-subtle border border-border/50">
    <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
    <TabsTrigger value="remediation">Auto-Remediation ({remediationLog.length})</TabsTrigger>
    <TabsTrigger value="health">Health Checks ({healthChecks.length})</TabsTrigger>
    <TabsTrigger value="drift">Drift Checks ({driftChecks.length})</TabsTrigger>
  </TabsList>

  {/* ... existing Alerts tab ... */}

  {/* NEW: Remediation Log Tab */}
  <TabsContent value="remediation">
    <Card className="glass-strong border-border/50">
      <CardHeader>
        <CardTitle>Auto-Remediation Activity Log</CardTitle>
        <CardDescription>Actions taken automatically by Elite Health Guardian</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {remediationLog.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold text-foreground">No Remediation Actions Yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Elite Guardian will log automated fixes here
              </p>
            </div>
          ) : (
            remediationLog.map((action) => (
              <div
                key={action.id}
                className="p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant={action.status === 'success' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {action.status === 'success' ? '✅ Success' : '❌ Failed'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {action.action_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {action.target}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Reason:</strong> {action.reason}
                    </p>

                    {/* Metrics */}
                    {action.metrics_before && action.metrics_after && (
                      <div className="bg-background/50 rounded p-2 mb-2 text-xs">
                        <div className="flex gap-4">
                          <div>
                            <span className="text-muted-foreground">Before:</span>{' '}
                            <code className="text-foreground">
                              {JSON.stringify(JSON.parse(action.metrics_before))}
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">After:</span>{' '}
                            <code className="text-green-500">
                              {JSON.stringify(JSON.parse(action.metrics_after))}
                            </code>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Duration & Timestamp */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Duration: {action.duration_seconds}s</span>
                      <span>•</span>
                      <span>{new Date(action.timestamp).toLocaleString()}</span>
                    </div>

                    {/* Error Message */}
                    {action.error_message && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                        <strong>Error:</strong> {action.error_message}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="ml-4">
                    {action.action_type === 'restart' && <RefreshCw className="w-6 h-6 text-blue-500" />}
                    {action.action_type === 'cache_clear' && <XCircle className="w-6 h-6 text-yellow-500" />}
                    {action.action_type === 'disk_cleanup' && <HardDrive className="w-6 h-6 text-green-500" />}
                    {action.action_type === 'db_optimize' && <Database className="w-6 h-6 text-purple-500" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  </TabsContent>

  {/* ... existing Health and Drift tabs ... */}
</Tabs>
```

**1.4.5** Add missing icon imports

Add to imports at top of file (around line 9):

```typescript
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Server,
  Database,
  Wifi,
  HardDrive,
  Bell,
  BellOff,
  Eye,
  Filter,
  Monitor,   // NEW
  Users      // NEW
} from 'lucide-react'
```

**Testing**:
- [ ] Verify resource cards display correctly
- [ ] Check service health shows all 6 services
- [ ] Test remediation log tab displays actions
- [ ] Verify auto-refresh updates all new data
- [ ] Test responsive layout on mobile

---

### Task 1.5: Deploy and Test Phase 1

**Time**: 3 hours
**Status**: ⏳ Pending
**Dependencies**: All previous tasks

#### Subtasks:

**1.5.1** Database migrations on production

```bash
# SSH to VPS
ssh root@141.136.44.168

# Run migrations
docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production < /path/to/migration.sql
```

**1.5.2** Deploy Elite Guardian updates

```bash
# Upload updated script
scp scripts/elite-health-guardian.sh root@141.136.44.168:/var/pdflab/scripts/

# Fix line endings
ssh root@141.136.44.168 "sed -i 's/\r$//' /var/pdflab/scripts/elite-health-guardian.sh"

# Test manually
ssh root@141.136.44.168 "/var/pdflab/scripts/elite-health-guardian.sh"
```

**1.5.3** Deploy backend changes

```bash
# On VPS
cd /var/pdflab/app/backend
npm run build
docker restart pdflab-backend-prod
```

**1.5.4** Deploy frontend changes

```bash
# On VPS
cd /var/pdflab/app
npm run build
docker restart pdflab-frontend-prod
```

**1.5.5** End-to-end testing

- [ ] Navigate to https://pdflab.pro/admin/monitoring
- [ ] Verify resource cards show current metrics
- [ ] Verify 6 services displayed in health card
- [ ] Check remediation log tab (should have worker restart from earlier)
- [ ] Wait 30 seconds for auto-refresh
- [ ] Verify metrics update
- [ ] Check database has resource_metrics entries
- [ ] Manually trigger container restart to test remediation logging

---

## Phase 1 Success Criteria

**Phase 1 is complete when:**

✅ **Database**:
- [ ] `remediation_log` table created and populated
- [ ] `resource_metrics` table created and collecting data every 30s
- [ ] `health_checks` table extended with frontend/partners columns

✅ **Elite Guardian**:
- [ ] Auto-remediation actions logged to database
- [ ] Resource metrics collected every 30 seconds
- [ ] Script runs without errors

✅ **Backend**:
- [ ] `/api/monitoring/resources` endpoint returns valid data
- [ ] `/api/monitoring/remediation-log` endpoint returns valid data
- [ ] `/api/monitoring/dashboard` includes 6 services

✅ **Frontend**:
- [ ] Resource cards display (Disk, Memory, Redis)
- [ ] Service health shows all 6 services (4/6, 6/6, etc.)
- [ ] Remediation log tab shows auto-remediation actions
- [ ] Auto-refresh updates all new data

✅ **Production**:
- [ ] Deployed to https://pdflab.pro/admin/monitoring
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Data updates in real-time

---

## Phase 2-4 Preview (To Be Executed After Phase 1)

### Phase 2: SSL & Security (Week 2 - 2 days)
- SSL certificate monitoring
- Security alerts
- Certificate expiry warnings

### Phase 3: Performance Metrics (Week 3 - 3 days)
- Job processing dashboard
- Queue depth monitoring
- Success/failure rate tracking

### Phase 4: Alert Intelligence (Week 4 - 2 days)
- Enhanced alert context
- Alert analytics
- MTTR tracking

---

## Execution Notes

**Development Workflow**:
1. Work on local development environment first
2. Test thoroughly on localhost:3000
3. Deploy to VPS production only after local testing passes
4. Monitor production for 24 hours after deployment

**Rollback Plan**:
- Database migrations are additive (no drops), safe to rollback
- Keep backup of elite-health-guardian.sh before updates
- Backend/frontend can be reverted via git

**Communication**:
- Update this plan with ✅ as tasks complete
- Document any issues encountered in separate ISSUES.md
- Take screenshots of completed UI for documentation

---

**Last Updated**: 2025-11-16
**Current Phase**: Phase 1 - Task 1.1
**Next Action**: Create database migrations
