# Session Management

## Current Implementation

PDFLab uses JWT-based session management:

1. **Login**: Backend issues access token (JWT)
2. **Requests**: Frontend sends token in Authorization header
3. **Expiry**: Token expires after 24 hours
4. **Refresh**: Handled automatically by fetchWithTokenRefresh()

## What Doesn't Work

- `refreshSession()` function: Does nothing (deprecated)
- `endSession()` function: Does nothing (deprecated)
- `TokenExpirationWarning`: Never receives data (removed)

## How to Handle Session Expiry

Frontend:
- Use `fetchWithTokenRefresh()` for all API calls
- It automatically retries with new token on 401
- User only logged out if refresh fails

Backend:
- JWT expiry: 24 hours (configured in auth service)
- Refresh token: Not currently implemented
- Future: Add refresh token flow

## Migration Plan

v2.0.0:
- Remove deprecated session functions
- Implement proper refresh token flow
- Add session expiry warnings (if refresh tokens added)
