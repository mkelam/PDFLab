# PDFLab - Claude Code Project Documentation

This file provides guidance to Claude Code when working with the PDFLab codebase.

## Project Overview

**PDFLab** is a professional PDF conversion and manipulation platform that enables users to convert PDFs to various formats (PPTX, DOCX, XLSX, PNG) and merge multiple PDFs. The platform features a modern Next.js frontend with a robust Express.js backend, integrated with CloudConvert for file processing and PayFast for payment processing.

## Claude Code Skills

**IMPORTANT**: Before starting any task, always check the `.claude/skills/` directory for relevant skills that can help with the task. Available skills include:

- **typescript-build-guardian.skill** - Monitors TypeScript builds and fixes errors proactively
- Check `.claude/skills/` folder for additional skills specific to this project

When working on tasks, search for applicable skills using:
```bash
dir .claude\skills\*.skill
```

Skills provide specialized workflows and best practices for common development tasks in this project.

## Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS with OKLCH color space
- Glassmorphism design system
- React hooks for state management

**Backend:**
- Express.js with TypeScript
- MySQL 8.0 (Database)
- Redis 7 (Job queue)
- Bull (Background job processing)
- Sequelize ORM
- JWT authentication

**External Services:**
- CloudConvert API v3 (PDF processing)
- PayFast (Payment gateway - USD)

## Directory Structure

```
PDFLab/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Home page with conversion interface
│   ├── dashboard/                # User dashboard
│   ├── login/                    # Authentication pages
│   ├── signup/
│   ├── pricing/                  # Pricing and plans
│   └── admin/                    # Admin panel
├── backend/                      # Express.js API
│   ├── src/
│   │   ├── config/              # Database, Redis config
│   │   ├── controllers/         # API endpoint handlers
│   │   ├── middleware/          # Auth, upload, rate limiting
│   │   ├── models/              # Sequelize models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic (CloudConvert, PayFast)
│   │   ├── jobs/                # Background workers
│   │   └── server.ts            # Express app entry
│   ├── storage/                 # File uploads (gitignored)
│   └── .env                     # Environment variables
├── components/                   # React components
│   ├── Navigation.tsx
│   ├── UnifiedConversionInterface.tsx
│   └── ui/                      # Shadcn UI components
├── contexts/                     # React contexts
│   └── AuthContext.tsx          # Authentication state
├── lib/                         # Utilities
│   ├── api.ts                   # API client
│   └── auth-api.ts              # Auth helpers
├── docs/                        # **ALL PROJECT DOCUMENTATION**
│   ├── README.md                # Documentation index
│   ├── architecture/            # Architecture documents
│   ├── api/                     # API documentation
│   ├── deployment/              # Deployment guides
│   ├── testing/                 # Testing documentation
│   ├── payment/                 # PayFast integration docs
│   ├── admin/                   # Admin panel docs
│   ├── guides/                  # General guides
│   ├── prd/                     # Product requirements (sharded)
│   └── archives/                # Historical reports
└── public/                      # Static assets

```

## Development Environment

### Local Development Ports
- **Frontend**: http://localhost:3000 (Next.js)
- **Backend**: http://localhost:3006 (Express API)
- **MySQL**: localhost:3306 (Docker container: pdflab-mysql)
- **Redis**: localhost:6379 (Docker container: pdflab-redis)

### Production Environment
- **Production URL**: https://pdflab.pro
- **VPS IP**: 141.136.44.168 (Hostinger VPS)
- **Backend Port**: 3006 (Node.js Express)
- **Deployment Date**: November 5, 2025
- **Infrastructure**: Docker Compose with MySQL + Redis
- **SSL**: Let's Encrypt (auto-renewed)
- **Web Server**: Nginx reverse proxy

### Running the Application

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend:**
```bash
npm run dev
```

**Database Containers:**
```bash
docker start pdflab-mysql pdflab-redis
```

## Key Features Implemented

### 1. PDF Conversion
- **Formats**: PPTX, DOCX, XLSX, PNG
- **Processing**: CloudConvert API integration
- **Job Queue**: Bull with Redis for async processing
- **Status Tracking**: Real-time progress via polling
- **File Limits**: Plan-based (10MB free → 500MB enterprise)

### 2. PDF Merging
- **Multiple Files**: Up to 10 PDFs per merge
- **Size Validation**: Total size checked against user plan
- **Background Processing**: Async merge via job queue

### 3. PDF Compression ✨ NEW
- **Compression Levels**: Good, Recommended, Extreme
- **Quality vs Size**: Balance between quality retention and file size reduction
- **Authentication Required**: Only available to logged-in users
- **Compression Stats**: Shows original size, compressed size, and compression ratio
- **Processing**: CloudConvert optimize API integration
- **Typical Results**: 40-60% file size reduction (recommended level)

### 4. Authentication System
- **JWT Tokens**: Access + refresh tokens
- **Session Persistence**: localStorage + auto-restore
- **Protected Routes**: `useRequireAuth()` hook
- **Guest Routes**: `useGuestOnly()` hook redirects authenticated users

### 5. Payment Integration (PayFast)
- **Currency**: USD (PayFast multi-currency enabled)
  - **Multi-Currency**: PayFast natively supports multiple currencies via dashboard settings
  - **Automatic Conversion**: PayFast handles currency display and conversion automatically
  - **Settlement**: All payments settled in ZAR to merchant account
- **Plans**:
  - Free: $0 (3 conversions/month, 10MB)
  - Starter: $9.99/month (100 conversions, 25MB)
  - Pro: $29.99/month (unlimited, 100MB)
  - Enterprise: $99.99/month (unlimited, 500MB, API access)
- **Subscriptions**: Recurring monthly billing
- **ITN Webhooks**: Instant transaction notifications
- **Payment Logs**: Full audit trail in database
- **Configuration**: Multi-currency must be enabled in PayFast dashboard (Settings > Multi-currency > Enable USD)

## Database Schema

### Users Table
```sql
id (UUID), email (unique), password_hash, name, plan (enum),
conversions_used, conversions_limit, subscription_id, subscription_status,
created_at, updated_at, last_login
```

### Conversion Jobs Table
```sql
id (UUID), user_id (FK), type (enum), status (enum), progress,
input_file, output_file, file_name, file_size, cloudconvert_job_id,
error_message, estimated_time, created_at, expires_at
```

### Subscriptions Table
```sql
id (UUID), user_id (FK), plan (enum), status (enum), payfast_token,
amount, currency (USD), billing_date, next_billing_date,
started_at, ended_at, created_at
```

### Payment Logs Table
```sql
id (UUID), user_id (FK), subscription_id (FK), transaction_id (unique),
payfast_payment_id, payment_type (enum), status (enum),
amount_gross, amount_fee, amount_net, currency (USD),
itn_data (JSON), created_at
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile (requires auth)

### Conversion
- `POST /api/upload` - Upload PDF for conversion (requires auth)
- `POST /api/compress` - Compress PDF file (requires auth) ✨ NEW
- `POST /api/merge` - Merge multiple PDFs (requires auth)
- `GET /api/status/:job_id` - Check job status
- `GET /api/download/:job_id` - Download converted file
- `GET /api/history` - User's conversion history

### PayFast Payment
- `GET /api/payfast/plans` - Get pricing plans (public)
- `POST /api/payfast/initialize` - Start payment (requires auth)
- `POST /api/payfast/webhook` - ITN handler (public)
- `GET /api/payfast/return` - Success redirect
- `GET /api/payfast/cancel` - Cancel redirect
- `GET /api/payfast/subscription/:id` - Get subscription details
- `POST /api/payfast/cancel-subscription` - Cancel subscription

## Environment Variables

### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=3006
API_URL=http://localhost:3006

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CloudConvert
CLOUDCONVERT_API_KEY=<api_key>
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=<secret>
JWT_EXPIRATION=7d

# PayFast (Multi-Currency - USD)
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3006
```

## Common Commands

### Backend Development
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start dev server with tsx watch
npm run build            # Build TypeScript
npm start                # Run production build
```

### Frontend Development
```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # Lint code
```

### Database Management
```bash
# Reset conversion quota for user
node -e "const {Sequelize} = require('sequelize'); const db = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {host: 'localhost', port: 3306, dialect: 'mysql', logging: false}); db.query('UPDATE users SET conversions_used = 0 WHERE email = \"test@example.com\"').then(() => process.exit(0));"
```

## Testing Credentials

**Test User:**
- Email: testuser@pdflab.com
- Password: TestPass123!
- JWT Token: Available after login via POST /api/auth/login

**Test Files:**
- test-sample.pdf (13KB from w3.org)
- Located in project root

## Key Implementation Details

### 1. CloudConvert Integration
- **Service**: `backend/src/services/cloudconvert.service.ts`
- **Job Worker**: `backend/src/jobs/conversion.job.ts`
- **Flow**: Upload → CloudConvert job → Export → Download via HTTPS
- **Note**: SDK download method not available, use native https.get()

### 2. PayFast Integration
- **Service**: `backend/src/services/payfast.service.ts`
- **Signature**: MD5 hash with optional passphrase
- **ITN Validation**: Host check → Signature → Server verification
- **Subscription Flow**: Initialize → PayFast payment → ITN → Activate

### 3. Authentication Flow
- **Context**: `contexts/AuthContext.tsx`
- **API Client**: `lib/api.ts`
- **Token Storage**: localStorage.authToken
- **Session Check**: On mount via GET /api/auth/profile
- **Hooks**: useRequireAuth(), useGuestOnly()

### 4. File Upload Pipeline
- **Middleware**: `backend/src/middleware/upload.middleware.ts`
- **Storage**: `backend/storage/uploads/{user_id}/{job_id}/{filename}`
- **Validation**: File type, size (plan-based), quota check
- **Queue**: Bull job added to Redis, processed by workers

## Design System

### Colors (OKLCH)
- **Primary**: oklch(0.72 0.15 250) - Purple/blue
- **Background**: oklch(0.98 0.01 250) - Light
- **Foreground**: oklch(0.15 0.01 250) - Dark text

### Glassmorphism Classes
- `.glass-strong` - Strong blur with border
- `.glass-subtle` - Subtle transparency
- Used throughout UI for modern aesthetic

## Troubleshooting

### Backend Won't Start
1. Check MySQL container: `docker ps | grep pdflab-mysql`
2. Check Redis container: `docker ps | grep pdflab-redis`
3. Verify port 3006 is free: `netstat -ano | findstr :3006`
4. Check .env file exists with correct values

### CloudConvert Errors
- **401 Unauthorized**: Restart server to reload .env (tsx doesn't auto-reload)
- **Quota Exceeded**: Reset user quota in database
- **Sandbox Mode**: Set CLOUDCONVERT_SANDBOX=false for production API

### Payment Not Working
- Verify PayFast credentials in .env
- Check ITN webhook URL is accessible (ngrok for local dev)
- Review payment_logs table for error details

### Frontend Not Connecting
- Verify NEXT_PUBLIC_API_URL in .env.local
- Check CORS_ORIGIN in backend .env includes frontend URL
- Inspect Network tab for failed requests

## Security Notes

- **Passwords**: Bcrypt hashed with salt rounds = 10
- **JWT**: HS256 algorithm, 7-day expiration
- **File Uploads**: Validated by MIME type and extension
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **PayFast**: 3-step ITN validation (host + signature + server)

## Documentation Organization

**IMPORTANT**: All project documentation has been organized into the `docs/` folder. See [docs/README.md](docs/README.md) for complete documentation index.

**Quick Links**:
- Architecture: [docs/architecture/](docs/architecture/)
- API Reference: [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md)
- Deployment: [docs/deployment/](docs/deployment/)
- Payment Integration: [docs/payment/](docs/payment/)
- Admin Panel: [docs/admin/](docs/admin/)

## Recent Updates

### November 2025
- ✅ **2025-11-12**: **ROADMAP CORRECTION** - Removed Stripe from Phase 2 (PayFast already supports USD) ([ROADMAP_CORRECTION_NOV12.md](ROADMAP_CORRECTION_NOV12.md))
- ✅ **2025-11-12**: **PHASE 1 COMPLETE (Backend + Frontend)** - Email service, refresh tokens (15min + auto-refresh), database sync ([Backend](PHASE_1_IMPLEMENTATION_COMPLETE.md) | [Frontend](PHASE_1_FRONTEND_INTEGRATION_COMPLETE.md))
- ✅ **2025-11-12**: **COMPREHENSIVE CODEBASE REVIEW COMPLETED** - Full architecture audit and documentation update
- ✅ **2025-11-12**: **FEEDBACK SYSTEM IMPLEMENTED** - Real-time user feedback collection with glassmorphism UI
- ✅ **2025-11-10**: **BETA USER SYSTEM DEPLOYED** - 60-day beta trials with application workflow
- ✅ **2025-11-10**: **BETA EXPIRATION TIMER ADDED** - Smart countdown with 4 urgency levels
- ✅ **2025-11-09**: **BATCH PROCESSING FEATURE** - Process multiple PDFs simultaneously with ZIP download
- ✅ **2025-11-08**: **SENTRY MONITORING INTEGRATED** - Error tracking and performance profiling
- ✅ **2025-11-06**: **PDF COMPRESSION FEATURE** - Compress PDFs with 3 levels (good/recommended/extreme)
- ✅ **2025-11-06**: Documentation organized into docs/ folder structure
- ✅ **2025-11-06**: Dual-currency system clarified and documented
- ✅ **2025-11-05**: **PRODUCTION DEPLOYMENT COMPLETED** - Live at https://pdflab.pro
- ✅ **2025-11-05**: VPS deployment (141.136.44.168) completed and verified
- ✅ **2025-11-04**: Admin panel integration successful
- ✅ **2025-11-03**: Error messaging improvements implemented

### October 2025
- ✅ **2025-10-30**: CloudConvert integration stabilized with enhanced OCR
- ✅ **2025-10-29**: PayFast payment gateway integrated with multi-currency support (USD)
- ✅ Authentication integration complete (login/signup)
- ✅ PDF merge functionality implemented
- ✅ Frontend-backend API integration complete

## New Features (v1.2.0 - Beta Launch)

### Batch Processing
- **Multi-file operations**: Convert, compress, or merge up to 50 files (plan-dependent)
- **Progress tracking**: Real-time progress for each file in batch
- **ZIP download**: All processed files packaged in single ZIP
- **Status management**: Track overall batch status (pending, processing, completed, partial, failed)
- **API**: `/api/batch/*` endpoints

### Beta User System
- **Application workflow**: Users apply via `/beta` page with use case details
- **Admin review**: Approve/reject applications via `/admin/beta-users`
- **Auto-provisioning**: Approved users get instant access to Starter or Pro plans
- **60-day trial**: Beta access expires automatically after 60 days
- **Expiration timer**: Smart countdown widget with dismissible notifications
- **Database**: `beta_applications` table, `is_beta_user` + `beta_expires_at` columns in users

### Feedback System
- **Floating widget**: Teal-bordered feedback bubble (bottom-right)
- **Glassmorphism UI**: Consistent with design system
- **Guest + authenticated**: Both user types can submit feedback
- **4 types**: Bug reports, feature requests, general feedback, other
- **Auto-capture**: Page URL and user agent automatically recorded
- **Admin dashboard**: View, filter, reply, and manage all feedback at `/admin/feedback`
- **Status tracking**: New → in progress → resolved/dismissed
- **Database**: `feedback` table with full audit trail

### Enhanced OCR
- **Force OCR mode**: All conversions now use `ocr_mode: 'force'`
- **Better text extraction**: Scanned PDFs → editable text
- **Table detection**: XLSX conversions auto-detect table structures
- **High quality**: 300 DPI for image conversions
- **Layout preservation**: Maintains original document formatting

### Sentry Monitoring
- **Error tracking**: Real-time error capture and reporting
- **Performance monitoring**: 10% sample rate in production
- **Data sanitization**: PII automatically removed from reports
- **Custom events**: Test routes for validation
- **Integration**: Backend + frontend monitoring

## Known Issues

- Server requires restart after .env changes (tsx watch limitation)
- XLSX conversion fails on PDFs without table data (expected behavior)
- PayFast ITN testing requires public webhook URL (use ngrok for local)
- Database sync disabled due to "too many keys" error (manual migrations required)
- Email service configured but not yet active (SMTP setup pending)

## Product Roadmap (v1.3.0+)

**Detailed Analysis**: See [ROADMAP_ANALYSIS_V1.3.0.md](ROADMAP_ANALYSIS_V1.3.0.md) for complete roadmap with revenue projections and priority matrix.

### Completed Features (v1.0.0 - v1.2.0)
- [x] Core PDF conversion (PPTX, DOCX, XLSX, PNG)
- [x] PDF merging and compression
- [x] PayFast payment integration (USD)
- [x] Authentication and authorization (5-tier RBAC)
- [x] Admin panel with user management
- [x] Batch conversion processing (v1.2.0)
- [x] Beta user system with 60-day trials (v1.2.0)
- [x] Feedback collection system (v1.2.0)
- [x] Sentry error monitoring (v1.2.0)

### Phase 1: Production Essentials (Weeks 1-2) ✅ COMPLETE
**Goal**: Fix production blockers and security gaps

- [x] **Email Service Integration** ✅ COMPLETE
  - Welcome emails, password reset, payment receipts
  - SMTP integration via Hostinger (support@pdflab.pro)
  - 5 professional HTML email templates
  - Non-blocking delivery (doesn't break user flows)
- [x] **Refresh Token Mechanism** ✅ COMPLETE (Backend + Frontend)
  - Backend: 15-min access tokens + 30-day refresh tokens
  - Frontend: Automatic token refresh interceptor (lib/api.ts)
  - AuthContext: Stores and manages refresh tokens
  - Session restoration on page load (auto-refresh)
  - Token rotation on every refresh
- [x] **Database Sync Fix** ✅ COMPLETE
  - "Too many keys" error already resolved
  - Using manual migrations (industry best practice)
  - Sync disabled in production (alter: false)

**Implementation Reports**:
- Backend: [PHASE_1_IMPLEMENTATION_COMPLETE.md](PHASE_1_IMPLEMENTATION_COMPLETE.md)
- Frontend: [PHASE_1_FRONTEND_INTEGRATION_COMPLETE.md](PHASE_1_FRONTEND_INTEGRATION_COMPLETE.md)

**Status**: ✅ **PRODUCTION READY** (pending browser testing)
**Impact**: Critical user flows unblocked, security posture improved (99.8% attack window reduction), seamless 30-day sessions

### Phase 2: Revenue Optimization (Weeks 3-5) 💰
**Goal**: Increase conversion rates and reduce churn

- [ ] **User Onboarding Flow** (HIGH - 3x activation rate)
  - Interactive product tour
  - Sample conversion templates
  - Quick-start wizard
  - Email drip campaign (5 emails over 14 days)
- [ ] **Referral Program** (HIGH - 20% user growth)
  - Give 1 month free, Get 1 month free
  - Unique referral codes per user
  - Dashboard tracking
  - Automatic credit application
- [ ] **Usage Analytics Dashboard** (MEDIUM - engagement)
  - Conversions per day/week/month
  - File size trends
  - Most popular formats
  - Export to CSV

**Expected Impact**: $20K MRR → $40K MRR in 3 months

**NOTE**: ~~Stripe Integration~~ - **REMOVED FROM ROADMAP**. PayFast is already implemented with full USD support (multi-currency enabled). No need for Stripe unless expanding to EUR/GBP.

### Phase 3: Feature Expansion (Weeks 6-10) 📊
**Goal**: Increase user engagement and retention

- [ ] **API Access (Phase 1)** (HIGH - enterprise unlock)
  - REST API with JWT authentication
  - 10,000 requests/month on Enterprise plan
  - API key management in dashboard
  - Basic webhook support (job completion)
- [ ] **Basic PDF Editor** (MEDIUM - competitive parity)
  - Add/remove pages
  - Rotate pages
  - Reorder pages
  - Split PDF by page range

**Expected Impact**: 30% increase in user engagement, unlock Enterprise tier

### Phase 4: Growth Channels (Weeks 11-14) 🚀
**Goal**: Expand user acquisition and platform reach

- [ ] **Chrome Extension** (MEDIUM - 50K new users)
  - Right-click PDF → Convert
  - Drag-and-drop to extension icon
  - OAuth integration with pdflab.pro account
- [ ] **Progressive Web App** (LOW)
  - Installable on mobile
  - Offline conversion queue
  - Push notifications for job completion
- [ ] **Conversion Templates** (LOW)
  - Pre-configured conversion settings
  - Industry-specific templates (legal, education, business)
  - Community template sharing

**Expected Impact**: 2x user acquisition rate via Chrome Web Store

### Phase 5: Enterprise & Scalability (Weeks 15-18) 🏢
**Goal**: Unlock B2B revenue and platform stability

- [ ] **API Access (Phase 2/3)** (HIGH - B2B revenue)
  - Webhook configurability (custom URLs)
  - Batch API endpoints
  - 100,000+ requests/month for custom plans
  - SLA guarantees (99.9% uptime)
- [ ] **Zapier Integration** (MEDIUM - 10K+ integrations)
  - Triggers: Conversion complete, Payment received
  - Actions: Convert PDF, Merge PDFs
  - Pre-built templates (Google Drive → PDF → Dropbox)
- [ ] **Team Collaboration** (LOW - future revenue)
  - Shared workspaces
  - Team billing
  - Role-based access (viewer, editor, admin)
- [ ] **White-label Solution** (LOW - B2B opportunity)
  - Custom branding
  - Custom domain
  - API-first architecture
  - $999/month starting price

**Expected Impact**: $60K MRR → $140K MRR in 6 months, unlock enterprise contracts

---

---

## Lessons Learned (Week of Nov 24 - Dec 1, 2025)

This section documents critical lessons from development work. Review before starting new features.

### 1. Next.js 14 Static Generation

**Problem**: Build failures with `useSearchParams()` and `useContext()` hooks.

**Solution Pattern**:
```tsx
// page.tsx (Server Component)
import { Suspense } from "react"
import ClientComponent from "./ClientComponent"

export const dynamic = 'force-dynamic'  // REQUIRED

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ClientComponent />
    </Suspense>
  )
}

// ClientComponent.tsx (Client Component)
"use client"
import { useSearchParams } from 'next/navigation'
// Now safe to use hooks
```

**Pages Affected**: `/beta`, `/get-started`, `/verify-email`, `/reset-password`, `/payment/*`, `/auth/callback`

### 2. Product Tour (react-joyride)

**Common Mistakes**:
- Using CSS selectors (`.class-name`) - unreliable with Next.js
- Placing IDs on wrapper divs instead of actual target components
- Using async/await in callbacks (causes re-renders → auto-advance)

**Correct Pattern**:
```tsx
// Place ID directly on the component to highlight
<Card id="tour-upload-area">...</Card>

// Tour step
{
  target: '#tour-upload-area',  // Explicit ID
  spotlightClicks: false,       // Prevent accidental clicks
}

// Fire-and-forget callback (no await)
callback: (data) => {
  updateProgress(...).catch(console.error)  // Don't await
}
```

### 3. Nginx Proxy Configuration

**Critical Bug Found**: Rewrite rules can break API routing.

```nginx
# WRONG - strips /api prefix, causes 404s
location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://localhost:3006;
}

# CORRECT - preserves path
location /api/ {
    proxy_pass http://localhost:3006;
}
```

**Debugging Steps**:
1. Test directly: `curl http://localhost:3006/api/...`
2. Test through nginx: `curl https://pdflab.pro/api/...`
3. Compare responses

### 4. Token System Security

**Token TTLs**:
| Token Type | TTL | Storage |
|------------|-----|---------|
| Access Token | 15 minutes | localStorage |
| Refresh Token | 30 days | localStorage (hashed server-side) |
| Password Reset | 1 hour | URL parameter |

**Security Checklist**:
- [x] Tokens only in Authorization header (not URL params)
- [x] Generic error messages ("Invalid credentials" for both wrong password AND non-existent user)
- [x] Rate limiting on auth endpoints (5 attempts/15 min)
- [x] Refresh tokens hashed server-side

### 5. Rate Limiting Gotchas

**Problem**: Tests fail with "Too many authentication attempts"

**Solution**: Rate limiter uses in-memory storage. Restart backend to clear:
```bash
docker restart pdflab-backend-prod
```

**Configuration** (backend/src/middleware/ratelimit.middleware.ts):
- Production: 5 attempts/15 min (with `skipSuccessfulRequests: true`)
- Development: 1000 attempts (effectively unlimited)

### 6. MySQL Identifier Limits

**Problem**: Index name exceeds 64-character limit.

**Solution**: Always specify explicit short index names:
```typescript
@Table({
  indexes: [
    {
      name: 'onboard_user_step_unique',  // Max 64 chars
      unique: true,
      fields: ['user_id', 'step_type']
    }
  ]
})
```

### 7. Docker Environment Variables

**Problem**: `NEXT_PUBLIC_*` variables not working in production.

**Root Cause**: These are baked into the JS bundle at BUILD time, not runtime.

**Solution**:
```dockerfile
# Dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build command
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.pdflab.pro ...
```

### 8. Google OAuth Graceful Degradation

**Problem**: Backend crashes when OAuth credentials not configured.

**Solution**: Check and return 503:
```typescript
const requireGoogleOAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'OAuth not configured',
      message: 'Google authentication is not available'
    })
  }
  next()
}
```

### 9. Password Reset Flow

**Complete Flow**:
1. `POST /api/auth/forgot-password` → generates JWT with `type: 'password_reset'`
2. Email sent with link: `${FRONTEND_URL}/reset-password?token=${jwt}`
3. User visits link, frontend extracts token
4. `POST /api/auth/reset-password` with token and new password
5. Redirect to login

**Critical Config**:
- `FRONTEND_URL` env var must match actual domain
- `JWT_SECRET` must be consistent across services

### 10. Admin Panel Quota Sync

**Problem**: Changing user plan doesn't update quota limits.

**Solution**: Auto-calculate quota from plan (don't expose in UI):
```typescript
const quotaLimits = {
  free: 3,
  starter: 50,
  pro: 200,
  enterprise: 1000,
  founder: 1000
}

await user.update({
  plan,
  conversions_limit: quotaLimits[plan]  // Auto-sync
})
```

### 11. Progress Bar State Bug

**Problem**: Users click Convert but see no feedback.

**Root Cause**: `isProcessing: true` was never set.

**Fix**:
```typescript
const startProgressAnimation = () => {
  setProgress({
    isProcessing: true,  // REQUIRED for UI to show
    stage: 'uploading',
    ...
  })
}
```

### 12. Founder's Edition System

**Challenge Rules**:
- 100 spots cap (real scarcity)
- 14-day probation period
- Requirements: 10+ conversions AND feedback submitted
- Success: Permanent lifetime Pro access
- Failure: Downgrade to free tier

**Database Fields on User**:
```typescript
founder_status: 'none' | 'active' | 'earned' | 'expired'
founder_deadline: Date
founder_feedback_submitted: boolean
founder_conversions_count: number
```

---

**Last Updated**: 2025-12-01
**Project Status**: Production (Phase 2 In Progress)
**Current Version**: 1.4.0 (Founder's Edition)
**Production URL**: https://pdflab.pro
**Phase 1 Report**: See [PHASE_1_IMPLEMENTATION_COMPLETE.md](PHASE_1_IMPLEMENTATION_COMPLETE.md)
**Comprehensive Review**: See [COMPREHENSIVE_CODEBASE_REVIEW_2025-11-12.md](COMPREHENSIVE_CODEBASE_REVIEW_2025-11-12.md)
**Documentation**: See [docs/README.md](docs/README.md) for complete index
