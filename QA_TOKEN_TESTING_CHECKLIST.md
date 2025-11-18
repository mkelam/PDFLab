# QA Token Testing Checklist

**Date**: November 18, 2025
**Tester**: ___________________
**Environment**: ☐ Local ☐ Staging ☐ Production
**Browser**: ☐ Chrome ☐ Firefox ☐ Safari ☐ Edge

---

## Pre-Test Setup

- [ ] Backend running on http://localhost:3006
- [ ] Frontend running on http://localhost:3000
- [ ] MySQL database accessible
- [ ] Redis cache running
- [ ] Browser DevTools open (F12)
- [ ] localStorage cleared (`localStorage.clear()`)
- [ ] Cookies cleared
- [ ] Test user accounts created (see Test Data section)

---

## Test Execution

### ✅ = PASS | ❌ = FAIL | ⚠️ = PARTIAL | ➖ = SKIP

---

## Section 1: User Registration with Tokens

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 1.1 | Register new user | Both `token` and `refreshToken` returned | ☐ | |
| 1.2 | Verify tokens stored in localStorage | `authToken` and `refreshToken` exist | ☐ | |
| 1.3 | Decode access token at jwt.io | Expiration ~15 min, correct user data | ☐ | |
| 1.4 | Decode refresh token at jwt.io | Expiration ~30 days, correct user data | ☐ | |
| 1.5 | User redirected to /dashboard | Dashboard loads correctly | ☐ | |
| 1.6 | Register with existing email | Error displayed, no tokens stored | ☐ | |
| 1.7 | Register with weak password | Error displayed, no tokens stored | ☐ | |

**Section 1 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 2: User Login with Tokens

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 2.1 | Login with correct credentials | Both tokens returned and stored | ☐ | |
| 2.2 | Verify new tokens different from registration | Tokens rotated on login | ☐ | |
| 2.3 | Login with wrong password | Error displayed, no tokens stored | ☐ | |
| 2.4 | Login with non-existent email | Error displayed, no tokens stored | ☐ | |
| 2.5 | Login redirects to /dashboard | User profile loaded correctly | ☐ | |
| 2.6 | Admin login redirects to /admin | Admin panel accessible | ☐ | |

**Section 2 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 3: Token Refresh Mechanism

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 3.1 | Manual refresh via browser console | New tokens returned (both different) | ☐ | Use script from guide |
| 3.2 | Verify refresh uses camelCase parameter | Check Network tab: `refreshToken` not `refresh_token` | ☐ | |
| 3.3 | Verify response uses camelCase | Response has `refreshToken` field | ☐ | |
| 3.4 | Refresh with invalid token | 401 error, tokens cleared | ☐ | |
| 3.5 | Refresh with expired refresh token | 401 error, redirect to /login | ☐ | |

**Section 3 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 4: Automatic Token Refresh

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 4.1 | Wait 16 minutes after login | Access token expires | ☐ | OR use manual expiry script |
| 4.2 | Make API call (visit /dashboard) | Auto-refresh triggered | ☐ | Check console logs |
| 4.3 | Verify request retried with new token | Operation succeeds seamlessly | ☐ | No user interruption |
| 4.4 | Check localStorage for new tokens | Both tokens updated | ☐ | |
| 4.5 | Console shows refresh logs | "⚠️ Access token expired..." + "✅ Refreshed successfully" | ☐ | |

**Section 4 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 5: Session Persistence & Restoration

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 5.1 | Login and reload page (F5) | Session persists, user stays logged in | ☐ | |
| 5.2 | Close browser and reopen | Session persists (tokens in localStorage) | ☐ | |
| 5.3 | Reload page with expired access token | Auto-refresh + session restored | ☐ | |
| 5.4 | Reload page with expired refresh token | Redirect to /login, tokens cleared | ☐ | |
| 5.5 | Session restoration console logs | Shows refresh flow if needed | ☐ | |

**Section 5 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 6: Google OAuth Token Flow

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 6.1 | Click "Continue with Google" | Redirected to Google OAuth | ☐ | |
| 6.2 | Complete Google authentication | Redirected to /auth/callback | ☐ | |
| 6.3 | Verify callback URL parameters | Contains `token` and `refreshToken` params | ☐ | |
| 6.4 | Verify tokens stored in localStorage | Both tokens present | ☐ | |
| 6.5 | Redirected to /dashboard | User profile loaded | ☐ | |
| 6.6 | Manual callback with missing token | Error displayed, redirect to /login | ☐ | Navigate to /auth/callback?refreshToken=abc |
| 6.7 | Manual callback with invalid tokens | Error displayed, redirect to /login | ☐ | |

**Section 6 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 7: Password Reset Token Flow

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 7.1 | Request password reset | Success message displayed | ☐ | |
| 7.2 | Check email for reset link | Email received with valid link | ☐ | Or check backend logs |
| 7.3 | Click reset link | Redirected to /reset-password?token=... | ☐ | |
| 7.4 | Enter new password and submit | Password reset successful | ☐ | |
| 7.5 | Login with new password | Login succeeds | ☐ | |
| 7.6 | Login with old password | Login fails | ☐ | |
| 7.7 | Reset with expired token (>1 hour) | Error message, redirect to /forgot-password | ☐ | |
| 7.8 | Reset with invalid token | Error message displayed | ☐ | |
| 7.9 | Try using reset token as access token | 401 error (should not work) | ☐ | Use browser console |

**Section 7 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 8: Protected Routes & Authorization

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 8.1 | Access /dashboard without token | Redirect to /login | ☐ | Clear localStorage first |
| 8.2 | Access /dashboard with invalid token | Redirect to /login, tokens cleared | ☐ | |
| 8.3 | Access /dashboard with valid token | Dashboard loads correctly | ☐ | |
| 8.4 | Authenticated user visits /login | Redirect to /dashboard | ☐ | |
| 8.5 | Authenticated user visits /signup | Redirect to /dashboard | ☐ | |
| 8.6 | Admin user visits /login | Redirect to /admin | ☐ | |
| 8.7 | Regular user tries /admin | Access denied or redirect | ☐ | |

**Section 8 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 9: Logout & Token Cleanup

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 9.1 | Click logout button | Tokens cleared from localStorage | ☐ | Check console: both null |
| 9.2 | Redirected to /login or home | Navigation successful | ☐ | |
| 9.3 | Try accessing /dashboard after logout | Redirect to /login | ☐ | |
| 9.4 | Logout and re-login | New tokens generated (different) | ☐ | |
| 9.5 | Manual token deletion | User treated as logged out | ☐ | Use `localStorage.clear()` |

**Section 9 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 10: API Operations with Tokens

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 10.1 | Convert PDF (logged in) | Conversion succeeds | ☐ | |
| 10.2 | Merge PDFs (logged in) | Merge succeeds | ☐ | |
| 10.3 | Compress PDF (logged in) | Compression succeeds | ☐ | |
| 10.4 | View conversion history | History loads correctly | ☐ | |
| 10.5 | API call with expired token | Auto-refresh + retry succeeds | ☐ | |
| 10.6 | Verify Authorization header | Contains `Bearer <token>` | ☐ | Check Network tab |
| 10.7 | API call without token (guest) | Limited functionality or error | ☐ | |

**Section 10 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 11: Token Security

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 11.1 | Inspect token payload at jwt.io | No password or sensitive data | ☐ | |
| 11.2 | Verify token signature | Uses HS256 algorithm | ☐ | |
| 11.3 | Modify token payload | Token verification fails | ☐ | Change plan to 'enterprise' |
| 11.4 | Use forged token | 401 error | ☐ | |
| 11.5 | Use expired token | 401 error | ☐ | |
| 11.6 | Check cookies | No tokens in document.cookie | ☐ | Tokens in localStorage only |
| 11.7 | XSS attempt | Tokens not accessible via script injection | ☐ | (Advanced test) |

**Section 11 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 12: Token Expiration Handling

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|----------------|--------|-------|
| 12.1 | Access token expires after 15 min | Auto-refresh triggered | ☐ | Wait or manual expiry |
| 12.2 | Refresh token expires after 30 days | User logged out, redirect to /login | ☐ | Manual expiry script |
| 12.3 | Both tokens expired | Redirect to /login, tokens cleared | ☐ | |
| 12.4 | Token expires during API call | Seamless refresh + retry | ☐ | No error shown to user |
| 12.5 | Multiple API calls with expired token | Single refresh, all retries succeed | ☐ | |

**Section 12 Result**: ☐ PASS ☐ FAIL
**Comments**: ___________________________________________

---

## Section 13: Cross-Browser Testing

Test key flows in different browsers:

| Browser | Login | Refresh | Session Restore | Logout | Status | Notes |
|---------|-------|---------|----------------|--------|--------|-------|
| Chrome | ☐ | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL | |
| Firefox | ☐ | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL | |
| Safari | ☐ | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL | |
| Edge | ☐ | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL | |

---

## Section 14: Mobile Testing

Test on mobile devices (responsive design + token handling):

| Device | Browser | Login | Tokens Stored | Session Restore | Status |
|--------|---------|-------|---------------|----------------|--------|
| iOS Safari | Safari | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL |
| Android Chrome | Chrome | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL |
| Mobile Firefox | Firefox | ☐ | ☐ | ☐ | ☐ PASS ☐ FAIL |

---

## Section 15: Performance Testing

| # | Test Case | Target | Actual | Status | Notes |
|---|-----------|--------|--------|--------|-------|
| 15.1 | Token generation time | <10ms | ____ ms | ☐ | Backend performance test |
| 15.2 | Token verification time | <5ms | ____ ms | ☐ | Backend performance test |
| 15.3 | Token refresh request time | <100ms | ____ ms | ☐ | Network tab |
| 15.4 | Auto-refresh overhead | <200ms | ____ ms | ☐ | Measure API call retry |
| 15.5 | Session restoration time | <500ms | ____ ms | ☐ | Page load performance |

---

## Test Data

### Test User Accounts

```
Regular User:
- Email: token-test-user@pdflab.test
- Password: TestPass123!
- Plan: Free

Admin User:
- Email: token-test-admin@pdflab.test
- Password: AdminPass123!
- Plan: Pro
- Role: admin

Beta User:
- Email: token-test-beta@pdflab.test
- Password: BetaPass123!
- Plan: Starter
- Beta: true
```

### Manual Token Expiry Scripts

**Expire Access Token**:
```javascript
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('authToken', expiredToken)
console.log('✅ Access token manually expired')
window.location.reload()
```

**Expire Both Tokens**:
```javascript
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.fake'
localStorage.setItem('authToken', expiredToken)
localStorage.setItem('refreshToken', expiredToken)
console.log('✅ Both tokens manually expired')
window.location.reload()
```

**Manual Token Refresh**:
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
  localStorage.setItem('authToken', data.token)
  localStorage.setItem('refreshToken', data.refreshToken)
  console.log('✅ Tokens refreshed manually')
})
.catch(err => console.error('❌ Refresh failed:', err))
```

**Inspect Current Tokens**:
```javascript
console.log('Access Token:', localStorage.getItem('authToken'))
console.log('Refresh Token:', localStorage.getItem('refreshToken'))

// Decode at https://jwt.io
```

---

## Common Issues & Solutions

### Issue 1: Tokens Not Persisting

**Symptoms**: User logged out on page reload
**Check**:
- localStorage not cleared by browser settings
- No private/incognito mode
- Tokens actually stored after login

**Fix**: Verify `setAuthTokens()` called after login

---

### Issue 2: Infinite Refresh Loop

**Symptoms**: Console shows repeated refresh attempts
**Check**:
- Refresh endpoint returns new tokens
- New tokens being stored in localStorage
- No circular dependency in auth code

**Fix**: Verify tokens updated after refresh

---

### Issue 3: 401 Errors Not Triggering Refresh

**Symptoms**: User logged out instead of auto-refresh
**Check**:
- API calls use `fetchWithTokenRefresh`
- Refresh token exists in localStorage
- Network tab shows refresh request

**Fix**: Use wrapped fetch function, not raw `fetch()`

---

### Issue 4: OAuth Tokens Not Stored

**Symptoms**: Redirected to login after OAuth callback
**Check**:
- URL parameters contain both tokens
- Callback page calls `setTokens()`
- Network tab shows profile request

**Fix**: Verify callback page implementation

---

## Test Summary

**Total Sections**: 15
**Sections Passed**: _____ / 15
**Sections Failed**: _____ / 15
**Overall Status**: ☐ PASS ☐ FAIL ☐ PARTIAL

**Critical Issues Found**: _____________________
**Minor Issues Found**: _____________________
**Blockers**: _____________________

---

## Sign-Off

**Tester Name**: _____________________
**Date**: _____________________
**Signature**: _____________________

**Reviewer Name**: _____________________
**Date**: _____________________
**Signature**: _____________________

---

## Next Steps

- [ ] File bug reports for failed tests
- [ ] Retest after fixes applied
- [ ] Document workarounds for known issues
- [ ] Update test cases based on findings
- [ ] Schedule regression testing
- [ ] Deploy to production (if all tests pass)

---

**Related Documents**:
- [COMPREHENSIVE_TOKEN_TESTING_GUIDE.md](COMPREHENSIVE_TOKEN_TESTING_GUIDE.md) - Detailed test procedures
- [JWT_TOKEN_RULES_IDIOT_PROOF_GUIDE.md](JWT_TOKEN_RULES_IDIOT_PROOF_GUIDE.md) - Token documentation
- [backend/tests/auth.tokens.test.ts](backend/tests/auth.tokens.test.ts) - Automated backend tests
- [tests/token-integration.test.tsx](tests/token-integration.test.tsx) - Automated frontend tests
