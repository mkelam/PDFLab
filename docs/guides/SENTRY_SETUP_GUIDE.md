# Sentry Setup Guide for PDFLab

## Overview
Sentry provides real-time error tracking and performance monitoring for both backend and frontend applications.

## Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up with your email or GitHub account
3. Create a new organization (e.g., "PDFLab")

## Step 2: Create Projects

### Backend Project
1. Click "Create Project"
2. Select platform: **Node.js - Express**
3. Project name: `pdflab-backend`
4. Copy the DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)

### Frontend Project
1. Click "Create Project" again
2. Select platform: **Next.js**
3. Project name: `pdflab-frontend`
4. Copy the DSN

## Step 3: Configure Backend

### Add to backend/.env
```env
# Sentry
SENTRY_DSN=https://your-backend-dsn@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.1.1
```

### Backend Already Configured!
The backend already has Sentry initialization in `backend/src/config/sentry.config.ts`:
- Error tracking enabled
- Performance monitoring (50% sample rate)
- Automatic Express instrumentation
- Database query tracing
- HTTP request tracing

**No code changes needed** - just add the DSN to `.env`!

## Step 4: Configure Frontend

### Install Sentry Next.js SDK
```bash
npm install @sentry/nextjs
```

### Initialize Sentry in Next.js
Create `sentry.client.config.ts` and `sentry.server.config.ts` in project root.

### Add to .env.local
```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-frontend-dsn@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=pdflab-frontend
```

## Step 5: Configure UptimeRobot (Separate Tool)

### Create UptimeRobot Account
1. Go to https://uptimerobot.com/signUp
2. Sign up (Free plan: 50 monitors, 5-min intervals)

### Add Monitors
1. Click "Add New Monitor"
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `PDFLab Production`
4. URL: `https://pdflab.pro`
5. Monitoring Interval: **5 minutes**

6. Add another monitor:
   - Name: `PDFLab API Health`
   - URL: `https://pdflab.pro/api/health`

7. Add API endpoint monitor:
   - Name: `PDFLab Backend`
   - URL: `https://pdflab.pro/health`

### Configure Alerts
1. Go to "Alert Contacts"
2. Add your email
3. Add SMS (optional, paid feature)
4. Configure when to alert:
   - Down for 5 minutes
   - Down after 2 failed checks

### Configure Status Page (Optional)
1. Go to "Public Status Pages"
2. Create public page: `pdflab-status.uptimerobot.com`
3. Add your monitors
4. Customize branding

## Step 6: Test Error Tracking

### Test Backend Error Tracking
```bash
# Trigger a test error
curl -X POST https://pdflab.pro/api/test-error

# Or manually trigger from backend
Sentry.captureException(new Error('Test error from PDFLab'))
```

### Test Frontend Error Tracking
```typescript
// Add a test button in dashboard
<button onClick={() => {
  throw new Error('Test frontend error')
}}>
  Test Sentry
</button>
```

## Step 7: Configure Alerting

### Sentry Alerts
1. Go to project settings
2. Alerts → New Alert Rule
3. Configure:
   - When: Error count > 10 in 1 hour
   - Action: Send email + Slack notification
   - Team: Developers

### Custom Alert Rules
- **High Error Rate**: > 5% error rate in 15 minutes
- **New Issue**: Any new error type appears
- **Regression**: Previously resolved issue reoccurs
- **Performance**: P95 response time > 2 seconds

## Step 8: Dashboard Setup

### Sentry Dashboard Widgets
1. Error frequency chart
2. Top 10 errors by occurrence
3. Affected users count
4. Error rate trend (7 days)
5. Performance metrics

### UptimeRobot Dashboard
1. Uptime percentage (last 30 days)
2. Response time graph
3. Incident history
4. Downtime summary

## Expected Behavior

### When Error Occurs:
1. **Sentry captures error** with full stack trace
2. **Email sent** to configured alert contacts
3. **Issue created** in Sentry dashboard
4. **Context captured**: User ID, request data, environment

### When Site Goes Down:
1. **UptimeRobot detects** (within 5 minutes)
2. **Email/SMS alert** sent immediately
3. **Status page updated** (if configured)
4. **Downtime logged** for reporting

## Monitoring Checklist

After setup, verify:
- [ ] Sentry DSN configured in backend
- [ ] Sentry DSN configured in frontend
- [ ] Test error captured in Sentry
- [ ] UptimeRobot monitoring pdflab.pro
- [ ] UptimeRobot monitoring API endpoints
- [ ] Email alerts configured
- [ ] Alert rules created in Sentry
- [ ] Team members invited to Sentry

## Cost Breakdown

### Free Tier Limits
**Sentry**:
- 5,000 errors/month (backend + frontend combined)
- 10,000 performance transactions/month
- 1 GB storage
- 30-day data retention

**UptimeRobot**:
- 50 monitors
- 5-minute check intervals
- Email alerts (unlimited)
- SMS alerts (paid)

### When to Upgrade
**Sentry** ($26/month Developer plan):
- > 5,000 errors/month
- Need more data retention (90 days)
- Need custom alerts

**UptimeRobot** ($7/month Pro plan):
- Need 1-minute intervals
- Need SMS alerts
- Need custom status page domain

## Integration with Slack (Optional)

### Sentry Slack Integration
1. Sentry → Settings → Integrations
2. Install Slack integration
3. Connect to your Slack workspace
4. Configure which alerts go to Slack
5. Create #pdflab-errors channel

### UptimeRobot Slack Integration
1. UptimeRobot → My Settings → Integrations
2. Add Slack webhook URL
3. Configure alert format
4. Test notification

## Troubleshooting

### Sentry Not Capturing Errors
- Check SENTRY_DSN is set correctly
- Verify Sentry.init() is called before any errors
- Check environment (production vs development)
- Verify network access to sentry.io

### UptimeRobot False Positives
- Increase check interval to 5 minutes
- Add confirmation check (2 failures before alert)
- Whitelist UptimeRobot IPs in firewall
- Check if maintenance mode is active

## Security Notes

- Keep Sentry DSN secret (don't commit to public repos)
- Frontend DSN is public (safe to expose)
- Backend DSN should remain private
- Use environment variables for all secrets
- Enable IP allowlisting in Sentry if needed

## Maintenance

### Weekly
- Review error trends
- Check uptime percentage
- Resolve recurring issues
- Update alert thresholds

### Monthly
- Review Sentry quota usage
- Check UptimeRobot statistics
- Update status page
- Generate uptime report

---

## Quick Start Commands

```bash
# 1. Add Sentry DSN to backend/.env
echo "SENTRY_DSN=your-backend-dsn" >> backend/.env

# 2. Restart backend
cd backend && npm run dev

# 3. Test error capture
curl -X POST http://localhost:3006/api/test-error

# 4. Check Sentry dashboard
# Go to https://sentry.io and verify error appears
```

---

**Setup Time**: ~30 minutes
**Maintenance**: ~15 minutes/week
**Value**: Critical for production stability

**Next Steps**: After setup, proceed to implementing user analytics dashboard and profile customization.
