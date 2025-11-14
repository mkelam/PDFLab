# Influencer Attribution Tracking System

**Created:** November 13, 2025
**Status:** Implementation Complete
**Purpose:** Track which influencer brought each customer and calculate commissions accurately

---

## Overview

This system solves the critical problem: **"How do I know which influencer brought which customer?"**

When partnering with multiple influencers (Jeff Su, Sandi, Keep Productive, etc.), you need to:
1. ✅ Identify which influencer each customer came from
2. ✅ Track their referral links and promo codes
3. ✅ Calculate commissions per influencer
4. ✅ Provide partners with real-time performance dashboards

---

## How It Works

### User Journey Example

**Scenario:** A user discovers PDFLab through Jeff Su's YouTube video

```
1. User clicks Jeff Su's link: pdflab.pro/partner/jeff-su
2. Attribution middleware captures: partner_id = "jeff-su-uuid"
3. User signs up with email: test@example.com
4. System creates UserAttribution record: user → jeff-su
5. User upgrades to Pro ($29.99/month)
6. System marks attribution as converted
7. Commission calculated: $29.99 × 40% = $11.99
8. Jeff Su's dashboard shows: +1 conversion, +$11.99 commission
```

---

## Database Schema

### 1. `partners` Table
Stores influencer/partner information

```sql
CREATE TABLE partners (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,              -- e.g., "Jeff Su"
  email VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,       -- e.g., "jeff-su"

  -- Partner Details
  platform VARCHAR(50),                    -- youtube, twitter, linkedin
  follower_count INT,
  website VARCHAR(500),

  -- Commission Structure
  commission_rate DECIMAL(5,2) DEFAULT 30.00,  -- 30% = 30.00
  commission_tier ENUM('bronze', 'silver', 'gold'),

  -- Free Licenses
  free_licenses_allocated INT DEFAULT 10,
  free_licenses_used INT DEFAULT 0,

  -- Status
  status ENUM('pending', 'active', 'paused', 'inactive'),
  contract_signed_at DATETIME,

  -- Tracking Stats (auto-updated via triggers)
  total_signups INT DEFAULT 0,
  total_conversions INT DEFAULT 0,
  total_revenue_generated DECIMAL(10,2) DEFAULT 0.00,
  total_commission_earned DECIMAL(10,2) DEFAULT 0.00,
  total_commission_paid DECIMAL(10,2) DEFAULT 0.00,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. `promo_codes` Table
Unique promo codes per partner

```sql
CREATE TABLE promo_codes (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,        -- e.g., "JEFFSU10"

  discount_type ENUM('percentage', 'fixed', 'free_trial'),
  discount_value DECIMAL(10,2),            -- 10.00 = 10% off

  max_uses INT,                            -- NULL = unlimited
  current_uses INT DEFAULT 0,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,

  FOREIGN KEY (partner_id) REFERENCES partners(id)
);
```

### 3. `user_attribution` Table
**SOURCE OF TRUTH** - Links each user to their referring partner

```sql
CREATE TABLE user_attribution (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,     -- One attribution per user
  partner_id VARCHAR(36),                  -- NULL = organic signup
  promo_code_id VARCHAR(36),

  -- Attribution Details
  attribution_method ENUM('referral_link', 'promo_code', 'manual'),
  referral_url VARCHAR(1000),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),

  -- Conversion Tracking
  converted_to_paid BOOLEAN DEFAULT FALSE,
  converted_at DATETIME,
  first_payment_amount DECIMAL(10,2) DEFAULT 0.00,

  -- Commission Status
  commission_due DECIMAL(10,2) DEFAULT 0.00,
  commission_paid BOOLEAN DEFAULT FALSE,
  commission_paid_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL
);
```

---

## Attribution Methods

### Method 1: Referral Links (Recommended)

**Partner Link Format:**
```
https://pdflab.pro/partner/jeff-su
https://pdflab.pro/partner/sandi
https://pdflab.pro/partner/keep-productive
```

**Alternative Format (Query Parameter):**
```
https://pdflab.pro?ref=jeff-su
https://pdflab.pro/pricing?ref=sandi&utm_source=youtube&utm_campaign=workflow-tips
```

**How It Works:**
1. Middleware (`attribution.middleware.ts`) runs on ALL requests
2. Extracts `partner_id` from URL path or `?ref=` parameter
3. Stores attribution data in `req.attributionData`
4. During signup, auth controller creates `UserAttribution` record

**Code Example:**
```typescript
// Middleware captures:
GET /partner/jeff-su → partner_id = "uuid-jeff-su"

// Signup creates attribution:
UserAttribution.create({
  user_id: newUser.id,
  partner_id: "uuid-jeff-su",
  attribution_method: "referral_link",
  referral_url: "https://pdflab.pro/partner/jeff-su"
})
```

---

### Method 2: Promo Codes

**Partner Promo Code Examples:**
```
JEFFSU10    → 10% off (Jeff Su)
SANDI15     → 15% off (Sandi)
KEEPPRO20   → 20% off (Keep Productive)
```

**How It Works:**
1. User enters promo code during signup
2. Auth controller validates promo code via `PromoCode.findOne()`
3. If valid, creates attribution record with `promo_code_id`
4. Increments promo code usage count

**Code Example:**
```typescript
// Signup with promo code
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "promo_code": "JEFFSU10"
}

// System creates attribution:
UserAttribution.create({
  user_id: newUser.id,
  partner_id: "uuid-jeff-su",
  promo_code_id: "uuid-promo-jeffsu10",
  attribution_method: "promo_code"
})
```

---

### Method 3: UTM Parameters

**UTM Tracking URLs:**
```
https://pdflab.pro?utm_source=jeff-su&utm_medium=youtube&utm_campaign=workflow-automation
https://pdflab.pro?utm_source=sandi&utm_medium=instagram&utm_campaign=productivity-tips
```

**Captured Data:**
- `utm_source` → Partner identifier (jeff-su, sandi)
- `utm_medium` → Platform (youtube, twitter, linkedin)
- `utm_campaign` → Specific campaign or video

**Benefits:**
- Track which specific video/post drove conversions
- Measure campaign performance
- Partner can see which content performs best

---

## API Endpoints

### Partner Dashboard

**GET /api/partners/:slug/dashboard**

Returns complete performance dashboard for a partner.

**Example Request:**
```bash
GET /api/partners/jeff-su/dashboard
```

**Example Response:**
```json
{
  "partner": {
    "id": "uuid",
    "name": "Jeff Su",
    "slug": "jeff-su",
    "platform": "youtube",
    "follower_count": 200000,
    "commission_rate": 40.0,
    "commission_tier": "silver",
    "status": "active",
    "referral_link": "https://pdflab.pro/partner/jeff-su",
    "free_licenses": {
      "allocated": 10,
      "used": 3,
      "remaining": 7
    }
  },
  "stats": {
    "all_time": {
      "signups": 45,
      "conversions": 12,
      "conversion_rate": "26.67%",
      "revenue_generated": 359.88,
      "commission_earned": "143.95",
      "commission_paid": "0.00",
      "commission_pending": "143.95"
    },
    "current_month": {
      "signups": 8,
      "conversions": 3,
      "conversion_rate": "37.50%"
    }
  },
  "promo_codes": [
    {
      "code": "JEFFSU10",
      "discount_type": "percentage",
      "discount_value": 10.0,
      "uses": 15,
      "max_uses": 100,
      "is_active": true
    }
  ],
  "recent_referrals": [
    {
      "user_email": "user1@example.com",
      "signup_date": "2025-11-10",
      "converted": true,
      "conversion_date": "2025-11-12",
      "commission_due": 11.99,
      "commission_paid": false
    }
  ]
}
```

---

### Partner Referrals (Detailed)

**GET /api/partners/:slug/referrals**

Get paginated list of all referrals with conversion details.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional: "converted", "pending")

**Example Request:**
```bash
GET /api/partners/jeff-su/referrals?page=1&limit=20&status=converted
```

**Example Response:**
```json
{
  "referrals": [
    {
      "id": "uuid",
      "user": {
        "email": "customer@example.com",
        "name": "John Doe",
        "plan": "pro",
        "signup_date": "2025-11-10"
      },
      "attribution_method": "referral_link",
      "promo_code": null,
      "utm_source": "youtube",
      "utm_campaign": "workflow-automation",
      "signup_date": "2025-11-10",
      "converted": true,
      "conversion_date": "2025-11-12",
      "first_payment": 29.99,
      "commission_due": 11.99,
      "commission_paid": false
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

---

### Admin: Create Partner

**POST /api/admin/partners** (Admin only)

Create a new partner in the system.

**Request Body:**
```json
{
  "name": "Jeff Su",
  "email": "jeff@jeffsu.com",
  "slug": "jeff-su",
  "platform": "youtube",
  "follower_count": 200000,
  "website": "https://jeffsu.org",
  "commission_tier": "silver",
  "free_licenses_allocated": 10
}
```

**Response:**
```json
{
  "message": "Partner created successfully",
  "partner": {
    "id": "uuid",
    "name": "Jeff Su",
    "slug": "jeff-su",
    "commission_tier": "silver",
    "commission_rate": 40.0,
    "referral_link": "https://pdflab.pro/partner/jeff-su",
    "default_promo_code": "JEFFSU10"
  }
}
```

---

### Admin: Get All Partners

**GET /api/admin/partners** (Admin only)

Get list of all partners with performance metrics.

**Response:**
```json
{
  "partners": [
    {
      "id": "uuid",
      "name": "Jeff Su",
      "slug": "jeff-su",
      "platform": "youtube",
      "follower_count": 200000,
      "commission_tier": "silver",
      "commission_rate": 40.0,
      "status": "active",
      "referral_link": "https://pdflab.pro/partner/jeff-su",
      "total_signups": 45,
      "total_conversions": 12,
      "conversion_rate": "26.67%",
      "total_revenue": 359.88,
      "total_commission_earned": 143.95,
      "pending_commission": 143.95,
      "free_licenses_remaining": 7,
      "promo_codes": ["JEFFSU10", "JEFFSU20"]
    }
  ]
}
```

---

### Admin: Create Promo Code

**POST /api/admin/partners/:id/promo-code** (Admin only)

Create a new promo code for a partner.

**Request Body:**
```json
{
  "code": "JEFFSU20",
  "discount_type": "percentage",
  "discount_value": 20.0,
  "max_uses": 50,
  "expires_at": "2026-01-01"
}
```

---

### Admin: Attribution Stats

**GET /api/admin/attribution/stats** (Admin only)

Get overall attribution statistics.

**Response:**
```json
{
  "stats": {
    "total_signups": 250,
    "partner_signups": 180,
    "organic_signups": 70,
    "partner_percentage": "72.00%",
    "total_conversions": 65,
    "conversion_rate": "26.00%",
    "total_revenue": "1949.35",
    "total_commission": "701.76"
  }
}
```

---

## Commission Calculation

### Commission Tiers

| Tier   | Rate | Typical Partner Profile                    |
|--------|------|--------------------------------------------|
| Bronze | 30%  | 5K-20K followers, new partnership          |
| Silver | 40%  | 20K-100K followers, proven performance     |
| Gold   | 50%  | 100K+ followers, high-converting audience  |

### Calculation Example

**User Journey:**
1. User signs up via Jeff Su's referral link (Silver tier, 40% commission)
2. User converts to Pro plan ($29.99/month)

**Commission Calculation:**
```
First Payment Amount: $29.99
Commission Rate: 40%
Commission Due: $29.99 × 0.40 = $11.99
```

**Database Updates:**
```sql
-- UserAttribution table
UPDATE user_attribution SET
  converted_to_paid = TRUE,
  converted_at = NOW(),
  first_payment_amount = 29.99,
  commission_due = 11.99
WHERE user_id = 'uuid-user';

-- Partners table (via trigger)
UPDATE partners SET
  total_conversions = total_conversions + 1,
  total_revenue_generated = total_revenue_generated + 29.99,
  total_commission_earned = total_commission_earned + 11.99
WHERE id = 'uuid-jeff-su';
```

### Recurring Commissions (Future Feature)

**Option 1: First Payment Only**
- Partner earns 40% of first payment only
- Simple to implement, already built

**Option 2: Recurring Commission**
- Partner earns 40% for lifetime of subscription
- Requires PayFast webhook integration to track renewals

---

## Implementation Guide

### Step 1: Run Database Migration

```bash
cd backend
mysql -u pdflab -p pdflab < src/migrations/006_add_influencer_attribution.sql
```

This creates:
- ✅ 5 tables (partners, promo_codes, user_attribution, partner_payouts, attribution_events)
- ✅ 2 views (partner_performance, unpaid_commissions)
- ✅ 3 triggers (auto-update partner stats)
- ✅ Sample data (Jeff Su, Sandi + promo codes)

### Step 2: Add Routes to Server

Edit `backend/src/server.ts`:

```typescript
import partnerRoutes from './routes/partner.routes'

// Add route
app.use('/api/partners', partnerRoutes)
```

### Step 3: Add Attribution Middleware

Edit `backend/src/server.ts`:

```typescript
import { captureAttribution } from './middleware/attribution.middleware'

// Add middleware BEFORE routes
app.use(captureAttribution)
```

### Step 4: Create Your First Partner

```bash
POST http://localhost:3006/api/admin/partners
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Jeff Su",
  "email": "jeff@jeffsu.com",
  "slug": "jeff-su",
  "platform": "youtube",
  "follower_count": 200000,
  "commission_tier": "silver"
}
```

### Step 5: Test Attribution

**Test Referral Link:**
```bash
# Visit: http://localhost:3000/partner/jeff-su
# Sign up for account
# Check database:

SELECT * FROM user_attribution WHERE partner_id = '<jeff-su-uuid>';
```

**Test Promo Code:**
```bash
POST http://localhost:3006/api/auth/register
{
  "email": "test@example.com",
  "password": "Test123!",
  "promo_code": "JEFFSU10"
}

# Check database:
SELECT * FROM user_attribution WHERE user_id = '<new-user-uuid>';
```

---

## Deployment to Production

### 1. Run Migration on VPS

```bash
ssh root@141.136.44.168
cd /var/pdflab/app/backend
mysql -u pdflab -p pdflab_production < src/migrations/006_add_influencer_attribution.sql
```

### 2. Update Environment Variables

Add to `backend/.env.production`:
```env
# Attribution System
ENABLE_ATTRIBUTION_TRACKING=true
```

### 3. Deploy New Backend

```bash
# On local machine:
cd backend
npm run build
docker build -t mkelam/pdflab-backend:v1.3.0-attribution .
docker push mkelam/pdflab-backend:v1.3.0-attribution

# On VPS:
docker pull mkelam/pdflab-backend:v1.3.0-attribution
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## Partner Onboarding Checklist

When onboarding a new influencer partner:

- [ ] Create partner account in admin panel
- [ ] Generate unique slug (e.g., `jeff-su`)
- [ ] Create default promo code (e.g., `JEFFSU10`)
- [ ] Provide partner with:
  - [ ] Referral link: `https://pdflab.pro/partner/{slug}`
  - [ ] Promo code(s)
  - [ ] Dashboard access URL
  - [ ] Commission structure (30%/40%/50%)
  - [ ] Free license allocation (10 licenses)
- [ ] Sign partnership agreement
- [ ] Activate partner (`status = 'active'`)

---

## Frequently Asked Questions

### Q: Can a user be attributed to multiple partners?
**A:** No. Each user has ONE attribution record. First-touch attribution wins (first partner they interacted with gets credit).

### Q: What if a user uses both a referral link AND a promo code?
**A:** Promo code takes priority. The partner who owns the promo code gets attribution.

### Q: How do I handle organic signups?
**A:** All users get an attribution record. If `partner_id = NULL`, it's an organic signup.

### Q: Can I change a user's attribution?
**A:** Yes, via admin panel (future feature) or database UPDATE query.

### Q: How often are commissions paid out?
**A:** Define payout schedule (e.g., monthly on 1st). Mark commissions as paid via `partner_payouts` table.

### Q: What happens if a partner is deleted?
**A:** Attribution records set `partner_id = NULL` (ON DELETE SET NULL). Historical data preserved.

---

## Monitoring & Analytics

### Key Metrics to Track

**Partner Performance:**
- Signups per partner
- Conversion rate per partner
- Revenue per partner
- Average commission per partner

**Attribution Channels:**
- % of signups via referral links vs promo codes
- Top-performing UTM campaigns
- Organic vs partner-driven growth

**Commission Management:**
- Total commission owed
- Total commission paid
- Commission per partner (pending)

### SQL Queries for Reporting

**Top Performing Partners:**
```sql
SELECT
  p.name,
  p.total_signups,
  p.total_conversions,
  ROUND((p.total_conversions / NULLIF(p.total_signups, 0)) * 100, 2) AS conversion_rate,
  p.total_revenue_generated,
  p.total_commission_earned
FROM partners p
ORDER BY p.total_revenue_generated DESC
LIMIT 10;
```

**Unpaid Commissions:**
```sql
SELECT * FROM unpaid_commissions;
```

**Attribution Breakdown:**
```sql
SELECT
  attribution_method,
  COUNT(*) AS count,
  SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) AS conversions,
  ROUND(SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS conversion_rate
FROM user_attribution
GROUP BY attribution_method;
```

---

## Next Steps

1. ✅ **Database Schema:** COMPLETE
2. ✅ **Backend Models:** COMPLETE
3. ✅ **API Endpoints:** COMPLETE
4. ✅ **Attribution Middleware:** COMPLETE
5. ✅ **Signup Integration:** COMPLETE
6. ⏳ **Frontend Partner Dashboard:** TODO
7. ⏳ **Admin Panel Integration:** TODO
8. ⏳ **Payment Webhook Integration:** TODO (mark conversions when user upgrades)

**Critical Next Implementation:**
When user upgrades to paid plan (via PayFast ITN webhook), you need to:

```typescript
// In PayFast ITN handler (backend/src/controllers/payfast.controller.ts)
// After successful payment:

const attribution = await UserAttribution.findOne({ where: { user_id: user.id } })
if (attribution && !attribution.converted_to_paid) {
  const partner = await Partner.findByPk(attribution.partner_id)
  const commissionRate = partner ? partner.commission_rate : 0

  await attribution.markAsConverted(paymentAmount, commissionRate)

  console.log(`[Attribution] User ${user.email} converted via partner ${partner?.name}`)
}
```

---

**Documentation Version:** 1.0
**Last Updated:** November 13, 2025
**Implementation Status:** Core system complete, ready for production testing
