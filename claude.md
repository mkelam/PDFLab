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
PAYFAST_MERCHANT_KEY=***REMOVED***
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
- ✅ **2025-11-06**: **PDF COMPRESSION FEATURE ADDED** - Compress PDFs with 3 levels (good/recommended/extreme)
- ✅ **2025-11-06**: Documentation organized into docs/ folder structure
- ✅ **2025-11-06**: Dual-currency system clarified and documented
- ✅ **2025-11-06**: PROJECT_STATUS_AND_ROADMAP.md updated with production deployment info
- ✅ **2025-11-05**: **PRODUCTION DEPLOYMENT COMPLETED** - Live at https://pdflab.pro
- ✅ **2025-11-05**: VPS deployment (141.136.44.168) completed and verified
- ✅ **2025-11-04**: Admin panel integration successful
- ✅ **2025-11-03**: Error messaging improvements implemented

### October 2025
- ✅ **2025-10-30**: CloudConvert integration stabilized
- ✅ **2025-10-29**: PayFast payment gateway integrated with multi-currency support (USD)
- ✅ Authentication integration complete (login/signup)
- ✅ PDF merge functionality implemented
- ✅ Frontend-backend API integration complete

## Known Issues

- Server requires restart after .env changes (tsx watch limitation)
- XLSX conversion fails on PDFs without table data (expected behavior)
- PayFast ITN testing requires public webhook URL (use ngrok for local)

## Future Enhancements

- [ ] Batch conversion processing
- [ ] OCR overlay for Pro+ plans
- [ ] API access for Enterprise users
- [ ] Advanced analytics dashboard
- [ ] Email notifications for job completion
- [ ] Webhook support for API users

---

**Last Updated**: 2025-11-06
**Project Status**: Active Development
**Current Version**: 1.0.0
**Documentation**: See [docs/README.md](docs/README.md) for complete index
