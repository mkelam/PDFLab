# 🔗 Sentry Internal Integration Setup Guide

**Date**: November 17, 2025
**Organization**: pdf-lab-pro
**URL**: https://pdf-lab-pro.sentry.io/settings/developer-settings/new-internal/

---

## 🎯 What is an Internal Integration?

Sentry Internal Integrations allow you to:
- Create **authentication tokens** for API access
- Set up **webhooks** for real-time notifications
- Automate **issue management** (create, update, resolve)
- Trigger **custom workflows** based on Sentry events
- Integrate with **monitoring systems** (Elite Guardian)

---

## 📋 Setup Steps

### Step 1: Access Internal Integration Settings

1. **Login to Sentry**: https://sentry.io
2. **Navigate to Settings**:
   - Click your organization name (top-left)
   - Select "Settings"
3. **Go to Developer Settings**:
   - Left sidebar → "Developer Settings"
   - Click "New Internal Integration"
   - Or use direct link: https://pdf-lab-pro.sentry.io/settings/developer-settings/new-internal/

### Step 2: Configure Basic Information

**Name**: `PDFLab Elite Guardian`
**Description**:
```
Elite Health Guardian monitoring system integration.
Automatically manages Sentry alerts, creates issues for critical errors,
and integrates with autonomous remediation workflows.
```

**Webhook URL** (Optional - for Guardian integration):
```
https://pdflab.pro/api/sentry/webhook
```
*Note: This endpoint doesn't exist yet - see "Create Webhook Handler" section below*

**Redirect URL**: Leave blank (not needed for internal integrations)

### Step 3: Configure Permissions

**Recommended Permissions**:

| Resource | Permission | Purpose |
|----------|-----------|---------|
| **Issue & Events** | Read & Write | Read errors, update issue status |
| **Projects** | Read | Access project configuration |
| **Organization** | Read | Access organization settings |
| **Releases** | Admin | Manage deployment tracking |
| **Team** | Read | Access team configuration |

**Minimal Permissions** (if you want limited access):
- Issue & Events: Read & Write
- Projects: Read

### Step 4: Configure Webhooks (Optional)

**Recommended Webhook Events**:
- [x] `issue` - Issue created, assigned, resolved
- [x] `error` - New error event
- [x] `event_alert` - Alert triggered
- [ ] `comment` - Comment added to issue (optional)
- [ ] `installation` - Integration installed/updated (optional)

**Webhook Configuration**:
```json
{
  "url": "https://pdflab.pro/api/sentry/webhook",
  "events": ["issue", "error", "event_alert"],
  "secret": "AUTO_GENERATED_BY_SENTRY"
}
```

### Step 5: Create Integration

1. Click **"Create Integration"**
2. **IMPORTANT**: Copy the generated token immediately!
3. The token will look like: `sntrys_...` (starts with `sntrys_`)
4. Store it securely - you won't see it again!

---

## 🔑 Token Storage

### Development Environment

**Backend** (`backend/.env`):
```env
# Sentry Internal Integration
SENTRY_AUTH_TOKEN=sntrys_YOUR_TOKEN_HERE
SENTRY_ORG_SLUG=pdf-lab-pro
SENTRY_PROJECT_SLUG=pdflab-backend
```

### Production Environment

**VPS** (`/var/www/pdflab/backend/.env`):
```env
# Sentry Internal Integration
SENTRY_AUTH_TOKEN=sntrys_YOUR_TOKEN_HERE
SENTRY_ORG_SLUG=pdf-lab-pro
SENTRY_PROJECT_SLUG=pdflab-backend
```

**Guardian** (`/var/pdflab/.env.monitoring`):
```bash
# Sentry Integration
SENTRY_AUTH_TOKEN="sntrys_YOUR_TOKEN_HERE"
SENTRY_ORG="pdf-lab-pro"
SENTRY_PROJECT="pdflab-backend"
```

---

## 🔧 Integration Use Cases

### Use Case 1: Auto-Create Issues from Monitoring

**Scenario**: Elite Guardian detects critical error → Create Sentry issue automatically

**Script**: `scripts/sentry-create-issue.sh`
```bash
#!/bin/bash

SENTRY_TOKEN="$SENTRY_AUTH_TOKEN"
SENTRY_ORG="pdf-lab-pro"
SENTRY_PROJECT="pdflab-backend"

ERROR_TITLE="$1"
ERROR_DESCRIPTION="$2"
ERROR_LEVEL="${3:-error}"  # error, warning, info

curl -X POST \
  "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/" \
  -H "Authorization: Bearer ${SENTRY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"${ERROR_TITLE}\",
    \"culprit\": \"Elite Guardian\",
    \"level\": \"${ERROR_LEVEL}\",
    \"platform\": \"other\",
    \"message\": \"${ERROR_DESCRIPTION}\"
  }"
```

**Usage**:
```bash
./scripts/sentry-create-issue.sh \
  "Container Restart Loop Detected" \
  "Backend container restarted 3 times in 1 hour" \
  "error"
```

### Use Case 2: Auto-Resolve Issues

**Scenario**: Guardian fixes issue → Auto-resolve corresponding Sentry issue

**Script**: `scripts/sentry-resolve-issue.sh`
```bash
#!/bin/bash

SENTRY_TOKEN="$SENTRY_AUTH_TOKEN"
ISSUE_ID="$1"

curl -X PUT \
  "https://sentry.io/api/0/issues/${ISSUE_ID}/" \
  -H "Authorization: Bearer ${SENTRY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "statusDetails": {
      "inNextRelease": false
    }
  }'
```

**Usage**:
```bash
./scripts/sentry-resolve-issue.sh 123456789
```

### Use Case 3: Query Recent Errors

**Scenario**: Weekly health audit → Get error statistics from Sentry

**Script**: `scripts/sentry-get-stats.sh`
```bash
#!/bin/bash

SENTRY_TOKEN="$SENTRY_AUTH_TOKEN"
SENTRY_ORG="pdf-lab-pro"
SENTRY_PROJECT="pdflab-backend"

# Get issues from last 7 days
curl -X GET \
  "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?statsPeriod=7d" \
  -H "Authorization: Bearer ${SENTRY_TOKEN}" \
  | jq '.[] | {id: .id, title: .title, count: .count, level: .level, status: .status}'
```

**Output**:
```json
{
  "id": "123456789",
  "title": "DatabaseError: Connection timeout",
  "count": "42",
  "level": "error",
  "status": "unresolved"
}
```

### Use Case 4: Webhook Handler (Backend)

**File**: `backend/src/routes/sentry.webhook.routes.ts`
```typescript
import { Router, Request, Response } from 'express'
import crypto from 'crypto'

const router = Router()

/**
 * Sentry Webhook Handler
 * POST /api/sentry/webhook
 *
 * Receives real-time notifications from Sentry when:
 * - New issue created
 * - Error rate spikes
 * - Alert triggered
 */
router.post('/sentry/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature (security)
    const signature = req.headers['sentry-hook-signature'] as string
    const secret = process.env.SENTRY_WEBHOOK_SECRET || ''

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(req.body))
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
      console.error('[Sentry Webhook] Invalid signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Process webhook event
    const event = req.body
    const action = event.action // 'created', 'resolved', 'assigned'
    const issue = event.data?.issue

    console.log(`[Sentry Webhook] ${action}: ${issue?.title}`)

    // Custom logic based on event type
    switch (action) {
      case 'created':
        // New issue created
        if (issue.level === 'error' && issue.count > 10) {
          // High-frequency error - escalate
          await sendEmailAlert('CRITICAL', `Sentry: ${issue.title} (${issue.count} occurrences)`)
        }
        break

      case 'resolved':
        // Issue resolved
        console.log(`[Sentry] Issue ${issue.id} resolved`)
        break

      case 'assigned':
        // Issue assigned to team member
        console.log(`[Sentry] Issue ${issue.id} assigned to ${event.data.assignedTo}`)
        break
    }

    res.json({ received: true })

  } catch (error: any) {
    console.error('[Sentry Webhook] Error:', error.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
```

**Register Route** (`backend/src/server.ts`):
```typescript
import sentryWebhookRoutes from './routes/sentry.webhook.routes'

// After other routes
app.use('/api', sentryWebhookRoutes)
```

---

## 🔐 Security Best Practices

### Token Security

**DO**:
- ✅ Store tokens in `.env` files (never commit)
- ✅ Use environment-specific tokens (dev vs prod)
- ✅ Rotate tokens periodically (every 90 days)
- ✅ Limit token permissions (minimum required)
- ✅ Verify webhook signatures

**DON'T**:
- ❌ Commit tokens to Git
- ❌ Share tokens via email/Slack
- ❌ Use production tokens in development
- ❌ Grant Admin permissions unless needed
- ❌ Skip signature verification on webhooks

### Webhook Security

**Verify Signatures**:
```typescript
import crypto from 'crypto'

function verifySentrySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return signature === expectedSignature
}
```

**Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit'

const sentryWebhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 webhooks per minute
  message: 'Too many webhook requests'
})

app.use('/api/sentry/webhook', sentryWebhookLimiter)
```

---

## 📊 Integration Benefits

### Automated Workflows

**Before Integration**:
- Manual error checking in Sentry dashboard
- Manual issue creation/resolution
- No correlation between monitoring and errors

**After Integration**:
- ✅ Auto-create Sentry issues from Guardian alerts
- ✅ Auto-resolve issues when Guardian fixes them
- ✅ Real-time error notifications via webhook
- ✅ Correlation between monitoring and errors
- ✅ Automated error statistics in health reports

### Example Guardian Integration

**Enhanced Guardian Script** (`scripts/elite-health-guardian.sh`):
```bash
#!/bin/bash

# ... existing health checks ...

# If critical error detected
if [[ $CONTAINER_RESTARTS -gt 3 ]]; then
  # Send email alert (existing)
  send_alert_email "CRITICAL" "Container restart loop detected"

  # Create Sentry issue (NEW)
  ./scripts/sentry-create-issue.sh \
    "Container Restart Loop: ${CONTAINER_NAME}" \
    "Container restarted ${CONTAINER_RESTARTS} times in 1 hour. Guardian has paused auto-restart." \
    "error"
fi

# If error was auto-fixed
if [[ $AUTO_REMEDIATION_SUCCESS == "true" ]]; then
  # Send success email (existing)
  send_alert_email "SUCCESS" "Issue resolved automatically"

  # Resolve Sentry issue (NEW)
  if [[ -n "$SENTRY_ISSUE_ID" ]]; then
    ./scripts/sentry-resolve-issue.sh "$SENTRY_ISSUE_ID"
  fi
fi
```

---

## 🧪 Testing the Integration

### Test 1: Create Issue via API

```bash
# Set token
export SENTRY_AUTH_TOKEN="sntrys_YOUR_TOKEN_HERE"

# Create test issue
./scripts/sentry-create-issue.sh \
  "Test Issue from API" \
  "This is a test issue created via Sentry API" \
  "warning"

# Check Sentry dashboard
# https://pdf-lab-pro.sentry.io/issues/
```

### Test 2: Resolve Issue via API

```bash
# Get issue ID from dashboard (e.g., 123456789)
ISSUE_ID="123456789"

# Resolve issue
./scripts/sentry-resolve-issue.sh "$ISSUE_ID"

# Verify in dashboard (status should be "Resolved")
```

### Test 3: Query Recent Errors

```bash
# Get error statistics
./scripts/sentry-get-stats.sh

# Should output JSON with recent issues
```

### Test 4: Webhook Test

```bash
# Trigger test error
curl -X POST http://localhost:3006/api/test/sentry-error

# Check webhook received
# tail -f /var/log/guardian.log | grep "Sentry Webhook"
```

---

## 📚 Sentry API Reference

### Common Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/0/projects/{org}/{project}/issues/` | GET | List issues |
| `/api/0/projects/{org}/{project}/issues/` | POST | Create issue |
| `/api/0/issues/{id}/` | GET | Get issue details |
| `/api/0/issues/{id}/` | PUT | Update issue (resolve, assign) |
| `/api/0/issues/{id}/` | DELETE | Delete issue |
| `/api/0/organizations/{org}/stats/` | GET | Get organization statistics |
| `/api/0/projects/{org}/{project}/events/` | GET | List events |

### Authentication

All API requests require Authorization header:
```bash
-H "Authorization: Bearer sntrys_YOUR_TOKEN_HERE"
```

### Full API Docs

**URL**: https://docs.sentry.io/api/

---

## ✅ Setup Checklist

### Initial Setup
- [ ] Login to Sentry dashboard
- [ ] Navigate to Developer Settings
- [ ] Create new internal integration
- [ ] Configure permissions (Issue & Events: Read & Write)
- [ ] Configure webhook events (issue, error, event_alert)
- [ ] Copy generated token
- [ ] Store token in `.env` files (dev + prod)

### Script Creation
- [ ] Create `sentry-create-issue.sh`
- [ ] Create `sentry-resolve-issue.sh`
- [ ] Create `sentry-get-stats.sh`
- [ ] Make scripts executable (`chmod +x`)
- [ ] Test scripts in development

### Backend Integration
- [ ] Create webhook handler route
- [ ] Add signature verification
- [ ] Add rate limiting
- [ ] Register route in server.ts
- [ ] Test webhook with Sentry test

### Guardian Integration
- [ ] Add Sentry token to `.env.monitoring`
- [ ] Update Guardian script with API calls
- [ ] Test issue creation on error
- [ ] Test issue resolution on fix
- [ ] Verify webhook integration

### Verification
- [ ] Test issue creation via API
- [ ] Test issue resolution via API
- [ ] Test webhook delivery
- [ ] Verify email + Sentry correlation
- [ ] Check Guardian logs for Sentry calls

---

## 🎯 Next Steps

### Immediate (After Token Creation)

1. **Copy Token**: Save the `sntrys_...` token immediately
2. **Add to .env**: Update backend/.env with token
3. **Test API**: Run `./scripts/sentry-get-stats.sh`
4. **Verify Access**: Should return JSON with issues

### Short-Term (This Week)

1. **Create Scripts**: sentry-create-issue.sh, sentry-resolve-issue.sh
2. **Test in Dev**: Verify API calls work
3. **Create Webhook Handler**: backend/src/routes/sentry.webhook.routes.ts
4. **Test Webhooks**: Trigger test error, verify webhook received

### Long-Term (Next Month)

1. **Guardian Integration**: Auto-create/resolve issues
2. **Weekly Reports**: Include Sentry stats in health audit
3. **Alert Correlation**: Match Guardian alerts with Sentry issues
4. **Performance Tracking**: Use Sentry traces for optimization

---

## 💡 Pro Tips

### Tip 1: Issue Deduplication

Sentry automatically deduplicates similar errors. Use this to your advantage:
```bash
# Don't create new issue for every error
# Instead, check if issue exists first
EXISTING_ISSUE=$(./scripts/sentry-get-stats.sh | jq -r ".[] | select(.title == \"$ERROR_TITLE\") | .id")

if [[ -z "$EXISTING_ISSUE" ]]; then
  # Create new issue
  ./scripts/sentry-create-issue.sh "$ERROR_TITLE" "$ERROR_DESC"
else
  # Add comment to existing issue
  echo "Issue already exists: $EXISTING_ISSUE"
fi
```

### Tip 2: Custom Tags

Add custom tags to help filter/search:
```bash
curl -X POST \
  "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/" \
  -H "Authorization: Bearer ${SENTRY_TOKEN}" \
  -d "{
    \"title\": \"${ERROR_TITLE}\",
    \"tags\": {
      \"guardian\": \"auto-created\",
      \"severity\": \"critical\",
      \"component\": \"backend\",
      \"environment\": \"production\"
    }
  }"
```

### Tip 3: Error Context

Include context in Sentry issues:
```bash
curl -X POST \
  "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/" \
  -d "{
    \"title\": \"${ERROR_TITLE}\",
    \"extra\": {
      \"container_restarts\": \"${CONTAINER_RESTARTS}\",
      \"memory_usage\": \"${MEMORY_USAGE}\",
      \"disk_usage\": \"${DISK_USAGE}\",
      \"timestamp\": \"$(date -Iseconds)\"
    }
  }"
```

---

## 📞 Support

### Sentry Documentation
- **API Docs**: https://docs.sentry.io/api/
- **Integrations**: https://docs.sentry.io/product/integrations/
- **Webhooks**: https://docs.sentry.io/product/integrations/integration-platform/webhooks/

### PDFLab Resources
- **Elite Guardian Guide**: [ELITE_GUARDIAN_DEPLOYMENT_GUIDE.md](ELITE_GUARDIAN_DEPLOYMENT_GUIDE.md)
- **Sentry Setup**: [SENTRY_ACTIVATION_COMPLETE.md](SENTRY_ACTIVATION_COMPLETE.md)
- **Monitoring Status**: [MONITORING_STATUS_2025-11-17.md](MONITORING_STATUS_2025-11-17.md)

### Contact
- **Email**: mmkela@gmail.com
- **Sentry Dashboard**: https://pdf-lab-pro.sentry.io
- **VPS**: ssh root@141.136.44.168

---

**Status**: 📖 GUIDE READY

**Next Action**: Follow steps above to create internal integration and copy token

**Documentation**: Keep this guide for future reference when setting up scripts and webhooks
