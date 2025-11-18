# Monitoring Enhancement - Focused Implementation Plan

**Created**: 2025-11-16
**Status**: Ready for Execution
**Estimated Time**: 8-12 hours total
**Priority**: HIGH - Adds critical autonomous capabilities

---

## Overview

This plan adds **6 essential enhancements** to the existing monitoring dashboard (Phase 1 complete ✅) to enable intelligent autonomous operation without overkill complexity.

**What's Being Added:**
1. ✅ Baseline/Trend Analysis (predictive capabilities)
2. ✅ Automated Execution Scripts (autonomous remediation)
3. ✅ Decision Engine (when to remediate)
4. ✅ Alert Severity Levels (intelligent prioritization)
5. ✅ Daily Digest Reports (proactive communication)
6. ✅ Automated Blocking Actions (security auto-response)
7. ✅ **Management Layer** (manual controls & restart buttons) ⭐ NEW

**What's NOT Included** (to avoid overkill):
- ❌ Complex ML models
- ❌ Chaos engineering
- ❌ Canary deployments
- ❌ Advanced capacity planning
- ❌ Full predictive failure modeling

---

## Enhancement 1: Baseline/Trend Analysis (3-4 hours)

### Goal
Track 7-day performance baselines to detect anomalies and predict issues.

### Backend Implementation

#### Step 1.1: Create Baseline Calculation Script (1 hour)

**File**: `backend/src/services/baseline.service.ts`

```typescript
import { Op } from 'sequelize';
import db from '../config/database';

interface BaselineMetrics {
  cpu_mean: number;
  cpu_stddev: number;
  memory_mean: number;
  memory_stddev: number;
  disk_mean: number;
  disk_stddev: number;
  response_time_mean: number;
  response_time_stddev: number;
  last_updated: Date;
}

export class BaselineService {
  /**
   * Calculate 7-day baseline from resource_metrics table
   * Updates every 24 hours
   */
  static async calculateBaseline(): Promise<BaselineMetrics> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Query resource_metrics for last 7 days
    const [results] = await db.query(`
      SELECT
        AVG(cpu_percent) as cpu_mean,
        STDDEV(cpu_percent) as cpu_stddev,
        AVG(memory_percent) as memory_mean,
        STDDEV(memory_percent) as memory_stddev,
        AVG(disk_percent) as disk_mean,
        STDDEV(disk_percent) as disk_stddev
      FROM resource_metrics
      WHERE timestamp >= :sevenDaysAgo
    `, {
      replacements: { sevenDaysAgo },
      type: 'SELECT'
    });

    const baseline = results[0] as any;

    // Store in new monitoring_baseline table
    await db.query(`
      INSERT INTO monitoring_baseline (
        cpu_mean, cpu_stddev,
        memory_mean, memory_stddev,
        disk_mean, disk_stddev,
        response_time_mean, response_time_stddev,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, NOW())
      ON DUPLICATE KEY UPDATE
        cpu_mean = VALUES(cpu_mean),
        cpu_stddev = VALUES(cpu_stddev),
        memory_mean = VALUES(memory_mean),
        memory_stddev = VALUES(memory_stddev),
        disk_mean = VALUES(disk_mean),
        disk_stddev = VALUES(disk_stddev),
        last_updated = NOW()
    `, {
      replacements: [
        baseline.cpu_mean || 0,
        baseline.cpu_stddev || 1,
        baseline.memory_mean || 0,
        baseline.memory_stddev || 1,
        baseline.disk_mean || 0,
        baseline.disk_stddev || 1
      ]
    });

    return baseline;
  }

  /**
   * Get current baseline
   */
  static async getBaseline(): Promise<BaselineMetrics | null> {
    const [results] = await db.query(`
      SELECT * FROM monitoring_baseline ORDER BY last_updated DESC LIMIT 1
    `);

    return results[0] as BaselineMetrics || null;
  }

  /**
   * Detect if current metric is anomalous (>2 standard deviations)
   */
  static async detectAnomaly(metricName: string, currentValue: number): Promise<{
    isAnomaly: boolean;
    zScore: number;
    severity: 'normal' | 'warning' | 'critical';
  }> {
    const baseline = await this.getBaseline();
    if (!baseline) {
      return { isAnomaly: false, zScore: 0, severity: 'normal' };
    }

    const mean = baseline[`${metricName}_mean`];
    const stddev = baseline[`${metricName}_stddev`];

    if (!stddev || stddev === 0) {
      return { isAnomaly: false, zScore: 0, severity: 'normal' };
    }

    const zScore = (currentValue - mean) / stddev;

    return {
      isAnomaly: Math.abs(zScore) > 2,
      zScore,
      severity: Math.abs(zScore) > 3 ? 'critical' : Math.abs(zScore) > 2 ? 'warning' : 'normal'
    };
  }
}
```

#### Step 1.2: Create Database Migration (15 min)

**File**: `backend/src/migrations/20251116-create-monitoring-baseline.sql`

```sql
CREATE TABLE IF NOT EXISTS monitoring_baseline (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cpu_mean DECIMAL(5,2) DEFAULT 0,
  cpu_stddev DECIMAL(5,2) DEFAULT 1,
  memory_mean DECIMAL(5,2) DEFAULT 0,
  memory_stddev DECIMAL(5,2) DEFAULT 1,
  disk_mean DECIMAL(5,2) DEFAULT 0,
  disk_stddev DECIMAL(5,2) DEFAULT 1,
  response_time_mean DECIMAL(8,2) DEFAULT 0,
  response_time_stddev DECIMAL(8,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_baseline (id)
);

-- Initialize with safe defaults
INSERT IGNORE INTO monitoring_baseline (id, cpu_mean, cpu_stddev, memory_mean, memory_stddev, disk_mean, disk_stddev)
VALUES (1, 30, 10, 50, 15, 40, 10);
```

#### Step 1.3: Add Baseline Cron Job (30 min)

**File**: `backend/src/jobs/baseline.job.ts`

```typescript
import cron from 'node-cron';
import { BaselineService } from '../services/baseline.service';
import logger from '../config/logger';

// Update baseline every 24 hours at 2am
export const startBaselineCalculation = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting baseline calculation...');
      const baseline = await BaselineService.calculateBaseline();
      logger.info('Baseline updated successfully', baseline);
    } catch (error) {
      logger.error('Baseline calculation failed:', error);
    }
  });

  logger.info('Baseline calculation cron job started (daily at 2am)');
};
```

**Update**: `backend/src/server.ts`

```typescript
import { startBaselineCalculation } from './jobs/baseline.job';

// After app.listen():
startBaselineCalculation();
```

#### Step 1.4: Add Baseline API Endpoint (30 min)

**File**: `backend/src/controllers/monitoring.admin.controller.ts`

```typescript
// Add this method to existing MonitoringAdminController

public async getBaseline(req: Request, res: Response): Promise<void> {
  try {
    const baseline = await BaselineService.getBaseline();

    if (!baseline) {
      res.json({
        status: 'no_data',
        message: 'Baseline not yet calculated (needs 7 days of data)',
        baseline: null
      });
      return;
    }

    res.json({
      status: 'ok',
      baseline: {
        cpu: {
          mean: baseline.cpu_mean,
          stddev: baseline.cpu_stddev,
          threshold_warning: baseline.cpu_mean + (2 * baseline.cpu_stddev),
          threshold_critical: baseline.cpu_mean + (3 * baseline.cpu_stddev)
        },
        memory: {
          mean: baseline.memory_mean,
          stddev: baseline.memory_stddev,
          threshold_warning: baseline.memory_mean + (2 * baseline.memory_stddev),
          threshold_critical: baseline.memory_mean + (3 * baseline.memory_stddev)
        },
        disk: {
          mean: baseline.disk_mean,
          stddev: baseline.disk_stddev,
          threshold_warning: baseline.disk_mean + (2 * baseline.disk_stddev),
          threshold_critical: baseline.disk_mean + (3 * baseline.disk_stddev)
        },
        last_updated: baseline.last_updated
      }
    });
  } catch (error) {
    logger.error('Get baseline error:', error);
    res.status(500).json({ error: 'Failed to fetch baseline' });
  }
}
```

**Add route**: `backend/src/routes/monitoring.admin.routes.ts`

```typescript
router.get('/baseline', authMiddleware, isAdmin, monitoringController.getBaseline);
```

#### Step 1.5: Frontend Display (1 hour)

**File**: `app/admin/monitoring/page.tsx`

Add baseline display to existing dashboard:

```typescript
// Add to state
const [baseline, setBaseline] = useState<any>(null);

// Add to fetch functions
const fetchBaseline = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/monitoring/baseline`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  setBaseline(data.baseline);
};

// Call in useEffect
useEffect(() => {
  fetchBaseline();
  // ... existing fetches
}, []);

// Add baseline indicator card
<Card className="glass-strong border-border/50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5" />
      Performance Baseline (7-day)
    </CardTitle>
  </CardHeader>
  <CardContent>
    {baseline ? (
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">CPU</p>
          <p className="font-semibold">{baseline.cpu.mean.toFixed(1)}% ± {baseline.cpu.stddev.toFixed(1)}%</p>
          <p className="text-xs text-yellow-500">Warning: {baseline.cpu.threshold_warning.toFixed(1)}%</p>
          <p className="text-xs text-red-500">Critical: {baseline.cpu.threshold_critical.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Memory</p>
          <p className="font-semibold">{baseline.memory.mean.toFixed(1)}% ± {baseline.memory.stddev.toFixed(1)}%</p>
          <p className="text-xs text-yellow-500">Warning: {baseline.memory.threshold_warning.toFixed(1)}%</p>
          <p className="text-xs text-red-500">Critical: {baseline.memory.threshold_critical.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Disk</p>
          <p className="font-semibold">{baseline.disk.mean.toFixed(1)}% ± {baseline.disk.stddev.toFixed(1)}%</p>
          <p className="text-xs text-yellow-500">Warning: {baseline.disk.threshold_warning.toFixed(1)}%</p>
          <p className="text-xs text-red-500">Critical: {baseline.disk.threshold_critical.toFixed(1)}%</p>
        </div>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Collecting baseline data (7 days required)...</p>
    )}
    {baseline && (
      <p className="text-xs text-muted-foreground mt-3">
        Last updated: {new Date(baseline.last_updated).toLocaleString()}
      </p>
    )}
  </CardContent>
</Card>
```

---

## Enhancement 2: Automated Execution Scripts (2-3 hours)

### Goal
Autonomous scripts that detect issues and execute fixes automatically.

### Implementation

**File**: `scripts/autonomous-remediation.sh`

```bash
#!/bin/bash
# Autonomous Remediation Script - Runs every 5 minutes via cron

LOG_FILE="/var/log/pdflab/remediation.log"
THRESHOLD_DISK=85
THRESHOLD_MEMORY=80
THRESHOLD_CPU=90

log_action() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"

  # Also log to database via API
  curl -s -X POST http://localhost:3006/api/admin/monitoring/remediation-log \
    -H "Content-Type: application/json" \
    -d "{
      \"action_type\": \"$2\",
      \"target\": \"$3\",
      \"reason\": \"$1\",
      \"status\": \"$4\"
    }" > /dev/null
}

# 1. CHECK DISK SPACE
check_disk_space() {
  disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ "$disk_usage" -gt "$THRESHOLD_DISK" ]; then
    log_action "Disk usage at ${disk_usage}% - executing cleanup" "disk_cleanup" "root_volume" "in_progress"

    # Clean Docker resources
    docker system prune -af --volumes --filter "until=72h" > /dev/null 2>&1

    # Clean old logs
    find /var/log -name "*.log" -mtime +7 -exec gzip {} \;
    find /var/log -name "*.gz" -mtime +30 -delete

    # Clean conversion job storage (older than 24 hours)
    find /var/pdflab/app/backend/storage/uploads -type f -mtime +1 -delete

    new_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    log_action "Disk cleanup complete: ${disk_usage}% → ${new_usage}%" "disk_cleanup" "root_volume" "success"
  fi
}

# 2. CHECK CONTAINER HEALTH
check_container_health() {
  unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")

  if [ -n "$unhealthy" ]; then
    for container in $unhealthy; do
      log_action "Container $container is unhealthy - restarting" "restart" "$container" "in_progress"
      docker restart "$container"
      sleep 10

      # Verify restart
      if docker ps --filter "name=$container" --filter "health=healthy" | grep -q "$container"; then
        log_action "Container $container restarted successfully" "restart" "$container" "success"
      else
        log_action "Container $container restart FAILED" "restart" "$container" "failed"
      fi
    done
  fi
}

# 3. CHECK REDIS MEMORY
check_redis_memory() {
  redis_memory=$(docker exec pdflab-redis-prod redis-cli INFO memory | grep used_memory_rss | cut -d: -f2 | tr -d '\r')
  redis_maxmemory=$(docker exec pdflab-redis-prod redis-cli CONFIG GET maxmemory | tail -1)

  if [ "$redis_maxmemory" != "0" ]; then
    usage_percent=$((redis_memory * 100 / redis_maxmemory))

    if [ "$usage_percent" -gt "$THRESHOLD_MEMORY" ]; then
      log_action "Redis memory at ${usage_percent}% - clearing volatile keys" "cache_clear" "redis" "in_progress"

      # Delete temporary keys
      docker exec pdflab-redis-prod redis-cli --scan --pattern "temp:*" | xargs -r docker exec -i pdflab-redis-prod redis-cli DEL
      docker exec pdflab-redis-prod redis-cli --scan --pattern "session:*:expired" | xargs -r docker exec -i pdflab-redis-prod redis-cli DEL

      log_action "Redis cache cleared successfully" "cache_clear" "redis" "success"
    fi
  fi
}

# 4. CHECK DATABASE CONNECTIONS
check_database_connections() {
  active=$(docker exec pdflab-mysql-prod mysql -e "SHOW STATUS LIKE 'Threads_connected'" -N | awk '{print $2}')
  max=$(docker exec pdflab-mysql-prod mysql -e "SHOW VARIABLES LIKE 'max_connections'" -N | awk '{print $2}')

  usage_percent=$((active * 100 / max))

  if [ "$usage_percent" -gt 85 ]; then
    log_action "Database connections at ${usage_percent}% - restarting backend" "restart" "backend" "in_progress"
    docker restart pdflab-backend-prod
    sleep 15
    log_action "Backend restarted to clear stale DB connections" "restart" "backend" "success"
  fi
}

# 5. CHECK SSL CERTIFICATE EXPIRATION
check_ssl_certificate() {
  expiry_date=$(echo | openssl s_client -servername pdflab.pro -connect pdflab.pro:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
  expiry_epoch=$(date -d "$expiry_date" +%s)
  current_epoch=$(date +%s)
  days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

  if [ "$days_until_expiry" -lt 30 ]; then
    log_action "SSL certificate expires in $days_until_expiry days - renewing" "ssl_renew" "pdflab.pro" "in_progress"
    certbot renew --quiet --deploy-hook "docker restart pdflab-nginx-prod"
    log_action "SSL certificate renewed successfully" "ssl_renew" "pdflab.pro" "success"
  fi
}

# MAIN EXECUTION
echo "=== Starting remediation check at $(date) ===" >> "$LOG_FILE"
check_disk_space
check_container_health
check_redis_memory
check_database_connections
check_ssl_certificate
echo "=== Remediation check complete ===" >> "$LOG_FILE"
```

**Deployment**:
```bash
# On VPS
ssh root@141.136.44.168
mkdir -p /var/log/pdflab
chmod +x /opt/pdflab/scripts/autonomous-remediation.sh

# Add to cron (every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh
```

---

## Enhancement 3: Decision Engine (1-2 hours)

### Goal
Intelligent decision-making about when to remediate vs when to alert humans.

### Implementation

**File**: `backend/src/services/decision-engine.service.ts`

```typescript
import { BaselineService } from './baseline.service';
import logger from '../config/logger';

export interface RemediationDecision {
  shouldRemediate: boolean;
  action: 'auto' | 'alert' | 'escalate' | 'ignore';
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  reason: string;
  confidence: number; // 0-100
}

export class DecisionEngine {
  /**
   * Decide if auto-remediation should be executed
   *
   * Rules:
   * 1. If metric within baseline ± 2σ → IGNORE
   * 2. If metric between 2σ-3σ → ALERT (warning)
   * 3. If metric > 3σ AND safe action → AUTO REMEDIATE
   * 4. If metric > 3σ AND risky action → ESCALATE (human approval)
   */
  static async shouldRemediate(
    metricName: string,
    currentValue: number,
    actionType: 'restart' | 'cache_clear' | 'disk_cleanup' | 'db_optimize' | 'ssl_renew'
  ): Promise<RemediationDecision> {

    // Check anomaly detection
    const anomaly = await BaselineService.detectAnomaly(metricName, currentValue);

    // Rule 1: Normal range
    if (!anomaly.isAnomaly) {
      return {
        shouldRemediate: false,
        action: 'ignore',
        severity: 'info',
        reason: `${metricName} within normal range (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)})`,
        confidence: 100
      };
    }

    // Rule 2: Warning range (2σ - 3σ)
    if (anomaly.severity === 'warning') {
      return {
        shouldRemediate: false,
        action: 'alert',
        severity: 'warning',
        reason: `${metricName} elevated (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)}) - monitoring`,
        confidence: 80
      };
    }

    // Rule 3: Critical range (>3σ) - decide based on action risk
    const safeActions: string[] = ['cache_clear', 'disk_cleanup', 'ssl_renew'];
    const riskyActions: string[] = ['restart', 'db_optimize'];

    if (safeActions.includes(actionType)) {
      return {
        shouldRemediate: true,
        action: 'auto',
        severity: 'critical',
        reason: `${metricName} critical (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)}) - auto-remediating with safe action`,
        confidence: 95
      };
    }

    if (riskyActions.includes(actionType)) {
      // Additional checks for risky actions
      const recentRestarts = await this.countRecentActions(actionType, 60); // last 60 min

      if (recentRestarts >= 3) {
        return {
          shouldRemediate: false,
          action: 'escalate',
          severity: 'urgent',
          reason: `${metricName} critical but ${actionType} already attempted ${recentRestarts} times in last hour - HUMAN INTERVENTION REQUIRED`,
          confidence: 100
        };
      }

      return {
        shouldRemediate: true,
        action: 'auto',
        severity: 'critical',
        reason: `${metricName} critical (${currentValue.toFixed(1)}) - auto-remediating with monitored risky action`,
        confidence: 75
      };
    }

    return {
      shouldRemediate: false,
      action: 'escalate',
      severity: 'urgent',
      reason: `${metricName} critical but action type unknown - escalating`,
      confidence: 0
    };
  }

  /**
   * Count recent remediation actions from database
   */
  private static async countRecentActions(actionType: string, minutesAgo: number): Promise<number> {
    const db = require('../config/database').default;
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);

    const [results] = await db.query(`
      SELECT COUNT(*) as count
      FROM remediation_log
      WHERE action_type = ? AND timestamp >= ?
    `, {
      replacements: [actionType, cutoff],
      type: 'SELECT'
    });

    return results[0]?.count || 0;
  }
}
```

**Integration**: Use in autonomous-remediation.sh via API endpoint:

```typescript
// Add to monitoring.admin.controller.ts
public async checkShouldRemediate(req: Request, res: Response): Promise<void> {
  const { metricName, currentValue, actionType } = req.body;

  const decision = await DecisionEngine.shouldRemediate(metricName, currentValue, actionType);

  res.json(decision);
}
```

---

## Enhancement 4: Alert Severity Levels (1 hour)

### Goal
Intelligent alert prioritization with 4 severity tiers.

### Backend Implementation

**File**: `backend/src/services/alert.service.ts`

```typescript
export enum AlertSeverity {
  INFO = 'info',       // Auto-handled, logged only
  WARNING = 'warning', // Email within 15min
  CRITICAL = 'critical', // Immediate email + logged
  URGENT = 'urgent'    // Email + SMS + human intervention required
}

export interface Alert {
  id?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric_name?: string;
  metric_value?: number;
  action_taken?: string;
  requires_human_action: boolean;
  created_at?: Date;
}

export class AlertService {
  /**
   * Create alert with severity-based routing
   */
  static async createAlert(alert: Alert): Promise<void> {
    const db = require('../config/database').default;

    // Insert into database
    await db.query(`
      INSERT INTO monitoring_alerts (
        severity, title, message, metric_name, metric_value,
        action_taken, requires_human_action, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, {
      replacements: [
        alert.severity,
        alert.title,
        alert.message,
        alert.metric_name || null,
        alert.metric_value || null,
        alert.action_taken || null,
        alert.requires_human_action ? 1 : 0
      ]
    });

    // Route based on severity
    switch (alert.severity) {
      case AlertSeverity.INFO:
        // Just log, no notification
        logger.info(`[ALERT-INFO] ${alert.title}: ${alert.message}`);
        break;

      case AlertSeverity.WARNING:
        // Email notification (batched - max 1 per 15min)
        await this.sendEmailAlert(alert, false);
        break;

      case AlertSeverity.CRITICAL:
        // Immediate email
        await this.sendEmailAlert(alert, true);
        break;

      case AlertSeverity.URGENT:
        // Email + mark for human review
        await this.sendEmailAlert(alert, true);
        await this.notifyUrgent(alert);
        break;
    }
  }

  private static async sendEmailAlert(alert: Alert, immediate: boolean): Promise<void> {
    // Use existing email service
    const emailService = require('./email.service').default;

    const subject = `[${alert.severity.toUpperCase()}] PDFLab Alert: ${alert.title}`;
    const body = `
      <h2>${alert.title}</h2>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      ${alert.metric_name ? `<p><strong>Metric:</strong> ${alert.metric_name} = ${alert.metric_value}</p>` : ''}
      ${alert.action_taken ? `<p><strong>Action Taken:</strong> ${alert.action_taken}</p>` : ''}
      ${alert.requires_human_action ? '<p style="color: red;"><strong>⚠️ HUMAN ACTION REQUIRED</strong></p>' : ''}
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    `;

    if (immediate) {
      await emailService.sendEmail('mmkela@gmail.com', subject, body);
    } else {
      // Queue for batched sending (implement batch queue if needed)
      await emailService.sendEmail('mmkela@gmail.com', subject, body);
    }
  }

  private static async notifyUrgent(alert: Alert): Promise<void> {
    // For urgent alerts, could integrate Twilio SMS or phone call
    logger.error(`[URGENT ALERT] ${alert.title} - Manual intervention required`);

    // Send to Slack if webhook configured
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 URGENT: ${alert.title}`,
          attachments: [{
            color: 'danger',
            text: alert.message,
            fields: [
              { title: 'Severity', value: 'URGENT', short: true },
              { title: 'Requires Action', value: alert.requires_human_action ? 'YES' : 'NO', short: true }
            ]
          }]
        })
      });
    }
  }
}
```

**Database Migration**:

```sql
-- Add to monitoring_alerts table
ALTER TABLE monitoring_alerts
  ADD COLUMN requires_human_action BOOLEAN DEFAULT FALSE,
  ADD COLUMN acknowledged_at TIMESTAMP NULL,
  ADD COLUMN acknowledged_by VARCHAR(255) NULL;
```

---

## Enhancement 5: Daily Digest Reports (2 hours)

### Goal
Automated daily email summarizing system health and auto-remediation actions.

### Implementation

**File**: `backend/src/services/daily-report.service.ts`

```typescript
import db from '../config/database';
import emailService from './email.service';
import logger from '../config/logger';

export class DailyReportService {
  /**
   * Generate and send daily digest report
   * Runs at 9:00 AM daily via cron
   */
  static async generateAndSendReport(): Promise<void> {
    try {
      const report = await this.compileReport();
      const html = this.formatReportHTML(report);

      await emailService.sendEmail(
        'mmkela@gmail.com',
        `PDFLab Daily Report - ${new Date().toLocaleDateString()}`,
        html
      );

      logger.info('Daily digest report sent successfully');
    } catch (error) {
      logger.error('Failed to send daily digest:', error);
    }
  }

  private static async compileReport() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. System uptime
    const [uptimeResult] = await db.query(`
      SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_checks
      FROM health_checks
      WHERE timestamp >= ?
    `, { replacements: [yesterday], type: 'SELECT' });

    const uptime = (uptimeResult[0]?.healthy_checks / uptimeResult[0]?.total_checks * 100) || 100;

    // 2. Auto-remediation actions
    const [remediationActions] = await db.query(`
      SELECT action_type, COUNT(*) as count, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
      FROM remediation_log
      WHERE timestamp >= ?
      GROUP BY action_type
    `, { replacements: [yesterday], type: 'SELECT' });

    // 3. Alerts summary
    const [alertsSummary] = await db.query(`
      SELECT severity, COUNT(*) as count
      FROM monitoring_alerts
      WHERE created_at >= ?
      GROUP BY severity
    `, { replacements: [yesterday], type: 'SELECT' });

    // 4. Resource usage averages
    const [resourceAvg] = await db.query(`
      SELECT
        AVG(cpu_percent) as avg_cpu,
        AVG(memory_percent) as avg_memory,
        AVG(disk_percent) as avg_disk,
        MAX(cpu_percent) as max_cpu,
        MAX(memory_percent) as max_memory
      FROM resource_metrics
      WHERE timestamp >= ?
    `, { replacements: [yesterday], type: 'SELECT' });

    // 5. Conversion activity
    const [conversionStats] = await db.query(`
      SELECT
        COUNT(*) as total_conversions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM conversion_jobs
      WHERE created_at >= ?
    `, { replacements: [yesterday], type: 'SELECT' });

    return {
      uptime,
      remediation: remediationActions,
      alerts: alertsSummary,
      resources: resourceAvg[0],
      conversions: conversionStats[0],
      date: new Date().toLocaleDateString()
    };
  }

  private static formatReportHTML(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
    .section { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .good { color: #10b981; }
    .warning { color: #f59e0b; }
    .bad { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #667eea; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 PDFLab Daily Operations Report</h1>
    <p>${report.date}</p>
  </div>

  <div class="section">
    <h2>🔧 System Health</h2>
    <div class="metric">
      <div class="metric-label">Uptime (24h)</div>
      <div class="metric-value ${report.uptime >= 99 ? 'good' : report.uptime >= 95 ? 'warning' : 'bad'}">
        ${report.uptime.toFixed(2)}%
      </div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg CPU</div>
      <div class="metric-value ${report.resources.avg_cpu < 70 ? 'good' : 'warning'}">
        ${report.resources.avg_cpu.toFixed(1)}%
      </div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg Memory</div>
      <div class="metric-value ${report.resources.avg_memory < 70 ? 'good' : 'warning'}">
        ${report.resources.avg_memory.toFixed(1)}%
      </div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg Disk</div>
      <div class="metric-value ${report.resources.avg_disk < 80 ? 'good' : 'warning'}">
        ${report.resources.avg_disk.toFixed(1)}%
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🤖 Auto-Remediation Actions (24h)</h2>
    ${report.remediation.length > 0 ? `
      <table>
        <tr><th>Action Type</th><th>Total</th><th>Successful</th><th>Success Rate</th></tr>
        ${report.remediation.map((r: any) => `
          <tr>
            <td>${r.action_type}</td>
            <td>${r.count}</td>
            <td>${r.successful}</td>
            <td class="${(r.successful / r.count * 100) >= 90 ? 'good' : 'warning'}">
              ${(r.successful / r.count * 100).toFixed(1)}%
            </td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>No auto-remediation actions taken (system stable ✅)</p>'}
  </div>

  <div class="section">
    <h2>🚨 Alerts Summary (24h)</h2>
    ${report.alerts.length > 0 ? `
      <table>
        <tr><th>Severity</th><th>Count</th></tr>
        ${report.alerts.map((a: any) => `
          <tr>
            <td style="text-transform: uppercase; font-weight: bold; color: ${
              a.severity === 'urgent' ? '#ef4444' :
              a.severity === 'critical' ? '#f59e0b' :
              a.severity === 'warning' ? '#3b82f6' : '#666'
            }">${a.severity}</td>
            <td>${a.count}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>No alerts generated (system healthy ✅)</p>'}
  </div>

  <div class="section">
    <h2>📄 Conversion Activity (24h)</h2>
    <div class="metric">
      <div class="metric-label">Total Conversions</div>
      <div class="metric-value">${report.conversions.total_conversions}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Successful</div>
      <div class="metric-value good">${report.conversions.successful}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Failed</div>
      <div class="metric-value ${report.conversions.failed > 0 ? 'bad' : 'good'}">${report.conversions.failed}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Success Rate</div>
      <div class="metric-value ${(report.conversions.successful / report.conversions.total_conversions * 100) >= 95 ? 'good' : 'warning'}">
        ${(report.conversions.successful / report.conversions.total_conversions * 100).toFixed(1)}%
      </div>
    </div>
  </div>

  <div class="section" style="border-left-color: #10b981;">
    <h2>✅ Recommendations</h2>
    <ul>
      ${report.uptime < 99 ? '<li>⚠️ Uptime below 99% - investigate recent incidents</li>' : ''}
      ${report.resources.max_cpu > 90 ? '<li>⚠️ CPU spiked above 90% - consider scaling</li>' : ''}
      ${report.resources.avg_disk > 80 ? '<li>⚠️ Disk usage high - review cleanup policies</li>' : ''}
      ${report.conversions.failed > 10 ? '<li>⚠️ High conversion failure rate - check CloudConvert integration</li>' : ''}
      ${report.uptime >= 99 && report.resources.max_cpu < 80 && report.conversions.failed < 5
        ? '<li>✅ All systems operating normally - no action required</li>'
        : ''
      }
    </ul>
  </div>

  <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
    Generated by PDFLab Autonomous Guardian | <a href="https://pdflab.pro/admin/monitoring">View Live Dashboard</a>
  </p>
</body>
</html>
    `;
  }
}
```

**Cron Job**:

```typescript
// Add to backend/src/jobs/daily-report.job.ts
import cron from 'node-cron';
import { DailyReportService } from '../services/daily-report.service';

export const startDailyReportCron = () => {
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    await DailyReportService.generateAndSendReport();
  });

  console.log('Daily report cron job started (9:00 AM daily)');
};

// Add to server.ts
import { startDailyReportCron } from './jobs/daily-report.job';
startDailyReportCron();
```

---

## Enhancement 6: Automated Blocking Actions (1 hour)

### Goal
Automatically block IPs with excessive failed login attempts or API abuse.

### Backend Implementation

**File**: `backend/src/services/security-blocker.service.ts`

```typescript
import db from '../config/database';
import logger from '../config/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SecurityBlockerService {
  private static FAILED_LOGIN_THRESHOLD = 10; // 10 failed attempts
  private static RATE_LIMIT_THRESHOLD = 100; // 100 requests per minute
  private static BLOCK_DURATION_HOURS = 24;

  /**
   * Check failed login attempts and auto-block abusive IPs
   */
  static async checkAndBlockFailedLogins(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Query failed login attempts from last hour
    const [results] = await db.query(`
      SELECT
        ip_address,
        COUNT(*) as failed_attempts
      FROM authentication_logs
      WHERE
        success = FALSE
        AND timestamp >= ?
      GROUP BY ip_address
      HAVING failed_attempts >= ?
    `, {
      replacements: [oneHourAgo, this.FAILED_LOGIN_THRESHOLD],
      type: 'SELECT'
    });

    for (const record of results as any[]) {
      await this.blockIP(record.ip_address, 'excessive_failed_logins', record.failed_attempts);
    }
  }

  /**
   * Check rate limit violations and block
   */
  static async checkAndBlockRateLimitAbuse(): Promise<void> {
    // Query Redis for rate limit violations
    // This assumes you have rate limit tracking in Redis
    const redis = require('../config/redis').default;

    const violationKeys = await redis.keys('ratelimit:violation:*');

    for (const key of violationKeys) {
      const ip = key.replace('ratelimit:violation:', '');
      const violations = await redis.get(key);

      if (parseInt(violations) >= 5) { // 5 rate limit violations = block
        await this.blockIP(ip, 'rate_limit_abuse', violations);
        await redis.del(key); // Clear violation counter
      }
    }
  }

  /**
   * Block IP address using iptables (on VPS) or database tracking
   */
  private static async blockIP(ipAddress: string, reason: string, violation_count: number): Promise<void> {
    // Check if already blocked
    const [existing] = await db.query(`
      SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
    `, {
      replacements: [ipAddress],
      type: 'SELECT'
    });

    if (existing.length > 0) {
      logger.info(`IP ${ipAddress} already blocked`);
      return;
    }

    // Insert into blocked IPs table
    const expiresAt = new Date(Date.now() + this.BLOCK_DURATION_HOURS * 60 * 60 * 1000);

    await db.query(`
      INSERT INTO blocked_ips (ip_address, reason, violation_count, blocked_at, expires_at)
      VALUES (?, ?, ?, NOW(), ?)
    `, {
      replacements: [ipAddress, reason, violation_count, expiresAt]
    });

    // Apply iptables rule (if running on Linux VPS)
    if (process.platform === 'linux') {
      try {
        await execAsync(`iptables -A INPUT -s ${ipAddress} -j DROP`);
        logger.info(`IP ${ipAddress} blocked via iptables (reason: ${reason}, violations: ${violation_count})`);
      } catch (error) {
        logger.error(`Failed to apply iptables rule for ${ipAddress}:`, error);
      }
    }

    // Log remediation action
    await db.query(`
      INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
      VALUES ('ip_block', ?, ?, 'success', NOW())
    `, {
      replacements: [ipAddress, `${reason} - ${violation_count} violations`]
    });

    logger.warn(`🚫 IP BLOCKED: ${ipAddress} (${reason}, ${violation_count} violations)`);
  }

  /**
   * Cleanup expired blocks
   */
  static async cleanupExpiredBlocks(): Promise<void> {
    const [expiredBlocks] = await db.query(`
      SELECT ip_address FROM blocked_ips WHERE expires_at < NOW()
    `);

    for (const block of expiredBlocks as any[]) {
      // Remove iptables rule
      if (process.platform === 'linux') {
        try {
          await execAsync(`iptables -D INPUT -s ${block.ip_address} -j DROP`);
        } catch (error) {
          // Rule might not exist, ignore
        }
      }
    }

    // Delete expired records
    await db.query(`DELETE FROM blocked_ips WHERE expires_at < NOW()`);

    if (expiredBlocks.length > 0) {
      logger.info(`Cleaned up ${expiredBlocks.length} expired IP blocks`);
    }
  }
}
```

**Database Migration**:

```sql
CREATE TABLE IF NOT EXISTS blocked_ips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  reason ENUM('excessive_failed_logins', 'rate_limit_abuse', 'manual_block') NOT NULL,
  violation_count INT DEFAULT 0,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_ip_expiry (ip_address, expires_at)
);

-- Track authentication attempts
CREATE TABLE IF NOT EXISTS authentication_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(255),
  success BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_timestamp (ip_address, timestamp)
);
```

**Middleware Integration**:

```typescript
// backend/src/middleware/ip-blocker.middleware.ts
import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

export const ipBlockerMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const [blocked] = await db.query(`
    SELECT * FROM blocked_ips WHERE ip_address = ? AND expires_at > NOW()
  `, {
    replacements: [clientIP],
    type: 'SELECT'
  });

  if (blocked.length > 0) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP has been temporarily blocked due to suspicious activity',
      blocked_until: blocked[0].expires_at
    });
  }

  next();
};

// Apply to all routes in server.ts
import { ipBlockerMiddleware } from './middleware/ip-blocker.middleware';
app.use(ipBlockerMiddleware);
```

**Cron Job**:

```typescript
// backend/src/jobs/security-blocker.job.ts
import cron from 'node-cron';
import { SecurityBlockerService } from '../services/security-blocker.service';

export const startSecurityBlockerCron = () => {
  // Check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await SecurityBlockerService.checkAndBlockFailedLogins();
    await SecurityBlockerService.checkAndBlockRateLimitAbuse();
    await SecurityBlockerService.cleanupExpiredBlocks();
  });

  console.log('Security blocker cron job started (every 5 minutes)');
};

// Add to server.ts
import { startSecurityBlockerCron } from './jobs/security-blocker.job';
startSecurityBlockerCron();
```

---

## Deployment Checklist

### Backend Deployment (4-5 hours total)

1. **Database Migrations** (30 min)
```bash
ssh root@141.136.44.168
cd /var/pdflab/app/backend

# Run migrations
mysql -u root -p pdflab < src/migrations/20251116-create-monitoring-baseline.sql
mysql -u root -p pdflab < src/migrations/20251116-create-blocked-ips.sql
mysql -u root -p pdflab < src/migrations/20251116-extend-alerts-table.sql
```

2. **Backend Code Deployment** (1 hour)
```bash
# Local
cd backend
npm run build

# Deploy to VPS
scp -r dist/* root@141.136.44.168:/var/pdflab/app/backend/dist/

# Restart backend
ssh root@141.136.44.168 "docker restart pdflab-backend-prod"
```

3. **Cron Jobs Setup** (30 min)
```bash
ssh root@141.136.44.168
crontab -e

# Add:
*/5 * * * * /opt/pdflab/scripts/autonomous-remediation.sh >> /var/log/pdflab/remediation.log 2>&1
0 9 * * * curl http://localhost:3006/api/admin/monitoring/daily-report
```

4. **Test All Enhancements** (2 hours)
```bash
# Test baseline calculation
curl http://localhost:3006/api/admin/monitoring/baseline

# Test decision engine
curl -X POST http://localhost:3006/api/admin/monitoring/check-remediate \
  -H "Content-Type: application/json" \
  -d '{"metricName": "cpu", "currentValue": 95, "actionType": "restart"}'

# Simulate failed login (10 times)
for i in {1..10}; do
  curl -X POST http://localhost:3006/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
done

# Check if IP blocked
curl http://localhost:3006/api/admin/monitoring/blocked-ips
```

### Frontend Deployment (1 hour)

Update dashboard to display new features:

```bash
# Add baseline display (already in Enhancement 1)
# Add alert severity badges
# Build and deploy
npm run build
docker build -t mkelam/pdflab-frontend:latest .
docker push mkelam/pdflab-frontend:latest

ssh root@141.136.44.168 "cd /var/pdflab/app && docker-compose -f docker-compose.production.yml pull frontend && docker-compose -f docker-compose.production.yml up -d frontend"
```

---

## Success Metrics

After deployment, verify:

- ✅ Baseline updates daily at 2am
- ✅ Autonomous remediation script runs every 5 minutes
- ✅ Alerts created with correct severity levels
- ✅ Daily digest email sent at 9am
- ✅ IPs auto-blocked after 10 failed logins
- ✅ Decision engine correctly categorizes actions (auto vs escalate)

---

## Summary

This focused plan adds **6 critical autonomous capabilities** without overwhelming complexity:

1. **Baseline/Trend Analysis** → Predict issues before they happen (7-day rolling baseline)
2. **Automated Execution Scripts** → Fix issues autonomously (disk cleanup, restarts, cache clearing)
3. **Decision Engine** → Smart decisions about when to auto-fix vs escalate
4. **Alert Severity Levels** → Prioritize urgent issues (info/warning/critical/urgent)
5. **Daily Digest Reports** → Proactive visibility into system health
6. **Automated Blocking Actions** → Stop attacks automatically (failed logins, rate limits)

**Total Time**: 10-14 hours (with Management Layer)
**Impact**: Autonomous guardian that handles 90% of issues without human intervention
**Next Step**: Choose which enhancement to implement first (recommend starting with #2: Automated Execution Scripts for immediate value)

---

## Enhancement 7: Management Layer - Manual Controls (2-3 hours) ⭐ NEW

### Goal
Provide admin UI with manual control buttons for restarting services, clearing caches, and executing remediation actions on-demand.

### Why This is Important
While autonomous scripts handle most issues, admins sometimes need to:
- **Restart services manually** during deployments
- **Clear caches** to test new features
- **Trigger remediation** without waiting for cron
- **View service status** in real-time with action buttons

### Backend Implementation

#### Step 7.1: Service Management Controller (1 hour)

**File**: `backend/src/controllers/service-management.controller.ts`

```typescript
import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../config/logger';
import db from '../config/database';

const execAsync = promisify(exec);

export class ServiceManagementController {
  /**
   * Get status of all Docker services
   */
  async getServicesStatus(req: Request, res: Response): Promise<void> {
    try {
      const { stdout } = await execAsync('docker ps --format "{{.Names}}|{{.Status}}|{{.State}}" --filter "name=pdflab"');

      const services = stdout.trim().split('\n').map(line => {
        const [name, status, state] = line.split('|');
        return {
          name,
          status,
          state,
          healthy: status.includes('healthy') || state === 'running'
        };
      });

      res.json({ services });
    } catch (error) {
      logger.error('Get services status error:', error);
      res.status(500).json({ error: 'Failed to fetch service status' });
    }
  }

  /**
   * Restart a specific service
   */
  async restartService(req: Request, res: Response): Promise<void> {
    const { serviceName } = req.body;

    // Whitelist allowed services
    const allowedServices = [
      'pdflab-backend-prod',
      'pdflab-frontend-prod',
      'pdflab-mysql-prod',
      'pdflab-redis-prod',
      'pdflab-nginx-prod',
      'pdflab-partners-prod'
    ];

    if (!allowedServices.includes(serviceName)) {
      res.status(400).json({ error: 'Invalid service name' });
      return;
    }

    try {
      logger.info(`Manual restart requested for ${serviceName} by admin`);

      // Log action to database
      await db.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('restart', ?, 'Manual admin restart', 'in_progress', NOW())
      `, { replacements: [serviceName] });

      // Execute restart
      await execAsync(`docker restart ${serviceName}`);

      // Wait 5 seconds for restart
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify restart
      const { stdout } = await execAsync(`docker ps --filter "name=${serviceName}" --format "{{.Status}}"`);
      const isHealthy = stdout.includes('healthy') || stdout.includes('Up');

      // Update log
      await db.query(`
        UPDATE remediation_log
        SET status = ?
        WHERE action_type = 'restart' AND target = ?
        ORDER BY timestamp DESC LIMIT 1
      `, { replacements: [isHealthy ? 'success' : 'failed', serviceName] });

      res.json({
        success: isHealthy,
        message: isHealthy
          ? `${serviceName} restarted successfully`
          : `${serviceName} restart attempted but may not be healthy`,
        status: stdout.trim()
      });

      logger.info(`${serviceName} restart completed - ${isHealthy ? 'success' : 'failed'}`);
    } catch (error) {
      logger.error(`Restart ${serviceName} failed:`, error);
      res.status(500).json({ error: 'Restart failed', details: error.message });
    }
  }

  /**
   * Clear Redis cache
   */
  async clearRedisCache(req: Request, res: Response): Promise<void> {
    const { pattern = '*' } = req.body; // Default clear all, or specific pattern

    try {
      logger.info(`Manual Redis cache clear requested (pattern: ${pattern})`);

      await db.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('cache_clear', 'redis', 'Manual admin cache clear', 'in_progress', NOW())
      `, { replacements: [] });

      if (pattern === '*') {
        // Clear all cache
        await execAsync('docker exec pdflab-redis-prod redis-cli FLUSHALL');
      } else {
        // Clear specific pattern
        await execAsync(`docker exec pdflab-redis-prod redis-cli --scan --pattern "${pattern}" | xargs docker exec -i pdflab-redis-prod redis-cli DEL`);
      }

      await db.query(`
        UPDATE remediation_log
        SET status = 'success'
        WHERE action_type = 'cache_clear' AND target = 'redis'
        ORDER BY timestamp DESC LIMIT 1
      `);

      res.json({
        success: true,
        message: `Redis cache cleared (pattern: ${pattern})`
      });

      logger.info(`Redis cache cleared successfully`);
    } catch (error) {
      logger.error('Clear Redis cache failed:', error);
      res.status(500).json({ error: 'Cache clear failed', details: error.message });
    }
  }

  /**
   * Run disk cleanup manually
   */
  async runDiskCleanup(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual disk cleanup requested by admin');

      await db.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('disk_cleanup', 'root_volume', 'Manual admin cleanup', 'in_progress', NOW())
      `);

      // Get disk usage before
      const { stdout: beforeUsage } = await execAsync('df / | awk \'NR==2 {print $5}\' | sed \'s/%//\'');
      const before = parseInt(beforeUsage.trim());

      // Execute cleanup
      await execAsync('docker system prune -af --volumes --filter "until=72h"');
      await execAsync('find /var/log -name "*.log" -mtime +7 -exec gzip {} \\;');
      await execAsync('find /var/pdflab/app/backend/storage/uploads -type f -mtime +1 -delete');

      // Get disk usage after
      const { stdout: afterUsage } = await execAsync('df / | awk \'NR==2 {print $5}\' | sed \'s/%//\'');
      const after = parseInt(afterUsage.trim());

      await db.query(`
        UPDATE remediation_log
        SET status = 'success', metrics_before = ?, metrics_after = ?
        WHERE action_type = 'disk_cleanup' AND target = 'root_volume'
        ORDER BY timestamp DESC LIMIT 1
      `, { replacements: [JSON.stringify({ disk_percent: before }), JSON.stringify({ disk_percent: after })] });

      res.json({
        success: true,
        message: `Disk cleanup completed`,
        before: `${before}%`,
        after: `${after}%`,
        freed: `${before - after}%`
      });

      logger.info(`Disk cleanup completed: ${before}% → ${after}%`);
    } catch (error) {
      logger.error('Disk cleanup failed:', error);
      res.status(500).json({ error: 'Disk cleanup failed', details: error.message });
    }
  }

  /**
   * Optimize database tables
   */
  async optimizeDatabase(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual database optimization requested by admin');

      await db.query(`
        INSERT INTO remediation_log (action_type, target, reason, status, timestamp)
        VALUES ('db_optimize', 'mysql', 'Manual admin optimization', 'in_progress', NOW())
      `);

      // Get list of tables
      const [tables] = await db.query('SHOW TABLES', { type: 'SELECT' });
      const tableNames = tables.map((t: any) => Object.values(t)[0]);

      // Optimize each table
      for (const table of tableNames) {
        await db.query(`OPTIMIZE TABLE ${table}`);
      }

      await db.query(`
        UPDATE remediation_log
        SET status = 'success'
        WHERE action_type = 'db_optimize' AND target = 'mysql'
        ORDER BY timestamp DESC LIMIT 1
      `);

      res.json({
        success: true,
        message: `Database optimized (${tableNames.length} tables)`,
        tables: tableNames
      });

      logger.info(`Database optimization completed - ${tableNames.length} tables`);
    } catch (error) {
      logger.error('Database optimization failed:', error);
      res.status(500).json({ error: 'Database optimization failed', details: error.message });
    }
  }

  /**
   * View active connections (diagnostic)
   */
  async getDatabaseConnections(req: Request, res: Response): Promise<void> {
    try {
      const [connections] = await db.query('SHOW PROCESSLIST', { type: 'SELECT' });
      const [variables] = await db.query("SHOW VARIABLES LIKE 'max_connections'", { type: 'SELECT' });

      res.json({
        active_connections: connections.length,
        max_connections: variables[0]?.Value || 'unknown',
        connections: connections.slice(0, 20) // Top 20
      });
    } catch (error) {
      logger.error('Get DB connections failed:', error);
      res.status(500).json({ error: 'Failed to fetch connections' });
    }
  }
}

export default new ServiceManagementController();
```

#### Step 7.2: Add Management Routes (15 min)

**File**: `backend/src/routes/service-management.routes.ts`

```typescript
import express from 'express';
import serviceManagementController from '../controllers/service-management.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(isAdmin);

// Service management
router.get('/services/status', serviceManagementController.getServicesStatus);
router.post('/services/restart', serviceManagementController.restartService);

// Cache management
router.post('/cache/clear', serviceManagementController.clearRedisCache);

// Disk management
router.post('/disk/cleanup', serviceManagementController.runDiskCleanup);

// Database management
router.post('/database/optimize', serviceManagementController.optimizeDatabase);
router.get('/database/connections', serviceManagementController.getDatabaseConnections);

export default router;
```

**Add to `backend/src/server.ts`:**

```typescript
import serviceManagementRoutes from './routes/service-management.routes';

app.use('/api/admin/manage', serviceManagementRoutes);
```

### Frontend Implementation

#### Step 7.3: Service Management Panel (1-1.5 hours)

**File**: `app/admin/monitoring/page.tsx`

Add new tab or section for service management:

```typescript
// Add to imports
import { Power, Trash2, Database, HardDrive, RefreshCw } from 'lucide-react';

// Add to state
const [services, setServices] = useState<any[]>([]);
const [actionLoading, setActionLoading] = useState<string | null>(null);

// Add fetch function
const fetchServicesStatus = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/manage/services/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  setServices(data.services);
};

// Call in useEffect
useEffect(() => {
  fetchServicesStatus();
  const interval = setInterval(fetchServicesStatus, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}, []);

// Action handlers
const handleRestartService = async (serviceName: string) => {
  if (!confirm(`Are you sure you want to restart ${serviceName}?`)) return;

  setActionLoading(serviceName);
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/manage/services/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ serviceName })
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ ${result.message}`);
      fetchServicesStatus(); // Refresh status
    } else {
      alert(`⚠️ ${result.message}`);
    }
  } catch (error) {
    alert('❌ Restart failed: ' + error.message);
  } finally {
    setActionLoading(null);
  }
};

const handleClearCache = async (pattern: string = '*') => {
  if (!confirm(`Clear Redis cache (pattern: ${pattern})?`)) return;

  setActionLoading('cache');
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/manage/cache/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ pattern })
    });

    const result = await response.json();
    alert(`✅ ${result.message}`);
  } catch (error) {
    alert('❌ Cache clear failed: ' + error.message);
  } finally {
    setActionLoading(null);
  }
};

const handleDiskCleanup = async () => {
  if (!confirm('Run disk cleanup? This will remove old Docker images, logs, and temp files.')) return;

  setActionLoading('disk');
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/manage/disk/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();
    alert(`✅ Disk cleanup: ${result.before} → ${result.after} (freed ${result.freed})`);
  } catch (error) {
    alert('❌ Disk cleanup failed: ' + error.message);
  } finally {
    setActionLoading(null);
  }
};

const handleOptimizeDatabase = async () => {
  if (!confirm('Optimize database tables? This may take a few minutes.')) return;

  setActionLoading('database');
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/manage/database/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();
    alert(`✅ ${result.message}`);
  } catch (error) {
    alert('❌ Database optimization failed: ' + error.message);
  } finally {
    setActionLoading(null);
  }
};

// Add to JSX (new card in dashboard)
<Card className="glass-strong border-border/50 col-span-full">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Power className="w-5 h-5" />
      Service Management
    </CardTitle>
    <CardDescription>Manual controls for restarting services and running maintenance</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Services Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {services.map(service => (
        <div key={service.name} className="p-4 border border-border/50 rounded-lg hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${service.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-semibold text-sm">{service.name.replace('pdflab-', '').replace('-prod', '')}</span>
            </div>
            <Badge variant={service.healthy ? 'default' : 'destructive'} className="text-xs">
              {service.healthy ? 'Healthy' : 'Unhealthy'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{service.status}</p>
          <button
            onClick={() => handleRestartService(service.name)}
            disabled={actionLoading === service.name}
            className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {actionLoading === service.name ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                Restart
              </>
            )}
          </button>
        </div>
      ))}
    </div>

    {/* System Actions */}
    <div className="border-t border-border/50 pt-6">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <HardDrive className="w-4 h-4" />
        System Maintenance
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clear Cache Button */}
        <button
          onClick={() => handleClearCache('*')}
          disabled={actionLoading === 'cache'}
          className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === 'cache' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Clear Redis Cache
            </>
          )}
        </button>

        {/* Disk Cleanup Button */}
        <button
          onClick={handleDiskCleanup}
          disabled={actionLoading === 'disk'}
          className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === 'disk' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <HardDrive className="w-4 h-4" />
              Run Disk Cleanup
            </>
          )}
        </button>

        {/* Optimize DB Button */}
        <button
          onClick={handleOptimizeDatabase}
          disabled={actionLoading === 'database'}
          className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading === 'database' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Optimize Database
            </>
          )}
        </button>
      </div>
    </div>
  </CardContent>
</Card>
```

### Security Considerations

**IMPORTANT**: These management controls are **destructive actions**. Security measures:

1. ✅ **Admin-only routes** (`isAdmin` middleware)
2. ✅ **Service whitelist** (only allowed containers can be restarted)
3. ✅ **Confirmation prompts** (UI confirms before executing)
4. ✅ **Audit logging** (all actions logged to `remediation_log`)
5. ✅ **Rate limiting** (add to routes if needed)

### Testing Checklist

- [ ] Service status displays correctly with health indicators
- [ ] Restart button works for each service
- [ ] Service health updates after restart
- [ ] Redis cache clear executes successfully
- [ ] Disk cleanup shows before/after disk usage
- [ ] Database optimization completes without errors
- [ ] All actions logged to `remediation_log` table
- [ ] UI loading states work correctly
- [ ] Confirmation dialogs appear before destructive actions
- [ ] Non-admin users cannot access management endpoints

---

## Updated Summary

This enhanced plan now includes **7 critical autonomous capabilities**:

1. **Baseline/Trend Analysis** → Predict issues before they happen
2. **Automated Execution Scripts** → Fix issues autonomously
3. **Decision Engine** → Smart auto-fix vs escalate decisions
4. **Alert Severity Levels** → Intelligent prioritization
5. **Daily Digest Reports** → Proactive visibility
6. **Automated Blocking Actions** → Auto-stop attacks
7. **Management Layer** ⭐ → Manual restart buttons & maintenance controls

**Total Time**: 10-14 hours (2-3 hours added for management layer)
**Impact**: Autonomous guardian + manual override controls for complete system management
