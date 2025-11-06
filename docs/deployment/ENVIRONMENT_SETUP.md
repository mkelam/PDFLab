# PDFLab Environment Setup & Configuration Guide

**Version**: 2.0.0
**Last Updated**: 2025-11-06
**Status**: Complete and Production-Ready

---

## 📋 Quick Navigation

1. [Overview](#overview)
2. [Frontend Environment](#frontend-environment)
3. [Backend Environment](#backend-environment)
4. [Docker Environment](#docker-environment)
5. [Security Best Practices](#security-best-practices)
6. [Quick Setup Guides](#quick-setup-guides)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Problem Solved

Previously, API URLs were hardcoded throughout the codebase with inconsistent port numbers (3006, 3007, 3010, 3015), making it difficult to switch between local and production environments.

### Solution

Centralized configuration using Next.js environment variables with a single source of truth: `lib/api-config.ts`.

---

## Frontend Environment

### Configuration Files

**Development** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3006
```

**Production** (`.env.production`):
```env
NEXT_PUBLIC_API_URL=http://141.136.44.168:3006
# Or with domain:
# NEXT_PUBLIC_API_URL=https://api.pdflab.pro
```

### Centralized API Configuration

**File**: `lib/api-config.ts` - Single source of truth for all API configuration

**Key Exports**:

1. **`API_URL`** - Base API URL
   ```typescript
   import { API_URL } from '@/lib/api-config'
   ```

2. **`API_ENDPOINTS`** - Type-safe endpoint constants
   ```typescript
   import { API_ENDPOINTS } from '@/lib/api-config'

   fetch(API_ENDPOINTS.auth.login, { method: 'POST', ... })
   fetch(API_ENDPOINTS.conversion.status('job-123'))
   fetch(API_ENDPOINTS.admin.users.detail('user-456'))
   ```

3. **Helper Functions**:
   - `getAuthToken()` - Retrieves JWT token from localStorage
   - `createAuthHeaders()` - Creates fetch headers with automatic auth

**Benefits**:
- ✅ Autocomplete for all endpoints
- ✅ Compile-time errors if endpoint changes
- ✅ Single place to update API structure
- ✅ Consistent auth handling

### Files Updated to Use Centralized Config

**Critical Fixes** (Wrong port numbers):

1. **`lib/auth-api.ts`**
   - Before: `http://localhost:3007`
   - After: Uses `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'`

2. **`app/pricing/page.tsx`**
   - Before: `http://localhost:3010`
   - After: Uses `API_URL` constant

3. **`app/admin/users/[id]/page.tsx`**
   - Before: `http://localhost:3015`
   - After: Uses `API_URL` from environment

---

## Backend Environment

### Server Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **NODE_ENV** | `development` | `production` | ✅ Yes | Node environment mode |
| **PORT** | `3006` | `3006` | ✅ Yes | Backend server port |
| **API_URL** | `http://localhost:3006` | `https://api.pdflab.pro` | ✅ Yes | Public API URL |

### Database Configuration (MySQL)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **DB_HOST** | `localhost` | `mysql` (Docker) | ✅ Yes | MySQL hostname |
| **DB_PORT** | `3306` | `3306` | ✅ Yes | MySQL port |
| **DB_USER** | `pdflab` | `pdflab_prod` | ✅ Yes | Database username |
| **DB_PASSWORD** | `***REMOVED***` | `[STRONG PASSWORD]` | ✅ Yes | Database password |
| **DB_NAME** | `pdflab` | `pdflab_production` | ✅ Yes | Database name |
| **DB_ROOT_PASSWORD** | `rootpassword` | `[STRONG PASSWORD]` | ⚠️ Docker only | MySQL root password |

**Generate Strong Passwords**:
```bash
# Development (INSECURE - local only)
DB_PASSWORD=***REMOVED***

# Production (SECURE)
DB_PASSWORD=$(openssl rand -base64 32)
# Example: 7xKm9P2nQ4vL8jR6wT5yH3gF1dS0aZ9c
```

### Redis Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **REDIS_HOST** | `localhost` | `redis` (Docker) | ✅ Yes | Redis hostname |
| **REDIS_PORT** | `6379` | `6379` | ✅ Yes | Redis port |
| **REDIS_PASSWORD** | *(empty)* | `[STRONG PASSWORD]` | 🟡 Recommended | Redis auth password |

**Enable Redis Auth in Production**:
```bash
REDIS_PASSWORD=$(openssl rand -base64 24)
```

### CloudConvert API (PDF Processing)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **CLOUDCONVERT_API_KEY** | `eyJ0eXAi...` | `eyJ0eXAi...` | ✅ Yes | CloudConvert API v3 key |
| **CLOUDCONVERT_SANDBOX** | `false` | `false` | ✅ Yes | Use sandbox mode |

**Current API Key**: Valid production key (expires 2155-11-01)
**Usage**: Free tier 500 minutes/month (~1000-2000 conversions)

### JWT Authentication

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **JWT_SECRET** | `pdflab-super-secret...` | `[RANDOM 64-CHAR]` | ✅ Yes | JWT signing secret |
| **JWT_EXPIRATION** | `7d` | `7d` | ✅ Yes | Access token lifetime |
| **JWT_REFRESH_EXPIRATION** | `30d` | `30d` | ✅ Yes | Refresh token lifetime |

**Generate JWT Secret**:
```bash
# Production (256-bit entropy)
JWT_SECRET=$(openssl rand -base64 64)
```

### PayFast Payment Gateway

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **PAYFAST_MERCHANT_ID** | `25263515` | `25263515` | ✅ Yes | PayFast merchant ID |
| **PAYFAST_MERCHANT_KEY** | `***REMOVED***` | `***REMOVED***` | ✅ Yes | PayFast merchant key |
| **PAYFAST_PASSPHRASE** | *(empty)* | `[PASSPHRASE]` | 🟡 Recommended | ITN signature passphrase |
| **PAYFAST_MODE** | `production` | `production` | ✅ Yes | PayFast environment |

**CRITICAL**: PayFast only accepts ZAR (South African Rands)
- Frontend displays USD ($9.99, $29.99, $99.99)
- Backend sends ZAR to PayFast (R185, R555, R1850)

**ITN URL**:
- Development: `https://your-ngrok-url.ngrok.io/api/payfast/webhook`
- Production: `https://api.pdflab.pro/api/payfast/webhook`

### File Storage & Limits

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **STORAGE_PATH** | `./storage` | `/app/storage` | ✅ Yes | File storage path |
| **MAX_FILE_SIZE** | `524288000` (500MB) | `524288000` (500MB) | ✅ Yes | Max file size |

**Plan Limits**:
- Free: 10MB, 3 conversions/month
- Starter: 25MB, 100 conversions/month
- Pro: 100MB, unlimited conversions
- Enterprise: 500MB, unlimited conversions

### CORS Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **CORS_ORIGIN** | `http://localhost:3000` | `https://pdflab.pro` | ✅ Yes | Allowed origins |

**Examples**:
```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://localhost:3002

# Production
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro

# ⚠️ NEVER use * wildcard in production!
```

### Rate Limiting

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **RATE_LIMIT_WINDOW_MS** | `900000` | `900000` | ✅ Yes | Time window (15 min) |
| **RATE_LIMIT_MAX_REQUESTS** | `100` | `100` | ✅ Yes | Max requests per window |

**Current**: 100 requests per 15 minutes per IP

---

## Docker Environment

### Docker Compose .env File

Create `.env` in project root (same folder as `docker-compose.production.yml`):

```bash
# Database
DB_ROOT_PASSWORD=your-strong-root-password-here
DB_NAME=pdflab_production
DB_USER=pdflab
DB_PASSWORD=your-strong-db-password-here

# CloudConvert
CLOUDCONVERT_API_KEY=your-cloudconvert-api-key
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your-super-secure-random-64-char-jwt-secret
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# PayFast
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production

# CORS
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro

# Storage
STORAGE_PATH=/app/storage
MAX_FILE_SIZE=524288000
```

---

## Security Best Practices

### 🔴 CRITICAL (Must Change for Production)

1. **Database Passwords**
   ```bash
   DB_PASSWORD=$(openssl rand -base64 32)
   DB_ROOT_PASSWORD=$(openssl rand -base64 32)
   ```

2. **JWT Secret**
   ```bash
   JWT_SECRET=$(openssl rand -base64 64)
   ```

3. **CORS Origin**
   ```bash
   CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro
   ```

4. **API URL**
   ```bash
   API_URL=https://api.pdflab.pro
   ```

### 🟡 RECOMMENDED (Should Change for Production)

5. **Redis Password**
   ```bash
   REDIS_PASSWORD=$(openssl rand -base64 24)
   ```

6. **PayFast Passphrase**
   ```bash
   PAYFAST_PASSPHRASE=$(openssl rand -base64 24)
   ```

7. **Node Environment**
   ```bash
   NODE_ENV=production
   ```

### Security Checklist

**Backend Environment**:
- [ ] `NODE_ENV=production`
- [ ] `DB_PASSWORD` changed (strong password)
- [ ] `DB_ROOT_PASSWORD` changed (Docker)
- [ ] `JWT_SECRET` changed (64+ characters)
- [ ] `REDIS_PASSWORD` configured (recommended)
- [ ] `PAYFAST_MODE=production`
- [ ] `CORS_ORIGIN` set to production domains only
- [ ] `API_URL` uses HTTPS

**Frontend Environment**:
- [ ] `NEXT_PUBLIC_API_URL` uses HTTPS

**General Security**:
- [ ] No passwords committed to Git
- [ ] `.env` files in `.gitignore`
- [ ] Strong passwords (16+ characters)
- [ ] Cryptographically random secrets
- [ ] File permissions set (chmod 600)

---

## Quick Setup Guides

### Development Setup

1. **Backend**:
   ```bash
   cd backend
   # File already exists: backend/.env
   # No changes needed for local development
   ```

2. **Frontend**:
   ```bash
   # Create .env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:3006" > .env.local
   ```

3. **Start Servers**:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   npm run dev
   ```

### Production Setup (Docker)

1. **Generate Secure Passwords**:
   ```bash
   # Create .env file in project root
   cat > .env << EOF
   DB_ROOT_PASSWORD=$(openssl rand -base64 32)
   DB_PASSWORD=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 64)
   REDIS_PASSWORD=$(openssl rand -base64 24)
   CLOUDCONVERT_API_KEY=your-api-key
   PAYFAST_MERCHANT_ID=25263515
   PAYFAST_MERCHANT_KEY=***REMOVED***
   PAYFAST_MODE=production
   CORS_ORIGIN=https://pdflab.pro
   EOF
   ```

2. **Build and Deploy**:
   ```bash
   docker compose -f docker-compose.production.yml up -d
   ```

3. **Verify**:
   ```bash
   docker ps
   curl http://localhost:3006/api/health
   ```

### Production Setup (VPS)

1. **Configure Environment**:
   ```bash
   ssh user@your-vps-ip
   nano /var/pdflab/app/backend/.env.production
   # Paste production values
   ```

2. **Set Permissions**:
   ```bash
   chmod 600 /var/pdflab/app/backend/.env.production
   ```

3. **Restart Services**:
   ```bash
   docker compose -f docker-compose.production.yml restart
   ```

---

## Troubleshooting

### Database Connection Failed

**Solution**: Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

```bash
# Test connection
docker exec -it pdflab-mysql-prod mysql -uroot -p
```

### Redis Connection Error

**Solution**: Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

```bash
# Test connection
docker exec -it pdflab-redis-prod redis-cli PING
```

### CORS Error in Browser

**Solution**: Verify `CORS_ORIGIN` includes frontend URL with correct protocol

```bash
# Check CORS configuration
docker exec pdflab-backend-prod env | grep CORS
```

### JWT Token Invalid

**Solution**: Ensure `JWT_SECRET` hasn't changed (changing it invalidates all tokens)

### CloudConvert Unauthorized

**Solution**:
- Restart backend (tsx doesn't auto-reload .env)
- Verify `CLOUDCONVERT_API_KEY`
- Check API usage at CloudConvert dashboard

### PayFast Signature Mismatch

**Solution**:
- Verify `PAYFAST_PASSPHRASE` matches dashboard
- Check `PAYFAST_MODE` is correct

---

## Environment Variable Summary

### Variables That MUST Change for Production

1. ✅ `NODE_ENV` → `production`
2. ✅ `API_URL` → `https://api.pdflab.pro`
3. ✅ `DB_HOST` → VPS hostname or `mysql` (Docker)
4. ✅ `DB_PASSWORD` → Strong random password
5. ✅ `DB_ROOT_PASSWORD` → Strong random password (Docker)
6. ✅ `JWT_SECRET` → 64-character random string
7. ✅ `CORS_ORIGIN` → Production domains only
8. 🟡 `REDIS_PASSWORD` → Random password (recommended)
9. 🟡 `PAYFAST_PASSPHRASE` → Random passphrase (recommended)

### Total Variables by Category

| Category | Total | Critical | Recommended | Optional |
|----------|-------|----------|-------------|----------|
| **Server** | 3 | 3 | 0 | 0 |
| **Database** | 6 | 5 | 0 | 1 |
| **Redis** | 3 | 2 | 1 | 0 |
| **CloudConvert** | 3 | 2 | 0 | 1 |
| **JWT** | 3 | 3 | 0 | 0 |
| **PayFast** | 4 | 3 | 1 | 0 |
| **Storage** | 2 | 2 | 0 | 0 |
| **CORS** | 1 | 1 | 0 | 0 |
| **Rate Limiting** | 2 | 2 | 0 | 0 |
| **TOTAL** | **27** | **23** | **2** | **2** |

---

**Status**: Production Ready ✅
**Last Review**: 2025-11-06
**Next Review**: Before major deployment changes
