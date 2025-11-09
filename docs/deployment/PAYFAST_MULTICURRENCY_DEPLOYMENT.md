# PayFast Multi-Currency Deployment Guide

**Date**: November 8, 2025
**Update**: Backend code changes for PayFast multi-currency
**Production URL**: https://pdflab.pro
**VPS**: 141.136.44.168 (Hostinger)

---

## Overview

This guide explains how to deploy the PayFast multi-currency updates to production. The changes remove manual ZAR conversion and send USD amounts directly to PayFast.

### What Changed

**Files Modified**:
- `backend/src/controllers/payfast.controller.ts` - Simplified pricing plans
- Documentation files updated

**Database**: No migration needed (currency already set to USD)

**Frontend**: No changes needed for payment processing (but pricing display needs update later)

---

## Deployment Architecture

### Current Setup

**Local Development**:
- Frontend: `npm run dev` (localhost:3000)
- Backend: `npm run dev` (localhost:3006)

**Production (VPS)**:
- Frontend: Docker container (`mkelam/pdflab-frontend:latest`)
- Backend: Docker container (`mkelam/pdflab-backend:latest`)
- Database: MySQL Docker container
- Redis: Redis Docker container
- Web Server: Nginx (reverse proxy)
- SSL: Let's Encrypt

**Deployment Method**: **Docker Images** (not direct code injection)

---

## Why Rebuild Images? (Not Code Injection)

You **cannot** inject code into running Docker containers because:

1. **Immutable Infrastructure**: Docker follows immutable principles
2. **Image-based Deployment**: VPS pulls pre-built images from Docker Hub
3. **Changes Lost on Restart**: Any manual changes are lost when container restarts
4. **Version Control**: Images provide proper versioning and rollback

**Correct Approach**: Rebuild → Push → Pull → Restart

---

## Deployment Options

### Option 1: Backend Only (Recommended for This Update) ⚡

**When to Use**: Only backend code changed (this case!)

**Time**: ~3-5 minutes

**Steps**:
1. Build backend Docker image
2. Push to Docker Hub
3. Pull on VPS
4. Restart backend container only

**Command** (Windows):
```batch
deploy-backend-only.bat
```

**Command** (Linux/Mac):
```bash
bash deploy-backend-only.sh
```

---

### Option 2: Full Deployment (Backend + Frontend) 🔄

**When to Use**: Both backend and frontend changed

**Time**: ~8-12 minutes

**Steps**:
1. Build backend Docker image
2. Build frontend Docker image
3. Push both to Docker Hub
4. Pull both on VPS
5. Restart all containers

**Command** (Windows):
```batch
deploy-full.bat
```

**Command** (Linux/Mac):
```bash
bash deploy-full.sh
```

---

## Manual Deployment Steps

If you prefer manual deployment (or scripts fail), follow these steps:

### Step 1: Build Backend Image

```bash
# Navigate to project root
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Build backend image
cd backend
docker build -t mkelam/pdflab-backend:latest -f Dockerfile .
cd ..
```

**Expected Output**:
```
Successfully built <image-id>
Successfully tagged mkelam/pdflab-backend:latest
```

---

### Step 2: Push to Docker Hub

```bash
# Login to Docker Hub (if not already)
docker login

# Push backend image
docker push mkelam/pdflab-backend:latest
```

**Expected Output**:
```
The push refers to repository [docker.io/mkelam/pdflab-backend]
latest: digest: sha256:abc123... size: 1234
```

---

### Step 3: Deploy to VPS

**SSH to VPS**:
```bash
ssh root@141.136.44.168
```

**On VPS, run**:
```bash
# Navigate to project directory
cd /var/www/pdflab

# Pull latest backend image
docker pull mkelam/pdflab-backend:latest

# Recreate backend container only
docker-compose -f docker-compose.production.yml up -d --no-deps --force-recreate backend

# Wait for container to be healthy
sleep 10

# Check status
docker ps | grep pdflab-backend-prod

# View logs
docker logs pdflab-backend-prod --tail 50
```

---

### Step 4: Verify Deployment

**Check Backend Health**:
```bash
curl https://pdflab.pro/api/health
```

**Expected Response**:
```json
{
  "uptime": 12.34,
  "timestamp": 1762604671419,
  "status": "OK",
  "checks": {
    "database": "OK",
    "redis": "OK"
  }
}
```

**Test Pricing API**:
```bash
curl https://pdflab.pro/api/payfast/plans
```

**Expected Response** (verify USD amounts):
```json
{
  "success": true,
  "plans": [
    {
      "id": "starter",
      "price": 9.99,
      "currency": "USD"
    },
    {
      "id": "pro",
      "price": 29.99,
      "currency": "USD"
    },
    {
      "id": "enterprise",
      "price": 99.99,
      "currency": "USD"
    }
  ]
}
```

✅ Look for: `"price": 9.99` (not 185), `"currency": "USD"`

---

## Rollback Procedure

If deployment fails or causes issues, rollback to previous version:

### Quick Rollback

**On VPS**:
```bash
# Pull previous stable image (if tagged)
docker pull mkelam/pdflab-backend:v1.0.0

# Or use a specific digest
docker pull mkelam/pdflab-backend@sha256:abc123...

# Restart with old image
docker-compose -f docker-compose.production.yml up -d --force-recreate backend
```

### Emergency Rollback (No Previous Tag)

If you didn't tag previous version, use git to rebuild:

```bash
# On local machine
git log --oneline  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild old version
cd backend
docker build -t mkelam/pdflab-backend:rollback -f Dockerfile .
docker push mkelam/pdflab-backend:rollback

# On VPS
docker pull mkelam/pdflab-backend:rollback
# Update docker-compose.production.yml to use :rollback tag
docker-compose -f docker-compose.production.yml up -d --force-recreate backend
```

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] ✅ Local testing complete (Playwright tests passed)
- [ ] ✅ Database verified (payment_logs show USD)
- [ ] ✅ Multi-currency enabled in PayFast dashboard
- [ ] ✅ Backed up production database
- [ ] ✅ Docker Hub credentials ready (`docker login`)
- [ ] ✅ SSH access to VPS confirmed (`ssh root@141.136.44.168`)
- [ ] ✅ Low traffic time scheduled (if possible)

---

## Post-Deployment Verification

### 1. Check Backend Health

```bash
curl https://pdflab.pro/api/health
```

Expected: `{"status":"OK"}`

### 2. Verify Pricing API

```bash
curl https://pdflab.pro/api/payfast/plans | jq '.plans[] | {id, price, currency}'
```

Expected Output:
```json
{"id":"free","price":0,"currency":"USD"}
{"id":"starter","price":9.99,"currency":"USD"}
{"id":"pro","price":29.99,"currency":"USD"}
{"id":"enterprise","price":99.99,"currency":"USD"}
```

### 3. Test Payment Initialization

**Login and get token**:
```bash
TOKEN=$(curl -s -X POST https://pdflab.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-user@example.com","password":"YourPassword"}' \
  | jq -r '.token')
```

**Initialize payment**:
```bash
curl -s -X POST https://pdflab.pro/api/payfast/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"plan":"starter","userEmail":"test@example.com","userName":"Test User"}' \
  | jq '.paymentData | {amount, recurring_amount, currency}'
```

Expected:
```json
{
  "amount": "9.99",
  "recurring_amount": "9.99"
}
```

✅ **Critical**: Verify amounts are in USD ($9.99, not R185)

### 4. Check Database

```bash
# On VPS
docker exec -it pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab_production

# In MySQL
SELECT plan, amount_gross, currency, created_at
FROM payment_logs
ORDER BY created_at DESC
LIMIT 5;
```

Expected: All `currency` values should be `USD`

### 5. Monitor Logs

```bash
# On VPS
docker logs -f pdflab-backend-prod
```

Watch for:
- ✅ No errors on startup
- ✅ Database connection successful
- ✅ Redis connection successful
- ⚠️ Any PayFast-related errors

---

## Troubleshooting

### Issue: Build Fails

**Error**: `npm install` fails or build errors

**Solution**:
```bash
# Clean build
cd backend
rm -rf node_modules dist
npm install
npm run build
```

---

### Issue: Push to Docker Hub Fails

**Error**: `denied: requested access to the resource is denied`

**Solution**:
```bash
# Login to Docker Hub
docker login

# Use correct username
docker tag pdflab-backend:latest mkelam/pdflab-backend:latest
docker push mkelam/pdflab-backend:latest
```

---

### Issue: Container Won't Start on VPS

**Symptoms**: Container keeps restarting

**Solution**:
```bash
# Check logs
docker logs pdflab-backend-prod

# Common issues:
# 1. Database connection - check DB_HOST in .env.production
# 2. Redis connection - check REDIS_HOST
# 3. Missing .env file - verify /var/www/pdflab/backend/.env.production exists
```

---

### Issue: PayFast Still Shows ZAR

**Symptoms**: Payment still processes in ZAR instead of USD

**Check**:
1. ✅ Multi-currency enabled in PayFast dashboard?
2. ✅ New container deployed (not old one)?
3. ✅ Pricing API returns USD amounts?

**Verify**:
```bash
curl https://pdflab.pro/api/payfast/plans | grep currency
```

Should show: `"currency":"USD"`

---

## Monitoring After Deployment

### First Hour

- [ ] Check backend health every 15 minutes
- [ ] Monitor error logs for PayFast issues
- [ ] Watch for failed payment attempts
- [ ] Verify database writes show USD currency

### First Day

- [ ] Complete at least one test payment
- [ ] Verify ITN webhook processes correctly
- [ ] Check PayFast dashboard for settlement currency
- [ ] Monitor user feedback on pricing confusion (frontend/backend mismatch)

### First Week

- [ ] Review all payment logs for currency consistency
- [ ] Check PayFast settlement reports
- [ ] Gather user feedback on payment flow
- [ ] Consider fixing frontend pricing display

---

## Next Steps After Deployment

### Immediate (Day 1)

1. **Test Real Payment**: Complete one real payment to verify PayFast displays USD
2. **Monitor ITN**: Check webhook logs for USD amounts
3. **User Communication**: Update users about currency display (if needed)

### Short-term (Week 1)

1. **Fix Frontend Pricing**: Update [app/pricing/page.tsx](../../app/pricing/page.tsx) to show $9.99 (not $4.55)
2. **Add Currency Validation**: Verify ITN webhooks have USD currency
3. **Update Documentation**: Add multi-currency notes to user docs

### Long-term (Month 1)

1. **Multi-Currency Expansion**: Enable EUR, GBP in PayFast dashboard
2. **Currency Selector**: Add currency picker on pricing page
3. **Analytics**: Track conversion rates by currency
4. **A/B Testing**: Test different pricing displays

---

## Files Changed in This Deployment

### Modified

- ✅ `backend/src/controllers/payfast.controller.ts` - Pricing plans simplified
- ✅ `CLAUDE.md` - Documentation updated
- ✅ `README.md` - Payment integration description updated
- ✅ `docs/payment/PAYFAST_MULTICURRENCY_MIGRATION.md` - Migration guide
- ✅ `docs/payment/MULTICURRENCY_TEST_RESULTS.md` - Test results
- ✅ `docs/payment/E2E_PAYMENT_TEST_RESULTS.md` - E2E test results

### Created

- ✅ `deploy-backend-only.sh` - Backend deployment script (Linux/Mac)
- ✅ `deploy-backend-only.bat` - Backend deployment script (Windows)
- ✅ `deploy-full.sh` - Full deployment script (Linux/Mac)
- ✅ `docs/deployment/PAYFAST_MULTICURRENCY_DEPLOYMENT.md` - This file

---

## Support & References

**PayFast Support Email**: November 8, 2025 (Anastacia Arendse)
**PayFast Dashboard**: https://www.payfast.co.za
**Multi-Currency Settings**: Settings → Multi-currency
**Production URL**: https://pdflab.pro
**Docker Hub**: https://hub.docker.com/u/mkelam

---

## Quick Reference Commands

**Build Backend**:
```bash
cd backend && docker build -t mkelam/pdflab-backend:latest -f Dockerfile .
```

**Push to Docker Hub**:
```bash
docker push mkelam/pdflab-backend:latest
```

**Deploy on VPS**:
```bash
ssh root@141.136.44.168
cd /var/www/pdflab
docker pull mkelam/pdflab-backend:latest
docker-compose -f docker-compose.production.yml up -d --no-deps --force-recreate backend
```

**Verify**:
```bash
curl https://pdflab.pro/api/payfast/plans | jq '.plans[1]'
# Should show: "price": 9.99, "currency": "USD"
```

---

**Deployment Ready**: ✅ YES
**Risk Level**: LOW (backend-only, well-tested)
**Recommended Time**: During low traffic (not critical)
**Estimated Downtime**: < 30 seconds (backend restart only)
