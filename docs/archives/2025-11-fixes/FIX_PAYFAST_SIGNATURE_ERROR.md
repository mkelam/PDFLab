# URGENT: Fix PayFast Signature Mismatch Error

**Error**: `400 Bad Request - Generated signature does not match submitted signature`

**Root Cause**: Missing passphrase in production `.env` file

**Impact**: ❌ Payments failing (all plans)

**Priority**: 🔴 CRITICAL - Fix immediately

---

## Quick Fix (5 minutes)

### Step 1: Get Passphrase from PayFast Dashboard

1. Log into **PayFast Dashboard**: https://www.payfast.co.za
2. Go to: **Settings → Integration → Security**
3. Find field: **"Passphrase"**
4. **Copy the passphrase** (or note if it's empty)

**Important**:
- If passphrase field is **empty** in dashboard → Leave it empty in .env
- If passphrase has a value → Copy it exactly (case-sensitive!)

---

### Step 2: Update Production .env File

**SSH to VPS**:
```bash
ssh root@141.136.44.168
```

**Edit .env file**:
```bash
nano /var/pdflab/app/backend/.env.production
```

**Find this line**:
```
PAYFAST_PASSPHRASE=
```

**Update it** (if you have a passphrase):
```
PAYFAST_PASSPHRASE=YourActualPassphraseFromDashboard
```

**OR keep it empty** (if PayFast dashboard shows empty):
```
PAYFAST_PASSPHRASE=
```

**Save file**: `Ctrl+O`, Enter, `Ctrl+X`

---

### Step 3: Restart Backend Container

```bash
docker restart pdflab-backend-prod
```

**Wait 10 seconds**, then check health:
```bash
curl http://localhost:3006/health
```

Should show: `{"status":"OK"}`

---

### Step 4: Test Payment Again

1. Go to https://pdflab.pro/pricing
2. Login
3. Click "Upgrade" on any plan
4. Try payment again

**Expected**: Payment should proceed without signature error ✅

---

## Alternative: PayFast Multi-Currency Might Need Passphrase

According to PayFast documentation, **multi-currency payments might require a passphrase** even if regular payments don't.

**To set a passphrase in PayFast**:

1. Log into PayFast Dashboard
2. Go to **Settings → Integration**
3. Find **"Passphrase"** field
4. **Generate a strong passphrase** (e.g., random 24-character string)
5. **Save** in PayFast dashboard
6. **Copy** the passphrase
7. **Add to production .env** (Step 2 above)
8. **Restart backend** (Step 3 above)

**Generate random passphrase**:
```bash
# On your local machine or VPS
openssl rand -base64 24
```

Example output: `xK9mP2nQ7sL4vR8wT3yU5zB6cA1d`

---

## Verification Checklist

After fix:

- [ ] Passphrase in PayFast dashboard matches .env file
- [ ] Backend restarted successfully
- [ ] Health check returns OK
- [ ] Test payment completes without signature error
- [ ] Check backend logs for any errors:
  ```bash
  docker logs pdflab-backend-prod --tail 50
  ```

---

## Why This Happened

**Incorrect assumption in code**:
- Comment said: "Add passphrase if provided (only for sandbox mode)"
- **This is WRONG!** Production with **recurring billing** requires passphrase
- Multi-currency might also require passphrase

**What we changed**:
- Switched from ZAR to USD amounts
- This might have triggered PayFast's multi-currency validation
- Multi-currency requires passphrase for signature

---

## If Problem Persists

**Check these in PayFast Dashboard**:

1. **Multi-Currency Settings**:
   - Settings → Multi-currency
   - Verify USD is enabled ✅

2. **Recurring Billing**:
   - Settings → Integration
   - Verify recurring billing is enabled ✅

3. **Passphrase**:
   - Must match between dashboard and .env file
   - Case-sensitive!
   - No spaces before/after

**Debug signature locally**:
```bash
node test-payfast-signature-production.js
```

This will show:
- Signature WITHOUT passphrase
- Signature WITH passphrase
- Both should be generated for comparison

---

## Contact PayFast Support (If Needed)

If signature still fails:

**Email**: support@payfast.help
**Subject**: "Signature mismatch with multi-currency USD payments"

**Include**:
- Merchant ID: 25263515
- Error: "Generated signature does not match"
- Note: "Multi-currency enabled for USD, recurring billing"
- Ask: "Do multi-currency payments require passphrase?"

---

## Quick Reference

**VPS Login**:
```bash
ssh root@141.136.44.168
```

**View .env**:
```bash
cat /var/pdflab/app/backend/.env.production | grep PAYFAST
```

**Edit .env**:
```bash
nano /var/pdflab/app/backend/.env.production
```

**Restart Backend**:
```bash
docker restart pdflab-backend-prod
```

**Check Logs**:
```bash
docker logs pdflab-backend-prod --tail 50
```

**Test Health**:
```bash
curl https://pdflab.pro/api/health
```

---

**Time to Fix**: 5 minutes
**Downtime**: < 30 seconds (container restart)
**Risk Level**: LOW (just config change)

**Priority**: 🔴 **FIX IMMEDIATELY** - Payments are broken!
