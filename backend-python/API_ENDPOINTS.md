# PDFLab Python Backend - API Endpoints

Complete reference for all available API endpoints in the FastAPI backend.

**Base URL:** `http://localhost:3007` (development)
**API Documentation:** `http://localhost:3007/docs` (Swagger UI)
**Alternative Docs:** `http://localhost:3007/redoc` (ReDoc)

---

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [Conversion Endpoints](#conversion-endpoints)
- [Payment Endpoints (PayFast)](#payment-endpoints-payfast)
- [Health & Status](#health--status)

---

## Authentication Endpoints

**Base Path:** `/api/auth`

### 1. Register User

**Endpoint:** `POST /api/auth/register`
**Rate Limit:** 5 requests/minute
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "created_at": "2025-10-30T12:00:00"
}
```

**Notes:**
- Password must be at least 8 characters with uppercase, lowercase, and digit
- Sends verification email automatically
- User must verify email before logging in

---

### 2. Verify Email

**Endpoint:** `GET /api/auth/verify-email?token={token}`
**Rate Limit:** None
**Authentication:** None (public)

**Query Parameters:**
- `token` (required): Email verification token from email link

**Response (200 OK):**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "email": "user@example.com"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token
- `400 Bad Request`: Token already used

---

### 3. Resend Verification Email

**Endpoint:** `POST /api/auth/resend-verification`
**Rate Limit:** 3 requests/minute
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Verification email resent successfully. Please check your inbox.",
  "email": "user@example.com"
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `400 Bad Request`: Email already verified

---

### 4. Login

**Endpoint:** `POST /api/auth/login`
**Rate Limit:** 10 requests/minute
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Email not verified

**Notes:**
- Access token valid for 7 days
- Refresh token valid for 7 days (rotated on use)
- Both tokens stored in database for security

---

### 5. Refresh Token

**Endpoint:** `POST /api/auth/refresh`
**Rate Limit:** None
**Authentication:** Refresh token required

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token
- `401 Unauthorized`: Token reuse detected (all sessions revoked)
- `404 Not Found`: User not found

**Security Features:**
- **Token Rotation:** Old token immediately revoked, new token issued
- **Replay Detection:** Reusing a token revokes entire token family
- **Audit Trail:** IP address and user agent tracked

---

### 6. Get Profile

**Endpoint:** `GET /api/auth/profile`
**Rate Limit:** None
**Authentication:** Bearer token required

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  "plan": "starter",
  "conversions_used": 15,
  "conversions_limit": 100,
  "subscription_status": "active",
  "created_at": "2025-10-30T12:00:00",
  "last_login": "2025-10-30T14:30:00"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: User not found

---

### 7. Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`
**Rate Limit:** 3 requests/minute
**Authentication:** None (public)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Reset token valid for 1 hour
- Email contains link to frontend reset page

---

### 8. Reset Password

**Endpoint:** `POST /api/auth/reset-password`
**Rate Limit:** 5 requests/minute
**Authentication:** None (public, requires valid reset token)

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token
- `400 Bad Request`: Password doesn't meet requirements

---

## Conversion Endpoints

**Base Path:** `/api`

### 1. Upload File for Conversion

**Endpoint:** `POST /api/upload`
**Rate Limit:** 10 requests/minute
**Authentication:** Bearer token required

**Request (multipart/form-data):**
```
file: <PDF file>
outputFormat: "pptx" | "docx" | "xlsx" | "png"
```

**Response (200 OK):**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "type": "pdf_to_pptx",
  "file_name": "document.pdf",
  "file_size": 1048576,
  "estimated_time": 30,
  "created_at": "2025-10-30T12:00:00"
}
```

---

### 2. Get Job Status

**Endpoint:** `GET /api/status/{job_id}`
**Rate Limit:** None
**Authentication:** Bearer token required

**Response (200 OK):**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "progress": 100,
  "type": "pdf_to_pptx",
  "file_name": "document.pdf",
  "output_file": "path/to/output.pptx",
  "created_at": "2025-10-30T12:00:00"
}
```

**Status Values:** `pending`, `processing`, `completed`, `failed`

---

### 3. Download Converted File

**Endpoint:** `GET /api/download/{job_id}`
**Rate Limit:** None
**Authentication:** Bearer token required

**Response:** Binary file download

---

### 4. Get Conversion History

**Endpoint:** `GET /api/history?limit=10&offset=0`
**Rate Limit:** None
**Authentication:** Bearer token required

**Query Parameters:**
- `limit` (optional): Number of results (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "type": "pdf_to_pptx",
      "status": "completed",
      "file_name": "document.pdf",
      "file_size": 1048576,
      "created_at": "2025-10-30T12:00:00"
    }
  ],
  "total": 50,
  "limit": 10,
  "offset": 0
}
```

---

### 5. Merge PDFs

**Endpoint:** `POST /api/merge`
**Rate Limit:** 5 requests/minute
**Authentication:** Bearer token required

**Request (multipart/form-data):**
```
files: <multiple PDF files>
```

**Response (200 OK):**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "type": "pdf_merge",
  "file_count": 3,
  "total_size": 3145728,
  "created_at": "2025-10-30T12:00:00"
}
```

---

## Payment Endpoints (PayFast)

**Base Path:** `/api/payfast`

### 1. Get Available Plans

**Endpoint:** `GET /api/payfast/plans`
**Rate Limit:** None
**Authentication:** None (public)

**Response (200 OK):**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0.0,
      "currency": "USD",
      "conversions_limit": 3,
      "file_size_limit_mb": 10,
      "features": ["3 conversions per month", "10MB file size limit"],
      "popular": false
    },
    {
      "id": "starter",
      "name": "Starter",
      "price": 9.99,
      "currency": "USD",
      "conversions_limit": 100,
      "file_size_limit_mb": 25,
      "features": ["100 conversions per month", "25MB file size limit"],
      "popular": false
    }
  ]
}
```

---

### 2. Initialize Payment

**Endpoint:** `POST /api/payfast/initialize`
**Rate Limit:** 5 requests/minute
**Authentication:** Bearer token required

**Request Body:**
```json
{
  "plan": "starter"
}
```

**Response (200 OK):**
```json
{
  "payment_url": "https://www.payfast.co.za/eng/process",
  "payment_data": {
    "merchant_id": "25263515",
    "merchant_key": "...",
    "amount": "9.99",
    "item_name": "PDFLab Starter Plan",
    "m_payment_id": "uuid",
    "signature": "..."
  }
}
```

**Notes:**
- Redirect user to `payment_url` with `payment_data` as form POST
- PayFast will handle payment processing
- User redirected back to return_url or cancel_url

---

### 3. PayFast Webhook (ITN)

**Endpoint:** `POST /api/payfast/webhook`
**Rate Limit:** None
**Authentication:** None (validated via signature)

**Request (form-urlencoded):** PayFast ITN data

**Response (200 OK):** Empty response

**Notes:**
- Called by PayFast servers only
- Validates host, signature, and server verification
- Activates subscription on successful payment
- Logs all transactions

---

### 4. Payment Return (Success)

**Endpoint:** `GET /api/payfast/return`
**Rate Limit:** None
**Authentication:** None (public)

**Response:** Redirect to frontend success page

---

### 5. Payment Cancel

**Endpoint:** `GET /api/payfast/cancel`
**Rate Limit:** None
**Authentication:** None (public)

**Response:** Redirect to frontend cancel page

---

### 6. Get Subscription Details

**Endpoint:** `GET /api/payfast/subscription/{subscription_id}`
**Rate Limit:** None
**Authentication:** Bearer token required

**Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "plan": "starter",
  "status": "active",
  "amount": 9.99,
  "currency": "USD",
  "billing_date": "2025-11-29",
  "next_billing_date": "2025-12-29",
  "started_at": "2025-10-30T12:00:00"
}
```

---

### 7. Cancel Subscription

**Endpoint:** `POST /api/payfast/cancel-subscription`
**Rate Limit:** 3 requests/minute
**Authentication:** Bearer token required

**Request Body:**
```json
{
  "subscription_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "message": "Subscription canceled successfully",
  "subscription_id": "uuid",
  "canceled_at": "2025-10-30T12:00:00"
}
```

---

## Health & Status

### 1. Root Endpoint

**Endpoint:** `GET /`
**Rate Limit:** None
**Authentication:** None (public)

**Response (200 OK):**
```json
{
  "name": "PDFLab API (Python)",
  "version": "2.0.0",
  "framework": "FastAPI",
  "environment": "development",
  "docs": "/docs",
  "health": "/health"
}
```

---

### 2. Health Check

**Endpoint:** `GET /health`
**Rate Limit:** 10 requests/minute
**Authentication:** None (public)

**Response (200 OK):**
```json
{
  "status": "OK",
  "version": "2.0.0",
  "python": "3.11+",
  "framework": "FastAPI",
  "environment": "development",
  "database": "MySQL 8.0",
  "cache": "Redis 7"
}
```

---

## Authentication Guide

### Using Bearer Tokens

All protected endpoints require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3007/api/auth/profile
```

### Token Refresh Flow

```bash
# 1. Login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Response includes access_token and refresh_token

# 2. When access token expires, refresh it
curl -X POST http://localhost:3007/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'

# Response includes new access_token and new refresh_token
# Old refresh_token is immediately revoked
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "detail": "Error message",
  "request_id": "uuid"
}
```

### Common Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

Rate limits are applied per IP address:

| Endpoint | Limit |
|----------|-------|
| POST /api/auth/register | 5/minute |
| POST /api/auth/login | 10/minute |
| POST /api/auth/resend-verification | 3/minute |
| POST /api/auth/forgot-password | 3/minute |
| POST /api/auth/reset-password | 5/minute |
| POST /api/upload | 10/minute |
| POST /api/merge | 5/minute |
| POST /api/payfast/initialize | 5/minute |
| POST /api/payfast/cancel-subscription | 3/minute |
| GET /health | 10/minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1698765432
```

---

## CORS Configuration

The API allows cross-origin requests from:
- `http://localhost:3000` (Next.js frontend)
- Additional origins configured in `.env` (`CORS_ORIGIN`)

**Allowed Methods:** All
**Allowed Headers:** All
**Credentials:** Allowed

---

## Testing Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get Profile
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3007/api/auth/profile
```

### Using Python Requests

```python
import requests

# Register
response = requests.post(
    "http://localhost:3007/api/auth/register",
    json={
        "email": "test@example.com",
        "password": "Test123!",
        "name": "Test User"
    }
)
print(response.json())

# Login
response = requests.post(
    "http://localhost:3007/api/auth/login",
    json={
        "email": "test@example.com",
        "password": "Test123!"
    }
)
tokens = response.json()
access_token = tokens["access_token"]

# Get Profile
response = requests.get(
    "http://localhost:3007/api/auth/profile",
    headers={"Authorization": f"Bearer {access_token}"}
)
print(response.json())
```

---

## Interactive Documentation

Visit `http://localhost:3007/docs` for interactive Swagger UI where you can:
- View all endpoints
- Test endpoints directly in browser
- See request/response schemas
- View authentication requirements

---

**Last Updated:** 2025-10-30
**API Version:** 2.0.1
**Backend:** Python 3.11 + FastAPI
