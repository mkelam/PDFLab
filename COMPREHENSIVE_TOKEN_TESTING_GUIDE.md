# Comprehensive Token Testing Guide

**Date**: November 18, 2025
**Purpose**: Exhaustive testing of JWT token functionality across all flows
**Scope**: Access tokens, refresh tokens, password reset tokens, OAuth tokens

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Manual Test Cases](#manual-test-cases)
3. [Automated Backend Tests](#automated-backend-tests)
4. [Automated Frontend Tests](#automated-frontend-tests)
5. [Integration Tests](#integration-tests)
6. [Security Tests](#security-tests)
7. [Performance Tests](#performance-tests)
8. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
9. [Validation Criteria](#validation-criteria)
10. [Test Data](#test-data)

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend (separate terminal)
npm run dev

# 3. Verify MySQL and Redis containers
docker ps | findstr "pdflab"

# 4. Clear test data (optional)
# MySQL: DELETE FROM users WHERE email LIKE '%test%';
# Redis: redis-cli FLUSHDB

# 5. Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
cd backend && npm install --save-dev jest supertest @types/jest @types/supertest
```

### Test User Accounts

Create these test accounts for different scenarios:

```json
{
  "newUser": {
    "email": "token-test-new@pdflab.test",
    "password": "TestPass123!",
    "name": "New Test User"
  },
  "existingUser": {
    "email": "token-test-existing@pdflab.test",
    "password": "TestPass123!",
    "name": "Existing Test User"
  },
  "adminUser": {
    "email": "token-test-admin@pdflab.test",
    "password": "AdminPass123!",
    "name": "Admin Test User",
    "role": "admin"
  },
  "betaUser": {
    "email": "token-test-beta@pdflab.test",
    "password": "BetaPass123!",
    "name": "Beta Test User",
    "is_beta_user": true
  }
}
```

---

## Manual Test Cases

### Test Suite 1: User Registration with Tokens

**Test Case 1.1: Successful Registration Returns Tokens**

**Steps**:
1. Open browser to http://localhost:3000/signup
2. Fill in registration form:
   - First Name: "Token"
   - Last Name: "Test"
   - Email: "token-test-1@pdflab.test"
   - Password: "TestPass123!"
   - Confirm Password: "TestPass123!"
3. Click "Sign Up"

**Expected Results**:
- ✅ Registration succeeds
- ✅ Response includes `token` (access token)
- ✅ Response includes `refreshToken` (refresh token)
- ✅ Both tokens stored in localStorage
- ✅ User redirected to /dashboard
- ✅ User profile loaded correctly

**Validation**:
```javascript
// Open browser console (F12)
localStorage.getItem('authToken')     // Should return JWT string
localStorage.getItem('refreshToken')  // Should return JWT string

// Decode tokens at https://jwt.io
// Access token should have:
// - userId: <user_id>
// - email: token-test-1@pdflab.test
// - plan: free
// - exp: ~15 minutes from now

// Refresh token should have:
// - userId: <user_id>
// - email: token-test-1@pdflab.test
// - plan: free
// - exp: ~30 days from now
```

**Test Case 1.2: Registration with Existing Email Fails**

**Steps**:
1. Open http://localhost:3000/signup
2. Use same email as Test Case 1.1
3. Fill in form and submit

**Expected Results**:
- ❌ Registration fails
- ✅ Error message: "Email already exists" or similar
- ✅ No tokens stored in localStorage
- ✅ User stays on signup page

**Test Case 1.3: Registration with Weak Password Fails**

**Steps**:
1. Open http://localhost:3000/signup
2. Use password: "weak"
3. Submit form

**Expected Results**:
- ❌ Registration fails
- ✅ Error message about password requirements
- ✅ No tokens stored
- ✅ User stays on signup page

---

### Test Suite 2: User Login with Tokens

**Test Case 2.1: Successful Login Returns Tokens**

**Steps**:
1. Open http://localhost:3000/login
2. Enter credentials:
   - Email: "token-test-1@pdflab.test"
   - Password: "TestPass123!"
3. Click "Login"

**Expected Results**:
- ✅ Login succeeds
- ✅ Response includes both `token` and `refreshToken`
- ✅ Both tokens stored in localStorage
- ✅ User redirected to /dashboard
- ✅ User profile loaded

**Validation**:
```javascript
// Browser console
const authToken = localStorage.getItem('authToken')
const refreshToken = localStorage.getItem('refreshToken')

// Both should be valid JWT tokens
console.log('Access Token:', authToken)
console.log('Refresh Token:', refreshToken)

// Tokens should be different from registration tokens
// (new tokens generated on each login)
```

**Test Case 2.2: Login with Wrong Password Fails**

**Steps**:
1. Open http://localhost:3000/login
2. Enter:
   - Email: "token-test-1@pdflab.test"
   - Password: "WrongPass123!"
3. Submit

**Expected Results**:
- ❌ Login fails
- ✅ Error message: "Invalid credentials"
- ✅ No tokens stored
- ✅ User stays on login page

**Test Case 2.3: Login with Non-Existent Email Fails**

**Steps**:
1. Use email: "nonexistent@pdflab.test"
2. Submit login form

**Expected Results**:
- ❌ Login fails
- ✅ Error message: "Invalid credentials" (don't reveal email doesn't exist)
- ✅ No tokens stored

---

### Test Suite 3: Token Refresh Mechanism

**Test Case 3.1: Manual Token Refresh**

**Steps**:
1. Login as "token-test-1@pdflab.test"
2. Open browser console
3. Execute manual refresh:

```javascript
const refreshToken = localStorage.getItem('refreshToken')

fetch('http://localhost:3006/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: refreshToken })
})
.then(r => r.json())
.then(data => {
  console.log('New Access Token:', data.token)
  console.log('New Refresh Token:', data.refreshToken)

  // Verify tokens are different from old tokens
  const oldAuthToken = localStorage.getItem('authToken')
  console.log('Token changed:', data.token !== oldAuthToken)

  // Store new tokens
  localStorage.setItem('authToken', data.token)
  localStorage.setItem('refreshToken', data.refreshToken)
})
```

**Expected Results**:
- ✅ Refresh succeeds
- ✅ New access token returned (different from old)
- ✅ New refresh token returned (different from old)
- ✅ Both tokens are valid JWTs
- ✅ Both contain correct user data

**Test Case 3.2: Automatic Token Refresh on API Call**

**Steps**:
1. Login as test user
2. Wait 16 minutes (access token expired)
3. Make any API call (e.g., visit /dashboard, click on profile)

**Expected Results**:
- ✅ Initial API call returns 401 Unauthorized
- ✅ Frontend automatically calls /api/auth/refresh
- ✅ New tokens obtained
- ✅ Original API call retried with new token
- ✅ Operation succeeds seamlessly
- ✅ No user interruption

**Validation**:
```javascript
// Check browser console for logs:
// "⚠️ Access token expired, attempting refresh..."
// "✅ Access token refreshed successfully"
// "✅ Request retried with new token"
```

**SHORTCUT for Testing (Don't wait 16 minutes)**:

```javascript
// Browser console - expire the access token manually
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('authToken', expiredToken)

// Now try any API call - should trigger auto-refresh
window.location.reload()
```

**Test Case 3.3: Token Refresh with Expired Refresh Token**

**Steps**:
1. Login as test user
2. Manually expire refresh token:

```javascript
// Set refresh token to expired token
const expiredRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('refreshToken', expiredRefreshToken)

// Also expire access token
localStorage.setItem('authToken', expiredRefreshToken)

// Reload page
window.location.reload()
```

**Expected Results**:
- ❌ Refresh fails (refresh token expired)
- ✅ Tokens cleared from localStorage
- ✅ User redirected to /login
- ✅ Error message: "Session expired, please log in again"

**Test Case 3.4: Token Refresh with Invalid Refresh Token**

**Steps**:
1. Login as test user
2. Corrupt refresh token:

```javascript
localStorage.setItem('refreshToken', 'invalid.token.here')
localStorage.setItem('authToken', 'invalid.token.here')
window.location.reload()
```

**Expected Results**:
- ❌ Refresh fails (invalid token)
- ✅ Tokens cleared from localStorage
- ✅ User redirected to /login

---

### Test Suite 4: Session Persistence & Restoration

**Test Case 4.1: Session Persists After Page Reload**

**Steps**:
1. Login as test user
2. Navigate to /dashboard
3. Press F5 (reload page)

**Expected Results**:
- ✅ Tokens still in localStorage
- ✅ User profile loaded automatically
- ✅ User stays logged in
- ✅ Dashboard displays correctly

**Test Case 4.2: Session Persists After Browser Close/Reopen**

**Steps**:
1. Login as test user
2. Close browser completely
3. Reopen browser
4. Navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Tokens still in localStorage (persisted)
- ✅ User automatically logged in
- ✅ Dashboard loads correctly

**Test Case 4.3: Session Restoration with Expired Access Token**

**Steps**:
1. Login as test user
2. Wait 16 minutes (or manually expire access token)
3. Reload page

**Expected Results**:
- ✅ Access token expired
- ✅ Refresh token still valid
- ✅ Automatic refresh triggered
- ✅ New access token obtained
- ✅ User stays logged in
- ✅ Session restored seamlessly

**Validation**:
```javascript
// Browser console should show:
console.log('⚠️ Access token expired, attempting refresh...')
console.log('✅ Session restored with refreshed token')
```

**Test Case 4.4: Session Restoration Fails After 30 Days**

**Steps**:
1. Login as test user
2. Manually set both tokens to expired (30+ days old):

```javascript
const expired30Days = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('authToken', expired30Days)
localStorage.setItem('refreshToken', expired30Days)
window.location.reload()
```

**Expected Results**:
- ❌ Both tokens expired
- ✅ Session restoration fails
- ✅ Tokens cleared from localStorage
- ✅ User redirected to /login
- ✅ Message: "Session expired, please log in again"

---

### Test Suite 5: Google OAuth Token Flow

**Test Case 5.1: Successful Google OAuth Login**

**Steps**:
1. Open http://localhost:3000/login
2. Click "Continue with Google" button
3. Complete Google OAuth flow
4. Redirected back to /auth/callback?token=...&refreshToken=...

**Expected Results**:
- ✅ Callback URL contains both `token` and `refreshToken` parameters
- ✅ Both tokens stored in localStorage
- ✅ User profile loaded
- ✅ User redirected to /dashboard
- ✅ User is logged in

**Validation**:
```javascript
// Check callback URL parameters
const urlParams = new URLSearchParams(window.location.search)
console.log('Access Token:', urlParams.get('token'))
console.log('Refresh Token:', urlParams.get('refreshToken'))

// Check localStorage
console.log('Stored Access Token:', localStorage.getItem('authToken'))
console.log('Stored Refresh Token:', localStorage.getItem('refreshToken'))
```

**Test Case 5.2: OAuth Callback with Missing Token**

**Steps**:
1. Manually navigate to: http://localhost:3000/auth/callback?refreshToken=abc
   (Missing `token` parameter)

**Expected Results**:
- ❌ Authentication fails
- ✅ Error message displayed
- ✅ User redirected to /login
- ✅ No tokens stored

**Test Case 5.3: OAuth Callback with Invalid Tokens**

**Steps**:
1. Navigate to: http://localhost:3000/auth/callback?token=invalid&refreshToken=invalid

**Expected Results**:
- ❌ Token validation fails
- ✅ Error message: "Invalid authentication tokens"
- ✅ User redirected to /login
- ✅ No tokens stored

---

### Test Suite 6: Password Reset Token Flow

**Test Case 6.1: Request Password Reset**

**Steps**:
1. Open http://localhost:3000/forgot-password
2. Enter email: "token-test-1@pdflab.test"
3. Submit form

**Expected Results**:
- ✅ Request succeeds
- ✅ Success message: "Password reset email sent"
- ✅ Email sent to user (check backend logs for email body)
- ✅ Reset link format: http://localhost:3000/reset-password?token=<reset_token>

**Validation**:
```javascript
// Check backend logs for email content
// Extract reset token from email
// Decode at jwt.io - should have:
// - userId: <user_id>
// - type: 'password_reset'
// - exp: ~1 hour from now
```

**Test Case 6.2: Reset Password with Valid Token**

**Steps**:
1. Request password reset (Test Case 6.1)
2. Copy reset token from email/logs
3. Navigate to: http://localhost:3000/reset-password?token=<reset_token>
4. Enter new password: "NewTestPass123!"
5. Confirm password: "NewTestPass123!"
6. Submit

**Expected Results**:
- ✅ Password reset succeeds
- ✅ Success message: "Password reset successfully"
- ✅ User redirected to /login
- ✅ Can login with new password
- ✅ Cannot login with old password

**Validation**:
```javascript
// Try logging in with new password
// Should succeed

// Try logging in with old password
// Should fail
```

**Test Case 6.3: Reset Password with Expired Token**

**Steps**:
1. Request password reset
2. Wait 61 minutes (or use expired token)
3. Try to reset password

**Expected Results**:
- ❌ Reset fails
- ✅ Error message: "Reset token expired"
- ✅ User redirected to /forgot-password
- ✅ Password NOT changed

**Test Case 6.4: Reset Password with Invalid Token**

**Steps**:
1. Navigate to: http://localhost:3000/reset-password?token=invalid_token
2. Try to reset password

**Expected Results**:
- ❌ Reset fails
- ✅ Error message: "Invalid reset token"
- ✅ User redirected to /forgot-password

**Test Case 6.5: Reset Token Cannot Be Used as Access Token**

**Steps**:
1. Request password reset
2. Copy reset token
3. Try to use it to access protected endpoint:

```javascript
const resetToken = '<reset_token_from_email>'

fetch('http://localhost:3006/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${resetToken}` }
})
.then(r => r.json())
.then(data => console.log(data))
```

**Expected Results**:
- ❌ Request fails
- ✅ Status: 401 Unauthorized
- ✅ Error: "Invalid token" or "Token type mismatch"

---

### Test Suite 7: Token Expiration Handling

**Test Case 7.1: Access Token Expires After 15 Minutes**

**Steps**:
1. Login as test user
2. Note exact login time
3. Wait 14 minutes
4. Make API call (visit /dashboard)
5. Wait 2 more minutes (total 16 min)
6. Make another API call

**Expected Results**:
- ✅ At 14 min: Token still valid, API call succeeds
- ✅ At 16 min: Token expired
- ✅ Auto-refresh triggered
- ✅ New token obtained
- ✅ API call succeeds

**Test Case 7.2: Refresh Token Expires After 30 Days**

**Steps**:
1. Login as test user
2. Manually set tokens to 30+ days old (see Test Case 4.4)
3. Reload page

**Expected Results**:
- ❌ Both tokens expired
- ✅ User logged out
- ✅ Redirected to /login

**Test Case 7.3: Multiple Concurrent Requests with Expired Token**

**Steps**:
1. Login as test user
2. Expire access token manually
3. Make 5 API calls simultaneously:

```javascript
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('authToken', expiredToken)

// Make 5 concurrent requests
Promise.all([
  fetch('http://localhost:3006/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  }),
  fetch('http://localhost:3006/api/history', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  }),
  fetch('http://localhost:3006/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  }),
  fetch('http://localhost:3006/api/history', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  }),
  fetch('http://localhost:3006/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  })
]).then(results => console.log('Results:', results))
```

**Expected Results**:
- ✅ First 401 triggers token refresh
- ✅ Subsequent requests wait for refresh
- ✅ All requests retry with new token
- ✅ All requests succeed
- ✅ Only ONE refresh call made (not 5)

**NOTE**: This tests the token refresh race condition handling.

---

### Test Suite 8: Protected Routes & Authorization

**Test Case 8.1: Access Protected Route Without Token**

**Steps**:
1. Clear all tokens:
```javascript
localStorage.clear()
```
2. Navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Redirect to /login
- ✅ URL changes to /login
- ✅ Login page displayed

**Test Case 8.2: Access Protected Route with Invalid Token**

**Steps**:
1. Set invalid token:
```javascript
localStorage.setItem('authToken', 'invalid.token')
localStorage.setItem('refreshToken', 'invalid.token')
```
2. Navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Token validation fails
- ✅ Tokens cleared
- ✅ Redirect to /login

**Test Case 8.3: Access Protected Route with Valid Token**

**Steps**:
1. Login as test user
2. Navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Dashboard loads correctly
- ✅ User profile displayed
- ✅ No redirects
- ✅ Protected data visible

**Test Case 8.4: Authenticated User Accessing Guest-Only Pages**

**Steps**:
1. Login as test user
2. Navigate to http://localhost:3000/login

**Expected Results**:
- ✅ User is authenticated
- ✅ Redirect to /dashboard (regular user) or /admin (admin user)
- ✅ Cannot access /login or /signup while logged in

---

### Test Suite 9: Logout & Token Cleanup

**Test Case 9.1: Logout Clears All Tokens**

**Steps**:
1. Login as test user
2. Verify tokens exist:
```javascript
console.log('Before logout:')
console.log('Auth Token:', localStorage.getItem('authToken'))
console.log('Refresh Token:', localStorage.getItem('refreshToken'))
```
3. Click logout button
4. Verify tokens cleared:
```javascript
console.log('After logout:')
console.log('Auth Token:', localStorage.getItem('authToken'))
console.log('Refresh Token:', localStorage.getItem('refreshToken'))
```

**Expected Results**:
- ✅ Both tokens removed from localStorage
- ✅ User redirected to /login or home page
- ✅ User profile cleared
- ✅ Cannot access protected routes

**Test Case 9.2: Logout and Re-Login**

**Steps**:
1. Login as test user
2. Logout
3. Login again with same credentials

**Expected Results**:
- ✅ New tokens generated (different from first login)
- ✅ Login succeeds
- ✅ User redirected to /dashboard
- ✅ Profile loaded correctly

**Test Case 9.3: Manual Token Deletion**

**Steps**:
1. Login as test user
2. Manually delete tokens:
```javascript
localStorage.removeItem('authToken')
localStorage.removeItem('refreshToken')
```
3. Try to access protected route

**Expected Results**:
- ✅ No tokens found
- ✅ Redirect to /login
- ✅ User treated as logged out

---

### Test Suite 10: Token Security

**Test Case 10.1: Token Cannot Be Forged**

**Steps**:
1. Create fake token with different signature:
```javascript
// Valid token structure but wrong signature
const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBsYW4iOiJmcmVlIiwiZXhwIjoxNzAwMDAwMDAwfQ.WRONG_SIGNATURE_HERE'

fetch('http://localhost:3006/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${forgedToken}` }
})
.then(r => r.json())
.then(data => console.log(data))
```

**Expected Results**:
- ❌ Request fails
- ✅ Status: 401 Unauthorized
- ✅ Error: "Invalid token"

**Test Case 10.2: Token Payload Cannot Be Modified**

**Steps**:
1. Login as free user
2. Decode token at jwt.io
3. Modify payload to set plan: "enterprise"
4. Re-encode with wrong signature
5. Try to use modified token

**Expected Results**:
- ❌ Token validation fails
- ✅ Signature mismatch detected
- ✅ Status: 401 Unauthorized

**Test Case 10.3: Expired Token Cannot Be Used**

**Steps**:
1. Use token with past expiration date:
```javascript
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.signature'

fetch('http://localhost:3006/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${expiredToken}` }
})
.then(r => console.log('Status:', r.status))
```

**Expected Results**:
- ❌ Request fails
- ✅ Status: 401 Unauthorized
- ✅ Error: "Token expired" or "Invalid token"

**Test Case 10.4: Token Cannot Be Reused After Logout**

**Steps**:
1. Login as test user
2. Copy access token:
```javascript
const tokenBeforeLogout = localStorage.getItem('authToken')
console.log('Token:', tokenBeforeLogout)
```
3. Logout
4. Try to use old token:
```javascript
fetch('http://localhost:3006/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${tokenBeforeLogout}` }
})
.then(r => r.json())
.then(data => console.log(data))
```

**Expected Results**:
- ✅ Token technically still valid (JWT is stateless)
- ⚠️ **NOTE**: Current implementation doesn't invalidate tokens server-side
- ⚠️ **TODO**: Consider implementing token blacklist in Redis for true logout

**Test Case 10.5: XSS Protection - Tokens Not Accessible via Document Cookie**

**Steps**:
1. Login as test user
2. Check cookies:
```javascript
console.log('Document cookies:', document.cookie)
```

**Expected Results**:
- ✅ Tokens NOT in cookies (stored in localStorage)
- ✅ No sensitive data in cookies
- ⚠️ **NOTE**: localStorage vulnerable to XSS, consider httpOnly cookies for production

---

## Validation Criteria

### Token Structure Validation

All tokens must:
- ✅ Be valid JWT format (header.payload.signature)
- ✅ Have `alg: HS256` in header
- ✅ Have `typ: JWT` in header
- ✅ Contain required payload fields:
  - `userId` (string, UUID)
  - `email` (string, valid email)
  - `plan` (string: free/starter/pro/enterprise)
  - `exp` (number, Unix timestamp)
  - `iat` (number, Unix timestamp - issued at)

### Access Token Validation

- ✅ Expiration: 15 minutes from issued time
- ✅ Payload includes: userId, email, plan
- ✅ No type field (default is access token)

### Refresh Token Validation

- ✅ Expiration: 30 days from issued time
- ✅ Payload includes: userId, email, plan
- ✅ Can be used to obtain new access token
- ✅ Rotates on each refresh (new refresh token issued)

### Password Reset Token Validation

- ✅ Expiration: 1 hour from issued time
- ✅ Payload includes: userId, email, plan, **type: 'password_reset'**
- ✅ Cannot be used as access token
- ✅ Single-use (should be invalidated after use)

---

## Expected Token Lifetimes

| Token Type | Lifetime | Use Case | Stored In |
|------------|----------|----------|-----------|
| Access Token | 15 minutes | API authentication | localStorage.authToken |
| Refresh Token | 30 days | Renewing access tokens | localStorage.refreshToken |
| Password Reset | 1 hour | Password reset flow | Email link only |
| OAuth Callback | 5 minutes | OAuth flow completion | URL params → localStorage |

---

## Test Data: Sample Tokens

### Valid Access Token (15 min)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QHBkZmxhYi50ZXN0IiwicGxhbiI6ImZyZWUiLCJpYXQiOjE3MzE5MDAwMDAsImV4cCI6MTczMTkwMDkwMH0.SIGNATURE
```

Decoded:
```json
{
  "userId": "1234567890",
  "email": "test@pdflab.test",
  "plan": "free",
  "iat": 1731900000,
  "exp": 1731900900
}
```

### Valid Refresh Token (30 days)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QHBkZmxhYi50ZXN0IiwicGxhbiI6ImZyZWUiLCJpYXQiOjE3MzE5MDAwMDAsImV4cCI6MTczNDQ5MjAwMH0.SIGNATURE
```

### Expired Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.SIGNATURE
```

---

## Common Issues & Troubleshooting

### Issue 1: Token Refresh Not Triggering

**Symptoms**:
- 401 errors not triggering refresh
- User logged out instead of auto-refresh

**Checks**:
1. Verify `fetchWithTokenRefresh` is used for API calls
2. Check refresh token exists in localStorage
3. Verify refresh endpoint returns 200 with new tokens
4. Check browser console for errors

**Fix**:
```javascript
// Ensure API calls use the wrapped fetch
import { fetchWithTokenRefresh } from '@/lib/api'

// ✅ CORRECT
const response = await fetchWithTokenRefresh(url, options)

// ❌ WRONG - bypasses auto-refresh
const response = await fetch(url, options)
```

### Issue 2: Tokens Not Persisting After Reload

**Symptoms**:
- User logged out on page refresh
- Tokens missing from localStorage

**Checks**:
1. Verify tokens saved to localStorage after login
2. Check browser storage in DevTools
3. Verify no code clearing localStorage unintentionally

**Fix**:
```javascript
// After login/signup/OAuth callback
localStorage.setItem('authToken', accessToken)
localStorage.setItem('refreshToken', refreshToken)
```

### Issue 3: Infinite Refresh Loop

**Symptoms**:
- Console shows repeated refresh attempts
- Network tab shows constant /api/auth/refresh calls

**Checks**:
1. Verify refresh endpoint returns NEW tokens
2. Check tokens are being stored after refresh
3. Verify no circular dependency in auth code

**Fix**:
```javascript
// Ensure new tokens replace old ones
const newToken = await refreshAccessToken()
if (newToken) {
  // This should update localStorage
  // ✅ MUST call setAuthTokens to update storage
}
```

### Issue 4: OAuth Callback Tokens Not Working

**Symptoms**:
- Redirected to login after OAuth callback
- Tokens in URL but not stored

**Checks**:
1. Verify callback page calls `setTokens()`
2. Check URL parameters contain both tokens
3. Verify tokens are valid JWTs

**Fix** (app/auth/callback/page.tsx):
```typescript
const token = searchParams.get('token')
const refreshToken = searchParams.get('refreshToken')

if (token && refreshToken) {
  await setTokens(token, refreshToken)
}
```

---

## Performance Benchmarks

### Token Generation Speed
- ✅ Access token generation: <5ms
- ✅ Refresh token generation: <5ms
- ✅ Password reset token generation: <5ms

### Token Verification Speed
- ✅ Token verification: <2ms
- ✅ User lookup after verification: <10ms
- ✅ Total auth middleware time: <15ms

### Token Refresh Flow
- ✅ Refresh request processing: <50ms
- ✅ New token generation: <10ms
- ✅ Total refresh time: <100ms

---

## Test Coverage Goals

- ✅ **Unit Tests**: 80%+ coverage of auth utilities
- ✅ **Integration Tests**: All token flows tested end-to-end
- ✅ **Manual Tests**: All test cases executed
- ✅ **Security Tests**: All security scenarios validated
- ✅ **Performance Tests**: Response times within benchmarks

---

**Next**: See [Automated Backend Tests](#automated-backend-tests) for test scripts
