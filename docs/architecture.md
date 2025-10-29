# PDFLab - Full-Stack Architecture Document

**Version**: 1.0
**Last Updated**: 2025-10-29
**Primary Conversion Engine**: CloudConvert API

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [API Architecture](#api-architecture)
6. [Database Schema](#database-schema)
7. [CloudConvert Integration](#cloudconvert-integration)
8. [Job Queue System](#job-queue-system)
9. [Security Architecture](#security-architecture)
10. [Performance Optimization](#performance-optimization)
11. [Infrastructure & Deployment](#infrastructure--deployment)
12. [Monitoring & Observability](#monitoring--observability)
13. [Error Handling & Recovery](#error-handling--recovery)
14. [Scalability Strategy](#scalability-strategy)

---

## System Overview

PDFLab is a high-performance PDF conversion platform designed to be **10x faster than industry standards** and **65% cheaper than Adobe**. The system provides five core conversion capabilities:

1. **PDF → PowerPoint** (<5s for 20 pages)
2. **PDF → Word** (<5s for 20 pages)
3. **PDF → Excel** (<5s for 10 pages)
4. **PDF → Images** (<10s for 20 pages)
5. **PDF Merge** (<2s for 5 files)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                    (Next.js 14 Frontend)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                         │
│            (Static Assets, Edge Functions, CDN)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND API (Hostinger VPS)                    │
│                   Node.js + Express + TypeScript                 │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │ Upload API   │  │ Conversion   │          │
│  │ (JWT)        │  │              │  │ API          │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┬──────────────────┐
          │                 │                 │                  │
          ▼                 ▼                 ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
  │   MySQL      │  │ Redis + Bull │  │ CloudConvert │  │ File Storage│
  │   Database   │  │  Job Queue   │  │     API      │  │  (Local +   │
  │              │  │              │  │              │  │  Future S3) │
  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘
```

---

## Architecture Principles

### Core Principles

1. **Privacy First**: Files deleted after 1 hour, bank-grade encryption
2. **Performance**: <5s conversions, P95 API response <500ms
3. **Reliability**: 98%+ success rate, 99.5%+ uptime
4. **Scalability**: 100+ concurrent users, horizontal scaling ready
5. **Cost Efficiency**: $8.99/mo VPS target, CloudConvert pay-per-use
6. **User Experience**: Visible system status, clear error recovery

### Design Patterns

- **Microservices-lite**: Modular backend services, future-ready for containerization
- **Job Queue Pattern**: Background processing for long-running conversions
- **API-First**: RESTful API design, GraphQL consideration for v2
- **Database per Service**: Logical separation in single MySQL instance
- **Event-Driven**: Redis pub/sub for real-time status updates
- **Circuit Breaker**: CloudConvert API failure handling

---

## System Components

### 1. Frontend (Next.js 14)

**Technology Stack**:
- **Framework**: Next.js 14.2.16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1 + OKLCH color space
- **UI Components**: Radix UI (accessible primitives)
- **State Management**: React hooks + Context API
- **File Upload**: react-dropzone 14.3.8
- **Analytics**: @vercel/analytics
- **Theme**: next-themes (dark mode support)

**Key Responsibilities**:
- User authentication (JWT token management)
- File upload interface with drag-and-drop
- Real-time conversion progress display
- Download management
- Pricing & account management UI
- Responsive design (mobile-first)

**File Structure**:
```
app/
├── page.tsx                    # Landing page
├── dashboard/
│   └── page.tsx                # User dashboard
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   └── register/route.ts
│   ├── upload/route.ts
│   ├── convert/route.ts
│   └── status/route.ts
├── globals.css                 # Design system (OKLCH colors)
└── layout.tsx

components/
├── UnifiedConversionInterface.tsx
├── Navigation.tsx
├── TestimonialsCarousel.tsx
└── ui/                         # Radix UI wrappers
```

**Environment Variables**:
```env
NEXT_PUBLIC_API_URL=https://api.pdflab.pro
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
```

---

### 2. Backend API (Node.js + Express)

**Technology Stack**:
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.x
- **Language**: TypeScript 5
- **Database**: MySQL 8.0
- **Cache**: Redis 7.x
- **Queue**: Bull (Redis-based job queue)
- **File Processing**: pdf-lib, ImageMagick
- **External API**: CloudConvert SDK

**Key Responsibilities**:
- User authentication & authorization (JWT)
- File upload handling (multipart/form-data)
- Conversion job creation & management
- CloudConvert API integration
- Job queue orchestration
- Usage tracking & rate limiting
- Webhook handling (CloudConvert callbacks)

**File Structure**:
```
backend/
├── src/
│   ├── server.ts               # Express app entry
│   ├── config/
│   │   ├── database.ts         # MySQL connection
│   │   ├── redis.ts            # Redis client
│   │   └── cloudconvert.ts     # CloudConvert config
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── upload.routes.ts
│   │   ├── convert.routes.ts
│   │   └── webhook.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── conversion.controller.ts
│   │   └── upload.controller.ts
│   ├── services/
│   │   ├── cloudconvert.service.ts
│   │   ├── file.service.ts
│   │   └── user.service.ts
│   ├── jobs/
│   │   ├── conversion.job.ts
│   │   └── cleanup.job.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── ratelimit.middleware.ts
│   │   └── validation.middleware.ts
│   └── models/
│       ├── User.model.ts
│       ├── ConversionJob.model.ts
│       └── UsageLog.model.ts
├── package.json
└── tsconfig.json
```

**Environment Variables**:
```env
DATABASE_URL=mysql://user:pass@localhost:3306/pdflab
REDIS_URL=redis://localhost:6379
CLOUDCONVERT_API_KEY=eyJ0eXAiOiJKV1QiLCJhb...
JWT_SECRET=your-secret-key-here
PORT=3001
NODE_ENV=production
```

---

### 3. Database (MySQL 8.0)

**Choice Rationale**:
- Relational data model (users, jobs, usage)
- ACID compliance for billing accuracy
- Cost-effective (included in Hostinger VPS)
- Mature tooling & community support

**Connection Pool Configuration**:
```typescript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'pdflab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})
```

---

### 4. Job Queue (Redis + Bull)

**Choice Rationale**:
- Persistent job storage (Redis AOF)
- Retry logic for failed conversions
- Concurrent job processing
- Real-time progress tracking
- Scheduled jobs (file cleanup)

**Queue Configuration**:
```typescript
import Bull from 'bull'

export const conversionQueue = new Bull('pdf-conversion', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
})

export const cleanupQueue = new Bull('file-cleanup', {
  redis: process.env.REDIS_URL
})
```

**Queue Types**:
1. **conversion-queue**: PDF conversion jobs
2. **cleanup-queue**: Scheduled file deletion (1 hour after creation)
3. **email-queue**: Send download links, notifications (future)

---

### 5. File Storage

**Current**: Local filesystem on Hostinger VPS
**Future**: AWS S3 or Cloudflare R2 for scalability

**Directory Structure**:
```
/var/www/pdflab/storage/
├── uploads/              # User-uploaded PDFs
│   └── {user_id}/
│       └── {job_id}/
│           └── input.pdf
├── outputs/              # Converted files
│   └── {user_id}/
│       └── {job_id}/
│           └── output.{pptx|docx|xlsx|zip}
└── temp/                 # CloudConvert webhook downloads
```

**Storage Policies**:
- Files deleted after 1 hour (privacy promise)
- Max file size: 10MB (Free), 25MB (Starter), 100MB (Pro)
- Allowed input types: `.pdf` only
- Output formats: `.pptx`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.pdf` (merged)

---

## Data Flow

### Conversion Flow (PDF → PowerPoint Example)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS FILE                                             │
│    Frontend: UnifiedConversionInterface.tsx                      │
│    Action: User drags PDF, selects "PowerPoint"                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND VALIDATION                                           │
│    - File type check (.pdf only)                                 │
│    - File size check (tier-based limits)                         │
│    - Format selection validation                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ POST /api/upload
┌──────────────────────────────────────────────────────────────────┐
│ 3. BACKEND: FILE UPLOAD                                          │
│    Route: POST /api/upload                                       │
│    Middleware: auth, ratelimit, multer                           │
│    Action:                                                        │
│      - Validate JWT token                                        │
│      - Check user quota (conversions_used < tier limit)          │
│      - Save file to /storage/uploads/{user_id}/{job_id}/         │
│      - Create conversion_jobs record (status: 'pending')         │
│      - Return job_id to frontend                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ POST /api/convert
┌──────────────────────────────────────────────────────────────────┐
│ 4. BACKEND: START CONVERSION                                     │
│    Route: POST /api/convert                                      │
│    Controller: conversion.controller.ts                          │
│    Action:                                                        │
│      - Add job to Bull queue: conversionQueue.add({job_id})      │
│      - Update status: 'queued'                                   │
│      - Return status to frontend                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. JOB QUEUE PROCESSOR                                           │
│    Worker: jobs/conversion.job.ts                                │
│    Action:                                                        │
│      - Fetch job from queue                                      │
│      - Update status: 'processing'                               │
│      - Call CloudConvert service                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. CLOUDCONVERT API CALL                                         │
│    Service: cloudconvert.service.ts                              │
│    Action:                                                        │
│      - Create CloudConvert job                                   │
│      - Upload PDF to CloudConvert                                │
│      - Start conversion: pdf → pptx                              │
│      - Poll status OR wait for webhook                           │
│      - Download converted file                                   │
│      - Save to /storage/outputs/{user_id}/{job_id}/output.pptx   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. JOB COMPLETION                                                │
│    Worker: jobs/conversion.job.ts                                │
│    Action:                                                        │
│      - Update status: 'completed'                                │
│      - Set output_file path                                      │
│      - Increment user.conversions_used                           │
│      - Log to usage_logs table                                   │
│      - Schedule cleanup job (1 hour)                             │
│      - Emit Redis event: job:{job_id}:completed                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. FRONTEND: REAL-TIME UPDATE                                    │
│    Method: EventSource (SSE) or WebSocket                        │
│    Action:                                                        │
│      - Receive completion event                                  │
│      - Show download button                                      │
│      - Enable "Convert Another" option                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ GET /api/download/{job_id}
┌──────────────────────────────────────────────────────────────────┐
│ 9. USER DOWNLOADS FILE                                           │
│    Route: GET /api/download/:job_id                              │
│    Action:                                                        │
│      - Validate ownership (user_id matches JWT)                  │
│      - Stream file from storage                                  │
│      - Set headers: Content-Disposition: attachment              │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Architecture

### Base URL
- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://api.pdflab.pro/v1`

### Authentication
All protected endpoints require JWT Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Endpoints

#### Authentication

**POST /auth/register**
```typescript
Request:
{
  email: string
  password: string (min 8 chars)
  name?: string
}

Response: 201 Created
{
  user: {
    id: string
    email: string
    plan: "free"
    conversions_used: 0
    conversions_limit: 3
  }
  token: string
}

Errors:
- 400: Email already exists
- 422: Validation error
```

**POST /auth/login**
```typescript
Request:
{
  email: string
  password: string
}

Response: 200 OK
{
  user: { id, email, plan, conversions_used, conversions_limit }
  token: string
}

Errors:
- 401: Invalid credentials
- 429: Too many attempts (rate limited)
```

**POST /auth/refresh**
```typescript
Request:
{
  refresh_token: string
}

Response: 200 OK
{
  token: string
  refresh_token: string
}
```

---

#### Conversion Operations

**POST /upload**
```typescript
Request: multipart/form-data
{
  file: File (PDF)
  conversion_type: "pptx" | "docx" | "xlsx" | "images" | "merge"
  options?: {
    image_dpi?: 300 | 600
    merge_files?: File[] (for merge operation)
  }
}

Response: 201 Created
{
  job_id: string
  status: "pending"
  estimated_time: number (seconds)
  created_at: string (ISO 8601)
}

Errors:
- 401: Unauthorized
- 413: File too large
- 415: Unsupported file type
- 429: Quota exceeded
```

**GET /status/:job_id**
```typescript
Response: 200 OK
{
  job_id: string
  status: "pending" | "queued" | "processing" | "completed" | "failed"
  progress: number (0-100)
  estimated_time_remaining?: number (seconds)
  output_file?: string (if completed)
  error?: string (if failed)
  created_at: string
  updated_at: string
}

Errors:
- 404: Job not found
- 403: Forbidden (not your job)
```

**GET /download/:job_id**
```typescript
Response: 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="converted-{timestamp}.pptx"

[Binary file stream]

Errors:
- 404: File not found or expired
- 403: Forbidden
- 410: File already deleted
```

**GET /history**
```typescript
Query params:
  page?: number (default: 1)
  limit?: number (default: 20, max: 100)

Response: 200 OK
{
  jobs: [
    {
      job_id: string
      type: string
      status: string
      created_at: string
      file_name: string
    }
  ],
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
```

---

#### User & Billing

**GET /user/profile**
```typescript
Response: 200 OK
{
  id: string
  email: string
  plan: "free" | "starter" | "pro" | "enterprise"
  conversions_used: number
  conversions_limit: number
  subscription_status?: "active" | "canceled" | "past_due"
  subscription_end_date?: string
  created_at: string
}
```

**POST /user/upgrade**
```typescript
Request:
{
  plan: "starter" | "pro"
  payment_method_id: string (Stripe)
}

Response: 200 OK
{
  subscription_id: string
  status: "active"
  plan: string
  next_billing_date: string
}

Errors:
- 402: Payment required
- 409: Already on this plan
```

---

### Webhooks

**POST /webhook/cloudconvert** (CloudConvert callback)
```typescript
Headers:
  CloudConvert-Signature: sha256=...

Request:
{
  event: "job.finished" | "job.failed"
  job: {
    id: string
    status: string
    tasks: [...]
  }
}

Response: 200 OK
{
  received: true
}

Action:
- Verify signature
- Update conversion_jobs table
- Emit Redis event for real-time update
- Download output file if job.finished
```

**POST /webhook/stripe** (Stripe subscription events)
```typescript
Headers:
  Stripe-Signature: t=...,v1=...

Events handled:
- invoice.payment_succeeded
- invoice.payment_failed
- customer.subscription.deleted
- customer.subscription.updated
```

---

## Database Schema

### users

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
  conversions_used INT DEFAULT 0,
  conversions_limit INT DEFAULT 3,
  stripe_customer_id VARCHAR(255),
  subscription_id VARCHAR(255),
  subscription_status ENUM('active', 'canceled', 'past_due', 'trialing'),
  subscription_end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_stripe_customer (stripe_customer_id)
);
```

**Indexes**:
- `idx_email`: Fast login lookups
- `idx_stripe_customer`: Webhook processing

**Plan Limits**:
| Plan       | conversions_limit | File Size  |
|------------|-------------------|------------|
| free       | 3                 | 10 MB      |
| starter    | 100               | 25 MB      |
| pro        | -1 (unlimited)    | 100 MB     |
| enterprise | -1 (unlimited)    | 500 MB     |

---

### conversion_jobs

```sql
CREATE TABLE conversion_jobs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  type ENUM('pdf_to_pptx', 'pdf_to_docx', 'pdf_to_xlsx', 'pdf_to_images', 'pdf_merge') NOT NULL,
  status ENUM('pending', 'queued', 'processing', 'completed', 'failed') DEFAULT 'pending',
  progress INT DEFAULT 0,
  input_file VARCHAR(500),
  output_file VARCHAR(500),
  file_name VARCHAR(255),
  file_size BIGINT,
  cloudconvert_job_id VARCHAR(255),
  error_message TEXT,
  estimated_time INT,
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at),
  INDEX idx_cloudconvert_job_id (cloudconvert_job_id)
);
```

**Indexes**:
- `idx_user_id`: User history queries
- `idx_status`: Queue processing
- `idx_expires_at`: Cleanup job queries
- `idx_cloudconvert_job_id`: Webhook lookups

**Status Flow**:
```
pending → queued → processing → completed
                              → failed
```

---

### usage_logs

```sql
CREATE TABLE usage_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36),
  operation_type VARCHAR(50),
  success BOOLEAN DEFAULT FALSE,
  processing_time INT,
  file_size BIGINT,
  error_code VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES conversion_jobs(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_operation_type (operation_type)
);
```

**Purpose**:
- Analytics & reporting
- Debugging failed conversions
- Performance monitoring
- Billing reconciliation

**Retention**: 90 days, then archived to cold storage

---

### api_keys (Future: API access for developers)

```sql
CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  last_used TIMESTAMP,
  rate_limit INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_key_hash (key_hash),
  INDEX idx_user_id (user_id)
);
```

---

## CloudConvert Integration

### Why CloudConvert?

**Advantages**:
- **Best-in-class accuracy**: 95%+ layout preservation for PDF→PPT
- **Fast processing**: <5s for 20-page documents
- **Comprehensive format support**: PPTX, DOCX, XLSX, images
- **Pay-per-use pricing**: $0.008/conversion minute (cost-effective for freemium)
- **Webhook support**: No polling required
- **High uptime**: 99.9% SLA
- **No infrastructure maintenance**: Fully managed

**Cost Estimation**:
- Average conversion time: 3 seconds
- Cost per conversion: $0.008 * (3/60) = $0.0004
- 1,000 conversions/month = $0.40
- 10,000 conversions/month = $4.00
- **Margin**: Even on free tier, costs are negligible

---

### CloudConvert SDK Setup

```typescript
// config/cloudconvert.ts
import CloudConvert from 'cloudconvert'

export const cloudConvertClient = new CloudConvert(
  process.env.CLOUDCONVERT_API_KEY!,
  true // Use sandbox for development
)
```

---

### Conversion Service Implementation

```typescript
// services/cloudconvert.service.ts
import { cloudConvertClient } from '../config/cloudconvert'
import fs from 'fs'
import path from 'path'

interface ConversionOptions {
  inputFormat: 'pdf'
  outputFormat: 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg'
  inputFilePath: string
  outputFilePath: string
  webhookUrl?: string
}

export class CloudConvertService {

  async convertFile(options: ConversionOptions): Promise<string> {
    const {
      inputFormat,
      outputFormat,
      inputFilePath,
      outputFilePath,
      webhookUrl
    } = options

    try {
      // 1. Create a job
      let job = await cloudConvertClient.jobs.create({
        tasks: {
          'upload-file': {
            operation: 'import/upload'
          },
          'convert-file': {
            operation: 'convert',
            input: 'upload-file',
            input_format: inputFormat,
            output_format: outputFormat,
            engine: 'office',
            some_other_option: 'value',
            // PDF → PPTX specific options
            ...(outputFormat === 'pptx' && {
              pages: 'all',
              layout_preserving: true,
              ocr: true
            }),
            // PDF → DOCX specific options
            ...(outputFormat === 'docx' && {
              ocr: true,
              pages: 'all'
            }),
            // PDF → XLSX specific options
            ...(outputFormat === 'xlsx' && {
              ocr: true,
              auto_detect_tables: true
            }),
            // PDF → Images specific options
            ...(outputFormat === 'png' && {
              pages: 'all',
              density: 300
            })
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file'
          }
        },
        // Webhook for async notification
        ...(webhookUrl && {
          webhook_url: webhookUrl
        })
      })

      // 2. Upload the input file
      const uploadTask = job.tasks.filter(
        task => task.name === 'upload-file'
      )[0]

      const inputFile = fs.createReadStream(inputFilePath)
      await cloudConvertClient.tasks.upload(uploadTask, inputFile)

      // 3. Wait for job completion (or rely on webhook)
      job = await cloudConvertClient.jobs.wait(job.id)

      // 4. Download the converted file
      const exportTask = job.tasks.filter(
        task => task.name === 'export-file'
      )[0]

      const file = cloudConvertClient.tasks.download(exportTask)
      const writeStream = fs.createWriteStream(outputFilePath)

      file.pipe(writeStream)

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      return outputFilePath

    } catch (error) {
      console.error('CloudConvert error:', error)
      throw new Error(`Conversion failed: ${error.message}`)
    }
  }

  /**
   * PDF Merge using CloudConvert
   */
  async mergePDFs(inputFiles: string[], outputPath: string): Promise<string> {
    const uploadTasks = inputFiles.map((file, index) => ({
      [`upload-${index}`]: {
        operation: 'import/upload'
      }
    }))

    const mergeInputs = inputFiles.map((_, index) => `upload-${index}`)

    let job = await cloudConvertClient.jobs.create({
      tasks: {
        ...Object.assign({}, ...uploadTasks),
        'merge-pdfs': {
          operation: 'merge',
          input: mergeInputs,
          output_format: 'pdf'
        },
        'export-file': {
          operation: 'export/url',
          input: 'merge-pdfs'
        }
      }
    })

    // Upload all files
    for (let i = 0; i < inputFiles.length; i++) {
      const uploadTask = job.tasks.filter(
        task => task.name === `upload-${i}`
      )[0]
      const inputFile = fs.createReadStream(inputFiles[i])
      await cloudConvertClient.tasks.upload(uploadTask, inputFile)
    }

    // Wait and download
    job = await cloudConvertClient.jobs.wait(job.id)
    const exportTask = job.tasks.filter(
      task => task.name === 'export-file'
    )[0]

    const file = cloudConvertClient.tasks.download(exportTask)
    const writeStream = fs.createWriteStream(outputPath)
    file.pipe(writeStream)

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    return outputPath
  }

  /**
   * Check CloudConvert account credits
   */
  async getAccountInfo() {
    const user = await cloudConvertClient.users.me()
    return {
      credits: user.credits,
      email: user.email
    }
  }
}

export const cloudConvertService = new CloudConvertService()
```

---

### Webhook Handler

```typescript
// routes/webhook.routes.ts
import express from 'express'
import crypto from 'crypto'
import { ConversionJob } from '../models/ConversionJob.model'
import { cloudConvertService } from '../services/cloudconvert.service'
import { redisClient } from '../config/redis'

const router = express.Router()

router.post('/cloudconvert', async (req, res) => {
  // 1. Verify webhook signature
  const signature = req.headers['cloudconvert-signature']
  const body = JSON.stringify(req.body)

  const expectedSignature = crypto
    .createHmac('sha256', process.env.CLOUDCONVERT_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 2. Process event
  const { event, job } = req.body

  if (event === 'job.finished') {
    // Update database
    await ConversionJob.update(
      {
        status: 'completed',
        progress: 100,
        processing_completed_at: new Date()
      },
      {
        where: { cloudconvert_job_id: job.id }
      }
    )

    // Download file (already handled in service)
    // Emit real-time event
    await redisClient.publish(
      `job:${job.id}:completed`,
      JSON.stringify({ status: 'completed' })
    )
  }

  if (event === 'job.failed') {
    await ConversionJob.update(
      {
        status: 'failed',
        error_message: job.error || 'Unknown error'
      },
      {
        where: { cloudconvert_job_id: job.id }
      }
    )

    await redisClient.publish(
      `job:${job.id}:failed`,
      JSON.stringify({ status: 'failed', error: job.error })
    )
  }

  res.status(200).json({ received: true })
})

export default router
```

---

## Job Queue System

### Bull Queue Configuration

```typescript
// jobs/conversion.job.ts
import { conversionQueue } from '../config/redis'
import { cloudConvertService } from '../services/cloudconvert.service'
import { ConversionJob } from '../models/ConversionJob.model'
import path from 'path'

interface ConversionJobData {
  job_id: string
  user_id: string
  input_file: string
  output_format: 'pptx' | 'docx' | 'xlsx' | 'png'
}

conversionQueue.process(5, async (job) => {
  const { job_id, user_id, input_file, output_format } = job.data as ConversionJobData

  try {
    // 1. Update status to processing
    await ConversionJob.update(
      {
        status: 'processing',
        processing_started_at: new Date(),
        progress: 10
      },
      { where: { id: job_id } }
    )

    // 2. Define output path
    const outputDir = path.join(
      process.env.STORAGE_PATH!,
      'outputs',
      user_id,
      job_id
    )
    const outputFile = path.join(outputDir, `output.${output_format}`)

    // 3. Call CloudConvert
    await cloudConvertService.convertFile({
      inputFormat: 'pdf',
      outputFormat: output_format,
      inputFilePath: input_file,
      outputFilePath: outputFile,
      webhookUrl: `${process.env.API_URL}/webhook/cloudconvert`
    })

    // 4. Update progress
    job.progress(50)

    // 5. Mark as completed (webhook will also update)
    await ConversionJob.update(
      {
        status: 'completed',
        output_file: outputFile,
        progress: 100,
        processing_completed_at: new Date()
      },
      { where: { id: job_id } }
    )

    // 6. Schedule cleanup (1 hour from now)
    await cleanupQueue.add(
      { job_id, user_id },
      { delay: 3600000 } // 1 hour in ms
    )

    return { success: true, output_file: outputFile }

  } catch (error) {
    // Log error
    console.error(`Conversion failed for job ${job_id}:`, error)

    // Update database
    await ConversionJob.update(
      {
        status: 'failed',
        error_message: error.message
      },
      { where: { id: job_id } }
    )

    throw error // Re-throw for Bull retry logic
  }
})

// Queue event listeners
conversionQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result)
})

conversionQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message)
})

conversionQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} stalled`)
})
```

---

### Cleanup Job

```typescript
// jobs/cleanup.job.ts
import { cleanupQueue } from '../config/redis'
import { ConversionJob } from '../models/ConversionJob.model'
import fs from 'fs/promises'
import path from 'path'

cleanupQueue.process(async (job) => {
  const { job_id, user_id } = job.data

  try {
    // 1. Get job details
    const conversionJob = await ConversionJob.findByPk(job_id)
    if (!conversionJob) {
      console.log(`Job ${job_id} not found, skipping cleanup`)
      return
    }

    // 2. Delete files
    const userDir = path.join(process.env.STORAGE_PATH!, 'uploads', user_id, job_id)
    const outputDir = path.join(process.env.STORAGE_PATH!, 'outputs', user_id, job_id)

    await fs.rm(userDir, { recursive: true, force: true })
    await fs.rm(outputDir, { recursive: true, force: true })

    // 3. Update database
    await ConversionJob.update(
      { input_file: null, output_file: null },
      { where: { id: job_id } }
    )

    console.log(`Cleanup completed for job ${job_id}`)
    return { deleted: true }

  } catch (error) {
    console.error(`Cleanup failed for job ${job_id}:`, error)
    throw error
  }
})
```

---

## Security Architecture

### 1. Authentication & Authorization

**JWT Implementation**:
```typescript
// middleware/auth.middleware.ts
import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

**Password Hashing** (bcrypt):
```typescript
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}
```

---

### 2. Rate Limiting

```typescript
// middleware/ratelimit.middleware.ts
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redisClient } from '../config/redis'

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
})

export const uploadLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'upload-limit:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    // Dynamic limit based on user plan
    if (req.user?.plan === 'pro') return 1000
    if (req.user?.plan === 'starter') return 100
    return 3 // Free tier
  },
  message: 'Conversion quota exceeded. Please upgrade your plan.'
})
```

---

### 3. File Upload Security

```typescript
// middleware/upload.middleware.ts
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      process.env.STORAGE_PATH!,
      'uploads',
      req.user.id,
      uuidv4()
    )
    fs.mkdirSync(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, 'input.pdf')
  }
})

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: (req) => {
      // Dynamic file size based on plan
      if (req.user?.plan === 'pro') return 100 * 1024 * 1024 // 100MB
      if (req.user?.plan === 'starter') return 25 * 1024 * 1024 // 25MB
      return 10 * 1024 * 1024 // 10MB
    }
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'))
    }
    cb(null, true)
  }
})
```

---

### 4. Input Validation

```typescript
// middleware/validation.middleware.ts
import { body, param, validationResult } from 'express-validator'

export const validateConversion = [
  body('conversion_type')
    .isIn(['pptx', 'docx', 'xlsx', 'images', 'merge'])
    .withMessage('Invalid conversion type'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    next()
  }
]

export const validateJobId = [
  param('job_id')
    .isUUID()
    .withMessage('Invalid job ID'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }
    next()
  }
]
```

---

### 5. CORS Configuration

```typescript
// config/cors.ts
import cors from 'cors'

export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://pdflab.pro',
      'https://www.pdflab.pro',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ]

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

### 6. Encryption

**File Encryption** (AES-256):
```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32)

export const encryptFile = (buffer: Buffer): { encrypted: Buffer, iv: Buffer, tag: Buffer } => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ])

  const tag = cipher.getAuthTag()

  return { encrypted, iv, tag }
}

export const decryptFile = (
  encrypted: Buffer,
  iv: Buffer,
  tag: Buffer
): Buffer => {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])
}
```

**Note**: File encryption is optional and may impact performance. Consider for enterprise tier only.

---

## Performance Optimization

### 1. Caching Strategy

**Redis Caching**:
```typescript
// services/cache.service.ts
import { redisClient } from '../config/redis'

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redisClient.setex(key, ttl, JSON.stringify(value))
  }

  async del(key: string): Promise<void> {
    await redisClient.del(key)
  }

  // Cache user profile for 5 minutes
  async getUserProfile(userId: string) {
    const cacheKey = `user:${userId}:profile`
    let profile = await this.get(cacheKey)

    if (!profile) {
      profile = await User.findByPk(userId)
      await this.set(cacheKey, profile, 300)
    }

    return profile
  }

  // Cache conversion history for 1 minute
  async getConversionHistory(userId: string, page: number) {
    const cacheKey = `user:${userId}:history:${page}`
    let history = await this.get(cacheKey)

    if (!history) {
      history = await ConversionJob.findAll({
        where: { user_id: userId },
        limit: 20,
        offset: (page - 1) * 20,
        order: [['created_at', 'DESC']]
      })
      await this.set(cacheKey, history, 60)
    }

    return history
  }
}

export const cacheService = new CacheService()
```

---

### 2. Database Query Optimization

**Connection Pooling** (already configured above)

**Indexed Queries**:
```typescript
// Always use indexed columns in WHERE clauses
await ConversionJob.findAll({
  where: { user_id: userId }, // Uses idx_user_id
  order: [['created_at', 'DESC']]
})

// Avoid full table scans
await User.findOne({
  where: { email: email } // Uses idx_email
})
```

**Pagination**:
```typescript
const limit = 20
const offset = (page - 1) * limit

const { count, rows } = await ConversionJob.findAndCountAll({
  where: { user_id: userId },
  limit,
  offset,
  order: [['created_at', 'DESC']]
})
```

---

### 3. Concurrent Processing

**Bull Queue Concurrency**:
```typescript
// Process up to 5 conversion jobs concurrently
conversionQueue.process(5, async (job) => {
  // Processing logic
})

// Separate queues for different priorities
export const priorityQueue = new Bull('priority-conversions', {
  redis: process.env.REDIS_URL,
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000 // Per second
  }
})
```

---

### 4. File Streaming

**Stream large files instead of loading into memory**:
```typescript
// Download endpoint with streaming
app.get('/download/:job_id', async (req, res) => {
  const job = await ConversionJob.findByPk(req.params.job_id)

  if (!job || !job.output_file) {
    return res.status(404).json({ error: 'File not found' })
  }

  const fileStream = fs.createReadStream(job.output_file)
  const stat = await fs.stat(job.output_file)

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Length', stat.size)
  res.setHeader('Content-Disposition', `attachment; filename="${job.file_name}"`)

  fileStream.pipe(res)
})
```

---

### 5. CDN Strategy (Future)

**Static Assets**: Serve Next.js static assets via Vercel Edge Network (automatic)

**Output Files**: Move to AWS S3 + CloudFront CDN
```typescript
// Future: S3 upload after conversion
import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
})

export const uploadToS3 = async (filePath: string, key: string) => {
  const fileStream = fs.createReadStream(filePath)

  const params = {
    Bucket: 'pdflab-outputs',
    Key: key,
    Body: fileStream,
    ContentType: 'application/octet-stream',
    Expires: new Date(Date.now() + 3600000) // 1 hour
  }

  return s3.upload(params).promise()
}
```

---

## Infrastructure & Deployment

### Development Environment

**Backend (local)**:
```bash
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm run dev
```

**Frontend (local)**:
```bash
cd frontend
npm install
npm run dev
```

**Database (local)**:
```bash
# Using Docker
docker run --name pdflab-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=pdflab \
  -e MYSQL_USER=pdflab \
  -e MYSQL_PASSWORD=***REMOVED*** \
  -p 3306:3306 \
  -d mysql:8.0
```

**Redis (local)**:
```bash
docker run --name pdflab-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

---

### Production Deployment

#### Frontend: Vercel

**Configuration** (vercel.json):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.pdflab.pro"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

**Deployment**:
```bash
vercel --prod
```

---

#### Backend: Hostinger VPS

**Server Specifications**:
- **Plan**: VPS 1 ($8.99/mo)
- **CPU**: 1 vCore
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Bandwidth**: 1 TB
- **OS**: Ubuntu 22.04 LTS

**Setup Script**:
```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Install Nginx (reverse proxy)
sudo apt install -y nginx
sudo systemctl enable nginx

# Create app directory
sudo mkdir -p /var/www/pdflab
sudo chown -R $USER:$USER /var/www/pdflab

# Clone repository
cd /var/www/pdflab
git clone https://github.com/your-org/pdflab-backend.git .

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env # Edit with production values

# Run database migrations
npm run migrate

# Start with PM2
pm2 start src/server.ts --name pdflab-api
pm2 save
pm2 startup
```

**PM2 Ecosystem File** (ecosystem.config.js):
```javascript
module.exports = {
  apps: [
    {
      name: 'pdflab-api',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'pdflab-worker',
      script: './dist/worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

**Nginx Configuration** (/etc/nginx/sites-available/pdflab):
```nginx
server {
    listen 80;
    server_name api.pdflab.pro;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.pdflab.pro;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.pdflab.pro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pdflab.pro/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client max body size (for file uploads)
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for long conversions
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

**SSL Certificate** (Let's Encrypt):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.pdflab.pro
sudo certbot renew --dry-run # Test auto-renewal
```

---

### Database Backup Strategy

**Daily Backups**:
```bash
#!/bin/bash
# /var/www/pdflab/scripts/backup.sh

BACKUP_DIR="/var/www/pdflab/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="pdflab_backup_$DATE.sql.gz"

# Create backup
mysqldump -u pdflab -p pdflab | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days
find $BACKUP_DIR -name "pdflab_backup_*.sql.gz" -mtime +7 -delete

# Upload to S3 (future)
# aws s3 cp "$BACKUP_DIR/$FILENAME" s3://pdflab-backups/
```

**Cron Job**:
```bash
# Run daily at 2 AM
0 2 * * * /var/www/pdflab/scripts/backup.sh
```

---

## Monitoring & Observability

### 1. Application Monitoring

**PM2 Monitoring**:
```bash
pm2 monit  # Real-time monitoring
pm2 logs   # View logs
pm2 status # Process status
```

**Health Check Endpoint**:
```typescript
// routes/health.routes.ts
import express from 'express'
import { redisClient } from '../config/redis'
import { pool } from '../config/database'

const router = express.Router()

router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    checks: {
      database: 'OK',
      redis: 'OK',
      cloudconvert: 'OK'
    }
  }

  try {
    // Check MySQL
    await pool.query('SELECT 1')
  } catch (error) {
    health.checks.database = 'FAIL'
    health.status = 'DEGRADED'
  }

  try {
    // Check Redis
    await redisClient.ping()
  } catch (error) {
    health.checks.redis = 'FAIL'
    health.status = 'DEGRADED'
  }

  try {
    // Check CloudConvert
    await cloudConvertService.getAccountInfo()
  } catch (error) {
    health.checks.cloudconvert = 'FAIL'
    health.status = 'DEGRADED'
  }

  const statusCode = health.status === 'OK' ? 200 : 503
  res.status(statusCode).json(health)
})

export default router
```

---

### 2. Error Tracking (Future: Sentry)

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
})

// Error handler middleware
app.use(Sentry.Handlers.errorHandler())
```

---

### 3. Metrics & Analytics

**Bull Queue Metrics**:
```typescript
// Monitor queue health
const queueMetrics = {
  waiting: await conversionQueue.getWaitingCount(),
  active: await conversionQueue.getActiveCount(),
  completed: await conversionQueue.getCompletedCount(),
  failed: await conversionQueue.getFailedCount(),
  delayed: await conversionQueue.getDelayedCount()
}
```

**Usage Analytics**:
```typescript
// Daily usage report
const dailyStats = await UsageLog.findAll({
  attributes: [
    [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
    [sequelize.fn('COUNT', sequelize.col('id')), 'total_conversions'],
    [sequelize.fn('SUM', sequelize.literal('CASE WHEN success = 1 THEN 1 ELSE 0 END')), 'successful'],
    [sequelize.fn('AVG', sequelize.col('processing_time')), 'avg_processing_time']
  ],
  where: {
    timestamp: {
      [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  },
  group: [sequelize.fn('DATE', sequelize.col('timestamp'))]
})
```

---

## Error Handling & Recovery

### Error Types & Handling

**1. CloudConvert API Errors**:
```typescript
try {
  await cloudConvertService.convertFile(options)
} catch (error) {
  if (error.code === 'ETIMEDOUT') {
    // Retry with exponential backoff
    await retryWithBackoff(() => cloudConvertService.convertFile(options))
  } else if (error.response?.status === 429) {
    // Rate limited - queue for later
    await conversionQueue.add(jobData, { delay: 60000 })
  } else if (error.response?.status === 402) {
    // Payment required - notify admin
    await notifyAdmin('CloudConvert credits depleted')
    throw new Error('Service temporarily unavailable')
  } else {
    // Unknown error - fail job
    throw error
  }
}
```

**2. File System Errors**:
```typescript
try {
  await fs.writeFile(outputPath, data)
} catch (error) {
  if (error.code === 'ENOSPC') {
    // Disk full - trigger cleanup
    await cleanupOldFiles()
    await fs.writeFile(outputPath, data) // Retry
  } else if (error.code === 'EACCES') {
    // Permission denied
    await fixPermissions(outputPath)
  } else {
    throw error
  }
}
```

**3. Database Errors**:
```typescript
try {
  await ConversionJob.create(jobData)
} catch (error) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    // Duplicate key - return existing job
    return await ConversionJob.findOne({ where: { id: jobData.id } })
  } else if (error.name === 'SequelizeConnectionError') {
    // Connection lost - retry
    await pool.query('SELECT 1') // Reconnect
    return await ConversionJob.create(jobData)
  } else {
    throw error
  }
}
```

---

### Circuit Breaker Pattern

```typescript
// utils/circuit-breaker.ts
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime: number | null = null
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

export const cloudConvertCircuitBreaker = new CircuitBreaker(5, 60000)
```

---

## Scalability Strategy

### Phase 1: Single VPS (Current)
- 100+ concurrent users
- 1,000-5,000 conversions/day
- Monthly cost: ~$10/mo

### Phase 2: Vertical Scaling
- Upgrade to VPS 2 (2 vCores, 8 GB RAM): $16.99/mo
- 500+ concurrent users
- 10,000-20,000 conversions/day

### Phase 3: Horizontal Scaling
- **Frontend**: Vercel (auto-scaling)
- **Backend**: Multiple VPS instances behind load balancer
- **Database**: Managed MySQL (PlanetScale or AWS RDS)
- **Queue**: Redis Cluster or AWS ElastiCache
- **Storage**: AWS S3 + CloudFront CDN
- **Estimated cost**: $150-300/mo for 100K conversions/day

### Phase 4: Microservices (Future)
- Separate services: Auth, Upload, Conversion, Billing
- Kubernetes orchestration
- Auto-scaling based on queue depth
- Multi-region deployment

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | User interface |
| **Backend** | Node.js 20, Express, TypeScript | API server |
| **Database** | MySQL 8.0 | User data, jobs, usage logs |
| **Cache/Queue** | Redis 7.x, Bull | Caching, job queue |
| **Conversion Engine** | **CloudConvert API** | PDF conversion |
| **File Processing** | pdf-lib, ImageMagick | PDF manipulation |
| **Authentication** | JWT, bcrypt | User auth |
| **Payment** | Stripe | Subscriptions |
| **Hosting (Frontend)** | Vercel | Static + Edge functions |
| **Hosting (Backend)** | Hostinger VPS | API + workers |
| **Monitoring** | PM2, Sentry (future) | Logs, errors |
| **Analytics** | Custom + Vercel Analytics | Usage tracking |

---

## Appendix: Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=3001
API_URL=https://api.pdflab.pro

# Database
DATABASE_URL=mysql://pdflab:password@localhost:3306/pdflab
DB_HOST=localhost
DB_USER=pdflab
DB_PASSWORD=your-secure-password
DB_NAME=pdflab

# Redis
REDIS_URL=redis://localhost:6379

# CloudConvert
CLOUDCONVERT_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
CLOUDCONVERT_WEBHOOK_SECRET=your-webhook-secret
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRATION=7d

# Storage
STORAGE_PATH=/var/www/pdflab/storage

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Future)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG...

# Sentry (Future)
SENTRY_DSN=https://...@sentry.io/...

# AWS S3 (Future)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=pdflab-outputs
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.pdflab.pro
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
```

---

**Document End**

This architecture document will evolve as PDFLab grows. Review and update quarterly.
