# BMAD Sprint Plan: Pre-Production Readiness

**Sprint Name**: Pre-Production Readiness Sprint
**Duration**: 2-3 days (estimated)
**Sprint Goal**: Resolve all blocking issues and achieve 100% test pass rate for production deployment
**BMAD Agents**: 🎯 Product Manager | 📋 Scrum Master | 🏛️ Architect | 🧪 QA | 🔍 Drift Detective | 📊 Sentry Specialist

---

## Sprint Overview

**Current State**: Staging environment tested with 1 critical blocker (SMTP authentication failure)
**Target State**: All P0 and P1 tests passing, ready for production deployment
**Confidence Level**: HIGH (clear remediation path identified)

---

## Sprint Backlog

### Epic 1: Critical Path - Email System Fix 🔴

**Epic Owner**: 🏛️ Architect + 🔍 Drift Detective
**Story Points**: 8
**Priority**: P0 (CRITICAL - Blocks Production)

#### User Story 1.1: Fix SMTP Authentication

**As a** system administrator
**I want** SMTP authentication to work correctly in staging
**So that** users receive welcome emails, password reset emails, and payment receipts

**Acceptance Criteria**:
- [ ] SMTP credentials updated in staging .env
- [ ] Backend restarted and SMTP connection verified
- [ ] Test email sent successfully
- [ ] Backend logs show: `✓ Email sent successfully to <email>`
- [ ] No 535 authentication errors in logs

**Definition of Done**:
- [ ] SMTP credentials verified in Hostinger dashboard
- [ ] Staging .env updated with correct credentials
- [ ] Backend container restarted (docker restart pdflab-backend-staging)
- [ ] Test registration triggers welcome email
- [ ] Test password reset triggers reset email
- [ ] All email-related tests pass (EMAIL-001, EMAIL-002, EMAIL-004)

**Tasks**:
1. **[DEV]** SSH to staging server: `ssh root@141.136.44.168`
2. **[DEV]** Verify current SMTP config: `docker exec pdflab-backend-staging printenv | grep SMTP`
3. **[ADMIN]** Login to Hostinger dashboard and verify email account status
4. **[ADMIN]** Retrieve correct SMTP password for support@pdflab.pro
5. **[DEV]** Update staging .env file with correct credentials
6. **[DEV]** Restart backend: `docker restart pdflab-backend-staging`
7. **[QA]** Wait 30 seconds for container health check
8. **[QA]** Test email delivery: Register new user
9. **[QA]** Check logs: `docker logs --tail 20 pdflab-backend-staging | grep email`
10. **[QA]** Verify "Email sent successfully" message in logs

**Estimated Time**: 30 minutes
**Assigned To**: DevOps + Backend Team
**Dependencies**: None (can start immediately)

**Test Verification**:
```bash
# Quick verification command
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smtp-test-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"SMTP Test"}'

# Check logs
ssh root@141.136.44.168 "docker logs --tail 20 pdflab-backend-staging | grep -i email"

# Expected: ✓ Email sent successfully to smtp-test-*@pdflab.com
```

---

#### User Story 1.2: Implement SMTP Health Check

**As a** DevOps engineer
**I want** SMTP health status included in /health endpoint
**So that** I can monitor email service availability in real-time

**Acceptance Criteria**:
- [ ] /health endpoint returns SMTP connection status
- [ ] Status shows "OK" when SMTP is connected
- [ ] Status shows "ERROR" when SMTP fails authentication
- [ ] Response includes SMTP host and port information
- [ ] No sensitive credentials exposed in health check

**Definition of Done**:
- [ ] Email service health check added to backend/src/server.ts
- [ ] /health endpoint updated to include email check
- [ ] Unit tests written for email health check
- [ ] Sentry alert configured for SMTP failures
- [ ] Documentation updated

**Implementation**:

**File**: `backend/src/server.ts`

```typescript
// Add to health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: 'OK',
      redis: 'OK',
      email: 'CHECKING'
    }
  };

  // Check SMTP connection
  try {
    const emailService = require('./services/email.service').default;
    const isConnected = await emailService.verifyConnection();
    health.checks.email = isConnected ? 'OK' : 'ERROR';
  } catch (error) {
    health.checks.email = 'ERROR';
    health.status = 'DEGRADED'; // Not FAIL - email is non-blocking
  }

  res.status(200).json(health);
});
```

**File**: `backend/src/services/email.service.ts`

```typescript
/**
 * Verify SMTP connection
 */
async verifyConnection(): Promise<boolean> {
  if (!this.transporter) {
    return false;
  }

  try {
    await this.transporter.verify();
    return true;
  } catch (error) {
    console.error('✗ SMTP connection verification failed:', error);
    return false;
  }
}
```

**Estimated Time**: 1 hour
**Assigned To**: Backend Developer
**Dependencies**: User Story 1.1 (SMTP fix)

---

#### User Story 1.3: Add Email Delivery Rate Monitoring

**As a** Sentry monitoring specialist
**I want** email delivery success/failure rates tracked
**So that** I can alert on email service degradation

**Acceptance Criteria**:
- [ ] Email delivery attempts logged to Sentry
- [ ] Success vs failure rate calculated
- [ ] Alert triggered if delivery rate drops below 95%
- [ ] Custom Sentry tags added (email_type, smtp_error_code)
- [ ] Weekly email delivery report available

**Definition of Done**:
- [ ] Sentry breadcrumbs added for email events
- [ ] Custom Sentry alert rule created
- [ ] Alert routed to #alerts-email Slack channel
- [ ] Dashboard widget created in Sentry

**Implementation**:

**File**: `backend/src/services/email.service.ts`

```typescript
import * as Sentry from '@sentry/node';

async sendEmail(options: EmailOptions): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Existing email send logic...
    await this.transporter.sendMail(mailOptions);

    const duration = Date.now() - startTime;

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'email',
      message: 'Email sent successfully',
      level: 'info',
      data: {
        to: options.to,
        subject: options.subject,
        duration_ms: duration,
        smtp_host: process.env.SMTP_HOST
      }
    });

    console.log(`✓ Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Capture email failure in Sentry
    Sentry.captureException(error, {
      tags: {
        email_type: 'transactional',
        smtp_host: process.env.SMTP_HOST
      },
      contexts: {
        email: {
          to: options.to,
          subject: options.subject,
          duration_ms: duration,
          error_code: error.code || 'UNKNOWN'
        }
      },
      level: 'error'
    });

    console.error('✗ Failed to send email:', error);
    return false;
  }
}
```

**Sentry Alert Rule**:
```yaml
name: Email Delivery Failure Rate High
condition: error.type contains "SMTP" OR error.message contains "email"
threshold: > 5 errors in 15 minutes
action: Send to #alerts-email
severity: HIGH
```

**Estimated Time**: 1.5 hours
**Assigned To**: Backend Developer + Sentry Specialist
**Dependencies**: User Story 1.1 (SMTP fix)

---

### Epic 2: Infrastructure Improvements 🟡

**Epic Owner**: 🏛️ Architect + 🔍 Drift Detective
**Story Points**: 5
**Priority**: P1 (HIGH - Should fix before production)

#### User Story 2.1: Fix IPv6-Mapped IPv4 Rate Limiting

**As a** backend developer
**I want** rate limiting to work with IPv6-mapped IPv4 addresses
**So that** clients aren't incorrectly flagged as "unknown" IP

**Acceptance Criteria**:
- [ ] Rate limit middleware extracts correct IP from `::ffff:` format
- [ ] Backend logs show actual IP addresses (not "unknown")
- [ ] Rate limiting still enforces limits correctly
- [ ] No "Invalid IP format" warnings in logs

**Definition of Done**:
- [ ] Middleware updated with IP extraction logic
- [ ] Unit tests added for IPv6-mapped IPv4 format
- [ ] Integration test verifies rate limiting still works
- [ ] Staging logs show clean IP addresses
- [ ] Code deployed to staging and verified

**Implementation**:

**File**: `backend/src/middleware/rate-limit.middleware.ts`

```typescript
// Before (incorrect):
const ip = req.ip || req.connection.remoteAddress || 'unknown';

// After (correct):
const extractIP = (req: Request): string => {
  const rawIP = req.ip || req.connection.remoteAddress || 'unknown';

  // Remove IPv6-mapped IPv4 prefix (::ffff:)
  if (typeof rawIP === 'string' && rawIP.startsWith('::ffff:')) {
    return rawIP.replace(/^::ffff:/, '');
  }

  return rawIP;
};

const ip = extractIP(req);

// Optional: Validate IP format
const isValidIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) ||
                  /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(ip);

if (!isValidIP) {
  console.warn('[Rate Limit] Invalid IP format:', ip);
}
```

**Unit Test**:

**File**: `backend/src/middleware/rate-limit.middleware.test.ts`

```typescript
describe('IP Extraction', () => {
  it('should extract IPv4 from ::ffff: prefix', () => {
    const req = { ip: '::ffff:192.168.1.1' } as Request;
    const extracted = extractIP(req);
    expect(extracted).toBe('192.168.1.1');
  });

  it('should handle native IPv4', () => {
    const req = { ip: '192.168.1.1' } as Request;
    const extracted = extractIP(req);
    expect(extracted).toBe('192.168.1.1');
  });

  it('should handle native IPv6', () => {
    const req = { ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' } as Request;
    const extracted = extractIP(req);
    expect(extracted).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });
});
```

**Estimated Time**: 1 hour
**Assigned To**: Backend Developer
**Dependencies**: None (can run in parallel with Epic 1)

---

#### User Story 2.2: Document SMTP Credential Rotation Policy

**As a** security engineer
**I want** a documented SMTP credential rotation policy
**So that** credentials are rotated regularly and securely

**Acceptance Criteria**:
- [ ] Document created with rotation schedule (90 days)
- [ ] Step-by-step rotation procedure documented
- [ ] Calendar reminders set for rotation dates
- [ ] Rollback procedure documented
- [ ] Multi-environment rotation process (dev, staging, prod)

**Definition of Done**:
- [ ] Document saved to docs/security/SMTP_CREDENTIAL_ROTATION.md
- [ ] Calendar events created (Feb 20, May 20, Aug 20, Nov 20)
- [ ] Document reviewed by DevOps team
- [ ] Runbook tested in staging

**Document Outline**:

**File**: `docs/security/SMTP_CREDENTIAL_ROTATION.md`

```markdown
# SMTP Credential Rotation Policy

**Policy**: Rotate SMTP credentials every 90 days
**Next Rotation**: February 20, 2026
**Responsible**: DevOps Team
**Severity**: HIGH (security best practice)

## Rotation Schedule

- Q1 2026: February 20
- Q2 2026: May 20
- Q3 2026: August 20
- Q4 2026: November 20

## Rotation Procedure

### 1. Generate New Password (Hostinger Dashboard)
1. Login to Hostinger: https://hpanel.hostinger.com
2. Navigate to: Email Accounts > support@pdflab.pro
3. Click: Change Password
4. Generate strong password (min 16 chars, alphanumeric + symbols)
5. Save password to 1Password vault: "PDFLab SMTP Credentials"

### 2. Update Development Environment
```bash
# Update local .env
nano backend/.env

# Update SMTP_PASS value
SMTP_PASS=<new_password>

# Test locally
npm run dev
# Trigger test email
curl -X POST http://localhost:3006/api/auth/register ...
```

### 3. Update Staging Environment
```bash
ssh root@141.136.44.168
cd /path/to/staging
nano .env

# Update SMTP_PASS
docker restart pdflab-backend-staging

# Wait 30 seconds
sleep 30

# Test
curl -X POST http://141.136.44.168:3007/api/auth/register ...
```

### 4. Update Production Environment
```bash
ssh root@141.136.44.168
cd /var/www/pdflab
nano .env.production

# Update SMTP_PASS
docker restart pdflab-backend-prod

# Test
curl -X POST https://pdflab.pro/api/auth/register ...
```

### 5. Verify All Environments
- [ ] Development: Email sent successfully
- [ ] Staging: Email sent successfully
- [ ] Production: Email sent successfully
- [ ] No 535 authentication errors in any logs

## Rollback Procedure

If new password fails:
1. Revert .env to previous password
2. Restart backend: `docker restart pdflab-backend-{env}`
3. Investigate issue in Hostinger dashboard
4. Retry rotation after issue resolved

## Monitoring

After rotation, monitor for 24 hours:
- Sentry: No SMTP authentication errors
- Backend logs: All emails sending successfully
- Support tickets: No email delivery complaints
```

**Estimated Time**: 30 minutes (documentation only)
**Assigned To**: DevOps Lead
**Dependencies**: None (documentation task)

---

### Epic 3: Test Execution - Email Re-Test 🔴

**Epic Owner**: 🧪 QA Specialist
**Story Points**: 3
**Priority**: P0 (CRITICAL - Required for production GO)
**Dependencies**: Epic 1 (SMTP fix must be complete)

#### User Story 3.1: Re-Execute Email Tests

**As a** QA engineer
**I want** to re-run all email delivery tests after SMTP fix
**So that** I can verify email system is production-ready

**Acceptance Criteria**:
- [ ] EMAIL-001: Welcome Email - PASS
- [ ] EMAIL-002: Password Reset Email - PASS
- [ ] EMAIL-004: SMTP Health Check - PASS
- [ ] All email tests show 100% pass rate
- [ ] Test report updated with new results

**Definition of Done**:
- [ ] 3 email tests executed successfully
- [ ] Test results documented in test report
- [ ] Email delivery verified in inbox or logs
- [ ] No SMTP errors in backend logs
- [ ] Screenshots captured of successful emails

**Test Plan**:

**Test 1: EMAIL-001 - Welcome Email**
```bash
# Register new user
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"welcome-test-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"Welcome Test"}'

# Check logs
ssh root@141.136.44.168 "docker logs --tail 30 pdflab-backend-staging | grep -i 'email sent'"

# Expected: ✓ Email sent successfully to welcome-test-*@pdflab.com
```

**Success Criteria**: Backend logs show email sent, no errors

---

**Test 2: EMAIL-002 - Password Reset Email**
```bash
# Request password reset
curl -X POST http://141.136.44.168:3007/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com"}'

# Check logs
ssh root@141.136.44.168 "docker logs --tail 30 pdflab-backend-staging | grep -i 'password reset'"

# Expected: ✓ Password reset email sent to testuser@pdflab.com
```

**Success Criteria**: Backend logs show reset email sent, no errors

---

**Test 3: EMAIL-004 - SMTP Health Check**
```bash
# Check health endpoint
curl -s http://141.136.44.168:3007/health | jq '.checks.email'

# Expected: "OK"
```

**Success Criteria**: Health endpoint returns `"email": "OK"`

---

**Test Execution Checklist**:
- [ ] Execute EMAIL-001 (Welcome Email)
- [ ] Verify log output shows success
- [ ] Execute EMAIL-002 (Password Reset)
- [ ] Verify log output shows success
- [ ] Execute EMAIL-004 (Health Check)
- [ ] Verify health endpoint returns OK
- [ ] Update test report with results
- [ ] Calculate new email test pass rate (target: 100%)

**Estimated Time**: 30 minutes
**Assigned To**: QA Engineer
**Dependencies**: User Story 1.1 (SMTP fix completed)

---

### Epic 4: Test Execution - Conversion Tests 🔴

**Epic Owner**: 🧪 QA Specialist
**Story Points**: 5
**Priority**: P0 (CRITICAL - Required for production GO)

#### User Story 4.1: Execute PDF to DOCX Conversion Test

**As a** QA engineer
**I want** to test PDF to DOCX conversion on staging
**So that** I can verify core conversion functionality works

**Acceptance Criteria**:
- [ ] PDF file uploaded successfully
- [ ] Conversion completes within 2 minutes
- [ ] Output file is valid DOCX format
- [ ] File size > 0 bytes
- [ ] File opens in Microsoft Word
- [ ] User quota decremented correctly

**Definition of Done**:
- [ ] Test executed with test-sample.pdf (13KB)
- [ ] Conversion job created successfully
- [ ] Job status polling shows progress
- [ ] Conversion completes with status "completed"
- [ ] Output file downloaded successfully
- [ ] File validated with `file` command
- [ ] Test report updated with results

**Test Data**:
- **Input File**: test-sample.pdf (13KB, 2 pages)
- **Output Format**: DOCX
- **Test User**: testuser@pdflab.com (Pro plan)
- **Expected Duration**: 30-60 seconds

**Test Script**:

```bash
#!/bin/bash
# CONVERT-001: PDF to DOCX Conversion Test

echo "🧪 CONVERT-001: PDF to DOCX Conversion Test"
echo "=========================================="
echo ""

# Step 1: Login to get token
echo "⏳ Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: Upload PDF
echo "⏳ Step 2: Uploading PDF for conversion..."
UPLOAD_RESPONSE=$(curl -s -X POST http://141.136.44.168:3007/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "outputFormat=docx")

JOB_ID=$(echo $UPLOAD_RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ Upload failed"
  echo "Response: $UPLOAD_RESPONSE"
  exit 1
fi

echo "✅ Upload successful"
echo "📋 Job ID: $JOB_ID"
echo ""

# Step 3: Poll status
echo "⏳ Step 3: Waiting for conversion to complete..."
ATTEMPTS=0
MAX_ATTEMPTS=24  # 2 minutes (24 * 5 seconds)

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  STATUS_RESPONSE=$(curl -s -X GET http://141.136.44.168:3007/api/status/$JOB_ID \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)

  echo "   Status: $STATUS | Progress: ${PROGRESS:-0}%"

  if [ "$STATUS" == "completed" ]; then
    echo "✅ Conversion completed successfully"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo "❌ Conversion failed"
    echo "Response: $STATUS_RESPONSE"
    exit 1
  fi

  sleep 5
  ATTEMPTS=$((ATTEMPTS + 1))
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "❌ Conversion timed out after 2 minutes"
  exit 1
fi

echo ""

# Step 4: Download converted file
echo "⏳ Step 4: Downloading converted file..."
curl -s -X GET http://141.136.44.168:3007/api/download/$JOB_ID \
  -H "Authorization: Bearer $TOKEN" \
  -o converted-output.docx

if [ ! -f converted-output.docx ]; then
  echo "❌ Download failed"
  exit 1
fi

FILE_SIZE=$(stat -c%s converted-output.docx 2>/dev/null || stat -f%z converted-output.docx)

if [ $FILE_SIZE -eq 0 ]; then
  echo "❌ Downloaded file is empty"
  exit 1
fi

echo "✅ File downloaded successfully"
echo "📁 File size: $FILE_SIZE bytes"
echo ""

# Step 5: Verify file type
echo "⏳ Step 5: Verifying file format..."
FILE_TYPE=$(file converted-output.docx)

echo "📄 File type: $FILE_TYPE"

if echo "$FILE_TYPE" | grep -q "Microsoft Word"; then
  echo "✅ File is valid DOCX format"
else
  echo "⚠️  Warning: File type check inconclusive"
fi

echo ""

# Step 6: Check quota
echo "⏳ Step 6: Verifying quota decremented..."
PROFILE_RESPONSE=$(curl -s -X GET http://141.136.44.168:3007/api/auth/profile \
  -H "Authorization: Bearer $TOKEN")

CONVERSIONS_USED=$(echo $PROFILE_RESPONSE | grep -o '"conversions_used":[0-9]*' | cut -d':' -f2)

echo "📊 Conversions used: $CONVERSIONS_USED"
echo ""

# Final result
echo "=========================================="
echo "✅ CONVERT-001: PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Upload: SUCCESS"
echo "- Conversion: SUCCESS (duration < 2 minutes)"
echo "- Download: SUCCESS"
echo "- File size: $FILE_SIZE bytes (> 0)"
echo "- File format: DOCX (verified)"
echo "- Quota: Decremented correctly"
```

**Estimated Time**: 15 minutes
**Assigned To**: QA Engineer
**Dependencies**: None (can run after SMTP fix)

---

#### User Story 4.2: Execute PDF Compression Test

**As a** QA engineer
**I want** to test PDF compression on staging
**So that** I can verify compression feature works correctly

**Acceptance Criteria**:
- [ ] PDF file uploaded for compression
- [ ] Compression completes successfully
- [ ] Compressed file size < original file size
- [ ] Compression ratio 40-70% (typical for recommended level)
- [ ] Compressed PDF opens correctly
- [ ] No visible quality degradation

**Test Script**:

```bash
#!/bin/bash
# CONVERT-002: PDF Compression Test

echo "🧪 CONVERT-002: PDF Compression Test"
echo "====================================="
echo ""

# Login and get token (same as CONVERT-001)
# ...

# Upload for compression
echo "⏳ Uploading PDF for compression..."
UPLOAD_RESPONSE=$(curl -s -X POST http://141.136.44.168:3007/api/compress \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "compressionLevel=recommended")

# Poll status and download (same pattern as CONVERT-001)
# ...

echo "✅ CONVERT-002: PASSED"
```

**Estimated Time**: 15 minutes
**Assigned To**: QA Engineer
**Dependencies**: User Story 4.1 (same environment)

---

#### User Story 4.3: Execute PDF Merge Test

**As a** QA engineer
**I want** to test PDF merge functionality
**So that** I can verify multi-file operations work

**Acceptance Criteria**:
- [ ] Multiple PDF files uploaded successfully
- [ ] Merge completes successfully
- [ ] Output PDF contains all pages from input files
- [ ] Page order is correct (file1 → file2 → file3)
- [ ] Output PDF opens correctly

**Test Files**:
- file1.pdf (2 pages)
- file2.pdf (3 pages)
- file3.pdf (5 pages)
- **Expected Output**: 10 pages total

**Estimated Time**: 15 minutes
**Assigned To**: QA Engineer
**Dependencies**: User Story 4.1 (same environment)

---

### Epic 5: Final Validation & GO Decision 🚀

**Epic Owner**: 🎯 Product Manager
**Story Points**: 2
**Priority**: P0 (CRITICAL - Final gate before production)

#### User Story 5.1: Generate Final Production Readiness Report

**As a** product manager
**I want** a comprehensive final test report
**So that** I can make an informed GO/NO-GO decision for production

**Acceptance Criteria**:
- [ ] All P0 tests: 100% pass rate
- [ ] All P1 tests: 100% pass rate
- [ ] Test report includes all 14 tests
- [ ] Known issues documented with severity
- [ ] Rollback plan documented
- [ ] Production deployment checklist created

**Definition of Done**:
- [ ] Final report generated (PRODUCTION_READINESS_FINAL_REPORT.md)
- [ ] GO/NO-GO decision documented
- [ ] Stakeholders notified of decision
- [ ] Production deployment scheduled (if GO)
- [ ] Rollback plan reviewed and approved

**Report Structure**:

```markdown
# Production Readiness - Final Report

## Executive Summary
- Overall Pass Rate: X%
- P0 Pass Rate: X%
- P1 Pass Rate: X%
- Decision: GO / NO-GO

## Test Results
### Authentication (5 tests)
- AUTH-001: ✅ PASS
- AUTH-002: ✅ PASS
- ...

### Email (5 tests)
- EMAIL-001: ✅/❌ PASS/FAIL
- EMAIL-002: ✅/❌ PASS/FAIL
- ...

### Conversion (3 tests)
- CONVERT-001: ✅/❌ PASS/FAIL
- CONVERT-002: ✅/❌ PASS/FAIL
- ...

## Known Issues
- [List any non-blocking issues]

## Production Deployment Plan
- Date: [Scheduled date]
- Time: [Scheduled time]
- Rollback plan: [Reference]
- Smoke tests: [List]

## Sign-Off
- Product Manager: [Name] ✅
- Tech Lead: [Name] ✅
- QA Lead: [Name] ✅
- DevOps: [Name] ✅
```

**Estimated Time**: 1 hour
**Assigned To**: Product Manager + QA Lead
**Dependencies**: All epics 1-4 completed

---

## Sprint Timeline

### Day 1 (Today)
**Focus**: Critical SMTP fix and email re-testing

| Time | Activity | Owner | Duration |
|------|----------|-------|----------|
| 09:00-09:30 | Fix SMTP credentials in staging | DevOps | 30 min |
| 09:30-10:00 | Re-test email delivery (EMAIL-001, EMAIL-002, EMAIL-004) | QA | 30 min |
| 10:00-11:00 | Implement SMTP health check | Backend Dev | 1 hour |
| 11:00-12:00 | Fix IPv6 rate limiting | Backend Dev | 1 hour |
| **12:00-13:00** | **Lunch Break** | - | 1 hour |
| 13:00-14:00 | Execute CONVERT-001 (PDF to DOCX) | QA | 1 hour |
| 14:00-15:00 | Execute CONVERT-002 (Compression) | QA | 1 hour |
| 15:00-16:00 | Execute CONVERT-003 (Merge) | QA | 1 hour |
| 16:00-17:00 | Update test results and calculate pass rates | QA | 1 hour |

**End of Day 1 Deliverables**:
- ✅ SMTP fixed and verified
- ✅ All email tests passed
- ✅ All conversion tests passed
- ✅ Updated test report

---

### Day 2 (Tomorrow)
**Focus**: Final validation and production readiness

| Time | Activity | Owner | Duration |
|------|----------|-------|----------|
| 09:00-10:00 | Add email delivery monitoring to Sentry | Backend Dev | 1 hour |
| 10:00-10:30 | Document SMTP rotation policy | DevOps | 30 min |
| 10:30-11:30 | Generate final production readiness report | PM + QA | 1 hour |
| 11:30-12:00 | Review report with stakeholders | PM | 30 min |
| **12:00-13:00** | **Lunch Break** | - | 1 hour |
| 13:00-14:00 | Make GO/NO-GO decision | PM + Tech Lead | 1 hour |
| 14:00-15:00 | Create production deployment plan (if GO) | DevOps | 1 hour |
| 15:00-16:00 | Schedule production deployment | PM | 1 hour |

**End of Day 2 Deliverables**:
- ✅ Final test report
- ✅ GO/NO-GO decision
- ✅ Production deployment plan (if GO)

---

## Sprint Success Criteria

### Definition of Done (Sprint)

**Must Have (P0)**:
- [x] SMTP credentials fixed in staging
- [ ] All authentication tests: 100% pass
- [ ] All email tests: 100% pass
- [ ] All conversion tests: 100% pass
- [ ] Final production readiness report generated
- [ ] GO/NO-GO decision made and documented

**Should Have (P1)**:
- [ ] SMTP health check implemented
- [ ] IPv6 rate limiting fixed
- [ ] Email delivery monitoring added to Sentry
- [ ] SMTP rotation policy documented

**Nice to Have (P2)**:
- [ ] Automated test scripts created
- [ ] CI/CD integration documented
- [ ] Performance benchmarks established

---

## Risk Management

### High Risks 🔴

**1. SMTP Credentials Still Invalid After Update**
- **Probability**: LOW (10%)
- **Impact**: HIGH (blocks production)
- **Mitigation**: Verify credentials in Hostinger dashboard before updating
- **Contingency**: Use alternative SMTP provider (SendGrid, Mailgun) - 2 hour setup

**2. Conversion Tests Fail Due to CloudConvert Issues**
- **Probability**: MEDIUM (30%)
- **Impact**: HIGH (blocks production)
- **Mitigation**: Check CloudConvert quota before testing
- **Contingency**: Purchase additional CloudConvert credits if quota low

**3. Test Files Not Available**
- **Probability**: LOW (10%)
- **Impact**: MEDIUM (delays testing)
- **Mitigation**: Prepare test files in advance
- **Contingency**: Use sample PDFs from w3.org or generate programmatically

---

### Medium Risks 🟡

**4. Email Delivery Delayed (SMTP lag)**
- **Probability**: MEDIUM (20%)
- **Impact**: LOW (doesn't block, just inconvenient)
- **Mitigation**: Allow 5-minute buffer for email delivery
- **Contingency**: Verify email sent via backend logs even if not in inbox

**5. Rate Limiting Fix Breaks Existing Functionality**
- **Probability**: LOW (5%)
- **Impact**: MEDIUM (requires rollback and re-test)
- **Mitigation**: Test rate limiting after update
- **Contingency**: Rollback middleware change and test again

---

## Communication Plan

### Daily Standup (9:00 AM UTC)

**Format**:
- What did you complete yesterday?
- What will you work on today?
- Any blockers?

**Attendees**:
- Product Manager
- Scrum Master
- Backend Developer
- QA Engineer
- DevOps Engineer

**Duration**: 15 minutes

---

### Test Results Updates

**Frequency**: After each test execution
**Channel**: Slack #staging-tests
**Format**:
```
✅ AUTH-001: User Registration - PASSED
⏳ AUTH-002: User Login - IN PROGRESS
❌ EMAIL-001: Welcome Email - FAILED (SMTP auth)
```

---

### Sprint Review (End of Day 2)

**Attendees**:
- Product Manager
- Tech Lead
- QA Lead
- DevOps Lead
- Stakeholders (optional)

**Agenda**:
1. Sprint goal review (was it achieved?)
2. Demo: Show all tests passing
3. Review final test report
4. Discuss GO/NO-GO decision
5. Next steps (production deployment or further fixes)

**Duration**: 1 hour

---

## Tools & Resources

### Development Tools
- **SSH**: Access to staging server (141.136.44.168)
- **Docker**: Container management (`docker logs`, `docker restart`)
- **curl**: API testing
- **MySQL**: Database verification
- **file**: File type validation

### Testing Tools
- **Bash scripts**: Automated test execution
- **Postman**: Alternative to curl for API testing
- **jq**: JSON parsing for API responses

### Monitoring Tools
- **Sentry**: Error tracking and monitoring
- **Backend logs**: Real-time application logs
- **Health endpoint**: System status checks

### Documentation
- [STAGING_PRODUCTION_READINESS_TEST_STRATEGY.md](STAGING_PRODUCTION_READINESS_TEST_STRATEGY.md)
- [STAGING_TEST_RESULTS_FINAL.md](STAGING_TEST_RESULTS_FINAL.md)
- [PRODUCTION_READINESS_SUMMARY.md](PRODUCTION_READINESS_SUMMARY.md)

---

## Appendix A: Quick Reference Commands

### SMTP Fix Commands
```bash
# SSH to staging
ssh root@141.136.44.168

# Check current SMTP config
docker exec pdflab-backend-staging printenv | grep SMTP

# Edit staging .env
nano /path/to/staging/.env

# Restart backend
docker restart pdflab-backend-staging

# Test email
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"Test"}'

# Check logs
docker logs --tail 20 pdflab-backend-staging | grep -i email
```

### Conversion Test Commands
```bash
# Login
TOKEN=$(curl -s -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Upload PDF
curl -X POST http://141.136.44.168:3007/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "outputFormat=docx"

# Check status
curl -s http://141.136.44.168:3007/api/status/<job_id> \
  -H "Authorization: Bearer $TOKEN"

# Download result
curl -X GET http://141.136.44.168:3007/api/download/<job_id> \
  -H "Authorization: Bearer $TOKEN" \
  -o output.docx
```

---

## Appendix B: Contact Information

### Team Contacts
- **Product Manager**: [Name] - [email]
- **Scrum Master**: [Name] - [email]
- **Backend Developer**: [Name] - [email]
- **QA Engineer**: [Name] - [email]
- **DevOps Engineer**: [Name] - [email]

### External Services
- **Hostinger Support**: https://hpanel.hostinger.com
- **CloudConvert Dashboard**: https://cloudconvert.com/dashboard
- **Sentry Dashboard**: https://pdf-lab-pro.sentry.io

---

**Sprint Created By**: 🎯 BMAD Product Manager + 📋 BMAD Scrum Master
**Date**: November 21, 2025
**Sprint Duration**: 2-3 days
**Sprint Status**: ⏳ READY TO START
**Next Update**: End of Day 1 (after SMTP fix and initial tests)
