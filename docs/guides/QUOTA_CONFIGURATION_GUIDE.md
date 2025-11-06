# PDFLab - Conversion Quota Configuration Guide

**Date**: 2025-11-01
**Status**: ✅ All quotas correctly configured

---

## Plan Tiers and Conversion Limits

### Pricing Structure (USD)

| Plan | Price | Conversions/Month | Max File Size | Status in Database |
|------|-------|------------------|---------------|-------------------|
| **Free** | $0 | 3 | 10MB | `conversions_limit: 3` |
| **Starter** | $9.99/month | 100 | 25MB | `conversions_limit: 100` |
| **Pro** | $29.99/month | Unlimited | 100MB | `conversions_limit: -1` |
| **Enterprise** | $99.99/month | Unlimited | 500MB | `conversions_limit: -1` |

**Note**: `-1` represents unlimited conversions in the database.

---

## Current User Quota Status

### Database Verification
✅ All users have correct conversion limits aligned with their tier:

```sql
SELECT email, plan, conversions_used, conversions_limit FROM users;
```

**Result**:
| Email | Plan | Used | Limit | Status |
|-------|------|------|-------|--------|
| docker-test@pdflab.com | free | 0 | 3 | ✅ OK |
| admin@pdflab.test | free | 0 | 3 | ✅ OK |
| test@test.com | starter | 0 | 100 | ✅ OK |

---

## Quota Configuration Locations

### 1. PayFast Controller
**File**: `backend/src/controllers/payfast.controller.ts`

**Lines 20-77**: Plan definitions
```typescript
const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    conversions: 3,
    maxFileSize: 10485760, // 10MB
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    conversions: 100,
    maxFileSize: 26214400, // 25MB
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    conversions: -1, // Unlimited
    maxFileSize: 104857600, // 100MB
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    conversions: -1, // Unlimited
    maxFileSize: 524288000, // 500MB
  }
}
```

**Lines 318-322**: Quota applied on successful payment
```typescript
// Update conversion limits based on plan
const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS]
if (plan) {
  user.conversions_limit = plan.conversions
  user.conversions_used = 0 // Reset usage on new subscription
}
```

### 2. Admin Controller
**File**: `backend/src/controllers/admin.controller.ts`

**Lines 195-200**: Manual plan updates by admin
```typescript
const limits: { [key: string]: number } = {
  free: 3,
  starter: 100,
  pro: -1, // Unlimited
  enterprise: -1 // Unlimited
}

await user.update({
  plan,
  conversions_limit: limits[plan]
})
```

**Line 150**: New user creation
```typescript
const user = await User.create({
  email,
  password_hash,
  name: name || email.split('@')[0],
  plan,
  conversions_used: 0,
  conversions_limit: plan === 'free' ? 3 : plan === 'starter' ? 100 : -1
})
```

### 3. Auth Controller
**File**: `backend/src/controllers/auth.controller.ts`

**Line 66**: User registration (default free plan)
```typescript
const user = await User.create({
  email,
  password_hash,
  name,
  plan: 'free',
  conversions_used: 0,
  conversions_limit: parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3'),
  // ...
})
```

### 4. Quota Reset Job
**File**: `backend/src/jobs/quota-reset.job.ts`

Monthly quota reset (runs on 1st day of each month):
```typescript
// Reset conversions_used to 0 for all users
await User.update(
  { conversions_used: 0 },
  { where: {} }
)
```

**Note**: This resets `conversions_used` but does NOT change `conversions_limit`.

---

## Quota Enforcement

### Upload Middleware
**File**: `backend/src/middleware/auth.middleware.ts`

**Lines 85-98**: Pre-upload quota check
```typescript
// Check if user has exceeded conversion limit
if (!user.canConvert()) {
  return res.status(403).json({
    error: 'Quota exceeded',
    message: `You have reached your conversion limit (${user.conversions_limit} conversions)`,
    conversions_used: user.conversions_used,
    conversions_limit: user.conversions_limit,
    plan: user.plan
  })
}
```

### User Model Method
**File**: `backend/src/models/User.ts`

**Lines 68-73**: Quota validation logic
```typescript
public canConvert(): boolean {
  // Pro and Enterprise users have unlimited conversions
  if (this.plan === UserPlan.PRO || this.plan === UserPlan.ENTERPRISE) {
    return true
  }
  return this.conversions_used < this.conversions_limit
}
```

---

## Environment Variables

### Backend `.env`
```env
# Default quota for free plan (used during registration)
CONVERSIONS_LIMIT_FREE=3
```

**Note**: Plan quotas are hardcoded in controllers, not environment variables. This ensures consistency and prevents accidental misconfiguration.

---

## Monthly Quota Reset

### Automatic Reset
**Cron Job**: Runs on 1st day of each month at 00:00 UTC
```javascript
// Cron expression: '0 0 1 * *'
// Resets conversions_used to 0 for ALL users
```

### Manual Reset (Admin)
**API Endpoint**: `PUT /api/admin/users/:id/quota`
```bash
curl -X PUT http://localhost:3006/api/admin/users/:id/quota \
  -H "Authorization: Bearer <admin_token>"
```

**Response**:
```json
{
  "success": true,
  "message": "User quota reset successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "conversions_used": 0,
    "conversions_limit": 100
  }
}
```

### Bulk Reset (Admin)
**API Endpoint**: `POST /api/admin/users/bulk-quota-reset`
```bash
curl -X POST http://localhost:3006/api/admin/users/bulk-quota-reset \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["uuid1", "uuid2", "uuid3"]}'
```

**Limits**:
- Maximum 1000 users per batch
- Only resets `conversions_used`, not `conversions_limit`

---

## Plan Upgrades and Downgrades

### PayFast Subscription (Automatic)
When a user completes payment via PayFast:

1. **ITN Webhook** processes payment
2. **User plan** updated to new tier
3. **`conversions_limit`** set based on new plan
4. **`conversions_used`** reset to `0`
5. **Subscription status** set to `ACTIVE`

**Code**: `backend/src/controllers/payfast.controller.ts:318-322`

### Admin Manual Update
Admin can manually change user plan:

**API Endpoint**: `PUT /api/admin/users/:id/plan`
```bash
curl -X PUT http://localhost:3006/api/admin/users/:id/plan \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"plan": "starter"}'
```

**Behavior**:
- Updates `plan` field
- Automatically sets correct `conversions_limit`
- Does NOT reset `conversions_used` (admin must do separately if needed)

---

## Testing Quota System

### 1. Check Current Quota
```bash
curl -X GET http://localhost:3006/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

**Response includes**:
```json
{
  "user": {
    "email": "test@test.com",
    "plan": "starter",
    "conversions_used": 5,
    "conversions_limit": 100
  }
}
```

### 2. Verify Quota Enforcement
```bash
# Upload PDF (counts toward quota)
curl -X POST http://localhost:3006/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "outputFormat=pptx"

# Check updated quota
curl -X GET http://localhost:3006/api/auth/profile \
  -H "Authorization: Bearer <token>"
# conversions_used should increment by 1
```

### 3. Test Quota Exceeded
```sql
-- Manually set user to quota limit
UPDATE users
SET conversions_used = conversions_limit
WHERE email = 'test@test.com';
```

```bash
# Try to upload (should fail)
curl -X POST http://localhost:3006/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "outputFormat=pptx"
```

**Expected Response**:
```json
{
  "error": "Quota exceeded",
  "message": "You have reached your conversion limit (100 conversions)",
  "conversions_used": 100,
  "conversions_limit": 100,
  "plan": "starter"
}
```

### 4. Test Unlimited Plans
```sql
-- Set user to Pro plan
UPDATE users
SET plan = 'pro', conversions_limit = -1, conversions_used = 9999
WHERE email = 'test@test.com';
```

```bash
# Upload should still work (unlimited)
curl -X POST http://localhost:3006/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "outputFormat=pptx"
# Should succeed even with 9999 conversions_used
```

---

## Database Queries

### Check All User Quotas
```sql
SELECT
  email,
  plan,
  conversions_used,
  conversions_limit,
  CONCAT(ROUND((conversions_used / conversions_limit) * 100, 1), '%') as usage_percent
FROM users
WHERE conversions_limit > 0
ORDER BY usage_percent DESC;
```

### Find Users Near Quota Limit
```sql
SELECT
  email,
  plan,
  conversions_used,
  conversions_limit,
  (conversions_limit - conversions_used) as remaining
FROM users
WHERE conversions_limit > 0
  AND conversions_used >= (conversions_limit * 0.8)  -- 80% or more used
ORDER BY remaining ASC;
```

### Validate Quota Configuration
```sql
SELECT
  email,
  plan,
  conversions_limit,
  CASE
    WHEN plan='free' AND conversions_limit=3 THEN 'OK'
    WHEN plan='starter' AND conversions_limit=100 THEN 'OK'
    WHEN plan='pro' AND conversions_limit=-1 THEN 'OK'
    WHEN plan='enterprise' AND conversions_limit=-1 THEN 'OK'
    ELSE 'MISMATCH'
  END as quota_status
FROM users
WHERE quota_status = 'MISMATCH';
```

---

## Common Issues and Solutions

### Issue 1: User has wrong quota after plan change
**Symptom**: User upgraded to Starter but still has 3 conversion limit

**Solution**:
```sql
-- Fix for specific user
UPDATE users
SET conversions_limit = 100
WHERE email = 'user@example.com' AND plan = 'starter';

-- Fix for all users (reset to correct values)
UPDATE users SET conversions_limit = 3 WHERE plan = 'free';
UPDATE users SET conversions_limit = 100 WHERE plan = 'starter';
UPDATE users SET conversions_limit = -1 WHERE plan = 'pro';
UPDATE users SET conversions_limit = -1 WHERE plan = 'enterprise';
```

### Issue 2: Unlimited plan users showing quota exceeded
**Symptom**: Pro/Enterprise user gets "Quota exceeded" error

**Diagnosis**:
```sql
SELECT email, plan, conversions_limit FROM users WHERE email = 'user@example.com';
-- If conversions_limit is NOT -1, there's a problem
```

**Solution**:
```sql
UPDATE users
SET conversions_limit = -1
WHERE plan IN ('pro', 'enterprise') AND conversions_limit != -1;
```

### Issue 3: Monthly quota didn't reset
**Symptom**: It's a new month but users still have old `conversions_used` values

**Check Cron Job**:
```bash
docker exec pdflab-backend-prod cat /var/spool/cron/crontabs/root
# Should show: 0 0 1 * * node /app/dist/jobs/quota-reset.job.js
```

**Manual Reset**:
```sql
-- Reset all users
UPDATE users SET conversions_used = 0;

-- Or use bulk admin API
curl -X POST http://localhost:3006/api/admin/users/bulk-quota-reset \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["<all_user_ids>"]}'
```

---

## Admin Dashboard

### View User Quotas
**URL**: http://localhost:3000/admin/users

**Features**:
- Filter by plan (free/starter/pro/enterprise)
- Search by email
- View conversions_used / conversions_limit
- Sort by quota usage percentage

### Reset User Quota
1. Navigate to user detail page
2. Click "Reset Quota" button
3. Confirms with admin password
4. Sets `conversions_used = 0`

**Note**: Does NOT change `conversions_limit`, only resets usage counter.

---

## API Endpoints Reference

### Get User Quota
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### Check if User Can Convert
```
POST /api/upload
Authorization: Bearer <token>
```
Returns 403 if quota exceeded.

### Admin: Get All Users (with quotas)
```
GET /api/admin/users?page=1&limit=25
Authorization: Bearer <admin_token>
```

### Admin: Update User Plan
```
PUT /api/admin/users/:id/plan
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "plan": "starter"
}
```

### Admin: Reset User Quota
```
PUT /api/admin/users/:id/quota
Authorization: Bearer <admin_token>
```

### Admin: Bulk Quota Reset
```
POST /api/admin/users/bulk-quota-reset
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2", ...]
}
```

---

## Best Practices

### 1. Never Manually Set Quotas to Non-Standard Values
Always use the standard values:
- Free: `3`
- Starter: `100`
- Pro: `-1`
- Enterprise: `-1`

### 2. Reset Usage, Not Limits
When resetting monthly quota, only update `conversions_used`, never `conversions_limit`.

**Correct**:
```sql
UPDATE users SET conversions_used = 0 WHERE email = 'user@example.com';
```

**Incorrect**:
```sql
-- DON'T DO THIS
UPDATE users SET conversions_limit = 3 WHERE email = 'user@example.com';
```

### 3. Verify After Plan Changes
After upgrading/downgrading users, always verify:
```sql
SELECT email, plan, conversions_limit FROM users WHERE email = 'user@example.com';
```

### 4. Monitor Quota Usage
Regularly check users approaching their limits to prevent surprise failures:
```sql
SELECT email, conversions_used, conversions_limit
FROM users
WHERE conversions_limit > 0
  AND conversions_used >= (conversions_limit * 0.9)
ORDER BY conversions_used DESC;
```

---

## Summary

✅ **All conversion quotas are now correctly configured**:
- Free: 3 conversions/month
- Starter: 100 conversions/month
- Pro: Unlimited (-1 in DB)
- Enterprise: Unlimited (-1 in DB)

✅ **Quota enforcement working**:
- Checked before file upload
- 403 error returned when exceeded
- Unlimited plans correctly bypass checks

✅ **Automatic quota management**:
- PayFast webhook sets correct limits on upgrade
- Admin controller enforces correct limits
- Monthly cron job resets usage counters

✅ **All users verified**:
- `test@test.com` (starter): 100 conversions ✅
- `admin@pdflab.test` (free): 3 conversions ✅
- `docker-test@pdflab.com` (free): 3 conversions ✅

---

**Last Updated**: 2025-11-01
**Verified By**: System Audit
**Status**: Production Ready ✅
