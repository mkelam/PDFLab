# SMTP Authentication Fix Guide

**Date**: November 21, 2025
**Issue**: SMTP authentication failure (535 error)
**BMAD Team**: 🏛️ Architect + 🔍 Drift Detective + 📊 Sentry Specialist

---

## Current Situation

### SMTP Configuration Found
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=support@pdflab.pro
SMTP_PASS=<SMTP_PASS>
SMTP_FROM_EMAIL=support@pdflab.pro
SMTP_FROM_NAME=PDFLab
SMTP_SECURE=false
```

### Error Message
```
✗ Failed to send email: Error: Invalid login: 535 5.7.8 Error: authentication failed: (reason unavailable)
code: 'EAUTH'
```

---

## 🔍 Root Cause Analysis (BMAD Drift Detective)

**Error Code 535**: SMTP authentication failure
**Possible Causes**:
1. ✅ Password is correct but special character handling issue
2. ⚠️ Password expired or changed in Hostinger
3. ⚠️ Account locked due to failed login attempts
4. ⚠️ Two-factor authentication enabled
5. ⚠️ IP address blocked by Hostinger
6. ⚠️ Special characters in password need escaping

### Most Likely Cause
The password `<SMTP_PASS>` contains a special character `!` which may need special handling in the .env file.

**Why This Happens**:
- Shell interprets `!` as history expansion
- Docker environment variables may parse `!` differently
- Need to properly quote or escape the password

---

## 🔧 Fix Options

### Option 1: Escape Special Characters (Quick Fix - 5 minutes)

**Step 1**: SSH to staging server
```bash
ssh root@141.136.44.168
```

**Step 2**: Find the staging .env file
```bash
# Typical locations:
cd /var/www/pdflab-staging
# OR
cd /root/pdflab-staging
# OR
docker inspect pdflab-backend-staging | grep -i env
```

**Step 3**: Edit .env file
```bash
nano .env
```

**Step 4**: Update SMTP_PASS with proper quoting
```bash
# Current (may be causing issues):
SMTP_PASS=<SMTP_PASS>

# Fix Option A - Single quotes (recommended):
SMTP_PASS='<SMTP_PASS>'

# Fix Option B - Escape exclamation mark:
SMTP_PASS=Jesus24\!7

# Fix Option C - Double quotes:
SMTP_PASS="<SMTP_PASS>"
```

**Step 5**: Save and exit (Ctrl+X, Y, Enter)

**Step 6**: Restart backend
```bash
docker restart pdflab-backend-staging
```

**Step 7**: Wait for health check
```bash
sleep 30
```

**Step 8**: Test email delivery
```bash
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smtp-fix-test-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"SMTP Fix Test"}'
```

**Step 9**: Check logs for success
```bash
docker logs --tail 30 pdflab-backend-staging | grep -i email
```

**Expected Result**: `✓ Email sent successfully to smtp-fix-test-*@pdflab.com`

---

### Option 2: Change Password (If Option 1 Fails - 15 minutes)

**Why**: If special character escaping doesn't work, use a password without special characters

**Step 1**: Login to Hostinger
- URL: https://hpanel.hostinger.com
- Login with your Hostinger credentials

**Step 2**: Navigate to Email Accounts
- Click "Emails" in sidebar
- Find: support@pdflab.pro
- Click "Manage"

**Step 3**: Change Password
- Click "Change Password"
- Generate new password (recommendations):
  - 16+ characters
  - Mix of uppercase, lowercase, numbers
  - **Avoid special characters** for easier .env handling
  - Example: `PdfLabSupport2025Staging`

**Step 4**: Copy new password to clipboard

**Step 5**: Update staging .env
```bash
ssh root@141.136.44.168
cd /var/www/pdflab-staging  # Or your staging directory
nano .env

# Update line:
SMTP_PASS=PdfLabSupport2025Staging  # Your new password

# Save and exit
```

**Step 6**: Restart backend
```bash
docker restart pdflab-backend-staging
sleep 30
```

**Step 7**: Test email delivery (same as Option 1, Step 8-9)

---

### Option 3: Verify Hostinger Account Status (If Options 1-2 Fail - 10 minutes)

**Step 1**: Check Email Account Status in Hostinger
- Login: https://hpanel.hostinger.com
- Navigate to: Emails > support@pdflab.pro
- Verify:
  - ✅ Account is active (not suspended)
  - ✅ No "locked" status
  - ✅ Storage not full (quota check)
  - ✅ No 2FA enabled on SMTP

**Step 2**: Check SMTP Access Settings
- In email account settings, verify:
  - ✅ SMTP access is enabled
  - ✅ Port 587 is allowed (STARTTLS)
  - ✅ Authentication method is PLAIN or LOGIN

**Step 3**: Check IP Restrictions
- Verify no IP blocking for staging server IP: 141.136.44.168
- If IP blocking is enabled, whitelist staging server IP

**Step 4**: Test SMTP Manually
```bash
# Install telnet (if not available)
apt-get update && apt-get install -y telnet

# Test SMTP connection
telnet smtp.hostinger.com 587

# Expected response:
# 220 smtp.hostinger.com ESMTP

# Type: EHLO pdflab.pro
# Expected: 250-smtp.hostinger.com
#           250-AUTH PLAIN LOGIN
#           ...

# Exit: QUIT
```

---

## 🧪 Verification Steps (BMAD QA)

After applying any fix, verify email delivery:

### Test 1: Welcome Email (Registration)
```bash
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"welcome-verify-'$(date +%s)'@pdflab.com","password":"TestPass123!","name":"Welcome Test"}'
```

**Expected Logs**:
```
✓ Email service initialized with SMTP: smtp.hostinger.com
✓ Email sent successfully to welcome-verify-*@pdflab.com
```

**Success Criteria**: No 535 errors, log shows "Email sent successfully"

---

### Test 2: Password Reset Email
```bash
curl -X POST http://141.136.44.168:3007/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com"}'
```

**Expected Logs**:
```
✓ Password reset email sent to testuser@pdflab.com
```

**Success Criteria**: No 535 errors, log shows reset email sent

---

### Test 3: Health Endpoint (After implementing health check)
```bash
curl -s http://141.136.44.168:3007/health | jq '.checks.email'
```

**Expected Response**: `"OK"`

---

## 📊 Troubleshooting Guide (BMAD Sentry Specialist)

### If Still Getting 535 Errors

**1. Check Backend Logs for Detailed Error**
```bash
docker logs --tail 200 pdflab-backend-staging 2>&1 | grep -A 10 "EAUTH"
```

**2. Verify .env File Was Updated**
```bash
docker exec pdflab-backend-staging printenv | grep SMTP
```

**3. Check If Container Restarted Correctly**
```bash
docker ps | grep pdflab-backend-staging
# Should show "Up X seconds" (recent restart)
```

**4. Test SMTP Credentials Manually**
```bash
# Create test script
cat > test-smtp.js << 'EOF'
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'support@pdflab.pro',
    pass: process.env.SMTP_PASS || '<SMTP_PASS>'
  }
});

transporter.verify()
  .then(() => console.log('✓ SMTP connection successful'))
  .catch(err => console.error('✗ SMTP connection failed:', err.message));
EOF

# Run test
docker exec pdflab-backend-staging node /tmp/test-smtp.js
```

---

### Alternative SMTP Providers (If Hostinger Fails)

If Hostinger SMTP continues to fail, consider these alternatives:

**1. SendGrid** (Recommended)
- Free tier: 100 emails/day
- Setup time: 10 minutes
- Configuration:
  ```
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASS=<your_sendgrid_api_key>
  ```

**2. Mailgun**
- Free tier: 100 emails/day
- Setup time: 15 minutes
- Good for transactional emails

**3. Amazon SES**
- Very cheap ($0.10 per 1,000 emails)
- Setup time: 30 minutes
- Requires AWS account

---

## 🎯 Success Criteria

**SMTP Fix is Complete When**:
- [ ] No 535 authentication errors in logs
- [ ] Test registration sends welcome email successfully
- [ ] Test password reset sends reset email successfully
- [ ] Backend logs show: `✓ Email sent successfully`
- [ ] Health endpoint returns `"email": "OK"` (after implementing health check)
- [ ] At least 3 consecutive successful email deliveries

---

## 📝 Next Steps After SMTP Fix

### Immediate (Today)
1. ✅ SMTP credentials fixed
2. ⏳ Re-run EMAIL-001 test (Welcome Email)
3. ⏳ Re-run EMAIL-002 test (Password Reset)
4. ⏳ Re-run EMAIL-004 test (SMTP Health Check)
5. ⏳ Update test results report

### Short-Term (This Week)
1. Implement SMTP health check in /health endpoint
2. Add email delivery monitoring to Sentry
3. Document SMTP credential rotation policy
4. Set up calendar reminders for credential rotation

---

## 🔐 Security Best Practices

**After SMTP Fix**:

1. **Store Password Securely**
   - Don't commit SMTP password to git
   - Use environment-specific secret managers
   - Rotate credentials every 90 days

2. **Monitor Email Delivery**
   - Track delivery success rate (target: >99%)
   - Alert if delivery rate drops below 95%
   - Log all email attempts for audit trail

3. **Implement Rate Limiting**
   - Limit emails per user per hour (e.g., 10 emails/hour)
   - Prevent email bombing attacks
   - Add captcha to registration if email abuse detected

---

## 📞 Escalation Path

**If SMTP Still Fails After All Fixes**:

1. **Contact Hostinger Support** (Priority 1)
   - URL: https://www.hostinger.com/contact
   - Live chat available 24/7
   - Provide: Account email, server IP (141.136.44.168), error logs

2. **Switch to Alternative SMTP Provider** (Priority 2)
   - Recommended: SendGrid (10 min setup)
   - Fallback: Mailgun or Amazon SES

3. **Implement Email Queue with Retry Logic** (Priority 3)
   - Use Bull queue for email jobs
   - Retry failed emails after 5 minutes
   - Alert after 3 failed attempts

---

## 📊 Monitoring & Alerts (Post-Fix)

**Sentry Alerts to Configure**:

1. **SMTP Authentication Failure**
   - Trigger: Error code EAUTH
   - Severity: HIGH
   - Action: Slack #alerts-critical

2. **Email Delivery Rate Drop**
   - Trigger: Success rate < 95% over 1 hour
   - Severity: MEDIUM
   - Action: Slack #alerts-email

3. **SMTP Connection Timeout**
   - Trigger: Connection timeout > 10 seconds
   - Severity: LOW
   - Action: Log only (investigate if recurring)

---

**Document Owner**: 🏛️ BMAD Architect + 🔍 BMAD Drift Detective
**Last Updated**: November 21, 2025
**Status**: ⏳ READY FOR EXECUTION
**Next Update**: After SMTP fix attempt
