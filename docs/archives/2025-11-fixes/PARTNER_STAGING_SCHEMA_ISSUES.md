# Partner Portal Staging Schema Issues Report
**Date**: 2025-11-22
**Status**: 🔴 CRITICAL BLOCKER - Partner Portal Not Functional on Staging
**Context**: Phase 0 - Partner Testing Sprint (Pre-Launch)

---

## 🚨 Executive Summary

While implementing the Partner Portal Staging Test Strategy, we discovered that the **partner portal has never been deployed to staging**. The database schema is incomplete, missing critical tables and columns. The partner portal containers are running but non-functional due to these schema mismatches.

**Impact**: Partner portal testing is BLOCKED until schema is synchronized.

---

## 📊 Issues Discovered

### ✅ Issue 1: Missing Partner Tables (FIXED)
**Status**: ✅ RESOLVED

**Problem**:
- `partners` table didn't exist in `pdflab_staging` database
- `partner_applications` table didn't exist
- `partner_conversions` table didn't exist
- `partner_payouts` table didn't exist

**Solution**:
Applied migrations:
- `007_partner_applications.sql` ✅
- `008_add_partner_authentication.sql` ✅

**Verification**:
```bash
ssh root@141.136.44.168 "docker exec -i pdflab-mysql-staging mysql -uroot -prootpass123 pdflab_staging -e 'SHOW TABLES LIKE \"partner%\";'"
# Output: partners, partner_applications, partner_conversions, partner_payouts
```

---

### ✅ Issue 2: Missing promo_codes Table (FIXED)
**Status**: ✅ RESOLVED

**Problem**:
```
Error: Table 'pdflab_staging.promo_codes' doesn't exist
```

Partner model (backend/src/models/Partner.model.ts) includes:
```typescript
Partner.hasMany(PromoCode, {
  foreignKey: 'partner_id',
  as: 'promo_codes'
})
```

**Solution**:
Created `promo_codes` table:
```sql
CREATE TABLE IF NOT EXISTS promo_codes (
    id VARCHAR(36) PRIMARY KEY,
    partner_id VARCHAR(36) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
)
```

**Verification**:
```bash
ssh root@141.136.44.168 "docker exec -i pdflab-mysql-staging mysql -uroot -prootpass123 pdflab_staging -e 'DESCRIBE promo_codes;'"
# Table exists with correct schema
```

---

### 🔴 Issue 3: Partner Model Column Mismatch (NOT FIXED)
**Status**: 🔴 BLOCKING

**Problem**:
```
Error: Unknown column 'Partner.name' in 'field list'
```

The Partner Sequelize model expects columns that don't exist in the database schema:

**Columns Expected by Model (but missing in DB)**:
- `name` (model expects this, but DB has `full_name`)
- `platform` (model expects this, but DB has `primary_platform`)
- `follower_count` (model expects this, but DB doesn't have it)
- `website` (model expects this, but DB doesn't have it)
- `commission_tier` (model expects this, but DB has `tier`)
- `free_licenses_allocated` (model expects this, but DB doesn't have it)
- `free_licenses_used` (model expects this, but DB doesn't have it)
- `total_signups` (model expects this, but DB doesn't have it)
- `total_revenue_generated` (model expects this, but DB has `total_revenue`)
- `total_commission_earned` (model expects this, but DB has `total_earnings`)
- `total_commission_paid` (model expects this, but DB doesn't have it)
- `contract_signed_at` (model expects this, but DB doesn't have it)
- `notes` (model expects this, but DB doesn't have it)

**Database Schema (actual columns)**:
```
Field                      Type
--------------------------  ------------------------------
id                         varchar(36)
application_id             varchar(36)
user_id                    varchar(36)
referral_code              varchar(50)
slug                       varchar(100)
tier                       enum('bronze','silver','gold','platinum')
commission_rate            decimal(5,2)
email                      varchar(255)
full_name                  varchar(255)
brand_name                 varchar(255)
primary_platform           varchar(50)
platform_url               varchar(500)
audience_size              varchar(50)
total_clicks               int
total_conversions          int
total_revenue              decimal(10,2)
total_earnings             decimal(10,2)
current_month_conversions  int
last_conversion_at         timestamp
payment_method             enum('paypal','bank_transfer','stripe')
payment_email              varchar(255)
payment_details            json
status                     enum('active','paused','suspended')
activated_at               timestamp
created_at                 timestamp
updated_at                 timestamp
password_hash              varchar(255)
last_login_at              timestamp
```

**Root Cause**:
The Partner Sequelize model (backend/src/models/Partner.model.ts) was never updated after the partner schema migrations were applied. The model still reflects an old schema design.

**Solution Options**:

**Option A: Update Database Schema to Match Model (NOT RECOMMENDED)**
- Add missing columns to database
- This approach is error-prone and may break existing production data

**Option B: Update Model to Match Database Schema (RECOMMENDED ✅)**
- Update Partner.model.ts to use correct column names
- Use Sequelize field aliases where needed:
  ```typescript
  name: {
    type: DataTypes.STRING,
    field: 'full_name', // Maps to DB column 'full_name'
    allowNull: false
  }
  ```

**Option C: Disable Eager Loading for Testing (QUICK FIX)**
- Remove `include: [PromoCode]` from Partner queries temporarily
- This allows testing to proceed while schema is fixed properly

---

### 🟡 Issue 4: sarah-johnson Test Partner Created
**Status**: ✅ COMPLETED (But not functional until Issue 3 is fixed)

**Test Partner Created**:
```
ID:               partner-sarah-johnson-uuid
Slug:             sarah-johnson
Email:            sarah.johnson@example.com
Full Name:        Sarah Johnson
Tier:             gold
Commission Rate:  40.00%
Password:         Welcome123! (bcrypt hash)
Status:           active
```

**API Test**:
```bash
curl -s http://141.136.44.168:3007/api/partners/sarah-johnson/dashboard
# Result: {"error":"Failed to load dashboard","message":"An error occurred while loading partner dashboard"}
```

**Error Cause**: Issue #3 (model column mismatch)

---

## 🛠️ Recommended Fix Plan

### Phase 0.1: Fix Partner Model Schema (CRITICAL - 1 hour)

**File**: `backend/src/models/Partner.model.ts`

**Changes Needed**:
1. Update all column definitions to match database schema
2. Add field aliases for mismatched names
3. Remove references to non-existent columns
4. Test model with `findByPk()` and `findOne()` queries

**Example Fix**:
```typescript
// BEFORE (WRONG)
name: {
  type: DataTypes.STRING,
  allowNull: false
},

// AFTER (CORRECT)
name: {
  type: DataTypes.STRING,
  field: 'full_name', // Maps to DB column
  allowNull: false
},
```

### Phase 0.2: Create Missing Columns Migration (OPTIONAL - 30 mins)

If model uses columns that should exist:
- `free_licenses_allocated`, `free_licenses_used`
- `total_signups`, `total_commission_paid`
- `contract_signed_at`, `notes`

Create migration: `009_add_missing_partner_columns.sql`

### Phase 0.3: Verify Partner API Works (30 mins)

After model fix:
```bash
# Test 1: Dashboard API
curl http://141.136.44.168:3007/api/partners/sarah-johnson/dashboard

# Test 2: Partner Login
curl -X POST http://141.136.44.168:3007/api/partners/login \
  -H "Content-Type: application/json" \
  -d '{"slug":"sarah-johnson","password":"Welcome123!"}'

# Test 3: Partner Stats
curl http://141.136.44.168:3007/api/partners/sarah-johnson/stats
```

---

## 📋 Testing Status Update

### Updated Timeline

**Original Plan**: 3-day sprint (12 hours)

**New Plan**: +1 day for schema fixes (4-day sprint, 14 hours)

| Phase | Duration | Status |
|-------|----------|--------|
| **Phase 0: Fix Schema** | +2 hours | 🟡 IN PROGRESS |
| Phase 1: Rate Limiter | 2 hours | ✅ COMPLETE |
| Phase 2: Update Tests | 3 hours | ✅ COMPLETE |
| Phase 3: API Tests | 4 hours | ⏸️ BLOCKED |
| Phase 4: Config Validation | 2 hours | ⏸️ BLOCKED |
| Phase 5: Health Monitoring | 2 hours | ⏸️ BLOCKED |

**New Total**: 14 hours over 4 days

---

## 🎯 Next Actions (Priority Order)

1. **FIX CRITICAL**: Update Partner.model.ts to match database schema (1 hour)
2. **TEST**: Verify sarah-johnson dashboard API works (30 mins)
3. **DEPLOY**: Restart staging backend container to reload model (5 mins)
4. **RESUME**: Continue with Phase 2 partner E2E tests (3 hours)

---

## 📈 Impact Assessment

**Without Fix**:
- ❌ Partner portal completely non-functional on staging
- ❌ All partner E2E tests will fail
- ❌ Cannot launch partner program until fixed
- ❌ Wasted 2 hours on schema discovery

**With Fix**:
- ✅ Partner portal functional on staging
- ✅ Can run full partner E2E test suite
- ✅ Can validate partner program before launch
- ✅ 14.4x ROI from testing (as per original strategy)

---

## 📝 Lessons Learned

1. **Schema Migrations Should Be Version Controlled**: Migration files exist but were never applied to staging
2. **Model-Schema Sync Is Critical**: Partner model was never updated after schema changes
3. **Staging Should Mirror Production**: Partner portal deployed to production but never to staging
4. **Health Checks Need Schema Validation**: Partner portal containers show "unhealthy" but actual issue is schema mismatch
5. **Testing-First Caught This Early**: Without this testing sprint, these issues would have surfaced in production

---

## 🔗 Related Files

**Migrations Applied**:
- `backend/src/migrations/007_partner_applications.sql` ✅
- `backend/src/migrations/008_add_partner_authentication.sql` ✅
- `/tmp/create_promo_codes.sql` ✅ (ad-hoc migration)
- `/tmp/create_sarah_johnson.sql` ✅ (test data)

**Files That Need Fixing**:
- `backend/src/models/Partner.model.ts` 🔴 CRITICAL

**Test Files Ready**:
- `e2e/partner-e2e-flow.spec.ts` ✅ (environment-aware URLs)
- `tests/config/staging.config.ts` ✅ (admin credentials updated)

---

**Report Generated**: 2025-11-22 16:02 UTC
**Generated By**: Claude Code (Elite Health Guardian Testing Mode)
**Sprint**: Partner Portal Pre-Launch Testing
