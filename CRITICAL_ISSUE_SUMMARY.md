# CRITICAL: PayFast Signature Still Failing

**Status**: 🔴 UNRESOLVED
**Error**: `400 Bad Request - Generated signature does not match`
**Attempts**: 2

---

## Problem

After adding passphrase to `.env.production` and restarting backend, the signature error persists.

## Possible Root Causes

### 1. Backend Not Loading New Environment ⚠️ MOST LIKELY

**Evidence**:
- Backend uptime shows 1226 seconds (20+ minutes)
- This suggests restart didn't happen OR restart failed
- Container might be using cached environment

**Solution**:
```bash
# Complete container recreation needed
ssh root@141.136.44.168
cd /var/pdflab/app

# Stop and remove
docker stop pdflab-backend-prod
docker rm pdflab-backend-prod

# Recreate with fresh .env
docker run -d \
  --name pdflab-backend-prod \
  --restart unless-stopped \
  -p 3006:3006 \
  --network app_pdflab-network \
  --env-file /var/pdflab/app/backend/.env.production \
  -e NODE_ENV=production \
  -e DB_HOST=8731b5f977d0_pdflab-mysql-prod \
  -e REDIS_HOST=f18c830e3d31_pdflab-redis-prod \
  -v /var/pdflab/storage:/app/storage \
  -v /var/pdflab/logs:/app/logs \
  mkelam/pdflab-backend:latest

# Wait for startup
sleep 15

# Verify passphrase loaded
docker exec pdflab-backend-prod printenv | grep PAYFAST

# Check health
curl http://localhost:3006/health
```

---

### 2. Passphrase Mismatch Dashboard vs .env ⚠️

**Check**:
1. PayFast Dashboard passphrase: `***REMOVED***`
2. .env.production passphrase: `***REMOVED***`
3. Must match EXACTLY (case-sensitive, no spaces)

**Verify .env**:
```bash
ssh root@141.136.44.168
cat /var/pdflab/app/backend/.env.production | grep PAYFAST_PASSPHRASE
# Should show: PAYFAST_PASSPHRASE=***REMOVED***
```

---

### 3. PayFast Dashboard Doesn't Have Passphrase Set ⚠️

**Possibility**:
- You checked dashboard and saw `***REMOVED***`
- But maybe it wasn't actually saved?
- Or saved in wrong location?

**Steps to verify**:
1. Log into https://www.payfast.co.za
2. Go to **Settings** → **Integration**
3. Find **"Passphrase"** field
4. Verify it shows: `***REMOVED***`
5. If empty or different → Re-save it
6. If correct → Continue to next check

---

### 4. Wrong PayFast Account / Sandbox vs Production ⚠️

**Check**:
- Merchant ID in .env: `25263515`
- Is this production or sandbox?
- PayFast sandbox merchant ID: `10000100`
- If using wrong account, passphrases won't match

**Verify**:
```bash
cat /var/pdflab/app/backend/.env.production | grep PAYFAST
# Check PAYFAST_MODE=production
# Check PAYFAST_MERCHANT_ID=25263515 (not 10000100)
```

---

### 5. Subscription vs One-Time Payment ⚠️

**According to PayFast docs**:
- One-time payments: Passphrase OPTIONAL
- Recurring billing: Passphrase REQUIRED
- Multi-currency: Passphrase likely REQUIRED

**Your setup**:
- Recurring billing: YES (subscriptions)
- Multi-currency: YES (USD)
- → Passphrase: **DEFINITELY REQUIRED**

---

## Diagnostic Steps (In Order)

### Step 1: Verify .env File Content
```bash
ssh root@141.136.44.168
cat /var/pdflab/app/backend/.env.production
```

**Look for**:
- `PAYFAST_PASSPHRASE=***REMOVED***` (no quotes, no spaces)
- `PAYFAST_MODE=production`
- `PAYFAST_MERCHANT_ID=25263515`

---

### Step 2: Force Container Recreation
```bash
ssh root@141.136.44.168
docker stop pdflab-backend-prod
docker rm pdflab-backend-prod

docker run -d \
  --name pdflab-backend-prod \
  --restart unless-stopped \
  -p 3006:3006 \
  --network app_pdflab-network \
  --env-file /var/pdflab/app/backend/.env.production \
  -e NODE_ENV=production \
  -e DB_HOST=8731b5f977d0_pdflab-mysql-prod \
  -e REDIS_HOST=f18c830e3d31_pdflab-redis-prod \
  -v /var/pdflab/storage:/app/storage \
  -v /var/pdflab/logs:/app/logs \
  mkelam/pdflab-backend:latest
```

---

### Step 3: Verify Passphrase Loaded
```bash
docker exec pdflab-backend-prod printenv | grep PAYFAST_PASSPHRASE
# Should output: PAYFAST_PASSPHRASE=***REMOVED***
```

**If empty or different**:
- `.env.production` file not being read
- Try setting env var directly: `-e PAYFAST_PASSPHRASE=***REMOVED***`

---

### Step 4: Check Backend Logs
```bash
docker logs pdflab-backend-prod --tail 50
```

**Look for**:
- Any environment variable loading errors
- Database connection issues
- Startup errors

---

### Step 5: Test Signature Generation
```bash
# On local machine
node test-signature-with-passphrase.js
```

**Expected signature** (with `***REMOVED***`):
- Different from signature without passphrase
- Should be 32-character MD5 hash

---

## Alternative Solution: Use Environment Variable Directly

If `--env-file` isn't working, set passphrase directly in docker run:

```bash
docker run -d \
  --name pdflab-backend-prod \
  --restart unless-stopped \
  -p 3006:3006 \
  --network app_pdflab-network \
  -e NODE_ENV=production \
  -e DB_HOST=8731b5f977d0_pdflab-mysql-prod \
  -e REDIS_HOST=f18c830e3d31_pdflab-redis-prod \
  -e PAYFAST_MERCHANT_ID=25263515 \
  -e PAYFAST_MERCHANT_KEY=***REMOVED*** \
  -e PAYFAST_PASSPHRASE=***REMOVED*** \
  -e PAYFAST_MODE=production \
  -v /var/pdflab/storage:/app/storage \
  -v /var/pdflab/logs:/app/logs \
  mkelam/pdflab-backend:latest
```

This bypasses `.env` file and sets env vars directly.

---

## Contact PayFast Support

If all else fails:

**Email**: support@payfast.help
**Subject**: "Signature mismatch with multi-currency recurring billing"

**Include**:
```
Merchant ID: 25263515
Issue: Generated signature does not match submitted signature
Setup: Recurring billing + Multi-currency (USD)
Passphrase: Set in dashboard (***REMOVED***)

Question: Are there special requirements for multi-currency recurring
billing signatures that differ from standard signature generation?
```

---

## Why SSH Commands Timing Out

**Issue**: SSH commands are consistently timing out (30s, 90s)

**Possible causes**:
1. VPS under heavy load
2. Network connectivity issues
3. Docker daemon slow/hung
4. Container creation taking too long

**Workaround**:
- Use multiple short commands instead of one long chain
- Increase timeout values
- Use `nohup` for long-running commands
- Check VPS resources (RAM, CPU)

---

## Next Actions (Priority Order)

1. **SSH to VPS manually** (don't use Claude commands if timing out)
2. **Verify `.env.production` has passphrase**
3. **Recreate container completely**
4. **Verify passphrase loaded** (`printenv`)
5. **Test payment**
6. **If still fails** → Contact PayFast support

---

**Status**: Needs manual intervention due to SSH timeout issues
**Priority**: 🔴 CRITICAL - Payments broken
**ETA**: 10-15 minutes manual fix
