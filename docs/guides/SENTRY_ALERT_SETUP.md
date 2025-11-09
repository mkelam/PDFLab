# Sentry Alert Setup Guide

**Date**: 2025-11-09
**Sentry Project**: https://pdf-lab-pro.sentry.io
**Version**: 1.0.0

---

## Overview

This guide provides step-by-step instructions for configuring Sentry alerts for PDFLab production monitoring. Follow these steps to set up all 12 critical alert rules.

---

## Prerequisites

- [ ] Access to Sentry dashboard (https://pdf-lab-pro.sentry.io)
- [ ] Admin/Manager permissions in Sentry project
- [ ] Slack workspace access (for Slack integration)
- [ ] Team member emails for notifications

---

## Step 1: Access Sentry Dashboard

1. Navigate to: https://pdf-lab-pro.sentry.io
2. Click on **Alerts** in the left sidebar
3. Click **Create Alert** button

---

## Step 2: Configure Critical Alerts (P1) 🔴

### Alert 1: Error Rate Spike

**Purpose**: Detect sudden increase in errors

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P1] Error Rate Spike"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "The number of events"
   - Condition: "is more than"
   - Value: 10
   - Interval: "in 1 minute"

5. Then:
   - Action: "Send a notification"
   - Integrations: Slack (#alerts-critical) + Email (team@pdflab.pro)

6. Additional Settings:
   - Priority: High
   - Owner: DevOps Team

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers when >10 errors occur within 1 minute
- Sends immediate Slack notification to #alerts-critical
- Sends email to team@pdflab.pro

---

### Alert 2: New Production Errors

**Purpose**: Get notified of new error types immediately

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P1] New Production Error"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "A new issue is created"
   - Filter: environment is production

5. Then:
   - Action: "Send a notification"
   - Integrations: Slack (#alerts-new-errors) + Email

6. Additional Settings:
   - Priority: High
   - Owner: Backend Team

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers on first occurrence of new error type
- Immediate notification
- Helps catch regressions early

---

### Alert 3: High User Impact

**Purpose**: Detect errors affecting many users

**Configuration**:
```
1. Click "Create Alert"
2. Select "Metric Alert" tab
3. Configure:
   - Name: "[P1] High User Impact - Multiple Users Affected"
   - Project: pdflab-backend
   - Environment: production

4. Metric:
   - Type: "count_unique(user)"
   - Filter: event.type:error

5. Threshold:
   - Warning: 25 users in 5 minutes
   - Critical: 50 users in 5 minutes

6. Actions:
   - Warning: Send notification to Slack
   - Critical: Send notification + Page on-call

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers when error affects 50+ unique users in 5 minutes
- Pages on-call engineer
- Indicates widespread issue

---

### Alert 4: Database Connection Failures

**Purpose**: Critical infrastructure issue detection

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P1] Database Connection Failure"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "An issue matches these filters"
   - Filters:
     - error.type equals "SequelizeConnectionError"
     OR
     - error.message contains "ECONNREFUSED"
     OR
     - error.message contains "Connection lost"

5. Then:
   - Action: "Send a notification immediately"
   - Integrations: Slack (#alerts-critical) + Email + PagerDuty

6. Additional Settings:
   - Priority: Critical
   - Rate Limit: Every occurrence (no throttling)

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers on any database connection error
- Immediate notification (no batching)
- Critical priority

---

### Alert 5: Redis Queue Failures

**Purpose**: Detect job queue processing issues

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P1] Redis Queue Failures"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "The number of events"
   - Filters:
     - error.type contains "Bull" OR "Redis"
     - error.message contains "Queue" OR "Job failed"
   - Condition: "is more than"
   - Value: 5
   - Interval: "in 1 minute"

5. Then:
   - Action: "Send a notification"
   - Integrations: Slack (#alerts-critical) + Email

6. Additional Settings:
   - Priority: High

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers when >5 queue errors in 1 minute
- Indicates job processing problems
- May affect conversions

---

### Alert 6: PayFast Webhook Failures

**Purpose**: Critical payment pipeline monitoring

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P1] PayFast Webhook Failure - REVENUE CRITICAL"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "An issue matches these filters"
   - Filters:
     - transaction contains "/api/payfast/webhook"
     AND
     - event.type equals "error"

5. Then:
   - Action: "Send a notification immediately"
   - Integrations: Slack (#alerts-payments) + Email (finance@pdflab.pro)

6. Additional Settings:
   - Priority: Critical
   - Tags: revenue-critical, payment-failure
   - Rate Limit: Every occurrence

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers on any PayFast webhook processing error
- Notifies both dev and finance teams
- Revenue-critical alert

---

## Step 3: Configure Performance Alerts (P2) 🟡

### Alert 7: Response Time Degradation

**Purpose**: Monitor API performance

**Configuration**:
```
1. Click "Create Alert"
2. Select "Metric Alert" tab
3. Configure:
   - Name: "[P2] Response Time Degradation"
   - Project: pdflab-backend
   - Environment: production

4. Metric:
   - Type: "percentile(transaction.duration, 0.95)"
   - Filter: transaction.op:http.server

5. Threshold:
   - Warning: >1000ms for 5 minutes
   - Critical: >2000ms for 5 minutes

6. Actions:
   - Warning: Send notification to Slack (#alerts-performance)
   - Critical: Send notification + Email

7. Click "Save Rule"
```

**Expected Behavior**:
- Monitors P95 response time
- Alerts when API slows down
- 5-minute window to avoid false alarms

---

### Alert 8: CloudConvert API Failures

**Purpose**: External API dependency monitoring

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P2] CloudConvert API Failure"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "An issue matches these filters"
   - Filters:
     - error.message contains "CloudConvert"
     AND
     - http.status_code in [401, 403, 429, 500, 502, 503]

5. Then:
   - Action: "Send a notification"
   - Integrations: Slack (#alerts-critical) + Email

6. Additional Settings:
   - Priority: High
   - Action Items: Check CloudConvert dashboard, verify API key, check quota

7. Click "Save Rule"
```

**Expected Behavior**:
- Triggers on CloudConvert API errors
- Indicates quota issues or service problems
- Affects all conversions

---

### Alert 9: Batch Processing Slow Performance

**Purpose**: Monitor batch job performance

**Configuration**:
```
1. Click "Create Alert"
2. Select "Metric Alert" tab
3. Configure:
   - Name: "[P2] Batch Processing Slow Performance"
   - Project: pdflab-backend
   - Environment: production

4. Metric:
   - Type: "avg(transaction.duration)"
   - Filter: transaction contains "batch"

5. Threshold:
   - Warning: >300000ms (5 minutes) for 10 minutes
   - Critical: >600000ms (10 minutes) for 10 minutes

6. Actions:
   - Warning: Send notification to Slack

7. Click "Save Rule"
```

**Expected Behavior**:
- Monitors batch processing duration
- Alerts when batches take too long
- Helps optimize performance

---

### Alert 10: Memory Usage High

**Purpose**: Infrastructure resource monitoring

**Configuration**:
```
1. Click "Create Alert"
2. Select "Metric Alert" tab
3. Configure:
   - Name: "[P2] High Memory Usage"
   - Project: pdflab-backend
   - Environment: production

4. Metric:
   - Type: Custom metric "memory.heap.used_ratio"
   - (Requires custom instrumentation - see below)

5. Threshold:
   - Warning: >0.8 (80%) for 10 minutes
   - Critical: >0.9 (90%) for 5 minutes

6. Actions:
   - Warning: Send notification
   - Critical: Send notification + investigate

7. Click "Save Rule"
```

**Note**: Requires custom metric tracking. See "Custom Metrics Setup" section below.

---

## Step 4: Configure Business Alerts (P3) 📊

### Alert 11: Conversion Failure Rate

**Purpose**: Monitor conversion success rate

**Configuration**:
```
1. Click "Create Alert"
2. Select "Metric Alert" tab
3. Configure:
   - Name: "[P3] High Conversion Failure Rate"
   - Project: pdflab-backend
   - Environment: production

4. Metric:
   - Type: Custom metric "conversion.failure_rate"
   - (Requires custom instrumentation)

5. Threshold:
   - Warning: >5% failure rate in 1 hour
   - Critical: >10% failure rate in 1 hour

6. Actions:
   - Send notification to Slack (#alerts-performance)

7. Click "Save Rule"
```

**Note**: Requires custom metric tracking. See "Custom Metrics Setup" section below.

---

### Alert 12: Subscription Activation Failures

**Purpose**: Revenue-critical business monitoring

**Configuration**:
```
1. Click "Create Alert"
2. Select "Issues" tab
3. Configure:
   - Name: "[P3] Subscription Activation Failure"
   - Project: pdflab-backend
   - Environment: production

4. When:
   - "An issue matches these filters"
   - Filters:
     - error.type equals "SubscriptionActivationError"
     OR
     - error.message contains "subscription activation failed"
     OR
     - transaction contains "/api/payfast" AND event.type equals "error"

5. Then:
   - Action: "Send a notification"
   - Integrations: Slack (#alerts-payments) + Email (finance@pdflab.pro)

6. Additional Settings:
   - Priority: High
   - Tags: revenue-critical

7. Click "Save Rule"
```

**Expected Behavior**:
- Monitors subscription activation pipeline
- Revenue-critical alert
- Notifies finance and dev teams

---

## Step 5: Set Up Slack Integration

### Add Sentry to Slack

1. Go to: https://pdf-lab-pro.sentry.io/settings/integrations/slack/
2. Click **"Add to Slack"**
3. Select your Slack workspace
4. Authorize Sentry app
5. Click **"Install"**

### Create Slack Channels

Create these channels in your Slack workspace:

```
#alerts-critical     - Critical errors (P1)
#alerts-new-errors   - New error types
#alerts-performance  - Performance issues (P2)
#alerts-payments     - Payment/revenue alerts
#dev-errors          - Development/staging errors
```

### Configure Alert Routing

For each alert created above, edit the notification settings:

1. Go to alert rule
2. Click **"Edit Rule"**
3. In "Actions" section:
   - Add Slack integration
   - Select appropriate channel
   - Save

---

## Step 6: Configure Email Notifications

### Set Up Email Recipients

1. Go to: https://pdf-lab-pro.sentry.io/settings/projects/pdflab-backend/alerts/
2. Click **"Email"** integration
3. Configure:
   - Critical alerts: `team@pdflab.pro, oncall@pdflab.pro`
   - Performance alerts: `dev-team@pdflab.pro`
   - Payment alerts: `finance@pdflab.pro, dev-team@pdflab.pro`

### Personal Notification Settings

Team members should configure personal preferences:

1. Go to: https://pdf-lab-pro.sentry.io/settings/account/notifications/
2. Configure:
   - **Workflow**: Email for issue state changes
   - **Deploy**: Email for new releases
   - **Alerts**: Email for critical issues only
   - **Weekly Reports**: Enable

---

## Step 7: Test Alerts

### Create Test Script

Create `backend/src/routes/test.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import * as Sentry from '@sentry/node';

const router = Router();

// Test endpoint to trigger Sentry error
router.post('/test/sentry-error', (req: Request, res: Response) => {
  try {
    throw new Error('Test error from Sentry alert setup');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: true,
        alert_test: 'error_rate_spike',
      },
    });
    res.status(500).json({
      error: 'Test error triggered',
      message: 'Check Sentry dashboard for event'
    });
  }
});

// Test database connection error
router.post('/test/sentry-db-error', (req: Request, res: Response) => {
  const error = new Error('Connection lost to MySQL server');
  error.name = 'SequelizeConnectionError';

  Sentry.captureException(error, {
    tags: {
      test: true,
      alert_test: 'database_connection',
    },
  });

  res.status(500).json({
    error: 'Test DB error triggered',
    message: 'Check Sentry dashboard and Slack for alert'
  });
});

export default router;
```

### Register Test Routes

In `backend/src/server.ts`:

```typescript
import testRoutes from './routes/test.routes';

// Add before other routes (for development/staging only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', testRoutes);
}
```

### Run Tests

```bash
# Test 1: Single error (should NOT trigger rate limit alert)
curl -X POST http://localhost:3006/api/test/sentry-error

# Test 2: Error rate spike (should trigger alert)
for i in {1..15}; do
  curl -X POST http://localhost:3006/api/test/sentry-error
done

# Test 3: Database connection error (should trigger critical alert)
curl -X POST http://localhost:3006/api/test/sentry-db-error

# Test 4: New error type (should trigger new error alert)
# Just create a different error in code and deploy
```

### Verify Alerts

1. **Check Sentry Dashboard**:
   - Go to: https://pdf-lab-pro.sentry.io/issues/
   - Verify test errors appear
   - Check that errors have correct tags

2. **Check Slack**:
   - Verify notifications in #alerts-critical
   - Check message format and content
   - Ensure links work

3. **Check Email**:
   - Verify team@pdflab.pro receives emails
   - Check email formatting
   - Ensure unsubscribe links work

---

## Step 8: Custom Metrics Setup (Optional)

### Memory Usage Tracking

Add to `backend/src/server.ts`:

```typescript
import * as Sentry from '@sentry/node';

// Track memory usage every 60 seconds
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;

  Sentry.metrics.gauge('memory.heap.used_ratio', heapUsedRatio, {
    tags: {
      service: 'pdflab-backend',
      environment: process.env.NODE_ENV || 'development',
    },
  });
}, 60000);
```

### Conversion Success Rate Tracking

Add to `backend/src/jobs/conversion.job.ts`:

```typescript
// After conversion completes
if (result.success) {
  Sentry.metrics.increment('conversion.success', 1, {
    tags: {
      type: conversionType,
      format: outputFormat,
    },
  });
} else {
  Sentry.metrics.increment('conversion.failure', 1, {
    tags: {
      type: conversionType,
      format: outputFormat,
      error: result.error,
    },
  });
}
```

---

## Step 9: Configure Source Maps (Better Stack Traces)

### Install Sentry CLI

```bash
cd backend
npm install --save-dev @sentry/cli
```

### Add Sentry CLI Config

Create `backend/.sentryclirc`:

```ini
[defaults]
org=pdf-lab-pro
project=pdflab-backend

[auth]
token=YOUR_AUTH_TOKEN_HERE
```

**Get auth token**: https://pdf-lab-pro.sentry.io/settings/account/api/auth-tokens/

### Update tsconfig.json

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true,
    "sourceRoot": "/"
  }
}
```

### Add Build Script

Update `backend/package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "build:production": "tsc && npm run sentry:sourcemaps",
    "sentry:sourcemaps": "sentry-cli sourcemaps upload --org pdf-lab-pro --project pdflab-backend ./dist"
  }
}
```

### Update Sentry Init

In `backend/src/server.ts`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: `pdflab-backend@${process.env.npm_package_version || '1.1.0'}`,
  // ... other config
});
```

---

## Step 10: Weekly Review Setup

### Create Weekly Digest

1. Go to: https://pdf-lab-pro.sentry.io/settings/account/notifications/
2. Enable **"Weekly Reports"**
3. Set delivery time: Monday 10:00 AM
4. Configure report contents:
   - New errors
   - Top issues
   - Performance summary
   - User impact

### Add Calendar Reminder

Add to team calendar:
```
Event: Sentry Weekly Review
Recurrence: Every Monday at 10:00 AM
Duration: 30 minutes
Attendees: Dev team
Agenda:
  - Review weekly digest
  - Triage top 5 issues
  - Check performance metrics
  - Adjust alert thresholds if needed
```

---

## Troubleshooting

### Issue: Alerts Not Firing

**Check**:
1. ✅ Alert rule is enabled (not paused)
2. ✅ Environment filter matches ("production")
3. ✅ Test error actually triggers the condition
4. ✅ Alert threshold is correct
5. ✅ No rate limiting applied

**Debug**:
- Go to alert rule
- Check "Alert History" tab
- Review "Why didn't this alert fire?" section

---

### Issue: Too Many Notifications

**Solutions**:
1. Increase alert threshold (e.g., 10 → 20 errors/minute)
2. Add alert frequency limit (max 1 per hour)
3. Use "Ignore Until" to temporarily mute
4. Add better error filtering

---

### Issue: Slack Notifications Not Working

**Check**:
1. ✅ Slack integration is active
2. ✅ Sentry bot is in the channel
3. ✅ Channel name is correct
4. ✅ Re-authorize Slack integration if needed

**Fix**:
```
1. Go to Slack channel
2. Type: /invite @Sentry
3. Test with: curl -X POST .../test/sentry-error
```

---

## Completion Checklist

- [ ] All 12 alert rules created in Sentry
- [ ] Slack integration connected
- [ ] Slack channels created (#alerts-critical, #alerts-performance, #alerts-payments)
- [ ] Email recipients configured
- [ ] Test script created and tested
- [ ] All alerts verified working
- [ ] Source maps configured (optional but recommended)
- [ ] Custom metrics implemented (optional)
- [ ] Weekly review scheduled
- [ ] Team trained on alert response

---

## Success Criteria

**You're done when**:
✅ Test error triggers alert within 30 seconds
✅ Slack notification appears in correct channel
✅ Email arrives at team inbox
✅ Sentry dashboard shows alert in "Alert History"
✅ Team members receive weekly digest on Monday

---

## Next Steps

After alert setup is complete:

1. **Monitor for 1 Week**:
   - Watch for false positives
   - Adjust thresholds if needed
   - Check alert response times

2. **Tune Alert Thresholds**:
   - Based on actual traffic patterns
   - Reduce noise without missing critical issues

3. **Document Runbooks**:
   - Create playbooks for each alert type
   - Document resolution steps
   - Add to team wiki

4. **Train Team**:
   - Review alert types with team
   - Practice incident response
   - Assign on-call rotation

---

**Setup Guide Version**: 1.0.0
**Last Updated**: 2025-11-09
**Related Skill**: [.claude/skills/sentry-monitoring-specialist.skill](../../.claude/skills/sentry-monitoring-specialist.skill)
