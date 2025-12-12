# PDFLab Environment Variables Configuration Guide

**Date**: 2025-11-01
**Purpose**: Complete reference for all environment variables in development vs production

---

## 📋 Table of Contents

1. [Backend Environment Variables](#backend-environment-variables)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Docker Environment Variables](#docker-environment-variables)
4. [Security Recommendations](#security-recommendations)
5. [Quick Setup Guides](#quick-setup-guides)

---

## Backend Environment Variables

### File Location
- **Development**: `backend/.env`
- **Production**: `backend/.env.production` or Docker environment
- **Template**: `backend/.env.example`

---

### Server Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **NODE_ENV** | `development` | `production` | ✅ Yes | Node environment mode |
| **PORT** | `3006` | `3006` | ✅ Yes | Backend server port |
| **API_URL** | `http://localhost:3006` | `https://api.pdflab.pro` | ✅ Yes | Public API URL |

**Production Notes**:
- Set `NODE_ENV=production` to enable performance optimizations
- Use HTTPS URL for `API_URL` with SSL certificate

---

### Database Configuration (MySQL)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **DB_HOST** | `localhost` | `mysql` (Docker) or `your-hostinger-host` | ✅ Yes | MySQL server hostname |
| **DB_PORT** | `3306` | `3306` | ✅ Yes | MySQL port |
| **DB_USER** | `pdflab` | `pdflab_prod` | ✅ Yes | Database username |
| **DB_PASSWORD** | `***REMOVED***` | `[STRONG PASSWORD]` | ✅ Yes | Database password |
| **DB_NAME** | `pdflab` | `pdflab_production` | ✅ Yes | Database name |
| **DB_ROOT_PASSWORD** | `rootpassword` | `[STRONG PASSWORD]` | ⚠️ Docker only | MySQL root password (Docker) |

**⚠️ CRITICAL PRODUCTION CHANGES**:
```bash
# Development (INSECURE - local only)
DB_PASSWORD=***REMOVED***

# Production (SECURE - generate strong password)
DB_PASSWORD=$(openssl rand -base64 32)
# Example: 7xKm9P2nQ4vL8jR6wT5yH3gF1dS0aZ9c
```

**Security Requirements**:
- ✅ Minimum 16 characters
- ✅ Mix of uppercase, lowercase, numbers, symbols
- ✅ No common dictionary words
- ✅ Never commit to version control

---

### Redis Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **REDIS_HOST** | `localhost` | `redis` (Docker) or `localhost` | ✅ Yes | Redis server hostname |
| **REDIS_PORT** | `6379` | `6379` | ✅ Yes | Redis port |
| **REDIS_PASSWORD** | *(empty)* | `[STRONG PASSWORD]` | 🟡 Recommended | Redis auth password |

**⚠️ PRODUCTION RECOMMENDATION**:
```bash
# Development (no auth - local only)
REDIS_PASSWORD=

# Production (enable auth - highly recommended)
REDIS_PASSWORD=$(openssl rand -base64 24)
# Example: 8jK4mN9pL2vR6tY3wQ5xZ7c
```

**To enable Redis password in Docker**:
```yaml
# docker-compose.production.yml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
```

---

### CloudConvert API (PDF Processing)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **CLOUDCONVERT_API_KEY** | `eyJ0eXAi...` (test key) | `eyJ0eXAi...` (prod key) | ✅ Yes | CloudConvert API v3 key |
| **CLOUDCONVERT_SANDBOX** | `false` | `false` | ✅ Yes | Use sandbox mode (false = production) |
| **CLOUDCONVERT_WEBHOOK_SECRET** | *(optional)* | `[RANDOM SECRET]` | 🟡 Optional | Webhook signature validation |

**Current API Key**: Valid production key (expires 2155-11-01)
**Scopes**: webhook.*, task.*, user.*, preset.*

**⚠️ IMPORTANT**:
- Same API key can be used for dev and production
- Monitor usage at https://cloudconvert.com/dashboard
- Free tier: 500 minutes/month (approx 1000-2000 conversions)
- Paid tier: $9/month for 1000 minutes (5000+ conversions)

---

### JWT Authentication

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **JWT_SECRET** | `pdflab-super-secret-jwt-key-change-in-production-min-32-chars` | `[RANDOM 64-CHAR STRING]` | ✅ Yes | JWT signing secret |
| **JWT_EXPIRATION** | `7d` | `7d` | ✅ Yes | Access token lifetime |
| **JWT_REFRESH_EXPIRATION** | `30d` | `30d` | ✅ Yes | Refresh token lifetime |

**⚠️ CRITICAL PRODUCTION CHANGES**:
```bash
# Development (INSECURE - predictable secret)
JWT_SECRET=pdflab-super-secret-jwt-key-change-in-production-min-32-chars

# Production (SECURE - cryptographically random)
JWT_SECRET=$(openssl rand -base64 64)
# Example: 9xK2mN4pL7vR1tY6wQ8xZ3c5aS0dF9gH2jK4mN7pL1vR6tY3wQ5xZ8c2aS0dF9gH
```

**Security Requirements**:
- ✅ Minimum 64 characters (256-bit entropy)
- ✅ Cryptographically random (use `openssl rand -base64 64`)
- ✅ Never reuse across environments
- ✅ Rotate every 90 days

---

### PayFast Payment Gateway

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **PAYFAST_MERCHANT_ID** | `25263515` | `25263515` | ✅ Yes | PayFast merchant ID |
| **PAYFAST_MERCHANT_KEY** | `<PAYFAST_MERCHANT_KEY>` | `<PAYFAST_MERCHANT_KEY>` | ✅ Yes | PayFast merchant key |
| **PAYFAST_PASSPHRASE** | *(empty)* | `[STRONG PASSPHRASE]` | 🟡 Recommended | ITN signature passphrase |
| **PAYFAST_MODE** | `production` | `production` | ✅ Yes | PayFast environment (production/sandbox) |

**Current Credentials**: Production PayFast account (USD currency)

**⚠️ PRODUCTION RECOMMENDATION**:
```bash
# Development (no passphrase - basic security)
PAYFAST_PASSPHRASE=

# Production (with passphrase - enhanced security)
PAYFAST_PASSPHRASE=$(openssl rand -base64 24)
# Example: 7jK9mN2pL5vR8tY1wQ4xZ6c
```

**To enable PayFast passphrase**:
1. Login to PayFast dashboard: https://www.payfast.co.za/
2. Settings → Integration → Security Passphrase
3. Enter the generated passphrase
4. Update backend/.env with same value

**ITN (Instant Transaction Notification) URL**:
- Development: `https://your-ngrok-url.ngrok.io/api/payfast/webhook`
- Production: `https://api.pdflab.pro/api/payfast/webhook`

---

### SMTP Email Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **SMTP_HOST** | `smtp.gmail.com` | `smtp.hostinger.com` | ⚠️ If using email | SMTP server hostname |
| **SMTP_PORT** | `587` | `587` | ⚠️ If using email | SMTP port (587=TLS) |
| **SMTP_SECURE** | `false` | `false` | ⚠️ If using email | Use SSL (false for TLS) |
| **SMTP_USER** | `your-email@gmail.com` | `noreply@pdflab.pro` | ⚠️ If using email | SMTP username |
| **SMTP_PASS** | `[GMAIL APP PASSWORD]` | `[EMAIL PASSWORD]` | ⚠️ If using email | SMTP password |
| **SMTP_FROM_NAME** | `PDFLab` | `PDFLab.Pro` | ⚠️ If using email | Email sender name |
| **SMTP_FROM_EMAIL** | `noreply@pdflab.com` | `noreply@pdflab.pro` | ⚠️ If using email | Email sender address |
| **FRONTEND_URL** | `http://localhost:3000` | `https://pdflab.pro` | ⚠️ If using email | Frontend URL (for email links) |

**Status**: 🟡 **Currently disabled in code** (no email sending implemented yet)

**Production Setup (when implementing email)**:
1. Create email account: `noreply@pdflab.pro` in Hostinger
2. Enable SMTP access
3. Configure credentials in .env
4. Test with password reset flow

---

### File Storage

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **STORAGE_PATH** | `./storage` | `/app/storage` (Docker) | ✅ Yes | File upload storage path |

**Docker Volume Mapping**:
- Development: `./backend/storage` → local filesystem
- Production: Docker volume `backend_storage` → persistent storage

---

### File Upload Limits (bytes)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **MAX_FILE_SIZE_FREE** | `10485760` (10MB) | `10485760` (10MB) | ✅ Yes | Free plan limit |
| **MAX_FILE_SIZE_STARTER** | `26214400` (25MB) | `26214400` (25MB) | ✅ Yes | Starter plan limit |
| **MAX_FILE_SIZE_PRO** | `104857600` (100MB) | `104857600` (100MB) | ✅ Yes | Pro plan limit |
| **MAX_FILE_SIZE_ENTERPRISE** | *(not set)* | `524288000` (500MB) | 🟡 Optional | Enterprise plan limit |

**Current Plan Limits**:
- Free: 10MB, 3 conversions/month
- Starter ($9.99/mo): 25MB, 100 conversions/month
- Pro ($29.99/mo): 100MB, unlimited conversions
- Enterprise ($99.99/mo): 500MB, unlimited conversions + API

---

### Conversion Limits

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **CONVERSIONS_LIMIT_FREE** | `3` | `3` | ✅ Yes | Free plan monthly conversions |
| **CONVERSIONS_LIMIT_STARTER** | `100` | `100` | ✅ Yes | Starter plan monthly conversions |
| **CONVERSIONS_LIMIT_PRO** | `-1` (unlimited) | `-1` (unlimited) | ✅ Yes | Pro plan conversions (-1 = unlimited) |
| **CONVERSIONS_LIMIT_ENTERPRISE** | `-1` (unlimited) | `-1` (unlimited) | ✅ Yes | Enterprise conversions (-1 = unlimited) |

---

### CORS Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **CORS_ORIGIN** | `http://localhost:3000,http://localhost:3002` | `https://pdflab.pro,https://www.pdflab.pro` | ✅ Yes | Allowed frontend origins (comma-separated) |

**⚠️ CRITICAL PRODUCTION CHANGES**:
```bash
# Development (multiple local origins)
CORS_ORIGIN=http://localhost:3000,http://localhost:3002

# Production (only production domains)
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro

# Staging (if needed)
CORS_ORIGIN=https://staging.pdflab.pro
```

**Security**: Never use `*` wildcard in production!

---

### Rate Limiting

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **RATE_LIMIT_WINDOW_MS** | `900000` (15 min) | `900000` (15 min) | ✅ Yes | Rate limit time window (ms) |
| **RATE_LIMIT_MAX_REQUESTS** | `100` | `100` | ✅ Yes | Max requests per window |

**Current Settings**: 100 requests per 15 minutes per IP

**Production Tuning Options**:
- **Strict**: 50 requests / 15 minutes (prevent abuse)
- **Standard**: 100 requests / 15 minutes (current)
- **Relaxed**: 200 requests / 15 minutes (high traffic)

---

### Monitoring & Logging (Optional)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **LOG_LEVEL** | `debug` | `info` | 🟡 Optional | Logging verbosity (debug/info/warn/error) |
| **LOG_FILE** | *(console only)* | `/var/log/pdflab/app.log` | 🟡 Optional | Log file path |
| **SENTRY_DSN** | *(disabled)* | `https://...@sentry.io/project-id` | 🟡 Optional | Sentry error tracking DSN |
| **HEALTH_CHECK_TOKEN** | *(disabled)* | `[RANDOM SECRET]` | 🟡 Optional | Health check auth token |

**Status**: 🟡 **Not yet implemented** (future enhancement)

---

## Frontend Environment Variables

### File Location
- **Development**: `.env.local`
- **Production**: Vercel/hosting platform environment variables
- **Template**: `.env.production.example`

---

### Frontend Configuration

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **NEXT_PUBLIC_API_URL** | `http://localhost:3006` | `https://api.pdflab.pro` | ✅ Yes | Backend API base URL |

**⚠️ IMPORTANT**: All frontend environment variables MUST start with `NEXT_PUBLIC_` to be accessible in browser.

---

### Optional Analytics (Not Yet Implemented)

| Variable | Development | Production | Required | Description |
|----------|------------|------------|----------|-------------|
| **NEXT_PUBLIC_GA_ID** | *(disabled)* | `G-XXXXXXXXXX` | ❌ Optional | Google Analytics 4 ID |
| **NEXT_PUBLIC_HOTJAR_ID** | *(disabled)* | `your-hotjar-id` | ❌ Optional | Hotjar tracking ID |
| **NEXT_PUBLIC_SENTRY_DSN** | *(disabled)* | `https://...@sentry.io/...` | ❌ Optional | Sentry DSN (frontend) |

---

## Docker Environment Variables

### File Location
- **Docker Compose**: `docker-compose.production.yml`
- **Environment File**: Create `.env` in project root for Docker Compose

---

### Docker Compose .env File (Production)

Create a file named `.env` in the project root (same folder as `docker-compose.production.yml`):

```bash
# Database
DB_ROOT_PASSWORD=your-strong-root-password-here
DB_NAME=pdflab
DB_USER=pdflab
DB_PASSWORD=your-strong-db-password-here

# CloudConvert
CLOUDCONVERT_API_KEY=<REDACTED>
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your-super-secure-random-64-char-jwt-secret-here-use-openssl-rand-base64-64
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# PayFast
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
PAYFAST_PASSPHRASE=your-optional-passphrase-here
PAYFAST_MODE=production

# CORS
CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro
```

---

## Security Recommendations

### 🔴 CRITICAL (Must Change for Production)

1. **Database Passwords**
   ```bash
   # Generate strong passwords
   DB_PASSWORD=$(openssl rand -base64 32)
   DB_ROOT_PASSWORD=$(openssl rand -base64 32)
   ```

2. **JWT Secret**
   ```bash
   # Generate 64-character secret (256-bit)
   JWT_SECRET=$(openssl rand -base64 64)
   ```

3. **CORS Origin**
   ```bash
   # Only allow production domains
   CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro
   ```

4. **API URL**
   ```bash
   # Use HTTPS with SSL certificate
   API_URL=https://api.pdflab.pro
   ```

### 🟡 RECOMMENDED (Should Change for Production)

5. **Redis Password**
   ```bash
   # Enable Redis authentication
   REDIS_PASSWORD=$(openssl rand -base64 24)
   ```

6. **PayFast Passphrase**
   ```bash
   # Enhanced ITN security
   PAYFAST_PASSPHRASE=$(openssl rand -base64 24)
   ```

7. **Node Environment**
   ```bash
   # Enable production optimizations
   NODE_ENV=production
   ```

### 🔵 OPTIONAL (Future Enhancements)

8. **Email SMTP** - Configure when implementing password reset
9. **Monitoring** - Add Sentry DSN for error tracking
10. **Analytics** - Add Google Analytics or Hotjar

---

## Quick Setup Guides

### Development Setup (Quick Start)

1. **Backend**: Copy existing `.env` (already configured)
   ```bash
   cd backend
   # File already exists: backend/.env
   # No changes needed for local development
   ```

2. **Frontend**: Create `.env.local`
   ```bash
   # Create file: .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3006
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   npm run dev
   ```

---

### Production Setup (Docker)

1. **Create Docker .env file**
   ```bash
   # Create file in project root: .env

   # Generate secure passwords
   DB_ROOT_PASSWORD=$(openssl rand -base64 32)
   DB_PASSWORD=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 64)
   REDIS_PASSWORD=$(openssl rand -base64 24)

   # Add to .env file with other variables
   ```

2. **Build and Deploy**
   ```bash
   # Build Docker image
   cd backend
   docker build -t pdflab-backend:production .

   # Start production stack
   cd ..
   docker-compose -f docker-compose.production.yml up -d

   # Verify all containers healthy
   docker ps
   ```

3. **Initialize Database**
   ```bash
   # Create database tables
   docker exec pdflab-backend-prod node -e "
   const {User, ConversionJob, Subscription, PaymentLog} = require('./dist/models');
   const {sequelize} = require('./dist/config/database');
   sequelize.sync({alter: true}).then(() => {
     console.log('All models synced');
     process.exit(0);
   });
   "
   ```

4. **Test Production Stack**
   ```bash
   # Health check
   curl http://localhost:3006/health

   # Register test user
   curl -X POST http://localhost:3006/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'
   ```

---

### Production Setup (VPS/Hostinger)

1. **Configure VPS Environment**
   ```bash
   # SSH into VPS
   ssh user@your-vps-ip

   # Create .env file
   nano /var/www/pdflab/backend/.env

   # Paste production values (see template above)
   # Save and exit (Ctrl+X, Y, Enter)
   ```

2. **Set Environment Permissions**
   ```bash
   # Secure .env file (only owner can read)
   chmod 600 /var/www/pdflab/backend/.env
   chown www-data:www-data /var/www/pdflab/backend/.env
   ```

3. **Restart Services**
   ```bash
   # If using PM2
   pm2 restart pdflab-backend

   # If using systemd
   systemctl restart pdflab-backend
   ```

---

## Environment Variable Checklist

### Pre-Deployment Checklist

**Backend Environment** (`.env`):
- [ ] `NODE_ENV=production`
- [ ] `PORT=3006`
- [ ] `API_URL=https://api.pdflab.pro`
- [ ] `DB_HOST` configured (mysql or VPS hostname)
- [ ] `DB_PASSWORD` changed (strong password)
- [ ] `DB_ROOT_PASSWORD` changed (Docker only)
- [ ] `REDIS_PASSWORD` configured (recommended)
- [ ] `JWT_SECRET` changed (64+ characters)
- [ ] `CLOUDCONVERT_API_KEY` verified
- [ ] `PAYFAST_MERCHANT_ID` verified
- [ ] `PAYFAST_MERCHANT_KEY` verified
- [ ] `PAYFAST_MODE=production`
- [ ] `CORS_ORIGIN` set to production domains only

**Frontend Environment** (`.env.local` or Vercel):
- [ ] `NEXT_PUBLIC_API_URL=https://api.pdflab.pro`

**Docker Environment** (`.env` in project root):
- [ ] All variables from backend checklist
- [ ] File exists in correct location
- [ ] Permissions set (chmod 600)

**Security Verification**:
- [ ] No passwords committed to Git
- [ ] `.env` files in `.gitignore`
- [ ] Strong passwords used (16+ chars)
- [ ] JWT secret is cryptographically random
- [ ] CORS restricted to production domains
- [ ] HTTPS URLs used for production

---

## Common Issues & Troubleshooting

### Issue: "Database connection failed"
**Solution**: Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` are correct

### Issue: "Redis connection error"
**Solution**:
- Check `REDIS_HOST` and `REDIS_PORT`
- If using password, verify `REDIS_PASSWORD` matches Redis config

### Issue: "CORS error in browser"
**Solution**: Verify `CORS_ORIGIN` includes your frontend URL (with correct protocol: http/https)

### Issue: "JWT token invalid"
**Solution**: Ensure `JWT_SECRET` hasn't changed (changing it invalidates all existing tokens)

### Issue: "CloudConvert unauthorized"
**Solution**:
- Restart backend server (tsx doesn't auto-reload .env changes)
- Verify `CLOUDCONVERT_API_KEY` is correct
- Check API usage at CloudConvert dashboard

### Issue: "PayFast signature mismatch"
**Solution**:
- Verify `PAYFAST_PASSPHRASE` matches PayFast dashboard setting
- Check `PAYFAST_MODE` is correct (production vs sandbox)

---

## Environment Variable Summary

### Total Variables by Category

| Category | Variables | Critical | Recommended | Optional |
|----------|-----------|----------|-------------|----------|
| **Server** | 3 | 3 | 0 | 0 |
| **Database** | 6 | 5 | 0 | 1 |
| **Redis** | 3 | 2 | 1 | 0 |
| **CloudConvert** | 3 | 2 | 0 | 1 |
| **JWT** | 3 | 3 | 0 | 0 |
| **PayFast** | 4 | 3 | 1 | 0 |
| **Email/SMTP** | 8 | 0 | 0 | 8 |
| **Storage** | 1 | 1 | 0 | 0 |
| **File Limits** | 4 | 3 | 0 | 1 |
| **CORS** | 1 | 1 | 0 | 0 |
| **Rate Limiting** | 2 | 2 | 0 | 0 |
| **Monitoring** | 4 | 0 | 0 | 4 |
| **TOTAL** | **42** | **25** | **2** | **15** |

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

---

**Last Updated**: 2025-11-01
**Status**: Complete and verified
**Next Review**: Before production deployment
