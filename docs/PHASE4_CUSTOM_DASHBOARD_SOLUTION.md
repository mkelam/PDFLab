# Phase 4: Advanced Monitoring - Custom Dashboard Solution

**Date**: November 23, 2025
**Status**: ✅ COMPLETE (Code Implementation)
**Stack**: Prometheus + Sentry + Custom React Dashboard

---

## Overview

Phase 4 implements comprehensive advanced monitoring using:
- **Prometheus** - Metrics collection and storage
- **Sentry** - Error tracking (existing integration)
- **Custom React Dashboard** - Built-in monitoring UI

Instead of Grafana, we've created custom React components that query Prometheus directly and display metrics in your application's admin panel.

---

## 📊 Architecture

```
┌─────────────────┐
│  PDFLab Backend │
│   (Node.js)     │
│                 │
│  - Metrics      │───────┐
│    Modules      │       │
│  - Prometheus   │       │
│    Client       │       │
└─────────────────┘       │
                          │ Scrapes metrics
                          ▼
                  ┌───────────────┐
                  │  Prometheus   │
                  │   (Port 9090) │
                  └───────────────┘
                          │
                          │ Queries metrics
                          ▼
┌─────────────────────────────────────┐
│  Custom React Dashboard             │
│  (Next.js Admin Panel)              │
│                                     │
│  Components:                        │
│  - MetricCard                       │
│  - ConversionFunnelChart            │
│  - SLODashboard                     │
│  - QueueMonitor                     │
└─────────────────────────────────────┘
```

---

## 🎯 What Was Implemented

### 1. Backend Metrics Modules (5 files)
✅ **[backend/src/metrics/conversion-funnel.metrics.ts](../backend/src/metrics/conversion-funnel.metrics.ts)** - Funnel tracking
✅ **[backend/src/metrics/error-rate.metrics.ts](../backend/src/metrics/error-rate.metrics.ts)** - Error monitoring
✅ **[backend/src/metrics/queue.metrics.ts](../backend/src/metrics/queue.metrics.ts)** - Queue health
✅ **[backend/src/metrics/slo.metrics.ts](../backend/src/metrics/slo.metrics.ts)** - SLO tracking
✅ **[backend/src/metrics/index.ts](../backend/src/metrics/index.ts)** - Module exports

### 2. Prometheus Query Client (1 file)
✅ **[lib/prometheus-client.ts](../lib/prometheus-client.ts)** - TypeScript client for querying Prometheus API

**Features**:
- Instant queries
- Range queries
- Rate calculations
- Histogram quantiles
- Grouped metrics
- Pre-built query functions for common metrics

### 3. Custom Dashboard Components (4 files)

✅ **[components/dashboard/MetricCard.tsx](../components/dashboard/MetricCard.tsx)**
- Reusable metric display component
- Status indicators (success/warning/error)
- Trend indicators
- Loading states

✅ **[components/dashboard/ConversionFunnelChart.tsx](../components/dashboard/ConversionFunnelChart.tsx)**
- 7-stage funnel visualization
- Drop-off rate highlighting
- Time range selection (1h, 24h, 7d)
- Auto-refresh every 30s

✅ **[components/dashboard/SLODashboard.tsx](../components/dashboard/SLODashboard.tsx)**
- SLO compliance tracking
- Error budget gauges
- Burn rate alerts
- Color-coded status indicators

✅ **[components/dashboard/QueueMonitor.tsx](../components/dashboard/QueueMonitor.tsx)**
- Real-time queue stats
- Health status indicators
- Visual queue composition
- Auto-refresh every 10s

### 4. Main Dashboard Page (1 file)

✅ **[app/admin/monitoring/page.tsx](../app/admin/monitoring/page.tsx)**
- Comprehensive monitoring view
- Key metrics overview
- All dashboard components
- Links to Prometheus and Sentry

### 5. Prometheus Alert Rules (1 file)

✅ **[prometheus/alerts/custom-alerts.yml](../prometheus/alerts/custom-alerts.yml)** - 25+ alert rules

---

## 🚀 Deployment Instructions

### Step 1: Ensure Prometheus is Running

Your Prometheus instance should already be scraping metrics from the backend.

**Verify**:
```bash
# Check Prometheus is accessible
curl http://localhost:9090/-/healthy

# Check metrics endpoint
curl http://localhost:3006/metrics | grep pdflab
```

### Step 2: Set Environment Variables

Add to `.env.local`:
```bash
# Prometheus URL (accessible from browser)
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090

# Sentry DSN (if not already set)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### Step 3: Initialize Metrics in Server

Add to `backend/src/server.ts`:

```typescript
// Import metrics
import { initializeMetrics } from './metrics'

// After Prometheus registry setup
const metricsCleanup = initializeMetrics()

// In graceful shutdown
process.on('SIGTERM', () => {
  metricsCleanup()
  // ... rest of shutdown
})
```

### Step 4: Deploy Prometheus Alert Rules

```bash
# Copy alert rules to Prometheus
cp prometheus/alerts/custom-alerts.yml /path/to/prometheus/alerts/

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

### Step 5: Access Dashboard

Navigate to: `http://localhost:3000/admin/monitoring`

You should see:
- Key metrics cards at the top
- Queue monitor with real-time status
- SLO compliance dashboard
- Conversion funnel visualization
- Error rate table

---

## 📈 Dashboard Features

### Metric Cards
- **Conversions (5m rate)** - Current throughput
- **Error Rate (1h)** - Percentage with SLO threshold
- **Response Time (p95)** - 95th percentile latency
- **Queue Depth** - Jobs waiting to process

### Queue Monitor
- Real-time queue stats (waiting, active, delayed, failed)
- Visual health status (Healthy/Warning/Critical)
- Auto-refresh every 10 seconds
- Alerts for queue backups

### SLO Dashboard
- 6 SLO types tracked:
  - Uptime (99.9% target)
  - Response Time (<200ms p95)
  - Error Rate (<0.1%)
  - Conversion Time (<5s for 20-page)
  - API Availability (99.95%)
  - Database Query Time (<100ms p95)
- Error budget tracking with burn rate alerts
- Color-coded status indicators
- Selectable time windows (24h, 7d, 30d)

### Conversion Funnel
- 7-stage funnel visualization
- Drop-off rate highlighting (red if >10%)
- Selectable time ranges (1h, 24h, 7d)
- Auto-refresh every 30 seconds

### Error Rate Table
- Top 10 endpoints by error count
- Color-coded status
- Auto-refresh every 60 seconds

---

## 🔧 Customization

### Adding New Metric Cards

```typescript
<MetricCard
  title="My Custom Metric"
  value={myValue}
  unit="units"
  status="success"
  trend="up"
  trendValue={5.2}
  description="Description of metric"
/>
```

### Querying Custom Metrics

```typescript
import { prometheusClient } from '@/lib/prometheus-client'

// Get current value
const value = await prometheusClient.getCurrentValue('my_metric_name')

// Get rate over time
const rate = await prometheusClient.getRate('my_counter_metric', '5m')

// Get percentile
const p95 = await prometheusClient.getQuantile('my_histogram_metric', 0.95, '5m')

// Get grouped data
const byLabel = await prometheusClient.getGroupedMetric('my_metric', 'label_name')
```

### Creating New Dashboard Components

1. Create component in `components/dashboard/`
2. Query Prometheus using `prometheusClient`
3. Use `useEffect` with `setInterval` for auto-refresh
4. Add to `app/admin/monitoring/page.tsx`

Example:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { prometheusClient } from '@/lib/prometheus-client'

export function MyCustomChart() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const value = await prometheusClient.getCurrentValue('my_metric')
      setData(value)
    }

    load()
    const interval = setInterval(load, 30000) // 30s refresh
    return () => clearInterval(interval)
  }, [])

  return <div>{/* Render your visualization */}</div>
}
```

---

## 🎨 Styling

All components use Tailwind CSS with consistent design:

- **Status Colors**:
  - Success: Green (`bg-green-50`, `text-green-600`)
  - Warning: Yellow (`bg-yellow-50`, `text-yellow-600`)
  - Error: Red (`bg-red-50`, `text-red-600`)
  - Info: Blue (`bg-blue-50`, `text-blue-600`)

- **Typography**:
  - Title: `text-xl font-bold text-gray-900`
  - Value: `text-3xl font-bold`
  - Description: `text-sm text-gray-600`

- **Cards**: `rounded-lg border-2 p-6`

---

## 🔗 Integration with Existing Tools

### Prometheus
Direct link from dashboard: `http://localhost:9090`
- Full PromQL query interface
- Graph builder
- Alert rules viewer

### Sentry
Direct link from dashboard (existing integration)
- Error tracking
- Performance monitoring
- Release tracking

### Benefits of Custom Solution

1. **Integrated Experience** - Monitoring within your app
2. **Customizable** - Full control over UI/UX
3. **Branded** - Matches your application design
4. **Fast** - No external tool switching
5. **Secure** - No additional authentication systems
6. **Cost** - No Grafana Cloud costs

---

## 📊 Available Pre-built Queries

The Prometheus client includes pre-built query functions:

```typescript
// Conversion funnel data
const funnel = await getConversionFunnel('24h')

// Error rate by endpoint
const errors = await getErrorRateByEndpoint('1h')

// Queue depth
const queue = await getQueueDepth()

// SLO compliance
const slos = await getSLOCompliance('30d')

// Response time percentiles
const responseTime = await getResponseTimePercentiles('/api/conversions')

// Error budget
const budget = await getErrorBudget('uptime', '30d')
```

---

## 🚨 Alerts

Prometheus alerts are configured in `prometheus/alerts/custom-alerts.yml`.

Alerts fire when thresholds are exceeded and can be routed to:
- Slack
- Email
- PagerDuty
- Custom webhooks

Example alert configuration for Slack:

```yaml
# alertmanager.yml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#pdflab-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## 🔧 Troubleshooting

### Dashboard Not Loading Data

1. **Check Prometheus is running**:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. **Check metrics endpoint**:
   ```bash
   curl http://localhost:3006/metrics | grep pdflab
   ```

3. **Check browser console** for fetch errors

4. **Verify environment variable**:
   ```
   NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
   ```

### CORS Issues

If Prometheus is on a different domain, add CORS headers to Prometheus config:

```yaml
# prometheus.yml
global:
  external_labels:
    cluster: 'pdflab'

# Add web config
web:
  cors:
    allowed_origins: ['http://localhost:3000']
```

### Metrics Not Appearing

1. Check metrics are being exported:
   ```bash
   curl http://localhost:3006/metrics | grep pdflab_conversion_funnel
   ```

2. Check Prometheus scrape config includes your backend

3. Check Prometheus targets page: `http://localhost:9090/targets`

---

## 📝 Next Steps

1. ✅ **Deploy custom dashboard** - Access at `/admin/monitoring`
2. ⏭️ **Configure Prometheus alerts** - Set up notification channels
3. ⏭️ **Train team** - Walkthrough dashboard features
4. ⏭️ **Create custom views** - Add company-specific metrics
5. ⏭️ **Set up AlertManager** - Configure Slack/email notifications

---

## 🎉 Benefits Summary

### vs. Grafana

| Feature | Custom Dashboard | Grafana |
|---------|-----------------|---------|
| **Integration** | Native in app | External tool |
| **Customization** | Full control | Template-based |
| **Authentication** | Existing auth | Separate auth |
| **Branding** | Your design | Grafana UI |
| **Mobile** | Responsive | Mobile app |
| **Cost** | Free | Cloud costs |
| **Maintenance** | Your codebase | Separate system |

### Additional Advantages

- **Performance**: Direct Prometheus queries, no proxy
- **Flexibility**: React components, easy to modify
- **Security**: No additional attack surface
- **Deployment**: Part of your app, single deployment
- **Monitoring**: See metrics where you work

---

## 📚 Files Reference

```
Phase 4 Custom Dashboard:
├── backend/src/metrics/          # Metrics modules (5 files)
├── lib/prometheus-client.ts      # Prometheus query client
├── components/dashboard/         # Dashboard components (4 files)
│   ├── MetricCard.tsx
│   ├── ConversionFunnelChart.tsx
│   ├── SLODashboard.tsx
│   └── QueueMonitor.tsx
├── app/admin/monitoring/
│   └── page.tsx                  # Main dashboard page
└── prometheus/alerts/
    └── custom-alerts.yml         # Alert rules
```

**Total**: 12 files, ~4,000 lines of code

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**

**Custom Dashboard**: Ready to deploy at `/admin/monitoring`

**Stack**: Prometheus (metrics) + Sentry (errors) + React (UI)

---

**END OF GUIDE** ✓
