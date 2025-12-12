# PDFLab - Comprehensive Function-Level Documentation

**Last Updated:** 2025-11-06
**Version:** 2.0.1 (Python Backend) / 1.0.0 (Node.js Backend)

This document provides detailed breakdown of all functions, features, and workflows in the PDFLab platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Python Backend Functions (Primary)](#python-backend-functions-primary)
3. [Node.js Backend Functions (Legacy)](#nodejs-backend-functions-legacy)
4. [Frontend Components & Functions](#frontend-components--functions)
5. [Core Workflows](#core-workflows)
6. [External Service Integrations](#external-service-integrations)
7. [Database Models & Methods](#database-models--methods)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Next.js 14 (App Router) + React + TypeScript + Tailwind   │
│                    Port: 3000 (localhost)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Layer (Backend)                         │
│  ┌─────────────────────┬──────────────────────────┐         │
│  │  Python Backend     │   Node.js Backend        │         │
│  │  FastAPI + Uvicorn  │   Express.js + TypeScript│         │
│  │  Port: 3007         │   Port: 3006             │         │
│  │  (PRIMARY)          │   (LEGACY)               │         │
│  └─────────┬───────────┴──────────┬───────────────┘         │
└────────────┼──────────────────────┼─────────────────────────┘
             │                       │
             ↓                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Background Workers                        │
│  ┌──────────────────┐   ┌───────────────────────┐           │
│  │  Celery Workers  │   │   Bull Job Queue      │           │
│  │  (Python)        │   │   (Node.js)           │           │
│  └──────────────────┘   └───────────────────────┘           │
└────────────┬────────────────────────┬───────────────────────┘
             │                         │
             ↓                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data & Cache Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  MySQL 8.0   │  │   Redis 7    │  │File Storage │       │
│  │  Port: 3306  │  │  Port: 6379  │  │ (Local FS)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────────┐   ┌───────────────────────┐           │
│  │  CloudConvert    │   │     PayFast           │           │
│  │  (PDF Processing)│   │  (Payment Gateway)    │           │
│  └──────────────────┘   └───────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Python Backend Functions (Primary)

**Location:** `backend-python/app/`
**Framework:** FastAPI
**Port:** 3007 (production/default)

### 1. Authentication Module

**File:** `app/routers/auth.py`

#### 1.1 User Registration
**Function:** `POST /api/auth/register`

**Purpose:** Create new user account with email verification

**Parameters:**
- `email` (string, required): User email address
- `password` (string, required): User password (min 8 chars)
- `name` (string, optional): User's full name

**Process Flow:**
```python
1. Validate email format and uniqueness
2. Hash password with bcrypt (10 salt rounds)
3. Create User record with FREE plan
4. Generate verification token (UUID4 + expiry)
5. Send verification email via SMTP
6. Return user data (without password)
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "created_at": "2025-11-06T10:00:00Z"
}
```

**Security Features:**
- Rate limit: 5 requests/minute
- Email uniqueness check
- Password strength validation
- Email verification required before login

---

#### 1.2 Email Verification
**Function:** `GET /api/auth/verify-email?token={token}`

**Purpose:** Verify user email address using token from email

**Parameters:**
- `token` (query string, required): Email verification token

**Process Flow:**
```python
1. Find user by verification_token
2. Check token expiry (24 hours)
3. Check if already verified
4. Mark email_verified = True
5. Clear verification_token and expiry
6. Update user record
```

**Response:**
```json
{
  "message": "Email verified successfully. You can now log in.",
  "email": "user@example.com"
}
```

---

#### 1.3 User Login
**Function:** `POST /api/auth/login`

**Purpose:** Authenticate user and issue JWT tokens

**Parameters:**
- `email` (string, required)
- `password` (string, required)

**Process Flow:**
```python
1. Find user by email
2. Verify password hash with bcrypt
3. Check email_verified status
4. Update last_login timestamp
5. Create access token (JWT, 15min expiry)
6. Create refresh token (JWT, 7day expiry)
7. Store refresh token in database with:
   - token_hash (SHA-256)
   - family_id (for rotation tracking)
   - ip_address and user_agent
8. Return both tokens
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Security Features:**
- Rate limit: 10 requests/minute
- Email verification required
- Refresh token rotation
- Token family tracking (replay attack detection)
- IP address and user agent logging

---

#### 1.4 Token Refresh (with Rotation)
**Function:** `POST /api/auth/refresh`

**Purpose:** Refresh access token with automatic token rotation

**Parameters:**
- `refresh_token` (string, required)

**Process Flow:**
```python
1. Verify refresh token JWT signature
2. Extract user_id from token payload
3. Hash token and lookup in database
4. SECURITY CHECKS:
   a. Token exists in database
   b. Token not already used (used_at = NULL)
   c. Token not revoked (is_revoked = FALSE)
   d. Token not expired (expires_at > NOW)
5. If token already used (replay attack):
   a. Revoke ENTIRE token family
   b. Log security incident
   c. Return 401 Unauthorized
6. Mark old token as used (used_at = NOW)
7. Revoke old token (is_revoked = TRUE)
8. Issue new access + refresh tokens
9. Store new refresh token in SAME family
10. Return new tokens
```

**Security Features:**
- **Token Rotation:** Old token invalidated immediately
- **Replay Detection:** Reuse of old token triggers family revocation
- **Token Families:** Track rotation chains
- **Automatic Cleanup:** Expired tokens cleaned by cron job

---

#### 1.5 Password Reset Flow

**Function:** `POST /api/auth/forgot-password`
**Purpose:** Request password reset email

**Parameters:**
- `email` (string, required)

**Process Flow:**
```python
1. Find user by email (or return success to prevent enumeration)
2. Generate password reset token (UUID4 + 1hr expiry)
3. Store token and expiry in user record
4. Send password reset email with token link
5. Return generic success message
```

**Rate Limit:** 3 requests/minute

---

**Function:** `POST /api/auth/reset-password`
**Purpose:** Reset password using token

**Parameters:**
- `token` (string, required): Reset token from email
- `new_password` (string, required): New password

**Process Flow:**
```python
1. Find user by password_reset_token
2. Validate token not expired
3. Hash new password
4. Update password_hash
5. Clear reset_token and expiry
6. Invalidate all refresh tokens (force re-login)
```

---

#### 1.6 Get User Profile
**Function:** `GET /api/auth/profile`

**Purpose:** Get current authenticated user's profile

**Headers:**
- `Authorization: Bearer {access_token}`

**Process Flow:**
```python
1. Extract JWT from Authorization header
2. Verify JWT signature and expiry
3. Extract user_id from token
4. Fetch user from database
5. Return user profile data
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true,
  "plan": "pro",
  "conversions_used": 15,
  "conversions_limit": 1000,
  "subscription_status": "active",
  "created_at": "2025-10-01T10:00:00Z",
  "last_login": "2025-11-06T09:30:00Z"
}
```

---

### 2. PDF Conversion Module

**File:** `app/routers/conversion.py`

#### 2.1 Upload & Convert PDF
**Function:** `POST /api/upload`

**Purpose:** Upload PDF and queue conversion job

**Headers:**
- `Authorization: Bearer {access_token}`

**Parameters (multipart/form-data):**
- `file` (File, required): PDF file to convert
- `conversion_type` (string, required): One of:
  - `pdf_to_pptx` - PowerPoint
  - `pdf_to_docx` - Word
  - `pdf_to_xlsx` - Excel
  - `pdf_to_images` - PNG images (ZIP)
- `dpi` (int, optional): DPI for image conversions (72-600, default: 300)
- `pages` (string, optional): Pages to convert ("all" or "1-5", default: "all")
- `ocr` (bool, optional): Enable OCR (default: true)

**Process Flow:**
```python
1. AUTHENTICATION: Verify JWT token and get user
2. QUOTA CHECK: Verify user has conversions remaining
3. VALIDATION:
   - File type is PDF
   - File size within user's plan limit:
     * Free: 10MB
     * Starter: 25MB
     * Pro: 100MB
     * Enterprise: 500MB
4. STORAGE:
   - Generate job_id (UUID4)
   - Sanitize filename
   - Save to storage/uploads/{user_id}/{job_id}/{filename}
5. DATABASE:
   - Create ConversionJob record
   - Status: PENDING
   - Store file metadata
6. QUEUE:
   - Queue Celery task for background processing
   - Task: convert_pdf_task
7. UPDATE:
   - Change status to QUEUED
   - Increment user's conversions_used
8. RETURN: Job ID and initial status
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "progress": 0,
  "estimated_time": 30,
  "file_name": "document.pdf"
}
```

---

#### 2.2 Merge Multiple PDFs
**Function:** `POST /api/merge`

**Purpose:** Merge 2-10 PDF files into one

**Headers:**
- `Authorization: Bearer {access_token}`

**Parameters (multipart/form-data):**
- `files` (File[], required): 2-10 PDF files
- `output_filename` (string, optional): Name for merged PDF (default: "merged.pdf")

**Process Flow:**
```python
1. AUTHENTICATION & QUOTA CHECK
2. VALIDATION:
   - Minimum 2 files, maximum 10 files
   - Each file is PDF
   - Each file within size limit
   - Total size within plan limit
3. STORAGE:
   - Save all files with index prefix: 0_file1.pdf, 1_file2.pdf
   - Store in storage/uploads/{user_id}/{job_id}/
4. DATABASE:
   - Create ConversionJob with type: PDF_MERGE
   - Store comma-separated file names
5. QUEUE:
   - Queue Celery task: merge_pdfs_task
   - Pass array of file paths
6. UPDATE:
   - Status: QUEUED
   - Increment conversions_used
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "progress": 0,
  "estimated_time": 20,
  "file_count": 3,
  "output_filename": "merged.pdf"
}
```

---

#### 2.3 Check Job Status
**Function:** `GET /api/status/{job_id}`

**Purpose:** Poll conversion job status

**Headers:**
- `Authorization: Bearer {access_token}`

**Process Flow:**
```python
1. Verify user owns the job (user_id match)
2. Fetch job from database
3. Return current status and progress
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": 65,
  "estimated_time_remaining": 15,
  "output_file": null,
  "error": null,
  "created_at": "2025-11-06T10:00:00Z",
  "completed_at": null
}
```

**Status Values:**
- `pending` - Job created, not yet picked up
- `queued` - Job queued in Celery
- `processing` - Worker actively processing
- `completed` - Job finished successfully
- `failed` - Job failed with error

---

#### 2.4 Download Converted File
**Function:** `GET /api/download/{job_id}`

**Purpose:** Download converted/merged file

**Headers:**
- `Authorization: Bearer {access_token}`

**Process Flow:**
```python
1. Verify user owns the job
2. Check job status is COMPLETED
3. Verify output_file path exists
4. Return FileResponse with:
   - Content-Type: application/octet-stream
   - Content-Disposition: attachment; filename="..."
   - File binary data
```

**Response:** Binary file data

---

#### 2.5 Get Conversion History
**Function:** `GET /api/history?limit=50&offset=0`

**Purpose:** Get user's conversion job history

**Headers:**
- `Authorization: Bearer {access_token}`

**Query Parameters:**
- `limit` (int, optional): Max jobs to return (default: 50)
- `offset` (int, optional): Pagination offset (default: 0)

**Process Flow:**
```python
1. Query ConversionJob table
2. Filter by user_id
3. Order by created_at DESC
4. Apply limit and offset
5. Return job list with download URLs
```

**Response:**
```json
[
  {
    "job_id": "uuid",
    "file_name": "document.pdf",
    "conversion_type": "pdf_to_pptx",
    "status": "completed",
    "created_at": "2025-11-06T10:00:00Z",
    "completed_at": "2025-11-06T10:00:45Z",
    "file_size": 1024000,
    "download_url": "/api/download/uuid"
  }
]
```

---

### 3. Payment Processing Module (PayFast)

**File:** `app/routers/payfast.py`

#### 3.1 Get Pricing Plans
**Function:** `GET /api/payfast/plans`

**Purpose:** Get all available pricing plans (public endpoint)

**Response:**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "conversions_limit": 3,
      "file_size_limit_mb": 10,
      "features": [
        "3 conversions per month",
        "10MB file size limit",
        "Basic PDF to PowerPoint",
        "Standard processing"
      ],
      "popular": false
    },
    {
      "id": "starter",
      "name": "Starter",
      "price": 9.99,
      "currency": "USD",
      "conversions_limit": 100,
      "file_size_limit_mb": 25,
      "features": [
        "100 conversions/month",
        "25MB file size limit",
        "All conversion formats",
        "Priority processing",
        "Email support"
      ],
      "popular": false
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29.99,
      "currency": "USD",
      "conversions_limit": -1,
      "file_size_limit_mb": 100,
      "features": [
        "Unlimited conversions",
        "100MB file size limit",
        "All formats + OCR",
        "Priority processing",
        "Batch operations",
        "Priority email support"
      ],
      "popular": true
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "price": 99.99,
      "currency": "USD",
      "conversions_limit": -1,
      "file_size_limit_mb": 500,
      "features": [
        "Unlimited conversions",
        "500MB file size limit",
        "All formats + Advanced OCR",
        "Highest priority",
        "API access",
        "Custom integrations",
        "Dedicated support"
      ],
      "popular": false
    }
  ]
}
```

---

#### 3.2 Initialize Payment
**Function:** `POST /api/payfast/initialize`

**Purpose:** Create payment transaction and get PayFast form data

**Headers:**
- `Authorization: Bearer {access_token}`

**Parameters:**
```json
{
  "plan": "pro",
  "subscription": true,
  "billing_date": "2025-12-06"
}
```

**Process Flow:**
```python
1. Validate plan exists and not "free"
2. Get plan pricing information
3. Generate unique transaction_id (UUID4)
4. Create payment data with PayFast fields:
   - merchant_id, merchant_key
   - return_url, cancel_url, notify_url (ITN webhook)
   - user details (name, email)
   - amount (USD display price)
   - custom_str1: user_id
   - custom_str2: plan_name
5. FOR SUBSCRIPTIONS:
   - subscription_type: 1 (recurring)
   - billing_date: YYYY-MM-DD
   - frequency: 3 (monthly)
   - cycles: 0 (unlimited until cancelled)
6. Generate MD5 signature:
   - Sort all fields alphabetically
   - Build query string with URL encoding
   - Append passphrase (if configured)
   - Hash with MD5
7. Create pending PaymentLog record
8. Return PayFast URL and payment data
```

**Response:**
```json
{
  "payment_url": "https://www.payfast.co.za/eng/process",
  "transaction_id": "uuid",
  "payment_data": {
    "merchant_id": "25263515",
    "merchant_key": "<PAYFAST_MERCHANT_KEY>",
    "amount": "29.99",
    "item_name": "PDFLab Pro Plan",
    "return_url": "http://localhost:3007/api/payfast/return",
    "cancel_url": "http://localhost:3007/api/payfast/cancel",
    "notify_url": "http://localhost:3007/api/payfast/webhook",
    "m_payment_id": "uuid",
    "custom_str1": "user_uuid",
    "custom_str2": "pro",
    "subscription_type": "1",
    "billing_date": "2025-12-06",
    "frequency": "3",
    "cycles": "0",
    "signature": "abc123def456..."
  }
}
```

**CRITICAL: Dual-Currency System**
```
Frontend: Displays USD ($9.99, $29.99, $99.99)
Backend: Sends USD to PayFast (PayFast ONLY accepts ZAR in production)
Database: Stores USD for customer records

NOTE: PayFast currency handling is region-specific
```

---

#### 3.3 PayFast ITN Webhook
**Function:** `POST /api/payfast/webhook`

**Purpose:** Receive Instant Transaction Notifications from PayFast

**Parameters:** Sent by PayFast as form data

**Process Flow (3-Step Validation):**
```python
STEP 1: VALIDATE HOST
- Check request came from PayFast server
- Valid hosts:
  * www.payfast.co.za (production)
  * sandbox.payfast.co.za (sandbox)
  * w1w.payfast.co.za, w2w.payfast.co.za (failover)
- Reject if invalid host

STEP 2: VALIDATE SIGNATURE
- Extract all form fields
- Remove 'signature' field
- Sort fields alphabetically
- Build parameter string (URL encoded)
- Append passphrase (if configured)
- Generate MD5 hash
- Compare with received signature
- Reject if mismatch

STEP 3: VERIFY WITH PAYFAST SERVER
- Make POST request back to PayFast
- POST to: https://www.payfast.co.za/eng/query/validate
- Send all ITN data as form
- PayFast responds: "VALID" or "INVALID"
- Reject if not "VALID"

IF ALL 3 CHECKS PASS:
1. Extract ITN data:
   - m_payment_id (transaction_id)
   - payment_status (COMPLETE, FAILED, etc.)
   - amount_gross, amount_fee, amount_net
   - pf_payment_id (PayFast's internal ID)
   - token (for subscriptions)
   - custom_str1 (user_id)
   - custom_str2 (plan_name)

2. Find PaymentLog by transaction_id

3. Update PaymentLog:
   - payfast_payment_id
   - amount_gross, amount_fee, amount_net
   - itn_data (full JSON)
   - processed_at timestamp

4. IF payment_status == 'COMPLETE':
   a. Update PaymentLog.status = COMPLETE
   b. Update User:
      - plan = plan_name
      - subscription_status = ACTIVE
      - conversions_limit = plan limit
      - conversions_used = 0 (reset quota)
   c. Create Subscription record:
      - user_id, plan, status=ACTIVE
      - payfast_token (for recurring)
      - amount, currency
      - started_at = NOW
   d. Link PaymentLog to Subscription

5. ELSE IF payment_status != 'COMPLETE':
   - Update PaymentLog.status = FAILED
   - Set error_message

6. Log success/failure

7. Return HTTP 200 with {"status": "ok"}
```

**Security Features:**
- 3-step validation (host + signature + server)
- Prevents replay attacks
- Tamper detection via MD5 signature
- Full audit trail in payment_logs table

---

#### 3.4 Payment Return URL
**Function:** `GET /api/payfast/return?m_payment_id={transaction_id}`

**Purpose:** Success page after payment on PayFast

**Response:** HTML page with:
- Success message
- Transaction ID
- Plan name
- Link to dashboard

---

#### 3.5 Payment Cancel URL
**Function:** `GET /api/payfast/cancel?m_payment_id={transaction_id}`

**Purpose:** User cancelled payment on PayFast

**Process Flow:**
```python
1. If transaction_id provided:
   - Update PaymentLog.status = CANCELLED
2. Show cancellation page with links to:
   - Pricing page (retry)
   - Dashboard
```

---

#### 3.6 Get Subscription Details
**Function:** `GET /api/payfast/subscription/{subscription_id}`

**Headers:**
- `Authorization: Bearer {access_token}`

**Process Flow:**
```python
1. Verify user owns subscription
2. Return subscription details
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "plan": "pro",
  "status": "active",
  "amount": 29.99,
  "currency": "USD",
  "payfast_token": "abc123",
  "billing_date": "2025-12-06",
  "next_billing_date": "2026-01-06",
  "started_at": "2025-11-06T10:00:00Z",
  "created_at": "2025-11-06T10:00:00Z"
}
```

---

#### 3.7 Cancel Subscription
**Function:** `POST /api/payfast/cancel-subscription`

**Headers:**
- `Authorization: Bearer {access_token}`

**Parameters:**
```json
{
  "subscription_id": "uuid"
}
```

**Process Flow:**
```python
1. Verify user owns subscription
2. Check subscription can be cancelled (status = ACTIVE)
3. Update subscription:
   - status = CANCELED
   - canceled_at = NOW
   - ended_at = NOW
4. Update user:
   - subscription_status = CANCELED
5. Note: User keeps current plan until end of billing period
```

---

### 4. Background Workers (Celery)

**Files:** `app/workers/conversion_worker.py`, `app/workers/merge_worker.py`

#### 4.1 PDF Conversion Worker
**Task:** `app.workers.conversion_worker.convert_pdf_task`

**Purpose:** Convert PDF to target format using CloudConvert

**Parameters:**
- `job_id` (str): Conversion job UUID
- `input_file_path` (str): Path to PDF file
- `output_format` (str): Target format (pptx, docx, xlsx, png)
- `conversion_type` (str): ConversionType enum value

**Process Flow:**
```python
1. Update job status: PROCESSING, progress=10%
2. Initialize CloudConvert service
3. Progress callback updates database every 20%
4. Call CloudConvert API:
   a. Create job with tasks:
      - import/upload: Upload PDF
      - convert: Convert to format
      - export/url: Export result
   b. Upload PDF file
   c. Poll job status every 2 seconds
   d. Wait for completion
   e. Download converted file
5. Save output to: storage/outputs/{user_id}/{job_id}/
6. Update job:
   - output_file path
   - status = COMPLETED
   - progress = 100%
   - processing_completed_at = NOW
7. ON ERROR:
   - Update job: status = FAILED
   - Set error_message
   - Retry up to 3 times with 60s delay
```

**Retry Logic:**
- Max retries: 3
- Retry delay: 60 seconds
- Exponential backoff: No
- Retry on: All exceptions

---

#### 4.2 PDF Merge Worker
**Task:** `app.workers.merge_worker.merge_pdfs_task`

**Purpose:** Merge multiple PDFs using CloudConvert

**Parameters:**
- `job_id` (str)
- `input_file_paths` (List[str]): Paths to PDF files
- `output_file_name` (str): Name for merged PDF

**Process Flow:**
```python
1. Update job: PROCESSING, 10%
2. Create CloudConvert job:
   - upload-0, upload-1, ..., upload-N: Upload each PDF
   - merge-pdfs: Merge all uploaded PDFs
   - export-file: Export merged PDF
3. Upload all PDF files
4. Poll until completion
5. Download merged PDF
6. Save to storage/outputs/
7. Update job: COMPLETED, 100%
```

---

### 5. CloudConvert Service

**File:** `app/services/cloudconvert.py`

#### 5.1 Convert File
**Function:** `cloudconvert_service.convert_file(options)`

**Purpose:** Convert PDF using CloudConvert API v3

**Parameters:**
```python
options = ConversionOptions(
    input_file_path="/path/to/input.pdf",
    output_file_path="/path/to/output.pptx",
    input_format="pdf",
    output_format="pptx",
    dpi=300,  # For images
    pages="all",  # or "1-5"
    ocr=True
)
```

**Process Flow:**
```python
1. Validate input file exists
2. Create output directory if needed
3. Build task configuration:
   - For PPTX:
     * layout_preserving=True
     * ocr=True
     * pages=all
   - For DOCX:
     * ocr=True
     * pages=all
   - For XLSX:
     * ocr=True
     * auto_detect_tables=True
   - For PNG/JPG:
     * density=300 (DPI)
     * pages=all

4. Create CloudConvert job:
   POST https://api.cloudconvert.com/v2/jobs
   Headers: Authorization: Bearer {API_KEY}
   Body: {
     "tasks": {
       "upload-file": {"operation": "import/upload"},
       "convert-file": {task_config},
       "export-file": {"operation": "export/url"}
     }
   }

5. Upload file to CloudConvert:
   - Get upload URL from upload-file task
   - POST file to URL

6. Poll for completion:
   - GET /jobs/{job_id} every 2 seconds
   - Check status: "waiting", "processing", "finished", "error"

7. Download converted file:
   - Get file URL from export-file task
   - Download file content
   - Save to output_file_path

8. Return success or error
```

**API Limits:**
- Free tier: 25 conversions/day
- Paid tier: Unlimited
- Timeout: 5 minutes per request

---

#### 5.2 Merge PDFs
**Function:** `cloudconvert_service.merge_pdfs(input_files, output_path)`

**Purpose:** Merge multiple PDFs

**Process Flow:**
```python
1. Validate all input files exist
2. Create job with:
   - upload-0, upload-1, ...: Upload tasks for each PDF
   - merge-pdfs: Merge operation with inputs=[upload-0, upload-1, ...]
   - export-file: Export merged PDF
3. Upload all files
4. Poll for completion
5. Download merged PDF
```

---

#### 5.3 Get Account Info
**Function:** `cloudconvert_service.get_account_info()`

**Purpose:** Check CloudConvert account credits

**Process Flow:**
```python
GET https://api.cloudconvert.com/v2/users/me
Headers: Authorization: Bearer {API_KEY}

Returns:
{
  "credits": 500,
  "email": "account@example.com"
}
```

---

### 6. Email Service

**File:** `app/services/email_service.py`

#### 6.1 Send Verification Email
**Function:** `send_verification_email(to_email, user_name, verification_token)`

**Purpose:** Send email with verification link

**Email Template:**
```html
Subject: Verify your PDFLab account

Hi {{user_name}},

Welcome to PDFLab! Please verify your email address by clicking the link below:

{{verification_url}}

This link expires in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
PDFLab Team
```

**Verification URL:**
```
http://localhost:3000/verify-email?token={verification_token}
```

---

#### 6.2 Send Password Reset Email
**Function:** `send_password_reset_email(to_email, user_name, reset_token)`

**Purpose:** Send password reset link

**Email Template:**
```html
Subject: Reset your PDFLab password

Hi {{user_name}},

Click the link below to reset your password:

{{reset_url}}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
PDFLab Team
```

**Reset URL:**
```
http://localhost:3000/reset-password?token={reset_token}
```

---

## Frontend Components & Functions

**Location:** `app/` and `components/`
**Framework:** Next.js 14 + React + TypeScript

### 1. Unified Conversion Interface

**File:** `components/UnifiedConversionInterface.tsx`

#### 1.1 Component State

**State Variables:**
```typescript
const [activeTab, setActiveTab] = useState<"convert" | "merge">("convert")
const [outputFormat, setOutputFormat] = useState<"image" | "powerpoint" | "word" | "excel">("powerpoint")
const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
const [processing, setProcessing] = useState<ProcessingState>({
  isProcessing: false,
  progress: 0,
  stage: "",
  timeRemaining: undefined,
  result: undefined,
  error: undefined,
  isGuest: false
})
const [showGuestPrompt, setShowGuestPrompt] = useState(false)
const [enhancedError, setEnhancedError] = useState<EnhancedError | null>(null)
```

#### 1.2 File Upload with Drag & Drop

**Function:** `onDrop(acceptedFiles: File[])`

**Purpose:** Handle file drop/selection

**Process Flow:**
```typescript
1. For each file:
   - Validate PDF type
   - Validate file size (10MB free, 25MB starter, 100MB pro, 500MB enterprise)
   - Create UploadedFile object with:
     * file: File
     * id: random string
     * valid: boolean
     * error: string | undefined

2. If convert mode:
   - Keep only first file (single file)
3. If merge mode:
   - Add to existing files (max 10)

4. Update uploadedFiles state
```

**Validation:**
```typescript
interface ValidationResult {
  valid: boolean
  error?: string
}

function validatePDFFile(file: File): ValidationResult {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed' }
  }

  // Check file size (based on user plan)
  const maxSize = user.plan === 'free' ? 10 * 1024 * 1024 : // 10MB
                  user.plan === 'starter' ? 25 * 1024 * 1024 : // 25MB
                  user.plan === 'pro' ? 100 * 1024 * 1024 : // 100MB
                  500 * 1024 * 1024 // 500MB enterprise

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Max: ${maxSize / (1024 * 1024)}MB`
    }
  }

  return { valid: true }
}
```

---

#### 1.3 Process Files

**Function:** `processFiles()`

**Purpose:** Convert or merge uploaded PDFs

**Process Flow:**
```typescript
1. VALIDATION:
   - Check at least 1 valid file
   - For merge: Check at least 2 files

2. SET PROCESSING STATE:
   - isProcessing = true
   - progress = 0
   - stage = "Converting to ..." or "Merging..."

3. PROGRESS SIMULATION:
   - Create interval timer (every 800ms)
   - Update progress through stages:
     * Convert: 20% → 40% → 60% → 80% → 90%
     * Merge: 25% → 50% → 75% → 90%
   - Update stage text and time remaining

4. API CALL:
   if (mode === "convert") {
     if (format === "image") {
       result = await pdflabAPI.convertPDFToImages(file)
     } else {
       // Map format: powerpoint→pptx, word→docx, excel→xlsx
       result = await pdflabAPI.convertPDFToOffice(file, apiFormat)
     }
   } else {
     result = await pdflabAPI.mergePDFs(files)
   }

5. HANDLE RESPONSE:
   - Clear progress timer
   - Set progress = 100%
   - Store result
   - If guest user: Show signup prompt

6. ERROR HANDLING:
   - Detect error type
   - Show enhanced error UI with actions:
     * File too large → "Upgrade" + "Try Different File"
     * Corrupted → "Upload Different File" + "Contact Support"
     * Timeout → "Try Images" + "Retry"
     * XLSX no tables → "Try Word" + "Try PowerPoint"
     * Network → "Try Again" + "Start Over"
```

---

#### 1.4 Download File

**Function:** `downloadFile()`

**Purpose:** Download converted/merged file

**Process Flow:**
```typescript
1. Check result.outputFile exists
2. If guest user:
   - Show signup prompt first
3. Else:
   - Call pdflabAPI.triggerDownload(outputFile, originalFile)
   - This creates temporary <a> tag with download attribute
   - Clicks it programmatically
   - Browser downloads file
```

---

### 2. API Client

**File:** `lib/api.ts`

#### 2.1 Convert PDF to Office Format

**Function:** `pdflabAPI.convertPDFToOffice(file: File, format: "pptx" | "docx" | "xlsx")`

**Process Flow:**
```typescript
1. Create FormData:
   formData.append('file', file)
   formData.append('conversion_type', `pdf_to_${format}`)
   formData.append('ocr', 'true')

2. Get auth token from localStorage

3. POST /api/upload:
   Headers:
     - Authorization: Bearer {token}
   Body: formData

4. Poll for status:
   const jobId = response.job_id
   while (status !== 'completed' && status !== 'failed') {
     await sleep(2000)
     status = await GET /api/status/{jobId}
   }

5. If completed:
   return {
     outputFile: `/api/download/${jobId}`,
     originalFile: file.name,
     message: "Conversion complete!",
     processingTime: "45 seconds"
   }

6. If failed:
   throw new Error(job.error || "Conversion failed")
```

---

#### 2.2 Convert PDF to Images

**Function:** `pdflabAPI.convertPDFToImages(file: File)`

**Process Flow:**
```typescript
1. Create FormData:
   formData.append('file', file)
   formData.append('conversion_type', 'pdf_to_images')
   formData.append('dpi', '300')

2. POST /api/upload with auth token

3. Poll for completion

4. Return download URL (ZIP file with images)
```

---

#### 2.3 Merge PDFs

**Function:** `pdflabAPI.mergePDFs(files: File[])`

**Process Flow:**
```typescript
1. Create FormData:
   files.forEach(file => formData.append('files', file))
   formData.append('output_filename', 'merged.pdf')

2. POST /api/merge with auth token

3. Poll for completion

4. Return download URL
```

---

#### 2.4 Initialize Payment

**Function:** `pdflabAPI.initializePayment(plan: string)`

**Process Flow:**
```typescript
1. POST /api/payfast/initialize:
   Body: {
     plan: "pro",
     subscription: true,
     billing_date: "2025-12-06"
   }
   Headers: Authorization: Bearer {token}

2. Receive payment_url and payment_data

3. Create HTML form with all payment_data fields

4. Submit form to PayFast (redirects user)
```

---

### 3. Authentication Context

**File:** `contexts/AuthContext.tsx`

#### 3.1 Auth Context Provider

**State:**
```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
}
```

**Functions:**

**login(email, password):**
```typescript
1. POST /api/auth/login with credentials
2. Receive access_token and refresh_token
3. Store tokens in localStorage
4. Fetch user profile
5. Update user state
```

**register(email, password, name):**
```typescript
1. POST /api/auth/register
2. Show "Check your email for verification"
3. Redirect to login page
```

**logout():**
```typescript
1. Clear tokens from localStorage
2. Clear user state
3. Redirect to home page
```

**refreshAuth():**
```typescript
1. Check if access_token in localStorage
2. If yes: Fetch user profile
3. Update user state
4. Called on app mount to restore session
```

---

### 4. Protected Routes

**File:** `lib/auth-api.ts`

#### 4.1 Require Auth Hook

**Function:** `useRequireAuth()`

**Purpose:** Redirect to login if not authenticated

**Process Flow:**
```typescript
1. Check if user is authenticated
2. If not: Redirect to /login?redirect={currentPath}
3. If yes: Allow access
```

**Usage:**
```typescript
// In dashboard page
export default function DashboardPage() {
  useRequireAuth() // Protects this page

  return <DashboardContent />
}
```

---

#### 4.2 Guest Only Hook

**Function:** `useGuestOnly()`

**Purpose:** Redirect to dashboard if already logged in

**Process Flow:**
```typescript
1. Check if user is authenticated
2. If yes: Redirect to /dashboard
3. If no: Allow access
```

**Usage:**
```typescript
// In login page
export default function LoginPage() {
  useGuestOnly() // Redirect if already logged in

  return <LoginForm />
}
```

---

## Core Workflows

### Workflow 1: User Registration & Email Verification

```
1. User fills registration form
   ↓
2. POST /api/auth/register
   ↓
3. Backend:
   - Hash password
   - Create User (email_verified=false)
   - Generate verification_token
   - Save to database
   ↓
4. Send verification email with link:
   http://localhost:3000/verify-email?token={token}
   ↓
5. User clicks link in email
   ↓
6. GET /api/auth/verify-email?token={token}
   ↓
7. Backend:
   - Find user by token
   - Check token not expired
   - Set email_verified = true
   - Clear token
   ↓
8. Redirect to /login with success message
   ↓
9. User can now login
```

---

### Workflow 2: User Login & Session Management

```
1. User enters email + password
   ↓
2. POST /api/auth/login
   ↓
3. Backend:
   - Find user by email
   - Verify password hash
   - Check email_verified = true
   - Create access_token (JWT, 15min)
   - Create refresh_token (JWT, 7day)
   - Store refresh_token in database
   - Return both tokens
   ↓
4. Frontend:
   - Store tokens in localStorage
   - Set Authorization header for all requests
   ↓
5. User navigates app
   - Every API call includes: Authorization: Bearer {access_token}
   ↓
6. After 15 minutes: Access token expires
   ↓
7. Frontend detects 401 Unauthorized
   ↓
8. POST /api/auth/refresh with refresh_token
   ↓
9. Backend:
   - Validate refresh token
   - Check not used/revoked/expired
   - Mark old token as used
   - Revoke old token
   - Issue new access + refresh tokens
   - Return new tokens
   ↓
10. Frontend:
    - Update tokens in localStorage
    - Retry original request with new access_token
    ↓
11. User session continues seamlessly
```

---

### Workflow 3: PDF Conversion (Convert Mode)

```
1. User uploads PDF file via drag-drop
   ↓
2. Frontend validates:
   - File is PDF
   - Size within plan limit (10MB free, 100MB pro)
   ↓
3. User selects output format (PowerPoint/Word/Excel/Images)
   ↓
4. User clicks "Convert"
   ↓
5. Frontend shows progress UI (simulated stages)
   ↓
6. POST /api/upload
   - multipart/form-data
   - file: PDF
   - conversion_type: "pdf_to_pptx"
   - ocr: true
   ↓
7. Backend (FastAPI):
   - Verify authentication
   - Check conversion quota
   - Validate file
   - Generate job_id
   - Save file to storage/uploads/{user_id}/{job_id}/
   - Create ConversionJob (status=PENDING)
   - Queue Celery task
   - Update status=QUEUED
   - Increment user.conversions_used
   - Return job_id
   ↓
8. Celery Worker picks up task:
   - Update status=PROCESSING, progress=10%
   - Initialize CloudConvert
   - Create CloudConvert job:
     * upload-file
     * convert-file (PDF → PPTX with OCR)
     * export-file
   - Upload PDF to CloudConvert
   - Poll CloudConvert every 2 seconds
   - Update progress: 20%, 40%, 60%, 80%
   - Download converted PPTX
   - Save to storage/outputs/{user_id}/{job_id}/
   - Update status=COMPLETED, progress=100%
   ↓
9. Frontend polls GET /api/status/{job_id} every 2 seconds
   ↓
10. When status=COMPLETED:
    - Stop polling
    - Show "Download" button
    ↓
11. User clicks "Download"
    ↓
12. GET /api/download/{job_id}
    ↓
13. Backend:
    - Verify user owns job
    - Return FileResponse with converted PPTX
    ↓
14. Browser downloads file
```

---

### Workflow 4: PDF Merge (Merge Mode)

```
1. User uploads 2-10 PDF files
   ↓
2. Frontend validates each file
   ↓
3. User clicks "Merge PDFs"
   ↓
4. POST /api/merge
   - files: [file1, file2, file3]
   - output_filename: "merged.pdf"
   ↓
5. Backend:
   - Validate 2-10 files
   - Save all files with index prefix
   - Create ConversionJob (type=PDF_MERGE)
   - Queue merge_pdfs_task
   ↓
6. Celery Worker:
   - Create CloudConvert merge job:
     * upload-0, upload-1, upload-2
     * merge-pdfs (input=[upload-0, upload-1, upload-2])
     * export-file
   - Upload all PDFs
   - Poll for completion
   - Download merged PDF
   - Save to storage/outputs/
   - Update status=COMPLETED
   ↓
7. Frontend polls for completion
   ↓
8. User downloads merged PDF
```

---

### Workflow 5: Payment & Subscription (PayFast)

```
1. User clicks "Upgrade to Pro" on pricing page
   ↓
2. POST /api/payfast/initialize
   Body: { plan: "pro", subscription: true }
   ↓
3. Backend:
   - Create payment_data with PayFast fields
   - Generate MD5 signature
   - Create PaymentLog (status=PENDING)
   - Return payment_url + payment_data
   ↓
4. Frontend:
   - Create HTML form with all payment_data
   - Submit to PayFast (redirects user)
   ↓
5. User on PayFast website:
   - Enters payment details
   - Completes payment
   ↓
6. PayFast sends ITN webhook:
   POST /api/payfast/webhook
   ↓
7. Backend validates ITN:
   STEP 1: Check request from PayFast host
   STEP 2: Validate MD5 signature
   STEP 3: Verify with PayFast server
   ↓
8. All validations pass:
   - Update PaymentLog (status=COMPLETE)
   - Update User:
     * plan = "pro"
     * subscription_status = "active"
     * conversions_limit = 1000
     * conversions_used = 0
   - Create Subscription record
   ↓
9. PayFast redirects user to return_url
   ↓
10. User lands on success page:
    - "Payment successful!"
    - "Upgraded to Pro plan"
    - Link to dashboard
    ↓
11. User now has Pro plan benefits:
    - Unlimited conversions
    - 100MB file size
    - Priority processing
```

---

### Workflow 6: Token Refresh with Rotation

```
NORMAL FLOW:
1. User makes API request
2. Access token valid → Request succeeds
3. Access token expires after 15 minutes
4. Next request returns 401
5. Frontend detects 401
6. POST /api/auth/refresh with refresh_token
7. Backend validates and issues new tokens
8. Frontend retries request with new access_token
9. Request succeeds

REPLAY ATTACK SCENARIO:
1. Attacker steals old refresh_token
2. Legitimate user already used token and got new one
3. Attacker tries to use old token
4. Backend detects token already used (used_at != NULL)
5. Backend REVOKES ENTIRE TOKEN FAMILY
6. Both attacker and user are logged out
7. User must re-login
8. New token family created
```

---

## External Service Integrations

### CloudConvert API v3

**Documentation:** https://cloudconvert.com/api/v2

**Authentication:** Bearer token (API key)

**Base URL:** https://api.cloudconvert.com/v2

**Endpoints Used:**

1. **Create Job:** `POST /jobs`
2. **Get Job Status:** `GET /jobs/{id}`
3. **Cancel Job:** `POST /jobs/{id}/cancel`
4. **Get User Info:** `GET /users/me`

**Job Structure:**
```json
{
  "tasks": {
    "import-file": {
      "operation": "import/upload"
    },
    "convert-file": {
      "operation": "convert",
      "input": "import-file",
      "input_format": "pdf",
      "output_format": "pptx",
      "layout_preserving": true,
      "ocr": true
    },
    "export-file": {
      "operation": "export/url",
      "input": "convert-file"
    }
  }
}
```

**Polling:**
- Poll every 2 seconds
- Check `status` field: "waiting", "processing", "finished", "error"

---

### PayFast Payment Gateway

**Documentation:** https://developers.payfast.co.za/

**Mode:** Production (live payments)

**Merchant ID:** 25263515
**Merchant Key:** <PAYFAST_MERCHANT_KEY>

**URLs:**
- **Payment:** https://www.payfast.co.za/eng/process
- **ITN Validation:** https://www.payfast.co.za/eng/query/validate

**Signature Algorithm:**
```python
1. Sort all fields alphabetically (exclude 'signature')
2. Build query string: key1=value1&key2=value2
3. URL encode values (+ for spaces)
4. Append passphrase if configured
5. Generate MD5 hash
```

**ITN Validation:**
```python
1. Check request from PayFast IP
2. Validate signature
3. POST data back to PayFast
4. PayFast returns "VALID" or "INVALID"
```

**Subscription Fields:**
```
subscription_type: 1 (recurring)
billing_date: YYYY-MM-DD
frequency: 3 (monthly)
cycles: 0 (unlimited)
recurring_amount: 29.99
```

---

## Database Models & Methods

### User Model

**Table:** `users`

**Fields:**
- `id` (UUID, PK)
- `email` (VARCHAR, unique)
- `password_hash` (VARCHAR)
- `name` (VARCHAR, nullable)
- `email_verified` (BOOLEAN, default: false)
- `verification_token` (VARCHAR, nullable)
- `verification_token_expires` (DATETIME, nullable)
- `password_reset_token` (VARCHAR, nullable)
- `password_reset_token_expires` (DATETIME, nullable)
- `plan` (ENUM: free, starter, pro, enterprise)
- `conversions_used` (INT, default: 0)
- `conversions_limit` (INT, default: 3)
- `subscription_status` (ENUM: null, active, canceled, expired)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)
- `last_login` (DATETIME, nullable)

**Methods:**

```python
def generate_verification_token() -> str:
    """Generate email verification token (24hr expiry)"""
    self.verification_token = str(uuid.uuid4())
    self.verification_token_expires = datetime.utcnow() + timedelta(days=1)
    return self.verification_token

def is_verification_token_valid() -> bool:
    """Check if verification token not expired"""
    return self.verification_token_expires > datetime.utcnow()

def verify_email():
    """Mark email as verified"""
    self.email_verified = True
    self.verification_token = None
    self.verification_token_expires = None

def generate_password_reset_token() -> str:
    """Generate password reset token (1hr expiry)"""
    self.password_reset_token = str(uuid.uuid4())
    self.password_reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    return self.password_reset_token

def increment_conversions():
    """Increment conversion usage"""
    self.conversions_used += 1
```

---

### ConversionJob Model

**Table:** `conversion_jobs`

**Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `type` (ENUM: pdf_to_pptx, pdf_to_docx, pdf_to_xlsx, pdf_to_images, pdf_merge)
- `status` (ENUM: pending, queued, processing, completed, failed)
- `progress` (INT, 0-100)
- `file_name` (VARCHAR)
- `file_size` (BIGINT, bytes)
- `input_file` (VARCHAR, path)
- `output_file` (VARCHAR, path, nullable)
- `cloudconvert_job_id` (VARCHAR, nullable)
- `error_message` (TEXT, nullable)
- `created_at` (DATETIME)
- `processing_started_at` (DATETIME, nullable)
- `processing_completed_at` (DATETIME, nullable)
- `expires_at` (DATETIME) - Files deleted after 7 days

**Indexes:**
- `user_id, created_at DESC` - For history queries
- `status` - For worker job pickup
- `expires_at` - For cleanup cron

---

### Subscription Model

**Table:** `subscriptions`

**Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `plan` (ENUM: starter, pro, enterprise)
- `status` (ENUM: active, canceled, expired)
- `payfast_token` (VARCHAR, nullable) - For recurring billing
- `amount` (DECIMAL(10,2))
- `currency` (VARCHAR, default: "USD")
- `billing_date` (DATE)
- `next_billing_date` (DATE, nullable)
- `started_at` (DATETIME)
- `canceled_at` (DATETIME, nullable)
- `ended_at` (DATETIME, nullable)
- `created_at` (DATETIME)

**Methods:**

```python
def can_cancel() -> bool:
    """Check if subscription can be cancelled"""
    return self.status == SubStatus.ACTIVE
```

---

### PaymentLog Model

**Table:** `payment_logs`

**Fields:**
- `id` (UUID, PK) - Also used as transaction_id (m_payment_id)
- `user_id` (UUID, FK → users.id)
- `subscription_id` (UUID, FK → subscriptions.id, nullable)
- `payfast_payment_id` (VARCHAR, nullable) - PayFast's pf_payment_id
- `payment_type` (ENUM: one_time, subscription)
- `status` (ENUM: pending, complete, failed, cancelled)
- `amount_gross` (DECIMAL(10,2))
- `amount_fee` (DECIMAL(10,2))
- `amount_net` (DECIMAL(10,2))
- `currency` (VARCHAR, default: "USD")
- `plan` (VARCHAR)
- `name_first` (VARCHAR)
- `email_address` (VARCHAR)
- `item_name` (VARCHAR)
- `item_description` (VARCHAR, nullable)
- `itn_data` (JSON, nullable) - Full ITN payload
- `custom_data` (JSON, nullable)
- `created_at` (DATETIME)
- `processed_at` (DATETIME, nullable)

**Indexes:**
- `user_id, created_at DESC` - For user payment history
- `payfast_payment_id` - For ITN lookups
- `status` - For reporting

---

### RefreshToken Model

**Table:** `refresh_tokens`

**Fields:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `token_hash` (VARCHAR, unique) - SHA-256 hash
- `family_id` (UUID) - For rotation tracking
- `is_revoked` (BOOLEAN, default: false)
- `used_at` (DATETIME, nullable)
- `ip_address` (VARCHAR, nullable)
- `user_agent` (VARCHAR, nullable)
- `expires_at` (DATETIME)
- `created_at` (DATETIME)

**Methods:**

```python
@staticmethod
def create_token_hash(token: str) -> str:
    """Create SHA-256 hash of token"""
    return hashlib.sha256(token.encode()).hexdigest()

@staticmethod
def create_new_token(user_id, family_id=None, ip_address=None, user_agent=None):
    """Create new refresh token record"""
    return RefreshToken(
        user_id=user_id,
        family_id=family_id or str(uuid.uuid4()),
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )

def is_valid() -> bool:
    """Check if token is valid (not expired)"""
    return datetime.utcnow() < self.expires_at

def revoke():
    """Revoke token"""
    self.is_revoked = True

def mark_as_used():
    """Mark token as used (for replay detection)"""
    self.used_at = datetime.utcnow()
```

---

## Summary

This document provides a comprehensive function-level breakdown of PDFLab's architecture, covering:

- **Python Backend (Primary):** FastAPI with async support, Celery workers, comprehensive authentication
- **Node.js Backend (Legacy):** Express.js with Bull queue, similar functionality
- **Frontend:** Next.js 14 with React, TypeScript, modern UI components
- **External Services:** CloudConvert API v3, PayFast payment gateway
- **Database:** MySQL 8.0 with well-designed schema and indexes
- **Security:** JWT with refresh token rotation, email verification, secure password hashing
- **Background Processing:** Celery (Python) and Bull (Node.js) for async PDF processing
- **Payment Flow:** Full PayFast integration with ITN webhook validation

All functions are documented with parameters, process flows, security features, and response formats.
