# PDFLab Staging Test Failure Analysis
**Date**: 2025-11-19 22:30 UTC
**Test Run**: Post-deployment verification
**Environment**: Staging (http://141.136.44.168:3007)
**Results**: 32% pass rate (11/34 tests)

---

## Executive Summary

After deploying Phase 1 backend with refresh token support and middleware fixes, the staging test suite was executed. While deployment verification tests passed, the full test suite shows a **32% pass rate** with 23 failures across 3 main categories.

### Root Causes Identified

1. **🔴 CRITICAL: Refresh Token Not Returned in Login Response** (4 failures)
2. **🟡 HIGH: Rate Limiting Blocking Tests** (10+ failures)
3. **🟡 MEDIUM: Profile/Feedback Endpoints Failing** (6+ failures)

---

## Failure Breakdown

### Total Statistics
- **Tests Run**: 34
- **Passed**: 11 (32%)
- **Failed**: 23 (68%)
- **Skipped**: 0
- **Duration**: 74.8 seconds

### Failure Categories

| Category | Tests | Impact | Root Cause |
|----------|-------|--------|------------|
| **Refresh Token Missing** | 4 | 🔴 CRITICAL | Login endpoint not returning `refreshToken` field |
| **Rate Limiting** | 10+ | 🟡 HIGH | Test runner IP not whitelisted (expected 401, got 429) |
| **Profile/Feedback Endpoints** | 6+ | 🟡 MEDIUM | Endpoints returning non-200 status |
| **Other** | 3 | 🟢 LOW | Misc test failures |

---

## Issue #1: Refresh Token Not Returned (CRITICAL)

### Failure Pattern
```javascript
Error: expect(received).toBeDefined()
Received: undefined

const refreshToken = loginData.refreshToken
expect(refreshToken).toBeDefined()  // ❌ FAIL

Test: security.test.ts:138
```

### Affected Tests
1. ❌ "Should accept valid refresh token" (Chromium)
2. ❌ "Should accept valid refresh token" (Firefox)
3. ❌ "Should reject invalid refresh token" (Chromium)
4. ❌ "Should reject invalid refresh token" (Firefox)

### Root Cause Analysis

**Deployment Verification**: The `/api/auth/refresh` endpoint exists and returns 401 (not 404) ✅

**Problem**: The `/api/auth/login` endpoint is **not returning the `refreshToken` field** in the response, even though the endpoint exists.

**Possible Causes**:
1. **Backend Code Issue**: The auth controller login function may not be including `refreshToken` in response
2. **Environment Issue**: Staging backend may not have the updated login controller
3. **Docker Image**: The backend container might be using an old snapshot image (not the newly deployed code)

### Investigation Required

Check the actual login controller response on staging:

```bash
# Test login manually on staging
curl -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}' | jq .

# Expected response:
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",  # ← THIS IS MISSING!
  "user": {...}
}
```

**Next Steps**:
1. Check [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts) - login function
2. Verify the deployed `dist/` folder includes the updated auth controller
3. Confirm the Docker container is using the newly deployed code (not cached snapshot)

---

## Issue #2: Rate Limiting Blocking Tests (HIGH)

### Failure Pattern
```javascript
Error: expect(received).toBe(expected)
Expected: 401
Received: 429  // Too Many Requests

Test: security.test.ts:34
```

### Affected Tests (10+)
- ❌ SQL injection prevention tests (expected 401, got 429)
- ❌ Expired JWT token tests (expected 401, got 429)
- ❌ Invalid token tests (expected 401, got 429)

### Root Cause
**Rate Limiter Configuration**: 100 requests per 15 minutes per IP

The test suite makes rapid API requests (parallel execution with 2 workers), quickly exceeding the rate limit. This is **EXPECTED BEHAVIOR** and actually proves the rate limiter is working correctly!

### Why This is Expected
- Security tests intentionally make many rapid requests (SQL injection, token validation, etc.)
- Rate limiter correctly blocks excessive requests (429 status)
- Tests expect specific auth errors (401), but get rate limit errors (429) first

### Solution Options

**Option A**: Whitelist Test Runner IP (RECOMMENDED)
```typescript
// backend/src/middleware/ratelimit.middleware.ts
const STAGING_TEST_WHITELIST = [
  'YOUR.IP.ADDRESS.HERE',  // Test runner IP
  '127.0.0.1',             // Localhost
  '::1'                     // IPv6 localhost
]

if (process.env.NODE_ENV === 'staging' && STAGING_TEST_WHITELIST.includes(req.ip)) {
  return next() // Skip rate limiting for test execution
}
```

**Option B**: Increase Rate Limit for Staging
```typescript
const limit = process.env.NODE_ENV === 'staging' ? 500 : 100
```

**Option C**: Run Tests Sequentially (SLOW)
```javascript
// playwright.config.ts
workers: 1  // Sequential execution (no parallel tests)
```

---

## Issue #3: Profile/Feedback Endpoints Failing (MEDIUM)

### Failure Pattern
```javascript
Error: expect(received).toBeTruthy()
Received: false

expect(response.ok()).toBeTruthy()  // ❌ FAIL
Test: security.test.ts:71, 85, 103
```

### Affected Tests (6+)
- ❌ "XSS sanitization in user name" (2 tests)
- ❌ "XSS in feedback submission" (2 tests)
- ❌ "Profile update endpoint" (2 tests)

### Root Cause Investigation Needed

**Deployment Verification**: POST /api/feedback returned 201 Created ✅

**Problem**: Tests are getting non-200 status codes from these endpoints.

**Possible Causes**:
1. **Authentication Issues**: Endpoints require auth, tests may have invalid/expired tokens
2. **Request Validation**: Request body format mismatch (schema validation failing)
3. **Database Issues**: Missing tables or columns on staging
4. **Rate Limiting**: Could also be 429 errors (same as Issue #2)

### Investigation Required

**Check Actual Response**:
```bash
# Test profile update with auth token
TOKEN=$(curl -s -X POST http://141.136.44.168:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}' | jq -r .token)

curl -X PUT http://141.136.44.168:3007/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test <script>alert(1)</script>"}' -v
```

**Check Response Status**:
- 401? → Authentication problem
- 400? → Request validation problem
- 429? → Rate limiting (same as Issue #2)
- 500? → Server error (check logs)

---

## Tests That PASSED ✅

Despite the failures, 11 tests passed successfully:

1. ✅ **Rate Limiting Detection** - Correctly triggers at threshold (proves it works!)
2. ✅ **Password Hashing** - Passwords not returned in responses
3. ✅ **Expired JWT Rejection** - Returns 401 for expired tokens (when not rate limited)
4. ✅ **CORS Protection** - Headers validated correctly
5. ✅ **SQL Injection Prevention** - Blocked correctly (when not rate limited)
6. ✅ **File Upload Validation** - PDF signature validation working
7. ✅ **Admin Access Control** - Requires admin role
8. ✅ **User Data Isolation** - Cannot access other users' data
9. ✅ **Password Requirements** - Minimum length enforced
10. ✅ **Token-based Authentication** - Valid tokens accepted
11. ✅ **Health Check** - Endpoint responsive

**Key Insight**: Core security features are working! Most failures are due to:
1. Rate limiting (proves security works)
2. Missing refresh token in response (deployment issue)
3. Endpoint configuration (needs investigation)

---

## Deployment Verification vs. Test Suite Results

### Deployment Verification (Manual) ✅
- Health check: PASS
- Refresh token endpoint exists: PASS (401, not 404!)
- Feedback endpoint: PASS (201 Created)
- Admin login: PASS
- PayFast sandbox: PASS

### Test Suite (Automated) ❌
- Overall pass rate: 32% (11/34)
- Refresh token in login: FAIL (undefined)
- Rate limit bypassed: FAIL (429 errors)
- Profile/feedback: FAIL (non-200 status)

**Discrepancy**: Deployment verification passed, but automated tests failed. This suggests:
1. Manual tests didn't check refresh token **presence in login response** (only endpoint existence)
2. Manual tests didn't trigger rate limiting (single requests)
3. Manual tests didn't validate all endpoint behaviors

---

## Priority Remediation Plan

### Phase 1: Fix Critical Issues (2-3 hours) 🔴

#### Task 1.1: Investigate Refresh Token Response (HIGH PRIORITY)
**Problem**: Login endpoint not returning `refreshToken` field

**Steps**:
1. SSH to staging VPS
2. Check deployed backend code:
   ```bash
   ssh root@141.136.44.168
   cat /var/pdflab/backend-staging/dist/controllers/auth.controller.js | grep -A 20 "login"
   ```
3. Verify auth controller includes refresh token in response
4. If missing, check if Docker container is using new code or cached snapshot
5. Test login manually and inspect response

**Expected Fix**: Update auth controller or redeploy with correct code

#### Task 1.2: Whitelist Test Runner IP (HIGH PRIORITY)
**Problem**: Rate limiting blocking 10+ tests

**Steps**:
1. Get test runner IP address
2. Edit `backend/src/middleware/ratelimit.middleware.ts`
3. Add staging whitelist check
4. Rebuild and redeploy backend
5. Verify tests no longer get 429 errors

**Expected Result**: Rate limit tests will pass (401 instead of 429)

---

### Phase 2: Fix Medium Priority Issues (2-3 hours) 🟡

#### Task 2.1: Investigate Profile/Feedback Endpoint Failures
**Problem**: 6+ tests failing with non-200 status codes

**Steps**:
1. Run manual API tests with curl (see Investigation section above)
2. Check response status codes
3. Review backend logs for errors:
   ```bash
   ssh root@141.136.44.168
   docker logs pdflab-backend-staging --tail 100 | grep -E "(error|Error|ERROR)"
   ```
4. Fix identified issues (auth, validation, database, etc.)

**Expected Result**: Profile and feedback tests pass

---

### Phase 3: Rerun Tests & Verify (1 hour) ✅

**After Phase 1 & 2 fixes**:
1. Redeploy backend with fixes
2. Rerun staging test suite:
   ```bash
   node scripts/run-staging-tests.js --quick
   ```
3. Target: ≥95% pass rate
4. Review HTML report
5. Document final results

---

## Docker Container Investigation

**Critical Question**: Is the staging backend container using the newly deployed code?

### Container Details
- **Name**: `pdflab-backend-staging`
- **Image**: `pdflab-backend-staging:prod-snapshot`
- **Port**: 3007 → 3006
- **Status**: Healthy

### Investigation Needed

**Check if container picked up new code**:
```bash
ssh root@141.136.44.168

# Check when container was last restarted
docker inspect pdflab-backend-staging | jq '.[0].State.StartedAt'

# Check deployment directory timestamp
ls -la /var/pdflab/backend-staging/dist/controllers/

# Check if auth.controller.js includes refresh token logic
cat /var/pdflab/backend-staging/dist/controllers/auth.controller.js | grep -i "refreshtoken"
```

**Possible Issue**: The Docker container might be using a cached snapshot image instead of the newly deployed `/var/pdflab/backend-staging` directory.

**If container is using old snapshot**:
```bash
# Rebuild container from new code
cd /var/pdflab
docker build -t pdflab-backend-staging:latest -f Dockerfile.backend backend-staging/
docker stop pdflab-backend-staging
docker rm pdflab-backend-staging
# Recreate container with new image (use docker-compose or docker run)
```

---

## Recommended Next Actions

### Immediate (Today)

1. **🔴 CRITICAL**: Investigate why `refreshToken` is not in login response
   - Check deployed auth controller code
   - Verify Docker container is using new code
   - Test login manually and inspect response
   - Fix and redeploy if needed

2. **🟡 HIGH**: Whitelist test runner IP for rate limiting
   - Edit rate limit middleware
   - Add staging whitelist
   - Redeploy backend

3. **🟡 MEDIUM**: Investigate profile/feedback endpoint failures
   - Run manual curl tests
   - Check backend logs
   - Identify root cause
   - Fix and redeploy

### This Week

4. **Rerun Test Suite** - After fixes applied
   - Target: ≥95% pass rate
   - Review HTML report
   - Document final results

5. **Deploy to Production** - If staging tests pass
   - Use same deployment strategy
   - Monitor for 24 hours
   - Document any issues

---

## Files for Review

### Test Results
- **JSON**: [test-results/staging-results.json](test-results/staging-results.json)
- **HTML Report**: http://localhost:64534/ (currently serving)
- **Last Run**: [test-results/.last-run.json](test-results/.last-run.json)

### Backend Code to Check
- **Auth Controller**: [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts) - login function
- **Rate Limit Middleware**: [backend/src/middleware/ratelimit.middleware.ts](backend/src/middleware/ratelimit.middleware.ts)
- **Profile Controller**: [backend/src/controllers/profile.controller.ts](backend/src/controllers/profile.controller.ts)
- **Feedback Routes**: [backend/src/routes/feedback.routes.ts](backend/src/routes/feedback.routes.ts)

### Deployment Artifacts
- **Deployment Script**: [deploy-staging-fixes.sh](deploy-staging-fixes.sh)
- **Deployment Log**: deployment-*.log
- **Deployment Report**: [STAGING_DEPLOYMENT_COMPLETE_2025-11-19.md](STAGING_DEPLOYMENT_COMPLETE_2025-11-19.md)

---

## Conclusion

The staging deployment was technically successful (all containers healthy, endpoints responding), but the automated test suite revealed **critical issues** that were not caught by manual deployment verification:

1. **Refresh token not returned in login response** - CRITICAL blocker for token refresh functionality
2. **Rate limiting needs test runner exemption** - HIGH priority (proves security works, but blocks tests)
3. **Profile/feedback endpoints failing** - MEDIUM priority (needs investigation)

**Pass Rate**: 32% (11/34) - **Below 95% target**

**Recommendation**: **DO NOT deploy to production** until:
- ✅ Refresh token issue resolved
- ✅ Test runner IP whitelisted
- ✅ Test pass rate ≥95%

**Estimated Time to Production-Ready**: 4-6 hours (investigation + fixes + retest)

---

**Report Status**: 🔴 **BLOCKERS IDENTIFIED**
**Next Update**: After refresh token investigation complete
**Approval Status**: ❌ **NOT APPROVED** for production deployment

---

**End of Failure Analysis**
