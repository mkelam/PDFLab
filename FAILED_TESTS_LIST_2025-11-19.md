# Failed Staging Tests - Detailed List
**Date**: 2025-11-19
**Test Run**: P0 Critical Security Tests
**Environment**: Staging (http://141.136.44.168:3007)

---

## Summary
- **Total Unique Failures**: 14 tests (each ran on Chromium + Firefox = 28+ total failures)
- **Main Cause**: Rate limiting (HTTP 429 errors)
- **Secondary Issues**: API parity, missing test data

---

## Failed Tests by Category

### 1. XSS Protection (2 tests) ❌

#### Test #1: XSS in Feedback Submission
**File**: `tests/integration/api/security.test.ts:93`
**Test Name**: `Security: XSS Protection › should sanitize XSS in feedback submission`

**Error**:
```javascript
expect(response.ok()).toBeTruthy()
// Received: false
```

**Root Cause**:
- Feedback API endpoint not working on staging
- Possible: Route not registered or feedback feature not deployed

**Fix Priority**: 🟡 MEDIUM
**Fix**: Deploy feedback system to staging OR update test to handle missing feature

---

#### Test #2: XSS in User Name
**File**: `tests/integration/api/security.test.ts:76`
**Test Name**: `Security: XSS Protection › should sanitize XSS in user name`

**Error**:
```javascript
expect(response.ok()).toBeTruthy()
// Received: false
```

**Root Cause**:
- Profile update endpoint returning error
- Likely same issue as profile update test below

**Fix Priority**: 🟡 MEDIUM
**Fix**: Investigate profile update endpoint on staging

---

### 2. SQL Injection Protection (2 tests) ❌

#### Test #3: SQL Injection in Profile Update
**File**: `tests/integration/api/security.test.ts:41`
**Test Name**: `Security: SQL Injection Protection › should prevent SQL injection in profile update`

**Error**:
```javascript
expect(profileResponse.ok()).toBeTruthy()
// Received: false
```

**Root Cause**:
- Profile update endpoint failing
- Possible: Route mismatch, authentication issue, or missing endpoint

**Fix Priority**: 🟡 MEDIUM
**Fix**: Check staging routes for `/api/auth/profile` (PUT/PATCH)

---

#### Test #4: SQL Injection in Login (Firefox only - Rate Limited)
**File**: `tests/integration/api/security.test.ts:24`
**Test Name**: `Security: SQL Injection Protection › should prevent SQL injection in login email`

**Error**:
```javascript
expect(response.status()).toBe(401)
// Expected: 401
// Received: 429 (Too many requests)
```

**Root Cause**: Rate limiting triggered
**Fix Priority**: 🟢 LOW (Expected behavior)
**Fix**: Whitelist test IP for rate limiting OR run tests sequentially

---

### 3. JWT Token Security (1 test) ❌

#### Test #5: Accept Valid Refresh Token
**File**: `tests/integration/api/security.test.ts:126`
**Test Name**: `Security: JWT Token Expiration › should accept valid refresh token`

**Error**:
```javascript
expect(refreshToken).toBeDefined()
// Received: undefined
```

**Root Cause**:
- **CRITICAL**: Staging backend not returning `refreshToken` in login response
- Phase 1 backend deployment missing on staging

**Fix Priority**: 🔴 HIGH
**Fix**: Deploy latest backend with Phase 1 refresh token support

**Verification**:
```bash
# Test login response
curl -X POST http://141.136.44.168:3007/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}' \\
  | jq '.refreshToken'

# Should return: "jwt_refresh_token_here"
# Currently returns: null
```

---

### 4. Authorization Enforcement (4 tests) ❌

#### Test #6: Block Unauthenticated Access
**File**: `tests/integration/api/security.test.ts:162`
**Test Name**: `Security: Authorization Enforcement › should block unauthenticated access to protected routes`

**Error**:
```javascript
expect(response.status()).toBe(401)
// Expected: 401 Unauthorized
// Received: 404 Not Found
```

**Root Cause**:
- Routes returning 404 instead of 401
- Middleware ordering issue: 404 handler running before auth check

**Fix Priority**: 🟡 MEDIUM
**Fix**: Reorder middleware in `server.ts` - auth middleware must come before 404 handler

**Routes Affected**:
- `/api/auth/profile`
- `/api/upload`
- Other protected routes

---

#### Test #7: Block Non-Admin Access to Admin Routes
**File**: `tests/integration/api/security.test.ts:179`
**Test Name**: `Security: Authorization Enforcement › should block non-admin access to admin routes`

**Error**:
```javascript
expect(response.status()).toBe(403)
// Expected: 403 Forbidden
// Received: 401 Unauthorized
```

**Root Cause**:
- Auth middleware returning 401 before role check
- Should be: Check auth (401) THEN check role (403)

**Fix Priority**: 🟡 MEDIUM
**Fix**: Update admin middleware to check authentication first, then authorization

---

#### Test #8: Allow Admin Access to Admin Routes
**File**: `tests/integration/api/security.test.ts:208`
**Test Name**: `Security: Authorization Enforcement › should allow admin access to admin routes`

**Error**:
```javascript
expect(response.ok()).toBeTruthy()
// Received: false
```

**Root Cause**:
- Admin user doesn't exist on staging: `admin@pdflab.test`
- Or admin user exists but credentials don't match

**Fix Priority**: 🔴 HIGH
**Fix**: Create admin test user on staging database

**SQL Fix**:
```sql
-- Connect to staging database
USE pdflab_staging;

-- Create admin user
INSERT INTO users (id, email, password_hash, name, role, plan, created_at)
VALUES (
  UUID(),
  'admin@pdflab.test',
  '$2b$10$YourBcryptHashHere',  -- Hash of 'Admin123!'
  'Test Admin',
  'superadmin',
  'enterprise',
  NOW()
);
```

---

#### Test #9: Prevent Access to Other Users' Data
**File**: `tests/integration/api/security.test.ts:228`
**Test Name**: `Security: Authorization Enforcement › should prevent users from accessing other users data`

**Error**:
```javascript
TypeError: Cannot read properties of undefined (reading 'id')
// user2Data.user.id
//            ^--- undefined
```

**Root Cause**:
- Second test user doesn't exist: `mmkela@gmail.com`
- User registration failed or user not seeded

**Fix Priority**: 🟡 MEDIUM
**Fix**: Create second test user OR use existing user email

---

### 5. Rate Limiting (3 tests) ❌ - **EXPECTED BEHAVIOR**

#### Test #10: Reject Non-PDF File Uploads
**File**: `tests/integration/api/security.test.ts:312`
**Test Name**: `Security: File Upload Security › should reject non-PDF file uploads`

**Error**:
```javascript
expect(response.status()).toBe(400)
// Expected: 400 Bad Request
// Received: 429 Too Many Requests
```

**Root Cause**: Rate limiting (GOOD - security working!)
**Fix Priority**: 🟢 LOW
**Fix**: Whitelist test IP OR run tests slower

---

#### Test #11: Enforce Minimum Password Length
**File**: `tests/integration/api/security.test.ts:382`
**Test Name**: `Security: Password Security › should enforce minimum password length`

**Error**:
```javascript
expect(response.status()).toBe(400)
// Expected: 400 Bad Request
// Received: 429 Too Many Requests
```

**Root Cause**: Rate limiting
**Fix Priority**: 🟢 LOW
**Fix**: Whitelist test IP

---

#### Test #12: Validate PDF File Signature
**File**: `tests/integration/api/security.test.ts:346`
**Test Name**: `Security: File Upload Security › should validate PDF file signature`

**Error**:
```javascript
expect(data.error).toMatch(/invalid|corrupted|pdf/i)
// Expected pattern: /invalid|corrupted|pdf/i
// Received string: "Too many requests"
```

**Root Cause**: Rate limiting
**Fix Priority**: 🟢 LOW
**Fix**: Whitelist test IP

---

### 6. Password Security (1 test) ❌

#### Test #13: Hash Passwords (Not Store Plaintext)
**File**: `tests/integration/api/security.test.ts:398`
**Test Name**: `Security: Password Security › should hash passwords (not store plaintext)`

**Error**:
```javascript
expect(registerResponse.ok()).toBeTruthy()
// Received: false
```

**Root Cause**:
- User registration failing
- Possible: Rate limiting or validation error

**Fix Priority**: 🟡 MEDIUM
**Fix**: Check staging registration endpoint + add better error logging

---

#### Test #14: SQL Injection in Login (Firefox - Rate Limited)
**File**: `tests/integration/api/security.test.ts:24`
**Test Name**: `Security: SQL Injection Protection › should prevent SQL injection in login email`

**Error**:
```javascript
expect(response.status()).toBe(401)
// Expected: 401
// Received: 429
```

**Root Cause**: Rate limiting
**Fix Priority**: 🟢 LOW
**Fix**: Whitelist test IP

---

## Fix Priority Summary

### 🔴 HIGH Priority (Must Fix Before Full Test Suite)
1. **Deploy Phase 1 Backend** - Refresh tokens not returned
2. **Create Admin Test User** - Admin login failing

### 🟡 MEDIUM Priority (Should Fix This Week)
3. **Deploy Feedback System** - Feedback routes missing
4. **Fix Profile Update Endpoint** - Profile updates failing
5. **Fix Middleware Ordering** - 404 before 401 issue
6. **Create Second Test User** - Multi-user tests failing
7. **Update Admin Middleware** - 401 vs 403 distinction

### 🟢 LOW Priority (Rate Limiting - Expected)
8. **Whitelist Test IP** - Prevents rate limit issues
   OR
9. **Run Tests Sequentially** - Slower but avoids rate limits

---

## Recommended Fixes (Quick Wins)

### Fix #1: Whitelist Test Runner IP (5 minutes)
```typescript
// backend/src/middleware/rate-limit.middleware.ts
const WHITELIST = [
  '127.0.0.1',
  '::1',
  'YOUR_TEST_RUNNER_IP',  // Add this
];

export const rateLimitMiddleware = (req, res, next) => {
  if (WHITELIST.includes(req.ip)) {
    return next(); // Skip rate limiting
  }
  // ... existing rate limit logic
};
```

### Fix #2: Create Admin User (10 minutes)
```bash
ssh root@141.136.44.168

# Generate password hash locally first
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin123!', 10).then(console.log)"
# Copy the hash

# Connect to database
docker exec -it pdflab-mysql-staging mysql -u pdflab_staging -p
# Password: StagingDB2024!UserPass

USE pdflab_staging;

INSERT INTO users (id, email, password_hash, name, role, plan, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@pdflab.test',
  '$2b$10$PASTE_HASH_HERE',
  'Test Admin',
  'superadmin',
  'enterprise',
  NOW()
);
```

### Fix #3: Deploy Latest Backend (30 minutes)
```bash
# On local machine
cd backend
npm run build

# Deploy to staging (see deployment docs)
# ... deployment commands
```

---

## Test Rerun Command (After Fixes)

```bash
# Run only failed tests
npx playwright test tests/integration/api/security.test.ts \\
  --config=tests/e2e/playwright.config.staging.ts \\
  --grep "XSS|refresh token|admin access|profile update"

# Run full suite after all fixes
node scripts/run-staging-tests.js --quick --skip-performance
```

---

## Expected Results After Fixes

| Test Category | Before | After | Notes |
|--------------|--------|-------|-------|
| XSS Protection | 0/2 (0%) | 2/2 (100%) | After feedback + profile fixes |
| SQL Injection | 1/2 (50%) | 2/2 (100%) | After IP whitelist |
| JWT Tokens | 2/3 (67%) | 3/3 (100%) | After Phase 1 deployment |
| Authorization | 0/4 (0%) | 4/4 (100%) | After admin user + middleware |
| Rate Limiting | 2/2 (100%) | 2/2 (100%) | Already working! |
| File Upload | 0/2 (0%) | 2/2 (100%) | After IP whitelist |
| Password Security | 0/2 (0%) | 2/2 (100%) | After IP whitelist + fixes |
| **TOTAL** | **5/17 (29%)** | **17/17 (100%)** | **After all fixes** |

---

## Related Documentation

- **Full Test Report**: [STAGING_TEST_RESULTS_2025-11-19.md](STAGING_TEST_RESULTS_2025-11-19.md)
- **PayFast Fix**: [PAYFAST_SANDBOX_FIX_2025-11-19.md](PAYFAST_SANDBOX_FIX_2025-11-19.md)
- **Remediation Plan**: See full test report for complete fix instructions

---

**Report Generated**: 2025-11-19 22:30:00
**Tests Analyzed**: 34 (17 unique tests × 2 browsers)
**Failures**: 14 unique test failures
**Status**: Ready for remediation

---
