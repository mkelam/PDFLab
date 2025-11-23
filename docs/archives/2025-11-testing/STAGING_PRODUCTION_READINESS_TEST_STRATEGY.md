# PDFLab Staging Environment - Production Readiness Test Strategy

**Date**: November 21, 2025 (2025-11-21)
**Version**: v1.3.0 (Phase 1 Complete)
**Test Focus**: Authentication | Core PDF Conversion | Email Delivery
**Environment**: Staging (http://141.136.44.168:3007)
**BMAD Agents**: 🏛️ Architect + 🧪 QA Specialist

---

## Executive Summary

This comprehensive test strategy document defines the **production readiness criteria** for PDFLab's three critical systems ahead of production deployment:

1. **Authentication System** - User login, registration, session management
2. **Core PDF Conversion** - Convert, compress, merge operations
3. **Email Delivery System** - SMTP integration, template rendering

**Go/No-Go Decision Criteria**: All P0 (Critical) and P1 (High) tests must pass before production deployment.

---

## Staging Environment Status

### Current Infrastructure

**Containers Running** (Verified 2025-11-21):
```
✅ pdflab-backend-staging       Port: 3007 → 3006 (API)     Status: healthy
✅ pdflab-frontend-staging      Port: 3002 → 3000 (Web)     Status: healthy
✅ pdflab-partners-staging      Port: 3003 → 3001 (Portal)  Status: healthy
✅ pdflab-worker-staging        Internal                    Status: healthy
✅ pdflab-mysql-staging         Port: 3307 → 3306 (DB)      Status: Up 10h
✅ pdflab-redis-staging         Port: 6380 → 6379 (Queue)   Status: healthy (5d)
```

**Health Check**:
```bash
curl http://141.136.44.168:3007/health
# Response: {"uptime":31046,"timestamp":1763706356918,"status":"OK","checks":{"database":"OK","redis":"OK"}}
```

**Environment Configuration**:
- **Base URL**: http://141.136.44.168:3007
- **Frontend URL**: http://141.136.44.168:3002
- **Database**: MySQL 8.0 (staging schema)
- **Redis**: 7-alpine (job queue)
- **Phase 1 Features**: ✅ Email service, ✅ Refresh tokens (15min), ✅ Manual migrations

---

## Test Scope & Priorities

### 🎯 Critical Path (Must Pass - P0)

These tests represent **showstopper scenarios** that must work perfectly before production:

1. **Authentication**:
   - User can register a new account
   - User can login with valid credentials
   - Session persists across page reloads
   - Access tokens refresh automatically after 15 minutes
   - User can logout and session is cleared

2. **PDF Conversion**:
   - User can upload a PDF file (< plan limit)
   - User can convert PDF to DOCX (most popular format)
   - Conversion completes successfully
   - User can download converted file
   - Conversion quota is decremented correctly

3. **Email Delivery**:
   - Welcome email sent on registration
   - Password reset email sent on request
   - Email contains valid reset link
   - SMTP connection established successfully
   - No email errors block user flows

---

## 1. Authentication System Testing 🔐

**BMAD Architect Analysis**: Authentication is the foundation of the platform. All paid features, conversion history, and user data depend on reliable auth.

### 1.1 User Registration Flow (P0 - Critical)

**Test ID**: AUTH-001
**Priority**: P0 (Critical)
**Estimated Time**: 5 minutes

#### Test Steps

**Pre-Conditions**:
- Staging backend is healthy
- Database is accessible
- Email service is configured (SMTP or dev mode)

**Steps**:
```bash
# Step 1: Navigate to signup page
curl -I http://141.136.44.168:3002/signup
# Expected: 200 OK

# Step 2: Register new user
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staging-test-'$(date +%s)'@pdflab.com",
    "password": "TestPass123!",
    "name": "Staging Test User"
  }'
```

#### Expected Results

**Success Response** (status: 201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "<uuid>",
    "email": "staging-test-*@pdflab.com",
    "name": "Staging Test User",
    "plan": "free",
    "conversions_used": 0,
    "conversions_limit": 3
  },
  "token": "eyJhbGciOiJ...",
  "refresh_token": "eyJhbGciOiJ..."
}
```

**Validation Checklist**:
- [ ] Status code: 201 Created
- [ ] Response includes user object with correct plan (free)
- [ ] Response includes JWT access token (15min expiry)
- [ ] Response includes refresh token (30d expiry)
- [ ] User created in database (verify with query)
- [ ] Welcome email sent (check logs or inbox)
- [ ] Password is hashed (not plain text in database)

**Backend Logs** (Expected):
```
✓ Email service initialized with SMTP: smtp.hostinger.com
✓ Email sent successfully to staging-test-*@pdflab.com
```

**Database Verification**:
```sql
SELECT id, email, name, plan, conversions_used, conversions_limit, created_at
FROM users
WHERE email = 'staging-test-*@pdflab.com';

-- Expected: 1 row with correct values
```

#### Failure Scenarios

**TEST-FAIL-001**: Email already exists
```json
{
  "error": "User already exists"
}
```
**Action**: Use unique email (timestamp-based)

**TEST-FAIL-002**: Weak password
```json
{
  "error": "Password must be at least 8 characters"
}
```
**Action**: Use strong password (TestPass123!)

**TEST-FAIL-003**: Email service failure (non-blocking)
```
Server Log: ✗ Failed to send email: <error>
Response: 201 Created (user still created)
```
**Action**: Verify user can login despite email failure

---

### 1.2 User Login Flow (P0 - Critical)

**Test ID**: AUTH-002
**Priority**: P0 (Critical)
**Estimated Time**: 3 minutes

#### Test Steps

**Pre-Conditions**:
- Test user exists (from AUTH-001)
- Known valid credentials

**Steps**:
```bash
# Step 1: Login with valid credentials
curl -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@pdflab.com",
    "password": "TestPass123!"
  }'
```

#### Expected Results

**Success Response** (status: 200):
```json
{
  "message": "Login successful",
  "user": {
    "id": "<uuid>",
    "email": "testuser@pdflab.com",
    "name": "Test User",
    "plan": "pro",
    "conversions_used": 5,
    "conversions_limit": 1000
  },
  "token": "eyJhbGciOiJ...",
  "refresh_token": "eyJhbGciOiJ..."
}
```

**Validation Checklist**:
- [ ] Status code: 200 OK
- [ ] Access token returned (JWT format)
- [ ] Refresh token returned
- [ ] User object matches database record
- [ ] `last_login` timestamp updated in database

**Database Verification**:
```sql
SELECT last_login
FROM users
WHERE email = 'testuser@pdflab.com';

-- Expected: Recent timestamp (within last minute)
```

#### Failure Scenarios

**TEST-FAIL-004**: Invalid credentials
```bash
curl -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@pdflab.com",
    "password": "WrongPassword"
  }'
```

**Expected Response** (status: 401):
```json
{
  "error": "Invalid credentials"
}
```

**Validation**:
- [ ] Status code: 401 Unauthorized
- [ ] No token returned
- [ ] Error message is generic (security best practice)

---

### 1.3 Session Persistence (P0 - Critical)

**Test ID**: AUTH-003
**Priority**: P0 (Critical)
**Estimated Time**: 2 minutes

#### Test Steps

**Pre-Conditions**:
- User is logged in (token from AUTH-002)

**Steps**:
```bash
# Step 1: Call protected endpoint with valid token
TOKEN="<access_token_from_login>"

curl -X GET http://141.136.44.168:3007/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

#### Expected Results

**Success Response** (status: 200):
```json
{
  "user": {
    "id": "<uuid>",
    "email": "testuser@pdflab.com",
    "name": "Test User",
    "plan": "pro",
    "conversions_used": 5,
    "conversions_limit": 1000,
    "created_at": "2025-11-01T12:00:00.000Z"
  }
}
```

**Validation Checklist**:
- [ ] Status code: 200 OK
- [ ] User profile returned
- [ ] All user fields present and correct

#### Failure Scenarios

**TEST-FAIL-005**: No token provided
```bash
curl -X GET http://141.136.44.168:3007/api/auth/profile
```

**Expected Response** (status: 401):
```json
{
  "error": "No token provided"
}
```

**TEST-FAIL-006**: Invalid token
```bash
curl -X GET http://141.136.44.168:3007/api/auth/profile \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response** (status: 401):
```json
{
  "error": "Invalid token"
}
```

---

### 1.4 Token Refresh Mechanism (P1 - High)

**Test ID**: AUTH-004
**Priority**: P1 (High - Security Critical)
**Estimated Time**: 5 minutes

#### Test Steps

**Pre-Conditions**:
- User has a valid refresh token (from login)
- Access token expiry: 15 minutes (Phase 1 update)

**Steps**:
```bash
# Step 1: Use refresh token to get new access token
REFRESH_TOKEN="<refresh_token_from_login>"

curl -X POST http://141.136.44.168:3007/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'$REFRESH_TOKEN'"
  }'
```

#### Expected Results

**Success Response** (status: 200):
```json
{
  "token": "eyJhbGciOiJ...",
  "refresh_token": "eyJhbGciOiJ...",
  "message": "Token refreshed successfully"
}
```

**Validation Checklist**:
- [ ] Status code: 200 OK
- [ ] New access token returned (different from old one)
- [ ] New refresh token returned (token rotation)
- [ ] New access token is valid for 15 minutes
- [ ] Old refresh token is invalidated (security)

**Token Expiry Test**:
```bash
# Decode JWT to verify expiry (use jwt.io or jwt-cli)
echo "<new_access_token>" | jwt decode -

# Expected output:
# {
#   "userId": "<uuid>",
#   "email": "testuser@pdflab.com",
#   "exp": 1637164800,  # 15 minutes from now
#   "iat": 1637163900
# }
```

#### Failure Scenarios

**TEST-FAIL-007**: Expired refresh token
```bash
# Use 30+ day old token
curl -X POST http://141.136.44.168:3007/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<expired_token>"}'
```

**Expected Response** (status: 401):
```json
{
  "error": "Refresh token expired"
}
```

---

### 1.5 Password Reset Flow (P1 - High)

**Test ID**: AUTH-005
**Priority**: P1 (High)
**Estimated Time**: 8 minutes

#### Test Steps

**Pre-Conditions**:
- User exists in database
- Email service is configured

**Steps**:
```bash
# Step 1: Request password reset
curl -X POST http://141.136.44.168:3007/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@pdflab.com"
  }'

# Step 2: Extract reset token from email or backend logs
# Format: /reset-password?token=<reset_token>

# Step 3: Reset password with token
RESET_TOKEN="<token_from_email>"

curl -X POST http://141.136.44.168:3007/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$RESET_TOKEN'",
    "newPassword": "NewTestPass123!"
  }'

# Step 4: Login with new password
curl -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@pdflab.com",
    "password": "NewTestPass123!"
  }'
```

#### Expected Results

**Step 1 Response** (status: 200):
```json
{
  "message": "Password reset email sent"
}
```

**Step 2 Email** (console log or inbox):
```
Subject: Reset your PDFLab password
To: testuser@pdflab.com

Click the link below to reset your password:
http://141.136.44.168:3002/reset-password?token=<reset_token>

This link will expire in 1 hour.
```

**Step 3 Response** (status: 200):
```json
{
  "message": "Password reset successful"
}
```

**Step 4 Response** (status: 200):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJ...",
  "user": { ... }
}
```

**Validation Checklist**:
- [ ] Reset email sent successfully
- [ ] Email contains valid reset link
- [ ] Reset token expires after 1 hour
- [ ] Password is updated in database
- [ ] User can login with new password
- [ ] Old password no longer works

---

### Authentication Test Summary

| Test ID | Test Name | Priority | Pass/Fail | Notes |
|---------|-----------|----------|-----------|-------|
| AUTH-001 | User Registration | P0 | ⏳ Pending |  |
| AUTH-002 | User Login | P0 | ⏳ Pending |  |
| AUTH-003 | Session Persistence | P0 | ⏳ Pending |  |
| AUTH-004 | Token Refresh | P1 | ⏳ Pending |  |
| AUTH-005 | Password Reset | P1 | ⏳ Pending |  |

**P0 Pass Rate**: 0/3 (Target: 100%)
**P1 Pass Rate**: 0/2 (Target: 100%)

---

## 2. Core PDF Conversion Testing 📄

**BMAD Architect Analysis**: Conversion is the platform's primary value proposition. CloudConvert integration must be stable and reliable.

### 2.1 PDF to DOCX Conversion (P0 - Critical)

**Test ID**: CONVERT-001
**Priority**: P0 (Critical - Most Popular Format)
**Estimated Time**: 10 minutes

#### Test Steps

**Pre-Conditions**:
- User is authenticated (valid access token)
- Test PDF file available (< 25MB for Pro users)
- CloudConvert API key configured

**Steps**:
```bash
# Step 1: Upload PDF for conversion
TOKEN="<access_token_from_login>"

curl -X POST http://141.136.44.168:3007/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "outputFormat=docx"

# Response: { "jobId": "<job_id>", "status": "pending" }

# Step 2: Poll conversion status
JOB_ID="<job_id_from_upload>"

curl -X GET http://141.136.44.168:3007/api/status/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# Poll every 5 seconds until status = "completed"

# Step 3: Download converted file
curl -X GET http://141.136.44.168:3007/api/download/$JOB_ID \
  -H "Authorization: Bearer $TOKEN" \
  -o converted-output.docx

# Step 4: Verify file integrity
file converted-output.docx
# Expected: "Microsoft Word 2007+"

# Step 5: Check quota decremented
curl -X GET http://141.136.44.168:3007/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

#### Expected Results

**Upload Response** (status: 200):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "PDF uploaded successfully. Conversion started.",
  "estimatedTime": "30-60 seconds"
}
```

**Status Response (Processing)** (status: 200):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "progress": 45,
  "estimatedTimeRemaining": "20 seconds"
}
```

**Status Response (Completed)** (status: 200):
```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "progress": 100,
  "outputFile": "converted-output.docx",
  "fileSize": 54321,
  "downloadUrl": "/api/download/a1b2c3d4..."
}
```

**Download Response**:
- Status: 200 OK
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="converted-output.docx"`
- File size: > 0 bytes

**Profile Response (Quota Check)**:
```json
{
  "user": {
    "conversions_used": 6,  // Incremented from 5
    "conversions_limit": 1000
  }
}
```

**Validation Checklist**:
- [ ] Upload accepted (status 200)
- [ ] Job ID returned
- [ ] Status polling works (returns status updates)
- [ ] Conversion completes within 2 minutes
- [ ] Download URL is valid
- [ ] Downloaded file is valid DOCX format
- [ ] File size > 0 bytes
- [ ] File opens in Microsoft Word
- [ ] Conversions_used incremented by 1
- [ ] CloudConvert API quota not exceeded

**Backend Logs** (Expected):
```
✓ File uploaded: test-sample.pdf (13,078 bytes)
✓ CloudConvert job created: <cloudconvert_job_id>
✓ Conversion started: PDF → DOCX
✓ Conversion completed (duration: 45s)
✓ File ready for download
✓ User quota updated: 5 → 6
```

**Database Verification**:
```sql
SELECT id, status, type, file_size, progress, output_file, created_at
FROM conversion_jobs
WHERE id = '<job_id>';

-- Expected: status = 'completed', output_file is not null

SELECT conversions_used
FROM users
WHERE email = 'testuser@pdflab.com';

-- Expected: Incremented by 1
```

#### Failure Scenarios

**TEST-FAIL-008**: File size exceeds plan limit
```bash
curl -X POST http://141.136.44.168:3007/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@large-file.pdf" \  # 50MB file for Starter plan (25MB limit)
  -F "outputFormat=docx"
```

**Expected Response** (status: 400):
```json
{
  "error": "File size (50MB) exceeds your plan limit (25MB). Please upgrade to Pro plan."
}
```

**TEST-FAIL-009**: Conversion quota exceeded
```bash
# After using all 3 free conversions
curl -X POST http://141.136.44.168:3007/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "outputFormat=docx"
```

**Expected Response** (status: 403):
```json
{
  "error": "Monthly conversion limit reached (3/3). Please upgrade your plan."
}
```

**TEST-FAIL-010**: CloudConvert API failure
```
Backend Log: ✗ CloudConvert API error: 401 Unauthorized (API key invalid)
```

**Expected Response** (status: 500):
```json
{
  "error": "Conversion service temporarily unavailable. Please try again later."
}
```

**Action**: Check CloudConvert API key in backend .env

---

### 2.2 PDF Compression (P1 - High)

**Test ID**: CONVERT-002
**Priority**: P1 (High - Phase 1.1.0 Feature)
**Estimated Time**: 8 minutes

#### Test Steps

**Pre-Conditions**:
- User is authenticated
- Test PDF file available (ideally > 1MB for visible compression)

**Steps**:
```bash
# Step 1: Upload PDF for compression
curl -X POST http://141.136.44.168:3007/api/compress \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-sample.pdf" \
  -F "compressionLevel=recommended"

# compressionLevel options: "good" | "recommended" | "extreme"

# Step 2: Poll status and download (same as CONVERT-001)
```

#### Expected Results

**Upload Response** (status: 200):
```json
{
  "jobId": "<job_id>",
  "status": "pending",
  "originalSize": 1048576,  // 1MB
  "compressionLevel": "recommended"
}
```

**Completed Status** (status: 200):
```json
{
  "jobId": "<job_id>",
  "status": "completed",
  "originalSize": 1048576,  // 1MB
  "compressedSize": 524288,  // 512KB
  "compressionRatio": "50%",
  "fileReduction": "512KB saved"
}
```

**Validation Checklist**:
- [ ] Compression completes successfully
- [ ] Compressed file size < original file size
- [ ] Compression ratio 40-70% (typical for recommended level)
- [ ] Compressed PDF opens correctly
- [ ] No visible quality degradation (spot-check)
- [ ] Quota decremented correctly

---

### 2.3 PDF Merge (P1 - High)

**Test ID**: CONVERT-003
**Priority**: P1 (High)
**Estimated Time**: 10 minutes

#### Test Steps

**Pre-Conditions**:
- User is authenticated
- Multiple test PDF files available (2-5 files)

**Steps**:
```bash
# Step 1: Upload multiple PDFs for merging
curl -X POST http://141.136.44.168:3007/api/merge \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@file1.pdf" \
  -F "files[]=@file2.pdf" \
  -F "files[]=@file3.pdf"

# Step 2: Poll status and download merged PDF
```

#### Expected Results

**Upload Response** (status: 200):
```json
{
  "jobId": "<job_id>",
  "status": "pending",
  "filesCount": 3,
  "totalSize": 156789
}
```

**Completed Status** (status: 200):
```json
{
  "jobId": "<job_id>",
  "status": "completed",
  "filesCount": 3,
  "outputFile": "merged-output.pdf",
  "outputSize": 159123,
  "pageCount": 15
}
```

**Validation Checklist**:
- [ ] Merge completes successfully
- [ ] Output PDF contains all pages from input files
- [ ] Page order is correct (file1 → file2 → file3)
- [ ] Output PDF opens correctly
- [ ] Total page count = sum of input page counts
- [ ] Quota decremented correctly

---

### 2.4 Batch Processing (P2 - Medium)

**Test ID**: CONVERT-004
**Priority**: P2 (Medium - Pro feature)
**Estimated Time**: 15 minutes

#### Test Steps

**Pre-Conditions**:
- User has Pro or Enterprise plan
- Multiple test PDF files (5-10 files)

**Steps**:
```bash
# Step 1: Upload batch of PDFs
curl -X POST http://141.136.44.168:3007/api/batch/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@file1.pdf" \
  -F "files[]=@file2.pdf" \
  -F "files[]=@file3.pdf" \
  -F "operation=convert" \
  -F "outputFormat=docx"

# Step 2: Poll batch status
BATCH_ID="<batch_id_from_upload>"

curl -X GET http://141.136.44.168:3007/api/batch/status/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN"

# Step 3: Download batch ZIP when complete
curl -X GET http://141.136.44.168:3007/api/batch/download/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -o batch-output.zip
```

#### Expected Results

**Upload Response** (status: 200):
```json
{
  "batchId": "<batch_id>",
  "status": "pending",
  "totalFiles": 3,
  "operation": "convert",
  "outputFormat": "docx"
}
```

**Status Response** (status: 200):
```json
{
  "batchId": "<batch_id>",
  "status": "processing",
  "totalFiles": 3,
  "completedFiles": 2,
  "failedFiles": 0,
  "progress": 66,
  "estimatedTimeRemaining": "45 seconds"
}
```

**Completed Response** (status: 200):
```json
{
  "batchId": "<batch_id>",
  "status": "completed",
  "totalFiles": 3,
  "completedFiles": 3,
  "failedFiles": 0,
  "progress": 100,
  "downloadUrl": "/api/batch/download/<batch_id>"
}
```

**Download**: ZIP file containing all converted DOCX files

**Validation Checklist**:
- [ ] Batch upload accepted
- [ ] All files processed
- [ ] No failed files (or failed count matches expectations)
- [ ] ZIP download works
- [ ] ZIP contains all converted files
- [ ] All files in ZIP are valid format
- [ ] Quota decremented by file count (3 in this case)

---

### Conversion Test Summary

| Test ID | Test Name | Priority | Pass/Fail | Notes |
|---------|-----------|----------|-----------|-------|
| CONVERT-001 | PDF to DOCX | P0 | ⏳ Pending |  |
| CONVERT-002 | PDF Compression | P1 | ⏳ Pending |  |
| CONVERT-003 | PDF Merge | P1 | ⏳ Pending |  |
| CONVERT-004 | Batch Processing | P2 | ⏳ Pending |  |

**P0 Pass Rate**: 0/1 (Target: 100%)
**P1 Pass Rate**: 0/2 (Target: 100%)

---

## 3. Email Delivery Testing 📧

**BMAD Architect Analysis**: Email is a critical user touchpoint. Phase 1 implemented SMTP integration with 5 templates. Must verify end-to-end delivery.

### 3.1 Welcome Email Delivery (P0 - Critical)

**Test ID**: EMAIL-001
**Priority**: P0 (Critical - First impression)
**Estimated Time**: 5 minutes

#### Test Steps

**Pre-Conditions**:
- Email service configured (SMTP: smtp.hostinger.com)
- Test email address accessible for verification

**Steps**:
```bash
# Step 1: Register new user (triggers welcome email)
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-test-'$(date +%s)'@pdflab.com",
    "password": "TestPass123!",
    "name": "Email Test User"
  }'

# Step 2: Check backend logs for email confirmation
ssh root@141.136.44.168 "docker logs --tail 20 pdflab-backend-staging 2>&1 | grep -i email"

# Step 3: Check inbox (if using real email address)
# Or check console logs (if using development mode)
```

#### Expected Results

**Backend Logs**:
```
✓ Email service initialized with SMTP: smtp.hostinger.com
✓ Email sent successfully to email-test-*@pdflab.com
```

**Email Content** (inbox or console):
```
From: PDFLab <support@pdflab.pro>
To: email-test-*@pdflab.com
Subject: Welcome to PDFLab!

Hi Email Test User!

Thank you for joining PDFLab - the professional PDF conversion platform.

You now have access to:
- Convert PDFs to DOCX, PPTX, XLSX, PNG
- Compress PDFs to reduce file size
- Merge multiple PDFs into one
- Batch processing for multiple files
- Fast, secure cloud processing

[Go to Dashboard Button]

Need help? Visit our support page.

Best regards,
The PDFLab Team
```

**Validation Checklist**:
- [ ] Email sent without errors
- [ ] Email received in inbox (or logged to console)
- [ ] Email contains user's name
- [ ] Email has correct branding (PDFLab logo/colors)
- [ ] Dashboard link is correct (http://141.136.44.168:3002/dashboard)
- [ ] HTML rendering is correct (check in email client)
- [ ] Email does not block user registration (non-blocking)

---

### 3.2 Password Reset Email (P1 - High)

**Test ID**: EMAIL-002
**Priority**: P1 (High - Security Critical)
**Estimated Time**: 5 minutes

#### Test Steps

**Pre-Conditions**:
- User exists in database
- Email service configured

**Steps**:
```bash
# Step 1: Request password reset
curl -X POST http://141.136.44.168:3007/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@pdflab.com"
  }'

# Step 2: Check backend logs
ssh root@141.136.44.168 "docker logs --tail 20 pdflab-backend-staging 2>&1 | grep -i 'password reset'"

# Step 3: Check inbox for reset email
```

#### Expected Results

**Backend Logs**:
```
✓ Password reset email sent to testuser@pdflab.com
✓ Reset token expires at: 2025-11-21T18:30:00Z (1 hour)
```

**Email Content**:
```
From: PDFLab <support@pdflab.pro>
To: testuser@pdflab.com
Subject: Reset your PDFLab password

We received a request to reset the password for your PDFLab account.

[Reset Password Button]

⏱️ This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

Reset link: http://141.136.44.168:3002/reset-password?token=<reset_token>
```

**Validation Checklist**:
- [ ] Email sent successfully
- [ ] Email received in inbox
- [ ] Reset link is present
- [ ] Reset link includes valid token
- [ ] Reset link uses correct frontend URL
- [ ] Expiry time is 1 hour
- [ ] Token is single-use (verified in AUTH-005)

---

### 3.3 Payment Receipt Email (P1 - High)

**Test ID**: EMAIL-003
**Priority**: P1 (High - Revenue Critical)
**Estimated Time**: 10 minutes

#### Test Steps

**Pre-Conditions**:
- User has active subscription
- PayFast webhook is configured
- Test payment can be triggered (or use webhook test data)

**Steps**:
```bash
# Option 1: Trigger via PayFast webhook simulation
curl -X POST http://141.136.44.168:3007/api/payfast/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "m_payment_id=test123&payment_status=COMPLETE&item_name=Pro Plan&amount_gross=29.99&amount_net=28.49&email_address=testuser@pdflab.com"

# Option 2: Use real PayFast test environment
# (Follow PayFast sandbox instructions)

# Step 2: Check backend logs
ssh root@141.136.44.168 "docker logs --tail 30 pdflab-backend-staging 2>&1 | grep -i 'payment receipt'"
```

#### Expected Results

**Backend Logs**:
```
✓ PayFast webhook received: payment_status=COMPLETE
✓ Subscription activated: Pro Plan for testuser@pdflab.com
✓ Payment receipt email sent to testuser@pdflab.com
```

**Email Content**:
```
From: PDFLab <support@pdflab.pro>
To: testuser@pdflab.com
Subject: Payment Receipt - Pro Plan

✅ Payment Successful

Thank you for your payment!

Plan: Pro Plan
Amount: USD 29.99
Transaction ID: test123
Billing Date: 2025-11-21
Next Billing Date: 2025-12-21

[View Dashboard Button]

Questions? Contact us at support.
```

**Validation Checklist**:
- [ ] Email sent successfully
- [ ] Email received
- [ ] Payment details are correct
- [ ] Transaction ID is present
- [ ] Next billing date is accurate
- [ ] Dashboard link works
- [ ] HTML rendering is professional

---

### 3.4 SMTP Connection Health (P0 - Critical)

**Test ID**: EMAIL-004
**Priority**: P0 (Critical Infrastructure)
**Estimated Time**: 3 minutes

#### Test Steps

**Pre-Conditions**:
- Backend is running
- SMTP credentials in .env

**Steps**:
```bash
# Step 1: Check backend startup logs for SMTP initialization
ssh root@141.136.44.168 "docker logs pdflab-backend-staging 2>&1 | grep -i 'email service'"

# Step 2: Verify SMTP environment variables
ssh root@141.136.44.168 "docker exec pdflab-backend-staging printenv | grep SMTP"

# Step 3: Test SMTP connection (optional - if backend has test endpoint)
curl -X POST http://141.136.44.168:3007/api/test/email \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@pdflab.com",
    "subject": "SMTP Test",
    "text": "Test email from staging"
  }'
```

#### Expected Results

**Startup Logs**:
```
✓ Email service initialized with SMTP: smtp.hostinger.com
✓ SMTP credentials loaded from environment
```

**Environment Variables**:
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@pdflab.pro
SMTP_PASS=***
SMTP_FROM_NAME=PDFLab
SMTP_FROM_EMAIL=support@pdflab.pro
```

**Test Email Response** (if endpoint exists):
```json
{
  "message": "Test email sent successfully",
  "to": "test@pdflab.com"
}
```

**Validation Checklist**:
- [ ] SMTP service initializes on startup
- [ ] All SMTP env vars are set
- [ ] SMTP connection succeeds (no connection errors in logs)
- [ ] Test email sends successfully

---

### 3.5 Email Error Handling (P1 - High)

**Test ID**: EMAIL-005
**Priority**: P1 (High - Non-Blocking Requirement)
**Estimated Time**: 5 minutes

#### Test Objective

Verify that email failures do NOT block critical user flows (registration, password reset).

#### Test Steps

**Pre-Conditions**:
- Backend running
- Ability to simulate SMTP failure (temporarily invalid SMTP password)

**Steps**:
```bash
# Step 1: Temporarily break SMTP connection (SSH to backend)
ssh root@141.136.44.168
docker exec -it pdflab-backend-staging bash
# Edit .env: Set SMTP_PASS to invalid value
# Or stop SMTP service simulation

# Step 2: Attempt user registration
curl -X POST http://141.136.44.168:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-fail-test@pdflab.com",
    "password": "TestPass123!"
  }'

# Step 3: Check backend logs for error
ssh root@141.136.44.168 "docker logs --tail 20 pdflab-backend-staging 2>&1 | grep -i 'email\|smtp'"

# Step 4: Verify user was still created
curl -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-fail-test@pdflab.com",
    "password": "TestPass123!"
  }'
```

#### Expected Results

**Registration Response** (status: 201):
```json
{
  "message": "User registered successfully",
  "user": { ... },
  "token": "eyJhbGciOiJ..."
}
```

**Backend Logs**:
```
✗ Failed to send email: SMTP connection failed
⚠️ Email delivery error (non-blocking)
✓ User created successfully: email-fail-test@pdflab.com
```

**Login Response** (status: 200):
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJ..."
}
```

**Validation Checklist**:
- [ ] User registration succeeds despite email failure
- [ ] Error is logged but not thrown
- [ ] User can login with new credentials
- [ ] User record exists in database
- [ ] No 500 Internal Server Error

**Cleanup**:
```bash
# Restore correct SMTP credentials
# Restart backend if needed
```

---

### Email Test Summary

| Test ID | Test Name | Priority | Pass/Fail | Notes |
|---------|-----------|----------|-----------|-------|
| EMAIL-001 | Welcome Email | P0 | ⏳ Pending |  |
| EMAIL-002 | Password Reset Email | P1 | ⏳ Pending |  |
| EMAIL-003 | Payment Receipt Email | P1 | ⏳ Pending |  |
| EMAIL-004 | SMTP Health | P0 | ⏳ Pending |  |
| EMAIL-005 | Error Handling | P1 | ⏳ Pending |  |

**P0 Pass Rate**: 0/2 (Target: 100%)
**P1 Pass Rate**: 0/3 (Target: 100%)

---

## Production Readiness Criteria

### Go/No-Go Decision Matrix

**PRODUCTION DEPLOYMENT APPROVED IF**:
- ✅ All P0 (Critical) tests pass (100%)
- ✅ All P1 (High) tests pass (100%)
- ✅ At least 80% of P2 (Medium) tests pass
- ✅ No P0 blockers identified
- ✅ Staging environment stable (uptime > 99% over 48 hours)

**PRODUCTION DEPLOYMENT BLOCKED IF**:
- ❌ Any P0 test fails
- ❌ More than 1 P1 test fails
- ❌ Critical security vulnerability identified
- ❌ Data loss risk identified
- ❌ CloudConvert API quota exhausted

---

## Test Execution Plan

### Phase 1: Authentication Tests (30 minutes)

**Execution Order**:
1. AUTH-001: User Registration
2. AUTH-002: User Login
3. AUTH-003: Session Persistence
4. AUTH-004: Token Refresh
5. AUTH-005: Password Reset

**Team**: QA Engineer + Backend Developer
**Tools**: curl, Postman, MySQL Workbench
**Success Criteria**: 5/5 tests pass

---

### Phase 2: Conversion Tests (45 minutes)

**Execution Order**:
1. CONVERT-001: PDF to DOCX (Critical)
2. CONVERT-002: PDF Compression
3. CONVERT-003: PDF Merge
4. CONVERT-004: Batch Processing

**Team**: QA Engineer + CloudConvert Specialist
**Tools**: curl, file utility, PDF viewer, unzip
**Success Criteria**: 3/3 P0+P1 tests pass

---

### Phase 3: Email Tests (30 minutes)

**Execution Order**:
1. EMAIL-004: SMTP Health (First - validates infrastructure)
2. EMAIL-001: Welcome Email
3. EMAIL-002: Password Reset Email
4. EMAIL-003: Payment Receipt Email
5. EMAIL-005: Error Handling

**Team**: QA Engineer + DevOps
**Tools**: curl, email client, SMTP test tools
**Success Criteria**: 5/5 tests pass

---

### Phase 4: Integration Tests (20 minutes)

**End-to-End User Journey**:
1. Register account (AUTH-001 + EMAIL-001)
2. Login (AUTH-002)
3. Convert PDF (CONVERT-001)
4. Download result
5. Logout

**Team**: Full QA team
**Tools**: Browser (manual test), Playwright (automated)
**Success Criteria**: Complete journey succeeds

---

## Risk Assessment

### High-Risk Areas (Require Extra Attention)

**1. CloudConvert API Integration** 🔴
- **Risk**: API quota exhaustion during testing
- **Mitigation**: Monitor CloudConvert dashboard, use test account
- **Contingency**: Pause testing if quota < 20% remaining

**2. SMTP Email Delivery** 🟡
- **Risk**: Emails marked as spam, delivery delays
- **Mitigation**: Use support@pdflab.pro (verified sender), test with real email addresses
- **Contingency**: Verify email logs, check spam folder

**3. Token Refresh Timing** 🟡
- **Risk**: 15-minute token expiry may cause UX issues
- **Mitigation**: Implement auto-refresh in frontend (Priority 1)
- **Contingency**: Increase token expiry to 30 minutes if critical issues arise

**4. Database Connection Pool** 🟢
- **Risk**: Connection exhaustion under load
- **Mitigation**: Monitor MySQL connections during testing
- **Contingency**: Increase pool size in backend config

---

## Test Data Requirements

### User Test Accounts

**Test User 1 (Free Plan)**:
- Email: testuser@pdflab.com
- Password: TestPass123!
- Plan: free
- Conversions: 0/3

**Test User 2 (Pro Plan)**:
- Email: mmkela@gmail.com
- Password: TestPass123!
- Plan: pro
- Conversions: 5/1000

**Test User 3 (Enterprise Plan)**:
- Email: enterprise@pdflab.com
- Password: TestPass123!
- Plan: enterprise
- Conversions: 10/unlimited

### Test PDF Files

**Small PDF** (test-sample.pdf):
- Size: 13KB
- Pages: 2
- Purpose: Basic conversion tests

**Medium PDF** (test-medium.pdf):
- Size: 500KB
- Pages: 10
- Purpose: Compression tests

**Large PDF** (test-large.pdf):
- Size: 20MB
- Pages: 50
- Purpose: File size limit tests

**Multiple PDFs** (merge-test-*.pdf):
- Files: 3 x 100KB
- Purpose: Merge tests

---

## Success Metrics

### Test Pass Rates (Target)

| Priority | Target Pass Rate | Acceptable Minimum |
|----------|-----------------|-------------------|
| P0 (Critical) | 100% | 100% (no exceptions) |
| P1 (High) | 100% | 100% (no exceptions) |
| P2 (Medium) | 100% | 80% |
| P3 (Low) | 80% | 50% |

### Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| User Registration | < 1s | < 2s |
| User Login | < 500ms | < 1s |
| PDF Upload | < 2s | < 5s |
| PDF Conversion (DOCX) | < 60s | < 120s |
| Email Delivery | < 5s | < 10s |

### Reliability Metrics

| Metric | Target | Minimum |
|--------|--------|---------|
| API Uptime | 99.9% | 99.5% |
| Conversion Success Rate | 99% | 95% |
| Email Delivery Rate | 99% | 95% |

---

## Rollback Plan

### Rollback Triggers

**Immediate Rollback Required IF**:
- ❌ User authentication completely broken
- ❌ Database data loss or corruption detected
- ❌ CloudConvert integration failure rate > 50%
- ❌ SMTP service completely down (and blocking flows)
- ❌ Security vulnerability actively exploited

### Rollback Procedure

```bash
# Step 1: SSH to VPS
ssh root@141.136.44.168

# Step 2: Stop staging containers
cd /path/to/staging
docker-compose down

# Step 3: Restore previous version
git checkout <previous-commit>
docker-compose up -d

# Step 4: Verify rollback
curl http://141.136.44.168:3007/health

# Step 5: Notify stakeholders
# Send incident report
```

---

## Post-Test Actions

### Upon Successful Test Completion (All P0+P1 Pass)

1. **Generate Test Report**:
   - Test ID pass/fail status
   - Screenshots of key flows
   - Performance metrics
   - Risk assessment update

2. **Deploy to Production**:
   - Create deployment checklist
   - Schedule deployment window
   - Prepare rollback plan
   - Notify stakeholders

3. **Production Smoke Tests**:
   - Re-run P0 tests on production
   - Verify production email delivery (real inbox)
   - Monitor Sentry for errors (first 24 hours)

### Upon Test Failures

1. **Document Failures**:
   - Test ID
   - Expected vs actual results
   - Screenshots/logs
   - Root cause analysis

2. **Create Bug Tickets**:
   - Priority based on test priority
   - Assign to relevant developer
   - Set fix timeline (P0: immediate, P1: 24h, P2: 1 week)

3. **Retest After Fixes**:
   - Re-run failed tests
   - Regression test related functionality
   - Update test report

---

## Appendix A: Test Tools & Commands

### Essential Tools

**1. curl** - API testing
```bash
# GET request with auth
curl -X GET http://141.136.44.168:3007/api/endpoint \
  -H "Authorization: Bearer <token>"

# POST request with JSON
curl -X POST http://141.136.44.168:3007/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'

# File upload
curl -X POST http://141.136.44.168:3007/api/upload \
  -F "file=@test.pdf"
```

**2. MySQL Client** - Database verification
```bash
# Connect to staging database
mysql -h 141.136.44.168 -P 3307 -u pdflab -p pdflab

# Query user
SELECT * FROM users WHERE email = 'testuser@pdflab.com';

# Check conversion jobs
SELECT * FROM conversion_jobs ORDER BY created_at DESC LIMIT 5;
```

**3. Docker Commands** - Container management
```bash
# Check container health
docker ps --filter name=staging

# View logs
docker logs --tail 50 pdflab-backend-staging

# Execute command in container
docker exec -it pdflab-backend-staging bash
```

**4. JWT Decoder** - Token inspection
```bash
# Install jwt-cli (optional)
npm install -g jwt-cli

# Decode token
jwt decode <token>

# Or use jwt.io website
```

---

## Appendix B: Backend Endpoints Reference

### Authentication Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/profile
POST   /api/auth/logout
```

### Conversion Endpoints

```
POST   /api/upload            # Single file conversion
POST   /api/compress          # PDF compression
POST   /api/merge             # PDF merge
GET    /api/status/:jobId     # Check job status
GET    /api/download/:jobId   # Download result
GET    /api/history           # Conversion history
```

### Batch Processing Endpoints

```
POST   /api/batch/upload
GET    /api/batch/status/:batchId
GET    /api/batch/download/:batchId
```

### Admin/Monitoring Endpoints

```
GET    /health                # Health check
GET    /api/test/email        # Test email (admin only)
GET    /api/test/sentry-error # Test Sentry (admin only)
```

---

## Appendix C: Contact Information

### Staging Environment Access

**SSH Access**:
- Host: 141.136.44.168
- User: root
- Key: (provided separately)

**Database Access**:
- Host: 141.136.44.168:3307
- User: pdflab
- Password: (in backend .env)
- Database: pdflab

**Redis Access**:
- Host: 141.136.44.168:6380
- Password: (none)

### Support Contacts

**CloudConvert Support**:
- Email: support@cloudconvert.com
- Dashboard: https://cloudconvert.com/dashboard

**Hostinger SMTP Support**:
- Email: support@hostinger.com
- Dashboard: https://hpanel.hostinger.com

**Sentry Monitoring**:
- Dashboard: https://pdf-lab-pro.sentry.io
- Issues: https://pdf-lab-pro.sentry.io/issues/

---

**Document Version**: 1.0.0
**Created By**: BMAD QA Specialist + Architect
**Date**: November 21, 2025
**Next Review**: After test execution
**Status**: ⏳ READY FOR TEST EXECUTION
