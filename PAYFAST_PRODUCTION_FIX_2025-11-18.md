# PayFast Production Mode Fix - November 18, 2025

**Date**: 2025-11-18 22:15 EET
**Status**: ⚠️ **CRITICAL ISSUE FOUND**
**Severity**: HIGH - Payment system not configured

---

## Issue Summary

**Problem**: PayFast is NOT configured in production
- Environment variables for PayFast are **NOT SET** in production container
- PayFast defaults to **SANDBOX mode** when env vars are missing
- This means all payment attempts would go to PayFast sandbox (test mode) instead of production

**Impact**:
- ❌ Real payment processing is **NOT WORKING**
- ❌ Users cannot purchase subscriptions
- ❌ Revenue collection is impossible
- ⚠️ Any payment attempts would fail or go to sandbox

---

## Root Cause Analysis

### Current Production Container Environment

**Missing Environment Variables**:
```bash
# PayFast Configuration - ALL MISSING
PAYFAST_MERCHANT_ID       ❌ NOT SET (defaults to '')
PAYFAST_MERCHANT_KEY      ❌ NOT SET (defaults to '')
PAYFAST_PASSPHRASE        ❌ NOT SET (defaults to '')
PAYFAST_MODE              ❌ NOT SET (defaults to 'sandbox')

# Also Missing:
CLOUDCONVERT_API_KEY      ❌ NOT SET
SMTP_HOST                 ❌ NOT SET
SMTP_USER                 ❌ NOT SET
SMTP_PASS                 ❌ NOT SET
SENTRY_DSN                ❌ NOT SET
```

**PayFast Service Defaults** (from `payfast.service.ts`):
```typescript
const PAYFAST_CONFIG = {
  merchantId: process.env.PAYFAST_MERCHANT_ID || '',          // ❌ Empty
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',        // ❌ Empty
  passphrase: process.env.PAYFAST_PASSPHRASE || '',           // ❌ Empty
  mode: process.env.PAYFAST_MODE || 'sandbox',                // ❌ SANDBOX!
  apiUrl: process.env.PAYFAST_MODE === 'production'
    ? 'https://www.payfast.co.za'
    : 'https://sandbox.payfast.co.za'                         // ❌ SANDBOX URL!
}
```

**Result**: All payment requests go to `https://sandbox.payfast.co.za` instead of production.

---

## Production Credentials (from CLAUDE.md)

### PayFast Production Credentials
```bash
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=                    # Empty (production uses no passphrase)
PAYFAST_MODE=production
```

### URLs for Production
```bash
PAYFAST_ITN_URL=https://pdflab.pro/api/payfast/webhook
PAYFAST_RETURN_URL=https://pdflab.pro/payment/success
PAYFAST_CANCEL_URL=https://pdflab.pro/payment/cancel
```

**Note**: Passphrase is EMPTY for production mode. PayFast only uses passphrase in sandbox mode for testing.

---

## Required Action

### 1. Stop Current Backend Container
```bash
ssh root@141.136.44.168
docker stop pdflab-backend-prod
docker rm pdflab-backend-prod
```

### 2. Start New Container with PayFast Configuration
```bash
docker run -d \
  --name pdflab-backend-prod \
  --network app_pdflab-network \
  -p 3006:3006 \
  --restart unless-stopped \
  \
  # Database
  -e DB_HOST=57d5d601930a_pdflab-mysql-prod \
  -e DB_NAME=pdflab_production \
  -e DB_USER=pdflab \
  -e DB_PASSWORD=***REMOVED*** \
  -e DB_PORT=3306 \
  \
  # Redis
  -e REDIS_HOST=54dfd3ac119a_pdflab-redis-prod \
  -e REDIS_PORT=6379 \
  \
  # Application
  -e NODE_ENV=production \
  -e PORT=3006 \
  -e FRONTEND_URL=https://pdflab.pro \
  -e CORS_ORIGIN=https://pdflab.pro,https://www.pdflab.pro \
  \
  # JWT
  -e JWT_SECRET=pT1o+3SCnI5t9xsnGpd1XNc0UKTO2hedd6tQRRHzXsS4PCjKXhbGODUEaYlVBEpPNw7vGU1tyM56uRzyUgOiew== \
  -e JWT_EXPIRATION=15m \
  -e JWT_REFRESH_EXPIRATION=30d \
  \
  # Google OAuth
  -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
  -e GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback \
  \
  # LinkedIn OAuth
  -e LINKEDIN_CLIENT_ID=disabled \
  -e LINKEDIN_CLIENT_SECRET=disabled \
  \
  # PayFast PRODUCTION (NEW - CRITICAL)
  -e PAYFAST_MERCHANT_ID=25263515 \
  -e PAYFAST_MERCHANT_KEY=***REMOVED*** \
  -e PAYFAST_PASSPHRASE= \
  -e PAYFAST_MODE=production \
  -e PAYFAST_ITN_URL=https://pdflab.pro/api/payfast/webhook \
  -e PAYFAST_RETURN_URL=https://pdflab.pro/payment/success \
  -e PAYFAST_CANCEL_URL=https://pdflab.pro/payment/cancel \
  \
  # CloudConvert (NEEDS TO BE ADDED)
  -e CLOUDCONVERT_API_KEY=<YOUR_CLOUDCONVERT_API_KEY> \
  -e CLOUDCONVERT_SANDBOX=false \
  \
  # SMTP Email (NEEDS TO BE ADDED)
  -e SMTP_HOST=smtp.hostinger.com \
  -e SMTP_PORT=587 \
  -e SMTP_SECURE=false \
  -e SMTP_USER=support@pdflab.pro \
  -e SMTP_PASS=<YOUR_SMTP_PASSWORD> \
  -e SMTP_FROM_NAME=PDFLab \
  -e SMTP_FROM_EMAIL=support@pdflab.pro \
  \
  # Sentry (NEEDS TO BE ADDED)
  -e SENTRY_DSN=<YOUR_SENTRY_DSN> \
  \
  # Health check
  --health-cmd='wget --no-verbose --tries=1 --spider http://localhost:3006/health || exit 1' \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  \
  mkelam/pdflab-backend:latest
```

---

## Verification Steps

### 1. Check PayFast Configuration
```bash
docker exec pdflab-backend-prod node -e "
const config = {
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  mode: process.env.PAYFAST_MODE,
  apiUrl: process.env.PAYFAST_MODE === 'production'
    ? 'https://www.payfast.co.za'
    : 'https://sandbox.payfast.co.za'
};
console.log(JSON.stringify(config, null, 2));
"
```

**Expected Output**:
```json
{
  "merchantId": "25263515",
  "mode": "production",
  "apiUrl": "https://www.payfast.co.za"
}
```

### 2. Test PayFast Endpoint
```bash
curl https://pdflab.pro/api/payfast/plans
```

**Expected**: Should return pricing plans

### 3. Check Backend Logs
```bash
docker logs pdflab-backend-prod | grep -i payfast
```

---

## Security Considerations

### PayFast Passphrase
- **Sandbox**: Uses passphrase `jt7NOE43FZPn`
- **Production**: **NO PASSPHRASE** (empty string)
- **Why**: Production PayFast accounts don't require passphrase for signature generation

### Merchant Credentials
- **Merchant ID**: 25263515 (production account)
- **Merchant Key**: ***REMOVED*** (production key)
- **Mode**: MUST be set to `production` for live payments

---

## Additional Missing Configuration

While fixing PayFast, I discovered other critical services are also missing:

### 1. CloudConvert API ❌
**Impact**: PDF conversion will fail
**Required**: `CLOUDCONVERT_API_KEY` from backend/.env file

### 2. SMTP Email ❌
**Impact**: Welcome emails, password resets not sent
**Required**: SMTP credentials from backend/.env file

### 3. Sentry Monitoring ❌
**Impact**: No error tracking in production
**Required**: `SENTRY_DSN` from backend/.env file

---

## Deployment Priority

### CRITICAL (Deploy Immediately)
1. ✅ **PayFast Production Credentials** - Enable revenue
2. ✅ **CloudConvert API Key** - Enable core functionality

### HIGH (Deploy Soon)
3. ⚠️ **SMTP Configuration** - Enable user communications
4. ⚠️ **Sentry DSN** - Enable error monitoring

---

## Testing Plan

### Before Deployment
- [x] Identify missing PayFast configuration
- [x] Locate production credentials (CLAUDE.md)
- [ ] Prepare deployment command with all env vars

### After Deployment
- [ ] Verify PayFast mode is 'production'
- [ ] Verify PayFast API URL is `https://www.payfast.co.za`
- [ ] Test /api/payfast/plans endpoint
- [ ] Test payment initialization
- [ ] Check backend logs for errors

### End-to-End Payment Test
- [ ] Create test user account
- [ ] Attempt to purchase Starter plan ($9.99)
- [ ] Verify redirect to PayFast **PRODUCTION** (not sandbox)
- [ ] Complete test payment
- [ ] Verify ITN webhook received
- [ ] Verify subscription activated in database

---

## Rollback Procedure

If deployment causes issues:

```bash
# Stop new container
docker stop pdflab-backend-prod
docker rm pdflab-backend-prod

# Start previous container (without PayFast vars)
docker run -d \
  --name pdflab-backend-prod \
  --network app_pdflab-network \
  -p 3006:3006 \
  -e NODE_ENV=production \
  -e DB_HOST=57d5d601930a_pdflab-mysql-prod \
  -e DB_NAME=pdflab_production \
  -e DB_USER=pdflab \
  -e DB_PASSWORD=***REMOVED*** \
  -e REDIS_HOST=54dfd3ac119a_pdflab-redis-prod \
  -e FRONTEND_URL=https://pdflab.pro \
  -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
  -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
  -e JWT_SECRET=pT1o+3SCnI5t9xsnGpd1XNc0UKTO2hedd6tQRRHzXsS4PCjKXhbGODUEaYlVBEpPNw7vGU1tyM56uRzyUgOiew== \
  mkelam/pdflab-backend:latest
```

---

## Status

**Current State**: ❌ PayFast NOT in production mode
**Production Payments**: ❌ NOT WORKING
**Next Action**: Deploy PayFast production credentials to backend container

---

**Report Generated**: 2025-11-18 22:15 EET
**Discovered By**: Claude Code (Production Environment Audit)
**Severity**: CRITICAL - Revenue Collection Blocked
