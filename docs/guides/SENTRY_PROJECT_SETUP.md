# Sentry Project Setup - From Scratch

**Date**: 2025-11-09
**Status**: Initial Setup Guide
**Estimated Time**: 20-30 minutes

---

## Overview

This guide walks you through creating a Sentry account, organization, and project for PDFLab from scratch. Follow these steps in order.

---

## Step 1: Create Sentry Account (5 minutes)

### 1.1 Sign Up for Sentry

1. Go to: https://sentry.io/signup/
2. Choose sign-up method:
   - **Email + Password**
   - **GitHub** (recommended - easier authentication)
   - **Google**
3. Complete sign-up process
4. Verify email if required

### 1.2 Choose Plan

**For PDFLab (Starting Out)**:
- **Recommended**: **Developer Plan (Free)**
  - 5,000 errors/month
  - 10,000 performance units/month
  - 1 project
  - Perfect for getting started

**Alternative**: **Team Plan ($26/month)** if you need more:
  - 50,000 errors/month
  - 100,000 performance units/month
  - Multiple projects
  - Team collaboration features

**Decision**: Start with **Free Developer Plan**, upgrade later if needed.

---

## Step 2: Create Organization (2 minutes)

### 2.1 Organization Setup

After signing up, you'll be prompted to create an organization:

1. **Organization Name**: `PDFLab` or `pdf-lab-pro`
2. **Organization Slug**: `pdf-lab-pro` (this will be in your URLs)
3. **Time Zone**: Your local time zone
4. **Region**: Choose closest region:
   - **US** (default) - us.sentry.io
   - **EU** - eu.sentry.io
5. Click **"Continue"**

**Result**: Your organization URL will be:
- https://pdf-lab-pro.sentry.io

---

## Step 3: Create Project (5 minutes)

### 3.1 Create Backend Project

1. After organization creation, click **"Create Project"**
2. **Select Platform**:
   - Search for and select **"Node.js"**
3. **Alert Frequency**:
   - Choose **"Alert me on every new issue"** (recommended to start)
4. **Project Name**: `pdflab-backend`
5. **Project Slug**: `pdflab-backend`
6. **Team**: Default team (created automatically)
7. Click **"Create Project"**

### 3.2 Get Your DSN (Data Source Name)

After project creation, you'll see:

```
Sentry DSN (Data Source Name):
https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o4508296061149184.ingest.us.sentry.io/4508296065343488
```

**IMPORTANT**: Copy this DSN - you'll need it for the backend configuration.

**Find it later**:
- Go to: https://pdf-lab-pro.sentry.io/settings/projects/pdflab-backend/keys/
- Under "Client Keys (DSN)"

---

## Step 4: Configure Backend with DSN (5 minutes)

### 4.1 Add DSN to Backend .env

1. Open `backend/.env` file
2. Add or update the `SENTRY_DSN` line:

```env
# Sentry Error Tracking
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o4508296061149184.ingest.us.sentry.io/4508296065343488
SENTRY_ENVIRONMENT=production
```

**For Development** (optional):
```env
# Development
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o4508296061149184.ingest.us.sentry.io/4508296065343488
SENTRY_ENVIRONMENT=development
SENTRY_DEV=true  # Enable Sentry in development
```

### 4.2 Verify Backend Configuration

Check that `backend/src/server.ts` has Sentry initialization:

```typescript
// Should already be at the top of server.ts
import * as Sentry from '@sentry/node'
import dotenv from 'dotenv'

dotenv.config()

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  })
  console.log('✓ Sentry error tracking initialized')
}
```

**Status**: ✅ This is already configured in your backend.

---

## Step 5: Test Sentry Integration (5-10 minutes)

### 5.1 Start Backend

```bash
cd backend
npm run dev
```

**Look for this log message**:
```
✓ Sentry error tracking initialized
✓ Sentry Express instrumentation active
✓ Sentry test routes enabled (development/staging only)
```

If you see these, Sentry is configured correctly!

### 5.2 Test Error Capture

**Option A: Using Test Endpoint**

```bash
# Test basic error
curl -X POST http://localhost:3006/api/test/sentry-error

# Expected response:
{
  "success": false,
  "error": "Test error triggered successfully",
  "message": "Check Sentry dashboard at https://pdf-lab-pro.sentry.io/issues/",
  "expected": "Error should appear in Sentry within 30 seconds"
}
```

**Option B: Trigger Real Error**

```bash
# Trigger a real error by sending invalid request
curl -X POST http://localhost:3006/api/upload \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

### 5.3 Verify in Sentry Dashboard

1. Go to: https://pdf-lab-pro.sentry.io/issues/
2. Wait 30 seconds (Sentry batches events)
3. You should see your test error appear!

**Expected**:
- Issue titled: "Error: Test error from Sentry alert setup - This is a test!"
- Environment: development
- First seen: Just now
- Event count: 1

**If you see the error**: ✅ **Sentry is working!**

---

## Step 6: Optional - Create Frontend Project (5 minutes)

If you want to track frontend errors:

### 6.1 Create Frontend Project

1. Go to: https://pdf-lab-pro.sentry.io/projects/new/
2. Select platform: **"Next.js"**
3. Project name: `pdflab-frontend`
4. Click **"Create Project"**
5. Copy the DSN

### 6.2 Configure Frontend

Create `app/sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});
```

Add to `.env.local`:
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o4508296061149184.ingest.us.sentry.io/XXXXXXXXXX
```

**Note**: Frontend Sentry setup is optional. Focus on backend first.

---

## Step 7: Verify Complete Setup

### Verification Checklist

Run through this checklist:

- [ ] Sentry account created
- [ ] Organization created (pdf-lab-pro)
- [ ] Backend project created (pdflab-backend)
- [ ] DSN copied and added to `backend/.env`
- [ ] Backend restarted with `npm run dev`
- [ ] Log message shows: "✓ Sentry error tracking initialized"
- [ ] Test error sent via curl
- [ ] Error appears in Sentry dashboard (https://pdf-lab-pro.sentry.io/issues/)
- [ ] Can access Sentry dashboard successfully

**If all checked**: ✅ **Setup Complete!**

---

## Step 8: Next Steps - Alert Configuration

Now that Sentry is set up and working, you can:

### 8.1 Configure Alerts

**Follow**: [docs/guides/SENTRY_ALERT_SETUP.md](SENTRY_ALERT_SETUP.md)

**Quick start**:
1. Go to: https://pdf-lab-pro.sentry.io/alerts/
2. Click "Create Alert"
3. Follow the guide to create 12 alert rules

### 8.2 Set Up Slack Integration

1. Go to: https://pdf-lab-pro.sentry.io/settings/integrations/slack/
2. Click "Add to Slack"
3. Authorize
4. Create channels: #alerts-critical, #alerts-performance, #alerts-payments

### 8.3 Run Full Test Suite

```bash
cd backend
npm run test:sentry
```

This will test all alert scenarios.

---

## Troubleshooting

### Issue: "DSN not configured" message

**Problem**: Backend logs show: "⚠ Sentry DSN not configured - error tracking disabled"

**Solution**:
1. Check `backend/.env` has `SENTRY_DSN=...`
2. Restart backend: `npm run dev`
3. Verify DSN is correct (no typos)

---

### Issue: Errors not appearing in Sentry

**Check**:
1. ✅ DSN is correct in `.env`
2. ✅ Backend restarted after adding DSN
3. ✅ Internet connection working
4. ✅ Waited at least 30 seconds (Sentry batches events)
5. ✅ Looking at correct project (pdflab-backend)
6. ✅ Looking at correct environment (development vs production)

**Debug**:
```typescript
// In backend/src/server.ts, enable debug mode:
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  debug: true, // Add this line
  // ... rest of config
});
```

Then check logs for Sentry debug output.

---

### Issue: Can't access Sentry dashboard

**Problem**: https://pdf-lab-pro.sentry.io shows "Not Found"

**Solutions**:
1. **Check organization name**: Might be different (check welcome email)
2. **Login first**: Go to https://sentry.io/auth/login/
3. **Check URL**: Ensure using correct slug from organization settings

---

### Issue: Hitting free tier limits

**Problem**: Getting "quota exceeded" errors

**Current Limits (Free Developer Plan)**:
- 5,000 errors/month
- 10,000 performance units/month

**Solutions**:
1. **Reduce sample rate** in production:
   ```typescript
   Sentry.init({
     tracesSampleRate: 0.1, // 10% instead of 100%
   });
   ```

2. **Filter out noise**:
   ```typescript
   Sentry.init({
     beforeSend(event) {
       // Ignore development errors
       if (event.environment === 'development') return null;
       return event;
     },
   });
   ```

3. **Upgrade plan**: https://pdf-lab-pro.sentry.io/settings/billing/

---

## Summary

### What You've Accomplished:

✅ Created Sentry account
✅ Created organization (pdf-lab-pro)
✅ Created backend project (pdflab-backend)
✅ Got DSN and configured backend
✅ Tested integration - errors appearing in Sentry
✅ Backend is now sending errors to Sentry

### What's Next:

1. **Configure alerts** - [SENTRY_ALERT_SETUP.md](SENTRY_ALERT_SETUP.md)
2. **Set up Slack notifications**
3. **Deploy to production with Sentry enabled**

---

## Quick Reference

### Key URLs:
- **Dashboard**: https://pdf-lab-pro.sentry.io
- **Issues**: https://pdf-lab-pro.sentry.io/issues/
- **Alerts**: https://pdf-lab-pro.sentry.io/alerts/
- **Project Settings**: https://pdf-lab-pro.sentry.io/settings/projects/pdflab-backend/
- **DSN**: https://pdf-lab-pro.sentry.io/settings/projects/pdflab-backend/keys/

### Test Commands:
```bash
# Start backend
cd backend && npm run dev

# Test error
curl -X POST http://localhost:3006/api/test/sentry-error

# Run full test suite
npm run test:sentry
```

---

**Setup Guide Version**: 1.0.0
**Last Updated**: 2025-11-09
**Estimated Time**: 20-30 minutes
