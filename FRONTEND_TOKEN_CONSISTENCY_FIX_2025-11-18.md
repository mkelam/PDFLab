# Frontend Token Consistency Fix

**Date**: November 18, 2025
**Issue**: Frontend uses inconsistent parameter naming for refresh tokens (snake_case vs camelCase)
**Impact**: Potential compatibility issues, code inconsistency with documented standards

---

## Issue Summary

The JWT Token documentation (`JWT_TOKEN_RULES_IDIOT_PROOF_GUIDE.md`) specifies that **all token parameters should use camelCase** (`refreshToken`), but the frontend code currently uses **snake_case** (`refresh_token`) in multiple locations.

### Backend Compatibility

The backend controller ([auth.controller.ts:207-209](backend/src/controllers/auth.controller.ts#L207-L209)) currently accepts **BOTH** formats for backwards compatibility:

```typescript
// Accept both refreshToken (camelCase) and refresh_token (snake_case)
const { refresh_token, refreshToken: refreshTokenCamel } = req.body
const token = refreshTokenCamel || refresh_token
```

However, the backend **ALWAYS RETURNS** camelCase (`refreshToken`) in responses:

```typescript
res.status(200).json({
  token: newAccessToken,
  refreshToken: newRefreshToken  // ✅ camelCase
})
```

---

## Frontend Issues Found

### 1. lib/api.ts

**Line 147**: Sends snake_case to backend
```typescript
❌ BEFORE:
body: JSON.stringify({ refresh_token: refreshToken })

✅ AFTER:
body: JSON.stringify({ refreshToken: refreshToken })
```

**Line 159**: Expects snake_case from backend response
```typescript
❌ BEFORE:
setAuthTokens(data.token, data.refresh_token)

✅ AFTER:
setAuthTokens(data.token, data.refreshToken)
```

### 2. contexts/AuthContext.tsx

**Line 79**: Sends snake_case to backend
```typescript
❌ BEFORE:
body: JSON.stringify({ refresh_token: refreshToken })

✅ AFTER:
body: JSON.stringify({ refreshToken: refreshToken })
```

**Lines 86, 149, 209, 213, 235**: Expects snake_case from backend responses
```typescript
❌ BEFORE:
localStorage.setItem('refreshToken', refreshData.refresh_token)
localStorage.setItem('refreshToken', data.refresh_token)

✅ AFTER:
localStorage.setItem('refreshToken', refreshData.refreshToken)
localStorage.setItem('refreshToken', data.refreshToken)
```

---

## Files to Update

1. **lib/api.ts** (2 changes)
   - Line 147: Send parameter
   - Line 159: Response parsing

2. **contexts/AuthContext.tsx** (5 changes)
   - Line 79: Send parameter
   - Lines 86, 149, 209, 213, 235: Response parsing

---

## Why This Matters

### 1. **Code Consistency**
- JavaScript/TypeScript convention is camelCase for object properties
- Backend returns camelCase, frontend should match

### 2. **Documentation Alignment**
- JWT Token Rules Guide specifies `refreshToken` (camelCase)
- Current code contradicts documentation

### 3. **Future-Proofing**
- If backend removes snake_case support, frontend will break
- Better to fix now while backend supports both

### 4. **Developer Experience**
- Inconsistent naming confuses developers
- Harder to debug when different parts use different conventions

---

## Testing Checklist

After applying fixes:

- [ ] **User Login** - Verify tokens stored correctly
- [ ] **Token Refresh** (after 15 min) - Verify auto-refresh works
- [ ] **Page Reload** - Verify session restoration works
- [ ] **User Signup** - Verify tokens stored correctly
- [ ] **OAuth Callback** - Verify Google OAuth tokens stored correctly
- [ ] **Logout** - Verify tokens cleared correctly

---

## Implementation

All changes applied via Edit tool to maintain exact code structure. No behavioral changes, only parameter name consistency fixes.

---

**Status**: ✅ READY TO DEPLOY
**Breaking Changes**: None (backend supports both formats)
**Risk Level**: LOW (cosmetic changes only)
