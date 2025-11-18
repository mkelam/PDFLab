# JWT Token Rules - Idiot-Proof Guide

**PDFLab Authentication System**
**Date**: 2025-11-18
**For**: Developers, QA, Support Teams

---

## Table of Contents

1. [Token Types](#token-types)
2. [Token Generation Rules](#token-generation-rules)
3. [Token Expiration](#token-expiration)
4. [Token Usage](#token-usage)
5. [Token Verification](#token-verification)
6. [Common Scenarios with Examples](#common-scenarios-with-examples)
7. [Error Messages](#error-messages)
8. [Troubleshooting](#troubleshooting)

---

## Token Types

### 1. Access Token (Short-Lived)
**Purpose**: Access protected API endpoints
**Lifetime**: 15 minutes
**Contains**: userId, email, plan
**When Generated**: Login, Register, OAuth, Token Refresh

### 2. Refresh Token (Long-Lived)
**Purpose**: Get new access tokens when expired
**Lifetime**: 30 days
**Contains**: userId, email, plan
**When Generated**: Login, Register, OAuth, Token Refresh

### 3. Password Reset Token (Special)
**Purpose**: Reset user password
**Lifetime**: 1 hour
**Contains**: userId, email, plan, type='password_reset'
**When Generated**: Forgot Password request

---

## Token Generation Rules

### Rule 1: ALWAYS Generate BOTH Tokens on Authentication

**✅ CORRECT**: Generate access + refresh token
```typescript
// Login, Register, OAuth
const accessToken = generateAccessToken({ userId, email, plan })
const refreshToken = generateRefreshToken({ userId, email, plan })

res.json({
  token: accessToken,
  refreshToken: refreshToken  // Both tokens!
})
```

**❌ WRONG**: Generate only access token
```typescript
// DON'T DO THIS
const accessToken = generateAccessToken({ userId, email, plan })

res.json({
  token: accessToken  // Missing refreshToken!
})
```

---

### Rule 2: Tokens MUST Contain User Identity

**Required Payload Fields**:
- `userId` (string) - User's UUID
- `email` (string) - User's email
- `plan` (string) - User's subscription plan

**✅ CORRECT Payload**:
```typescript
{
  userId: "123e4567-e89b-12d3-a456-426614174000",
  email: "user@example.com",
  plan: "pro"
}
```

**❌ WRONG Payload** (missing fields):
```typescript
{
  userId: "123e4567-e89b-12d3-a456-426614174000"
  // Missing email and plan!
}
```

---

### Rule 3: Token Rotation on Refresh

**When user refreshes token, BOTH tokens are regenerated**

**✅ CORRECT**: Generate new access + refresh
```typescript
const newAccessToken = generateAccessToken({ userId, email, plan })
const newRefreshToken = generateRefreshToken({ userId, email, plan })

res.json({
  token: newAccessToken,
  refreshToken: newRefreshToken  // New refresh token too!
})
```

**❌ WRONG**: Reuse old refresh token
```typescript
// DON'T DO THIS
const newAccessToken = generateAccessToken({ userId, email, plan })

res.json({
  token: newAccessToken,
  refreshToken: oldRefreshToken  // Reusing old token is insecure!
})
```

---

## Token Expiration

### Access Token: 15 Minutes

**Environment Variable**:
```bash
JWT_EXPIRATION=15m  # 15 minutes
```

**Why 15 minutes?**
- Short expiration = more secure
- If token stolen, only valid for 15 minutes
- User stays logged in via refresh token

**Timeline**:
```
Login at 10:00 AM
├─ Access token valid until 10:15 AM
├─ At 10:14 AM: Token still works
├─ At 10:16 AM: Token expired → use refresh token
└─ At 10:16 AM: Get new access token (valid until 10:31 AM)
```

---

### Refresh Token: 30 Days

**Environment Variable**:
```bash
JWT_REFRESH_EXPIRATION=30d  # 30 days
```

**Why 30 days?**
- User stays logged in for 1 month
- Longer than "remember me" cookies
- Balances security and convenience

**Timeline**:
```
Login on November 1
├─ Refresh token valid until December 1
├─ On November 15: Refresh token still works
├─ On December 2: Refresh token expired → user must login again
└─ User gets 30 days before forced re-login
```

---

### Password Reset Token: 1 Hour

**Hardcoded**:
```typescript
{ expiresIn: '1h' }  // Always 1 hour, not configurable
```

**Why 1 hour?**
- Security: Short window for password reset
- User experience: Enough time to check email and reset
- Prevents old reset links from working

**Timeline**:
```
Request reset at 2:00 PM
├─ Reset link sent to email
├─ Reset token valid until 3:00 PM
├─ At 2:30 PM: Token works → password reset succeeds
└─ At 3:05 PM: Token expired → must request new reset
```

---

## Token Usage

### How to Send Access Token (API Requests)

**✅ CORRECT**: Authorization header with Bearer prefix
```typescript
// Frontend API call
fetch('https://pdflab.pro/api/dashboard', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

**❌ WRONG**: No Bearer prefix
```typescript
// DON'T DO THIS
headers: {
  'Authorization': accessToken  // Missing "Bearer "
}
```

**❌ WRONG**: Wrong header name
```typescript
// DON'T DO THIS
headers: {
  'Token': `Bearer ${accessToken}`  // Should be "Authorization"
}
```

---

### How to Refresh Access Token

**When to Refresh**:
- Access token expired (15 minutes passed)
- API returns 401 "Token is invalid or expired"
- Proactively refresh before expiration (recommended)

**✅ CORRECT**: Auto-refresh before expiration
```typescript
// Frontend: lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://pdflab.pro/api'
})

// Response interceptor: Auto-refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken')

      // Call refresh endpoint
      const { data } = await axios.post('/api/auth/refresh', {
        refreshToken: refreshToken
      })

      // Save new tokens
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Retry original request with new token
      error.config.headers['Authorization'] = `Bearer ${data.token}`
      return axios(error.config)
    }

    return Promise.reject(error)
  }
)
```

---

## Token Verification

### Backend: Verify Token Middleware

**File**: `backend/src/middleware/auth.middleware.ts`

**Process**:
```
1. Extract token from "Authorization: Bearer <token>"
2. Verify token signature with JWT_SECRET
3. Check token not expired
4. Fetch user from database using userId from token
5. Attach user to req.user
6. Continue to endpoint handler
```

**Code Flow**:
```typescript
// authMiddleware
const authHeader = req.headers.authorization  // "Bearer eyJhbGc..."
const token = authHeader.substring(7)         // "eyJhbGc..."

const decoded = verifyToken(token)            // { userId, email, plan }
const user = await User.findByPk(decoded.userId)

req.user = user  // Attach user to request
next()           // Continue to route handler
```

---

## Common Scenarios with Examples

### Scenario 1: User Registers

**Request**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "New User"
}
```

**Response**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "user",
    "plan": "free",
    "conversions_used": 0,
    "conversions_limit": 3
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoiZnJlZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwOTAwfQ.signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6Im5ld3VzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoiZnJlZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAyNTkyMDAwfQ.signature"
}
```

**Frontend Action**:
```typescript
// Save tokens to localStorage
localStorage.setItem('authToken', response.token)
localStorage.setItem('refreshToken', response.refreshToken)

// Redirect to dashboard
router.push('/dashboard')
```

---

### Scenario 2: User Logs In

**Request**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "plan": "pro",
    "conversions_used": 45,
    "conversions_limit": 999999,
    "last_login": "2025-11-18T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoicHJvIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDA5MDB9.signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoicHJvIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDI1OTIwMDB9.signature"
}
```

**Frontend Action**:
```typescript
// Save tokens
localStorage.setItem('authToken', response.token)
localStorage.setItem('refreshToken', response.refreshToken)

// Update auth context
setUser(response.user)

// Redirect based on role
if (response.user.role === 'admin') {
  router.push('/admin')
} else {
  router.push('/dashboard')
}
```

---

### Scenario 3: Access Protected Endpoint

**Request**:
```http
GET /api/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoicHJvIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDA5MDB9.signature
```

**Backend Process**:
```typescript
// 1. authMiddleware extracts token
const token = req.headers.authorization.substring(7)

// 2. Verify token
const decoded = verifyToken(token)
// { userId: "a1b2...", email: "user@example.com", plan: "pro" }

// 3. Fetch user from database
const user = await User.findByPk(decoded.userId)

// 4. Attach to request
req.user = user

// 5. Continue to handler
next()
```

**Response** (if valid):
```json
{
  "conversions": [...],
  "stats": {...}
}
```

---

### Scenario 4: Token Expired (After 15 Minutes)

**Request** (with expired access token):
```http
GET /api/dashboard
Authorization: Bearer <expired_token>
```

**Response**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid token",
  "message": "Token is invalid or expired"
}
```

**Frontend Action**: Auto-refresh
```typescript
// Interceptor catches 401
const refreshToken = localStorage.getItem('refreshToken')

// Request new access token
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
})

const data = await response.json()

// Save new tokens
localStorage.setItem('authToken', data.token)
localStorage.setItem('refreshToken', data.refreshToken)

// Retry original request
const retryResponse = await fetch('/api/dashboard', {
  headers: {
    'Authorization': `Bearer ${data.token}`
  }
})
```

---

### Scenario 5: Refresh Access Token

**Request**:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoicHJvIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDI1OTIwMDB9.signature"
}
```

**Backend Process**:
```typescript
// 1. Verify refresh token
const decoded = verifyToken(refreshToken)

// 2. Fetch user
const user = await User.findByPk(decoded.userId)

// 3. Generate NEW access + refresh tokens
const newAccessToken = generateAccessToken({
  userId: user.id,
  email: user.email,
  plan: user.plan
})

const newRefreshToken = generateRefreshToken({
  userId: user.id,
  email: user.email,
  plan: user.plan
})

// 4. Return both new tokens
res.json({
  token: newAccessToken,
  refreshToken: newRefreshToken
})
```

**Response**:
```json
{
  "token": "<new_access_token_valid_15_min>",
  "refreshToken": "<new_refresh_token_valid_30_days>"
}
```

**Frontend Action**:
```typescript
// Replace old tokens with new ones
localStorage.setItem('authToken', data.token)
localStorage.setItem('refreshToken', data.refreshToken)
```

---

### Scenario 6: Refresh Token Expired (After 30 Days)

**Request**:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<expired_refresh_token>"
}
```

**Response**:
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid refresh token",
  "message": "Refresh token is invalid or expired"
}
```

**Frontend Action**: Force logout + redirect to login
```typescript
// Clear all tokens
localStorage.removeItem('authToken')
localStorage.removeItem('refreshToken')

// Clear auth context
setUser(null)

// Redirect to login
router.push('/login?error=session_expired')
```

---

### Scenario 7: Google OAuth Login

**Flow**:
```
1. User clicks "Continue with Google"
2. Frontend redirects to: https://pdflab.pro/api/auth/google
3. Backend redirects to: https://accounts.google.com/o/oauth2/...
4. User authorizes app at Google
5. Google redirects to: https://pdflab.pro/api/auth/google/callback?code=xyz
6. Backend exchanges code for Google profile
7. Backend creates/finds user in database
8. Backend generates tokens
9. Backend redirects to: https://pdflab.pro/auth/callback?token=abc&refreshToken=def
10. Frontend saves tokens and redirects to dashboard
```

**Backend Token Generation** (auth.google.routes.ts):
```typescript
// After Google OAuth success
const accessToken = jwt.sign(
  { userId: user.id, email: user.email, plan: user.plan },
  jwtSecret,
  { expiresIn: '15m' }
)

const refreshToken = jwt.sign(
  { userId: user.id, email: user.email, plan: user.plan },
  jwtSecret,
  { expiresIn: '30d' }
)

// Redirect to frontend with tokens
res.redirect(
  `${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`
)
```

**Frontend Callback Handler** (app/auth/callback/page.tsx):
```typescript
// Extract tokens from URL
const token = searchParams.get('token')
const refreshToken = searchParams.get('refreshToken')

// Save tokens
localStorage.setItem('authToken', token)
localStorage.setItem('refreshToken', refreshToken)

// Fetch user profile
await setTokens(token, refreshToken)

// Redirect to dashboard
router.push('/dashboard')
```

---

### Scenario 8: Forgot Password

**Request**:
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Backend Process**:
```typescript
// 1. Find user
const user = await User.findOne({ where: { email } })

// 2. Generate password reset token (1 hour expiration)
const resetToken = generatePasswordResetToken({
  userId: user.id,
  email: user.email,
  plan: user.plan
})

// 3. Send email with reset link
await emailService.sendPasswordResetEmail(
  user.email,
  resetToken
)

// Email contains:
// https://pdflab.pro/reset-password?token=<resetToken>
```

**Response**:
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

---

### Scenario 9: Reset Password with Token

**Request**:
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJwbGFuIjoicHJvIiwidHlwZSI6InBhc3N3b3JkX3Jlc2V0IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDM2MDB9.signature",
  "new_password": "NewSecurePass456"
}
```

**Backend Verification**:
```typescript
// 1. Verify token
const decoded = verifyToken(token)

// 2. Check token type
if (decoded.type !== 'password_reset') {
  return res.status(401).json({
    error: 'Invalid token type',
    message: 'This token is not valid for password reset'
  })
}

// 3. Check token not expired (1 hour)
// Already checked by verifyToken()

// 4. Validate new password
if (!isValidPassword(new_password)) {
  return res.status(422).json({
    error: 'Weak password',
    message: 'Password must be at least 8 characters long and contain letters and numbers'
  })
}

// 5. Check password not reused (last 5 passwords)
const passwordHistory = await PasswordHistory.findAll({
  where: { user_id: decoded.userId },
  order: [['created_at', 'DESC']],
  limit: 5
})

for (const historyEntry of passwordHistory) {
  if (await verifyPassword(new_password, historyEntry.password_hash)) {
    return res.status(400).json({
      error: 'Password reuse not allowed',
      message: 'New password cannot be one of your last 5 passwords'
    })
  }
}

// 6. Update password
const password_hash = await hashPassword(new_password)
user.password_hash = password_hash
await user.save()
```

**Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

---

## Error Messages

### 401 Unauthorized Errors

#### Missing Token
```json
{
  "error": "Authentication required",
  "message": "Please log in to access this feature",
  "cta": {
    "text": "Log In",
    "url": "/login"
  }
}
```

#### Invalid Token Format
```json
{
  "error": "Invalid token",
  "message": "Token is invalid or expired"
}
```

#### Expired Access Token
```json
{
  "error": "Invalid token",
  "message": "Token is invalid or expired"
}
```
**Action**: Use refresh token to get new access token

#### Expired Refresh Token
```json
{
  "error": "Invalid refresh token",
  "message": "Refresh token is invalid or expired"
}
```
**Action**: User must login again

#### User Not Found
```json
{
  "error": "User not found",
  "message": "User associated with this token does not exist"
}
```

---

### 400 Bad Request Errors

#### Missing Fields
```json
{
  "error": "Missing required fields",
  "message": "Email and password are required"
}
```

#### Missing Refresh Token
```json
{
  "error": "Missing refresh token",
  "message": "Refresh token is required"
}
```

#### Weak Password
```json
{
  "error": "Weak password",
  "message": "Password must be at least 8 characters long and contain letters and numbers"
}
```

#### Password Reuse
```json
{
  "error": "Password reuse not allowed",
  "message": "New password cannot be one of your last 5 passwords. Please choose a different password."
}
```

---

### 422 Unprocessable Entity Errors

#### Invalid Email
```json
{
  "error": "Invalid email",
  "message": "Please provide a valid email address"
}
```

---

### 429 Too Many Requests Errors

#### Account Locked (Password Reset)
```json
{
  "error": "Account locked",
  "message": "Too many failed password reset attempts. Please try again in 30 minutes."
}
```

---

## Troubleshooting

### Problem: "Token is invalid or expired" after 15 minutes

**Cause**: Access token expired (normal behavior)

**Solution**:
```typescript
// Frontend should auto-refresh
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh token
      const refreshToken = localStorage.getItem('refreshToken')
      const { data } = await axios.post('/api/auth/refresh', { refreshToken })

      // Save new tokens
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Retry request
      error.config.headers['Authorization'] = `Bearer ${data.token}`
      return axios(error.config)
    }
  }
)
```

---

### Problem: "Refresh token is invalid or expired" after 30 days

**Cause**: Refresh token expired (normal behavior after 30 days)

**Solution**:
```typescript
// Frontend must force logout
if (error.response?.status === 401 && error.response?.data?.error === 'Invalid refresh token') {
  // Clear tokens
  localStorage.removeItem('authToken')
  localStorage.removeItem('refreshToken')

  // Redirect to login
  router.push('/login?error=session_expired')
}
```

---

### Problem: Token works in Postman but not in frontend

**Cause**: Missing "Bearer " prefix or wrong header

**Solution**:
```typescript
// ✅ CORRECT
headers: {
  'Authorization': `Bearer ${token}`  // Note: "Bearer " with space
}

// ❌ WRONG
headers: {
  'Authorization': token  // Missing "Bearer "
}
```

---

### Problem: User logged out after page refresh

**Cause**: Tokens not persisted in localStorage

**Solution**:
```typescript
// Save tokens on login
localStorage.setItem('authToken', accessToken)
localStorage.setItem('refreshToken', refreshToken)

// Restore session on app load
useEffect(() => {
  const token = localStorage.getItem('authToken')
  const refreshToken = localStorage.getItem('refreshToken')

  if (token) {
    // Verify token and fetch user
    fetchProfile()
  }
}, [])
```

---

### Problem: Password reset link not working

**Cause**: Token expired (1 hour lifetime)

**Solution**:
1. Check token expiration in JWT debugger (jwt.io)
2. If expired, request new reset link
3. Use link within 1 hour of requesting

---

### Problem: Getting user data shows old plan after upgrade

**Cause**: Token contains old plan value

**Solution**:
```typescript
// After plan upgrade, regenerate tokens
const newAccessToken = generateAccessToken({
  userId: user.id,
  email: user.email,
  plan: user.plan  // Updated plan
})

const newRefreshToken = generateRefreshToken({
  userId: user.id,
  email: user.email,
  plan: user.plan  // Updated plan
})

// Return new tokens
res.json({
  token: newAccessToken,
  refreshToken: newRefreshToken
})
```

---

## Environment Variables

**Production** (.env):
```bash
JWT_SECRET=pT1o+3SCnI5t9xsnGpd1XNc0UKTO2hedd6tQRRHzXsS4PCjKXhbGODUEaYlVBEpPNw7vGU1tyM56uRzyUgOiew==
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d
```

**⚠️ IMPORTANT**:
- JWT_SECRET must be at least 32 characters
- JWT_SECRET must be different in dev vs production
- Never commit JWT_SECRET to git
- Change JWT_SECRET after any security breach

---

## Quick Reference

| Token Type | Lifetime | When Generated | Use Case |
|------------|----------|----------------|----------|
| Access Token | 15 min | Login, Register, OAuth, Refresh | Access API endpoints |
| Refresh Token | 30 days | Login, Register, OAuth, Refresh | Get new access tokens |
| Password Reset Token | 1 hour | Forgot Password | Reset user password |

| Endpoint | Auth Required | Token Type | Returns |
|----------|---------------|------------|---------|
| POST /api/auth/register | No | - | Access + Refresh |
| POST /api/auth/login | No | - | Access + Refresh |
| GET /api/auth/profile | Yes | Access | User profile |
| POST /api/auth/refresh | No | Refresh | New Access + Refresh |
| POST /api/auth/forgot-password | No | - | Email with reset token |
| POST /api/auth/reset-password | No | Reset | Success message |

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0
**Maintained By**: PDFLab Engineering Team
