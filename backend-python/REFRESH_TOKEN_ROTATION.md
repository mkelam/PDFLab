# Refresh Token Rotation Implementation

## Overview

PDFLab implements **refresh token rotation** for enhanced authentication security. This prevents token theft and replay attacks by ensuring each refresh token can only be used once.

---

## How It Works

### Token Rotation Flow

1. **Login**: User logs in and receives both an access token and a refresh token
   - Refresh token is stored in the database (`refresh_tokens` table)
   - Token is hashed using SHA256 before storage
   - Token family ID is generated for tracking rotation chains

2. **Token Refresh**: When access token expires, client uses refresh token to get new tokens
   - System validates the refresh token exists and is not revoked
   - Old refresh token is marked as "used" and immediately revoked
   - New access and refresh tokens are issued (in the same token family)
   - New refresh token is stored in database

3. **Replay Attack Detection**: If a refresh token is reused (used twice)
   - System detects the token was already used (`used_at` timestamp)
   - **Entire token family is revoked** (all tokens in rotation chain)
   - User must log in again
   - Attack is logged for security monitoring

---

## Security Features

### 1. Token Family Tracking

Each refresh token belongs to a **token family** (identified by `family_id`):
- Initial login creates a new family
- Each token refresh stays in the same family
- If replay is detected, entire family is revoked
- Prevents compromised tokens from being used

### 2. One-Time Use Tokens

Refresh tokens can only be used once:
- `used_at` timestamp marks when token was used
- Attempting to reuse triggers security alert
- Forces clients to always use the latest token

### 3. Audit Trail

Complete tracking for security analysis:
- IP address of token creation
- User agent (browser/device info)
- Creation timestamp
- Usage timestamp
- Revocation timestamp
- Token family lineage

### 4. Automatic Cleanup

Expired and revoked tokens are tracked:
- `expires_at`: Token expiration (7 days)
- `is_revoked`: Manual or automatic revocation
- `revoked_at`: When token was revoked

---

## Database Schema

### `refresh_tokens` Table

```sql
CREATE TABLE refresh_tokens (
    id CHAR(36) PRIMARY KEY,              -- Token ID (UUID)
    user_id CHAR(36) NOT NULL,            -- User FK
    token_hash VARCHAR(64) UNIQUE,        -- SHA256 hash of token
    family_id CHAR(36) NOT NULL,          -- Token family for rotation
    expires_at DATETIME NOT NULL,         -- Expiration timestamp
    is_revoked BOOLEAN DEFAULT FALSE,     -- Revocation status
    revoked_at DATETIME,                  -- When revoked
    created_at DATETIME NOT NULL,         -- Creation timestamp
    used_at DATETIME,                     -- When token was used
    created_from_ip VARCHAR(45),          -- Client IP address
    user_agent VARCHAR(255),              -- Client user agent

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX ix_refresh_tokens_token_hash (token_hash),
    INDEX ix_refresh_tokens_family_id (family_id),
    INDEX ix_refresh_tokens_user_id (user_id),
    INDEX ix_refresh_tokens_expires_at (expires_at),
    INDEX ix_refresh_tokens_is_revoked (is_revoked)
);
```

---

## API Usage

### Login Endpoint

**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

Both tokens are returned. The refresh token is also stored in the database.

---

### Refresh Endpoint

**POST** `/api/auth/refresh`

Request:
```json
{
  "refresh_token": "eyJhbGc..."
}
```

Response (Success):
```json
{
  "access_token": "eyJhbGc...",   // New access token
  "refresh_token": "eyJhbGc...",  // New refresh token
  "token_type": "bearer",
  "expires_in": 604800
}
```

Response (Token Reuse Detected):
```json
{
  "detail": "Token reuse detected. All sessions have been revoked for security. Please log in again."
}
```
Status: 401 Unauthorized

---

## Client Implementation

### Best Practices

1. **Store Both Tokens Securely**
   ```typescript
   // Store in httpOnly cookies (most secure)
   document.cookie = `accessToken=${accessToken}; HttpOnly; Secure; SameSite=Strict`
   document.cookie = `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict`

   // Or use secure storage (localStorage/sessionStorage)
   localStorage.setItem('authToken', accessToken)
   localStorage.setItem('refreshToken', refreshToken)
   ```

2. **Auto-Refresh Before Expiry**
   ```typescript
   // Refresh token when access token is about to expire
   const refreshAccessToken = async () => {
     const refreshToken = localStorage.getItem('refreshToken')

     const response = await fetch('/api/auth/refresh', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ refresh_token: refreshToken })
     })

     if (response.ok) {
       const { access_token, refresh_token } = await response.json()

       // Store new tokens
       localStorage.setItem('authToken', access_token)
       localStorage.setItem('refreshToken', refresh_token)

       return access_token
     } else {
       // Refresh failed - redirect to login
       window.location.href = '/login'
     }
   }
   ```

3. **Handle Token Reuse Errors**
   ```typescript
   try {
     const newToken = await refreshAccessToken()
   } catch (error) {
     if (error.status === 401) {
       // Token reuse detected or expired
       // Clear all tokens and redirect to login
       localStorage.clear()
       window.location.href = '/login?reason=session_expired'
     }
   }
   ```

4. **Implement Token Rotation in Axios Interceptor**
   ```typescript
   axios.interceptors.response.use(
     (response) => response,
     async (error) => {
       const originalRequest = error.config

       // If 401 and we haven't retried yet
       if (error.response?.status === 401 && !originalRequest._retry) {
         originalRequest._retry = true

         try {
           const newAccessToken = await refreshAccessToken()

           // Retry original request with new token
           originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
           return axios(originalRequest)
         } catch (refreshError) {
           // Refresh failed - logout user
           return Promise.reject(refreshError)
         }
       }

       return Promise.reject(error)
     }
   )
   ```

---

## Security Considerations

### Token Storage

**DO:**
- ✅ Use httpOnly cookies (prevents XSS attacks)
- ✅ Enable Secure flag (HTTPS only)
- ✅ Use SameSite=Strict (prevents CSRF)
- ✅ Encrypt tokens at rest if using localStorage

**DON'T:**
- ❌ Store refresh tokens in plain localStorage (XSS risk)
- ❌ Include tokens in URL parameters
- ❌ Log tokens in console or analytics
- ❌ Send tokens over HTTP (always HTTPS)

### Token Lifetime

- **Access Token**: 7 days (can be reduced for high-security apps)
- **Refresh Token**: 7 days (rotated on each use)
- Both tokens expire independently

### Monitoring

Watch for these security events in logs:
- `token_reuse_detected` - Replay attack
- `token_family_revoked` - Family-wide revocation
- `token_refresh_expired` - Normal expiration
- `token_refresh_revoked` - Manual revocation

---

## Maintenance

### Cleanup Old Tokens

Create a scheduled task to remove expired/revoked tokens:

```python
# cleanup_tokens.py
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models import RefreshToken

async def cleanup_old_tokens():
    """Remove tokens expired for more than 30 days."""
    async with AsyncSessionLocal() as session:
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        result = await session.execute(
            delete(RefreshToken).where(
                RefreshToken.expires_at < cutoff_date
            )
        )

        deleted_count = result.rowcount
        await session.commit()

        print(f"Deleted {deleted_count} expired tokens")

if __name__ == "__main__":
    asyncio.run(cleanup_old_tokens())
```

Run via cron:
```bash
# Run daily at 2 AM
0 2 * * * cd /app && poetry run python cleanup_tokens.py
```

### Revoke All User Tokens

For security incidents or password changes:

```python
# In your password change endpoint
from sqlalchemy import select, update

# Revoke all refresh tokens for user
await session.execute(
    update(RefreshToken)
    .where(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    )
    .values(is_revoked=True, revoked_at=datetime.utcnow())
)
await session.commit()
```

---

## Testing

### Test Token Rotation

```bash
# 1. Login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Save tokens from response
ACCESS_TOKEN="eyJhbGc..."
REFRESH_TOKEN="eyJhbGc..."

# 2. Refresh tokens
curl -X POST http://localhost:3007/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"

# Save new tokens
NEW_ACCESS_TOKEN="eyJhbGc..."
NEW_REFRESH_TOKEN="eyJhbGc..."

# 3. Try reusing old token (should fail)
curl -X POST http://localhost:3007/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"

# Expected: 401 with "Token reuse detected" message
```

### Verify Database State

```sql
-- Check active tokens for user
SELECT
    id,
    user_id,
    family_id,
    is_revoked,
    used_at,
    created_at,
    expires_at
FROM refresh_tokens
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;

-- Count tokens by status
SELECT
    is_revoked,
    COUNT(*) as token_count
FROM refresh_tokens
GROUP BY is_revoked;
```

---

## Migration

If you have existing users, they will need to log in again to receive rotation-enabled refresh tokens. Old tokens issued before this feature will continue to work but won't have rotation enabled until the user logs in again.

---

**Last Updated:** 2025-10-30
**Version:** 1.0
**Security Level:** High
