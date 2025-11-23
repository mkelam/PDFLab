# Phase 4: Advanced Monitoring - Implementation Guide

**Date**: November 23, 2025
**Status**: ✅ COMPLETE (Code Implementation)
**Deployment Status**: ⏭️ Pending

---

## Overview

Phase 4 implements comprehensive advanced monitoring with Prometheus metrics, Grafana dashboards, and custom alerting rules. This provides deep visibility into:

1. **Conversion Funnel Metrics** - Track user journey and identify bottlenecks
2. **Error Rate Monitoring** - Monitor errors by endpoint, type, and severity
3. **Queue Depth Monitoring** - Real-time queue health and performance
4. **SLO Tracking** - Service Level Objective compliance and error budgets

---

## 📊 Implemented Metrics Modules

### 1. Conversion Funnel Metrics
**File**: `backend/src/metrics/conversion-funnel.metrics.ts`

**Tracks**:
- Funnel stage progression (upload → validate → queue → process → complete → download)
- Drop-off rates at each stage
- Stage duration (how long users spend at each step)
- Active conversions in each stage
- Success vs. failure rates
- E2E conversion duration by file size
- File size distribution
- Format popularity (which conversions are most common)

**Key Functions**:
```typescript
import { trackFunnelStage, trackFunnelDropoff, track FunnelDuration } from './metrics'

// Track user reaching a funnel stage
trackFunnelStage(FunnelStage.FILE_VALIDATED, 'pdf_to_docx', user, guestSession)

// Track user dropping off
trackFunnelDropoff(FunnelStage.PROCESSING_STARTED, 'timeout', 'pdf_to_docx', user)

// Track stage duration
trackFunnelDuration(FunnelStage.PROCESSING_COMPLETED, 12.5, 'pdf_to_docx', user)
```

**Metrics Exported**:
- `pdflab_conversion_funnel_stage_total` - Conversions reaching each stage
- `pdflab_conversion_funnel_dropoff_total` - Drop-offs at each stage
- `pdflab_conversion_funnel_stage_duration_seconds` - Time in each stage
- `pdflab_conversion_funnel_active_count` - Active conversions per stage
- `pdflab_conversion_success_total` - Successful conversions
- `pdflab_conversion_failure_total` - Failed conversions
- `pdflab_conversion_e2e_duration_seconds` - End-to-end duration
- `pdflab_uploaded_file_size_bytes` - File size distribution
- `pdflab_conversion_format_total` - Format popularity

---

### 2. Error Rate Metrics
**File**: `backend/src/metrics/error-rate.metrics.ts`

**Tracks**:
- HTTP errors by endpoint, method, and status code
- 4xx (client errors) vs 5xx (server errors) breakdown
- Error response duration
- Current error rate (errors/sec)
- Error rate percentage
- Specific error types (auth, validation, rate limit, upload, conversion)
- Database errors
- External API errors
- Error patterns (repeated errors, bursts)

**Key Functions**:
```typescript
import { trackHttpError, trackAuthError, trackConversionError } from './metrics'

// Track general HTTP error
trackHttpError('POST', '/api/conversions/upload', 500, 'Internal server error', user)

// Track authentication error
trackAuthError('invalid_token', '/api/conversions/upload', user)

// Track conversion error
trackConversionError('pdf_to_docx', 'CloudConvert API timeout', 'processing')
```

**Metrics Exported**:
- `pdflab_http_errors_total` - HTTP errors by endpoint
- `pdflab_http_4xx_errors_total` - Client errors
- `pdflab_http_5xx_errors_total` - Server errors
- `pdflab_error_response_duration_seconds` - Error response times
- `pdflab_current_error_rate` - Current error rate
- `pdflab_error_rate_percentage` - Error rate %
- `pdflab_auth_errors_total` - Auth/authz errors
- `pdflab_validation_errors_total` - Validation errors
- `pdflab_rate_limit_errors_total` - Rate limit errors
- `pdflab_file_upload_errors_total` - Upload errors
- `pdflab_conversion_processing_errors_total` - Conversion errors
- `pdflab_database_errors_total` - Database errors
- `pdflab_external_api_errors_total` - External API errors
- `pdflab_repeated_errors_total` - Repeated error patterns
- `pdflab_error_bursts_total` - Error burst events

---

### 3. Queue Depth Monitoring
**File**: `backend/src/metrics/queue.metrics.ts`

**Tracks**:
- Queue depth (jobs waiting, active, delayed, failed)
- Queue worker count and status
- Oldest job age (how long oldest job has been waiting)
- Job processing duration
- Job wait time (time from submission to processing start)
- Job completion rate
- Job retry attempts
- Job failures
- Queue backup events
- Stalled jobs
- Queue throughput (jobs/sec)
- Queue capacity utilization
- Circuit breaker state

**Key Functions**:
```typescript
import { updateQueueDepth, trackJobDuration, trackJobCompletion } from './metrics'

// Update queue metrics (called periodically)
await updateQueueDepth('conversion', conversionQueue)

// Track job duration
trackJobDuration('conversion', 'pdf_conversion', 'pdf_to_docx', 8.2)

// Track job completion
trackJobCompletion('conversion', 'pdf_conversion', 'completed')
```

**Metrics Exported**:
- `pdflab_queue_depth` - Current queue depth by state
- `pdflab_queue_workers` - Worker count by status
- `pdflab_queue_oldest_job_age_seconds` - Oldest job age
- `pdflab_job_processing_duration_seconds` - Processing time
- `pdflab_job_wait_time_seconds` - Wait time before processing
- `pdflab_job_completions_total` - Job completions
- `pdflab_job_retries_total` - Retry attempts
- `pdflab_job_failures_total` - Job failures
- `pdflab_queue_backups_total` - Queue backup events
- `pdflab_queue_stalled_jobs_total` - Stalled jobs
- `pdflab_queue_circuit_breaker_state` - Circuit breaker state
- `pdflab_queue_throughput_jobs_per_second` - Throughput
- `pdflab_queue_capacity_utilization_percentage` - Capacity %
- `pdflab_queue_jobs_by_priority` - Jobs by priority

**Automatic Monitoring**:
The `startQueueMonitoring()` function automatically monitors all queues every 10 seconds and checks health against configurable thresholds.

---

### 4. SLO Tracking
**File**: `backend/src/metrics/slo.metrics.ts`

**Tracks**:
- SLO compliance percentage
- Error budget remaining
- Error budget burn rate
- Service uptime (99.9% target)
- Response time percentiles (<200ms p95 target)
- Error rate (<0.1% target)
- Conversion time (<5s for 20-page PDF target)
- API endpoint availability (99.95% target)
- Database query time (<100ms p95 target)
- SLO violations

**SLO Targets**:
```typescript
export const SLO_TARGETS = {
  UPTIME_PERCENTAGE: 99.9,          // 43.2min downtime/month
  RESPONSE_TIME_P95_MS: 200,         // p95 < 200ms
  ERROR_RATE_PERCENTAGE: 0.1,        // < 0.1% errors
  CONVERSION_TIME_20_PAGE_SECONDS: 5, // < 5s for 20-page
  API_AVAILABILITY_PERCENTAGE: 99.95, // 99.95% available
  DB_QUERY_TIME_P95_MS: 100          // p95 < 100ms
}
```

**Key Functions**:
```typescript
import { updateSloCompliance, trackSloViolation, updateResponseTimePercentile } from './metrics'

// Update SLO compliance
updateSloCompliance('uptime', 99.95, '30d')

// Track SLO violation
trackSloViolation('response_time', 'high', 'p95_exceeded', 120)

// Update response time percentile
updateResponseTimePercentile('/api/conversions/upload', 'POST', 'p95', 185)
```

**Metrics Exported**:
- `pdflab_slo_compliance_percentage` - SLO compliance %
- `pdflab_slo_error_budget_percentage` - Error budget remaining
- `pdflab_slo_error_budget_burn_rate` - Burn rate
- `pdflab_service_uptime` - Service up/down status
- `pdflab_service_uptime_percentage` - Uptime %
- `pdflab_downtime_events_total` - Downtime events
- `pdflab_response_time_percentile_ms` - Response time percentiles
- `pdflab_response_time_slo_violations_total` - Response time violations
- `pdflab_current_error_rate_per_second` - Current error rate
- `pdflab_error_rate_slo_percentage` - Error rate %
- `pdflab_error_rate_slo_violations_total` - Error rate violations
- `pdflab_conversion_time_percentile_seconds` - Conversion time percentiles
- `pdflab_conversion_time_slo_violations_total` - Conversion time violations
- `pdflab_api_endpoint_availability_percentage` - API availability
- `pdflab_api_availability_slo_violations_total` - API violations
- `pdflab_db_query_time_percentile_ms` - DB query time percentiles
- `pdflab_db_query_slo_violations_total` - DB query violations
- `pdflab_slo_violations_total` - Total SLO violations
- `pdflab_slo_violation_duration_seconds` - Violation duration

---

## 📊 Grafana Dashboards

### 1. Conversion Funnel Dashboard
**File**: `grafana/dashboards/conversion-funnel.json`

**Panels**:
1. **Conversion Funnel - All Stages** (Line Graph) - Shows rate of conversions reaching each stage
2. **Funnel Drop-off Rate** (Line Graph with Alert) - Drop-off % at each stage (alerts >10%)
3. **Active Conversions by Stage** (Stat Panel) - Current active conversions
4. **Stage Duration (p95)** (Line Graph) - Time spent in each stage
5. **Success vs Failure Rate** (Line Graph) - Success/failure trends
6. **E2E Conversion Duration by File Size** (Heatmap) - Duration distribution
7. **Top Conversion Formats** (Pie Chart) - Most popular formats
8. **Conversion by User Type** (Stacked Graph) - Guest vs authenticated usage
9. **Failure Reasons** (Table) - Top failure reasons

**Import Instructions**:
1. Open Grafana: http://localhost:3000
2. Navigate to Dashboards → Import
3. Upload `grafana/dashboards/conversion-funnel.json`
4. Select Prometheus data source
5. Click Import

---

### 2. SLO Tracking Dashboard
**File**: `grafana/dashboards/slo-tracking.json`

**Panels**:
1. **SLO Compliance - All Services** (Stat Panel) - Current compliance for all SLOs
2. **Error Budget Remaining** (Gauge) - Error budget % remaining
3. **Error Budget Burn Rate** (Line Graph with Alert) - Burn rate (alerts >2x)
4. **Uptime SLO** (Line Graph) - 99.9% uptime tracking
5. **Response Time SLO** (Line Graph) - <200ms p95 tracking
6. **Error Rate SLO** (Line Graph) - <0.1% error rate tracking
7. **Conversion Time SLO** (Line Graph) - <5s for 20-page tracking
8. **SLO Violations** (Table) - Recent violations
9. **API Availability by Endpoint** (Stat Panel) - Endpoint availability
10. **Database Query Time SLO** (Line Graph) - <100ms p95 tracking

**Thresholds**:
- Green: SLO met
- Yellow: Within 0.5% of target
- Orange: Within 1% of target
- Red: SLO violated

---

## 🚨 Prometheus Alert Rules

**File**: `prometheus/alerts/custom-alerts.yml`

### Alert Groups:

#### 1. Queue Alerts
- **QueueBackup**: >100 jobs waiting for 5min (WARNING)
- **QueueBackupCritical**: >500 jobs waiting for 2min (CRITICAL)
- **QueueStalledJobs**: Stalled jobs detected (WARNING)
- **HighQueueFailureRate**: >10% job failure rate (WARNING)
- **QueueCircuitBreakerOpen**: Circuit breaker opened (CRITICAL)

#### 2. Error Rate Alerts
- **HighErrorRate**: >5% overall error rate for 5min (WARNING)
- **High5xxErrorRate**: >1% server error rate for 2min (CRITICAL)
- **ErrorBurst**: Sudden error spike (WARNING)
- **RepeatedErrors**: Same error repeating (INFO)
- **ConversionProcessingErrors**: >0.5 errors/sec for 5min (WARNING)

#### 3. SLO Violation Alerts
- **UptimeSLOViolation**: <99.9% uptime for 5min (CRITICAL)
- **ResponseTimeSLOViolation**: p95 >200ms for 5min (WARNING)
- **ErrorRateSLOViolation**: >0.1% error rate for 5min (CRITICAL)
- **ErrorBudgetLow**: <25% budget remaining (WARNING)
- **ErrorBudgetCritical**: <10% budget remaining (CRITICAL)
- **HighErrorBudgetBurnRate**: >2x burn rate for 5min (WARNING)

#### 4. Conversion Funnel Alerts
- **HighFunnelDropoff**: >10% drop-off at any stage (WARNING)
- **ConversionFailureSpike**: Failures >20% of successes (CRITICAL)
- **LongConversionDuration**: p95 >60s at any stage (WARNING)

#### 5. Database Alerts
- **DatabaseErrors**: >0.1 errors/sec for 2min (WARNING)
- **SlowDatabaseQueries**: p95 >100ms for 5min (WARNING)

#### 6. External API Alerts
- **ExternalAPIErrors**: >0.5 errors/sec for 3min (WARNING)
- **ExternalAPICircuitBreakerOpen**: Circuit breaker opened (CRITICAL)

#### 7. Rate Limit & Upload Alerts
- **HighRateLimitHits**: >10 hits/sec for 5min (INFO)
- **HighFileUploadErrors**: >1 error/sec for 3min (WARNING)

---

## 🚀 Deployment Instructions

### Step 1: Initialize Metrics in Server

Add to `backend/src/server.ts` after existing monitoring setup:

```typescript
// Import advanced metrics
import { initializeMetrics } from './metrics'

// Initialize after Prometheus registry setup
const metricsCleanup = initializeMetrics()

// Add to graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server')

  // Stop metrics monitoring
  metricsCleanup()

  // ... rest of shutdown logic
})
```

### Step 2: Deploy Grafana Dashboards

```bash
# Copy dashboards to Grafana
cp grafana/dashboards/*.json /path/to/grafana/dashboards/

# Or import via Grafana UI
# 1. Open Grafana: http://localhost:3000
# 2. Navigate to Dashboards → Import
# 3. Upload each JSON file
```

### Step 3: Deploy Prometheus Alert Rules

```bash
# Copy alert rules to Prometheus
cp prometheus/alerts/custom-alerts.yml /path/to/prometheus/alerts/

# Reload Prometheus configuration
curl -X POST http://localhost:9090/-/reload

# Or restart Prometheus
docker restart prometheus
```

### Step 4: Configure AlertManager (Optional)

Edit `prometheus/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#pdflab-alerts'
        title: '{{ range .Alerts }}{{ .Labels.severity }}: {{ .Annotations.summary }}{{ end }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### Step 5: Verify Deployment

```bash
# Check Prometheus metrics
curl http://localhost:9090/api/v1/label/__name__/values | grep pdflab

# Check Grafana dashboards
curl http://localhost:3000/api/dashboards/tags/pdflab

# Check alert rules loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].name'
```

---

## 📈 Usage Examples

### Example 1: Tracking Conversion Flow

```typescript
import {
  FunnelStage,
  trackFunnelStage,
  trackFunnelDuration,
  trackConversionSuccess
} from './metrics'

// Upload initiated
const startTime = Date.now()
trackFunnelStage(FunnelStage.UPLOAD_INITIATED, 'pdf_to_docx', user, guestSession)

// File validated
trackFunnelStage(FunnelStage.FILE_VALIDATED, 'pdf_to_docx', user, guestSession)
trackFunnelDuration(FunnelStage.FILE_VALIDATED, (Date.now() - startTime) / 1000, 'pdf_to_docx', user)

// Job queued
trackFunnelStage(FunnelStage.JOB_QUEUED, 'pdf_to_docx', user, guestSession)

// ... conversion happens ...

// Processing completed
trackFunnelStage(FunnelStage.PROCESSING_COMPLETED, 'pdf_to_docx', user, guestSession)
trackConversionSuccess('pdf_to_docx', 'docx', user, guestSession)
```

### Example 2: Tracking Errors

```typescript
import { trackHttpError, trackConversionError } from './metrics'

try {
  // ... conversion logic ...
} catch (error) {
  // Track HTTP error
  trackHttpError('POST', req.path, 500, error.message, req.user, req.guestSession)

  // Track specific conversion error
  trackConversionError('pdf_to_docx', 'CloudConvert timeout', 'processing')

  res.status(500).json({ error: 'Conversion failed' })
}
```

### Example 3: Monitoring SLO Compliance

```typescript
import { updateSloCompliance, updateResponseTimePercentile } from './metrics'

// Calculate and update SLO compliance (typically done in background job)
setInterval(async () => {
  // Get metrics from Prometheus
  const uptime = await calculateUptimePercentage('24h')
  updateSloCompliance('uptime', uptime, '24h')

  // Update response time SLO
  const p95ResponseTime = await getP95ResponseTime('/api/conversions/upload')
  updateResponseTimePercentile('/api/conversions/upload', 'POST', 'p95', p95ResponseTime)
}, 60000) // Every minute
```

---

## 🎯 Key Benefits

### 1. Conversion Funnel Insights
- **Identify bottlenecks**: See exactly where users drop off
- **Optimize stages**: Focus on improving slowest stages
- **Format popularity**: Understand which conversions to prioritize
- **User segmentation**: Different behavior for guests vs. paid users

### 2. Proactive Error Detection
- **Early warning**: Catch error spikes before they impact users
- **Root cause analysis**: Detailed error context (endpoint, type, reason)
- **Pattern detection**: Identify repeated errors and bursts
- **Circuit breaker monitoring**: Track external API health

### 3. Queue Health
- **Prevent backups**: Alert before queue gets overwhelmed
- **Optimize workers**: Right-size worker pool based on metrics
- **Failure tracking**: Identify problematic job types
- **Throughput monitoring**: Ensure consistent processing rate

### 4. SLO Compliance
- **Track targets**: Monitor all key SLOs in one place
- **Error budget management**: Know when to slow down releases
- **Burn rate alerts**: Early warning when burning through budget
- **Compliance reporting**: Monthly SLO reports for stakeholders

---

## 🔧 Customization

### Adding New Metrics

1. **Create metric in appropriate module**:
```typescript
export const myNewMetric = new Counter({
  name: 'pdflab_my_new_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2']
})
```

2. **Create tracking function**:
```typescript
export function trackMyNewMetric(label1: string, label2: string): void {
  myNewMetric.labels(label1, label2).inc()
}
```

3. **Add to dashboard**: Update Grafana JSON with new panel

4. **Add alert rule**: Update `custom-alerts.yml` if needed

### Adjusting Alert Thresholds

Edit `prometheus/alerts/custom-alerts.yml`:

```yaml
- alert: QueueBackup
  expr: pdflab_queue_depth{state="waiting"} > 50  # Changed from 100
  for: 10m  # Changed from 5m
```

### Adding New Dashboard Panels

1. Open Grafana dashboard
2. Click "Add Panel"
3. Configure visualization
4. Export JSON
5. Commit to git

---

## 📊 Metrics Reference

### Metric Naming Convention
- Prefix: `pdflab_`
- Component: `conversion_`, `queue_`, `error_`, `slo_`
- Type: `_total` (counter), `_seconds` (histogram), `_percentage` (gauge)

### Label Guidelines
- Always include relevant dimensions (user_type, conversion_type, etc.)
- Keep cardinality low (avoid unique IDs like job_id in labels)
- Use consistent naming across metrics

---

## 🚨 Troubleshooting

### Metrics Not Appearing in Prometheus

1. **Check metrics endpoint**: `curl http://localhost:3006/metrics | grep pdflab`
2. **Verify Prometheus scrape config**: Check `prometheus.yml` includes target
3. **Check Prometheus logs**: `docker logs prometheus`
4. **Reload Prometheus**: `curl -X POST http://localhost:9090/-/reload`

### Grafana Dashboard Not Loading

1. **Check data source**: Ensure Prometheus is configured
2. **Verify metrics exist**: Query Prometheus directly
3. **Check time range**: Ensure there's data in selected time range
4. **Check dashboard JSON**: Validate JSON syntax

### Alerts Not Firing

1. **Check alert rules loaded**: `curl http://localhost:9090/api/v1/rules`
2. **Verify expression**: Test query in Prometheus UI
3. **Check AlertManager**: `curl http://localhost:9093/api/v1/alerts`
4. **Check notification channels**: Verify webhook/email config

---

## 📝 Next Steps

1. ✅ **Deploy metrics modules** - Add to server.ts
2. ✅ **Import Grafana dashboards** - Load JSON files
3. ✅ **Configure Prometheus alerts** - Load alert rules
4. ⏭️ **Test alerts** - Trigger conditions and verify notifications
5. ⏭️ **Train team** - Walkthrough dashboards and alert responses
6. ⏭️ **Create runbooks** - Document response procedures for each alert

---

## 🎉 Success Metrics

After deployment, you should see:

- **2 Grafana dashboards** with real-time data
- **50+ custom metrics** in Prometheus
- **25+ alert rules** configured
- **Real-time funnel tracking** showing user flow
- **SLO compliance dashboards** with error budget tracking
- **Queue health monitoring** preventing backups
- **Error rate tracking** with early warning alerts

---

**Status**: ✅ Implementation Complete
**Documentation**: ✅ Complete
**Deployment**: ⏭️ Ready to deploy

**Estimated Deployment Time**: 2-3 hours
**Risk Level**: LOW (non-breaking additions)

---

**END OF GUIDE** ✓
