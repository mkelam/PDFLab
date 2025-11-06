# PDFLab API Documentation

**Version:** 2.0.1
**Base URL (Development):** `http://localhost:3007`
**Base URL (Production):** `https://api.pdflab.pro`

---

## 📚 Interactive Documentation

**Swagger UI:** [`/docs`](http://localhost:3007/docs) - Interactive API explorer with request testing
**ReDoc:** [`/redoc`](http://localhost:3007/redoc) - Clean API reference documentation

---

## 🔐 Authentication

All endpoints except public routes require JWT authentication.

### Header Format
```http
Authorization: Bearer <access_token>
```

### Token Expiration
- **Access Token:** 7 days
- **Refresh Token:** 30 days

---

## 📍 Endpoints Overview

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| POST | `/register` | Create new user account | No | 5/min |
| POST | `/login` | Authenticate and get tokens | No | 10/min |
| GET | `/verify-email` | Verify email with token | No | - |
| POST | `/resend-verification` | Resend verification email | No | 3/min |
| POST | `/forgot-password` | Request password reset | No | 3/min |
| POST | `/reset-password` | Reset password with token | No | 5/min |
| POST | `/refresh` | Refresh access token | No | - |
| GET | `/profile` | Get user profile | Yes | - |

### PDF Conversion (`/api`)

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| POST | `/upload` | Upload PDF for conversion | Yes | - |
| GET | `/status/{job_id}` | Check conversion job status | Yes | - |
| GET | `/download/{job_id}` | Download converted file | Yes | - |
| GET | `/history` | Get user's conversion history | Yes | - |
| POST | `/merge` | Merge multiple PDFs | Yes | - |

### Payment (`/api/payfast`)

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| GET | `/plans` | Get pricing plans | No | - |
| POST | `/initialize` | Start payment process | Yes | - |
| POST | `/webhook` | PayFast ITN handler | No | - |
| GET | `/return` | Payment success redirect | No | - |
| GET | `/cancel` | Payment cancel redirect | No | - |
| GET | `/subscription/{id}` | Get subscription details | Yes | - |
| POST | `/cancel-subscription` | Cancel subscription | Yes | - |

### System

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| GET | `/` | API information | No | - |
| GET | `/health` | Health check | No | 10/min |

---

## 🔧 Detailed Endpoint Documentation

### 1. User Registration

**POST** `/api/auth/register`

Register a new user account. Sends email verification link.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "created_at": "2025-10-30T10:00:00Z"
}
```

**Errors:**
- `400` - Email already exists / Invalid password
- `422` - Validation error
- `429` - Rate limit exceeded (5/min)

---

### 2. User Login

**POST** `/api/auth/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Email not verified
- `429` - Rate limit exceeded (10/min)

---

### 3. Email Verification

**GET** `/api/auth/verify-email?token={token}`

Verify user email address using token from email.

**Query Parameters:**
- `token` (required) - Verification token from email

**Response (200):**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "email": "user@example.com"
}
```

**Errors:**
- `400` - Invalid/expired token or already verified

---

### 4. Upload PDF for Conversion

**POST** `/api/upload`

Upload PDF and start conversion job.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required) - PDF file
- `conversion_type` (required) - One of: `pptx`, `docx`, `xlsx`, `png`
- `dpi` (optional) - Image quality for PNG (default: 300)
- `pages` (optional) - Page range (default: "all")
- `ocr` (optional) - Enable OCR (default: true)

**Response (202):**
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "queued",
  "conversion_type": "pptx",
  "file_name": "document.pdf",
  "created_at": "2025-10-30T10:00:00Z",
  "estimated_time": 120
}
```

**Errors:**
- `400` - Invalid file type / File too large
- `401` - Unauthorized
- `403` - Quota exceeded
- `413` - File size exceeds plan limit

---

### 5. Check Conversion Status

**GET** `/api/status/{job_id}`

Get current status of conversion job.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "progress": 100,
  "conversion_type": "pptx",
  "file_name": "document.pdf",
  "output_file": "document.pptx",
  "created_at": "2025-10-30T10:00:00Z",
  "completed_at": "2025-10-30T10:02:00Z"
}
```

**Job Status Values:**
- `queued` - Job in queue
- `processing` - Conversion in progress
- `completed` - Conversion successful
- `failed` - Conversion failed
- `expired` - Download link expired (after 24 hours)

**Errors:**
- `404` - Job not found
- `401` - Unauthorized

---

### 6. Download Converted File

**GET** `/api/download/{job_id}`

Download the converted file.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200):**
Binary file download

**Headers:**
```http
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.pptx"
```

**Errors:**
- `404` - Job not found / File expired
- `400` - Job not completed yet
- `401` - Unauthorized

---

### 7. Merge PDFs

**POST** `/api/merge`

Merge 2-10 PDF files into a single PDF.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `files` (required) - 2-10 PDF files

**Response (202):**
```json
{
  "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "queued",
  "file_count": 3,
  "total_size": 1024000
}
```

**Errors:**
- `400` - Invalid number of files (must be 2-10)
- `413` - Combined file size exceeds limit
- `401` - Unauthorized

---

### 8. Get User Profile

**GET** `/api/auth/profile`

Get authenticated user's profile information.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  "plan": "pro",
  "conversions_used": 42,
  "conversions_limit": 100,
  "subscription_status": "active",
  "created_at": "2025-10-30T10:00:00Z",
  "last_login": "2025-10-30T14:30:00Z"
}
```

---

### 9. Get Pricing Plans

**GET** `/api/payfast/plans`

Get available subscription plans.

**Response (200):**
```json
[
  {
    "id": "free",
    "name": "Free",
    "price": 0,
    "currency": "USD",
    "conversions": 3,
    "file_size_mb": 10,
    "features": ["3 conversions/month", "10MB file limit"]
  },
  {
    "id": "starter",
    "name": "Starter",
    "price": 9.99,
    "currency": "USD",
    "conversions": 100,
    "file_size_mb": 25,
    "features": ["100 conversions/month", "25MB file limit", "Priority support"]
  },
  {
    "id": "pro",
    "name": "Pro",
    "price": 29.99,
    "currency": "USD",
    "conversions": -1,
    "file_size_mb": 100,
    "features": ["Unlimited conversions", "100MB file limit", "Advanced OCR", "API access"]
  },
  {
    "id": "enterprise",
    "name": "Enterprise",
    "price": 99.99,
    "currency": "USD",
    "conversions": -1,
    "file_size_mb": 500,
    "features": ["Unlimited conversions", "500MB file limit", "Dedicated support", "Custom integrations"]
  }
]
```

---

## 📋 Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | File exceeds size limit |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 🔄 Rate Limiting

Rate limits are applied per IP address:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/register` | 5 requests | 1 minute |
| `/api/auth/login` | 10 requests | 1 minute |
| `/api/auth/forgot-password` | 3 requests | 1 minute |
| `/api/auth/reset-password` | 5 requests | 1 minute |
| `/api/auth/resend-verification` | 3 requests | 1 minute |
| `/health` | 10 requests | 1 minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1635724800
```

**Rate Limit Exceeded Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many requests. Please try again later."
}
```

---

## 🛠️ Error Format

All errors follow a consistent format:

```json
{
  "detail": "Error message",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation Errors (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ],
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🧪 Testing the API

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

**Upload PDF:**
```bash
curl -X POST http://localhost:3007/api/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.pdf" \
  -F "conversion_type=pptx"
```

### Using Python

```python
import requests

# Login
response = requests.post(
    'http://localhost:3007/api/auth/login',
    json={'email': 'test@example.com', 'password': 'TestPass123'}
)
token = response.json()['access_token']

# Upload PDF
with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3007/api/upload',
        headers={'Authorization': f'Bearer {token}'},
        files={'file': f},
        data={'conversion_type': 'pptx'}
    )

job_id = response.json()['job_id']
print(f"Job ID: {job_id}")
```

---

## 📞 Support

**Email:** support@pdflab.pro
**Documentation:** https://docs.pdflab.pro (Coming soon)
**Status Page:** https://status.pdflab.pro (Coming soon)

---

**Last Updated:** 2025-10-30
**API Version:** 2.0.1
