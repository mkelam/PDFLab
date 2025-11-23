# Influencer Attribution System - Implementation Complete ✅

**Date:** November 13, 2025
**Status:** Core system complete, ready for testing
**Purpose:** Track which influencer brought each customer and calculate commissions

---

## Problem Solved

**Your Question:** "What I'm saying there might be an audience member from influencer Jeff Su and another from influencer Sandi, etc. I need to be able to know whose audience they are part of"

**Solution Built:** Complete attribution tracking system that identifies which influencer each customer came from via:
1. ✅ Unique referral links (pdflab.pro/partner/jeff-su)
2. ✅ Promo codes (JEFFSU10, SANDI15)
3. ✅ UTM tracking parameters
4. ✅ Real-time partner dashboards
5. ✅ Automatic commission calculations

---

## What Was Built

### 1. Database Schema (SQL Migration)
**File:** `backend/src/migrations/006_add_influencer_attribution.sql`

**Tables Created:**
- `partners` - Stores influencer info (Jeff Su, Sandi, etc.)
- `promo_codes` - Unique promo codes per partner
- `user_attribution` - **SOURCE OF TRUTH** - Links each user to their partner
- `partner_payouts` - Tracks commission payments
- `attribution_events` - Detailed tracking log

**Triggers Created:**
- Auto-update partner stats when user signs up
- Auto-calculate commission when user converts to paid
- Auto-update commission totals when marked as paid

**Sample Data Included:**
- Jeff Su (slug: `jeff-su`, 40% commission, promo: `JEFFSU10`)
- Sandi (slug: `sandi`, 30% commission, promo: `SANDI15`)

---

### 2. Backend Models (TypeScript)
**Files Created:**
- `backend/src/models/Partner.ts` - Partner/influencer data model
- `backend/src/models/PromoCode.ts` - Promo code management
- `backend/src/models/UserAttribution.ts` - User → Partner attribution

**Helper Methods:**
```typescript
// Partner methods
partner.getReferralLink()           // → "https://pdflab.pro/partner/jeff-su"
partner.getConversionRate()         // → 26.67
partner.getPendingCommission()      // → 143.95

// PromoCode methods
promoCode.isValid()                 // Check if code is still usable
promoCode.incrementUse()            // Track code usage

// UserAttribution methods
attribution.markAsConverted(amount, rate)  // Mark user as paid customer
attribution.markCommissionPaid()           // Track commission payment
```

---

### 3. Attribution Middleware
**File:** `backend/src/middleware/attribution.middleware.ts`

**Captures Attribution From:**
1. URL path: `/partner/jeff-su`
2. Query parameter: `?ref=jeff-su`
3. UTM parameters: `?utm_source=jeff-su&utm_medium=youtube`

**How It Works:**
```typescript
// Middleware runs on ALL requests
app.use(captureAttribution)

// Extracts partner info from URL
GET /partner/jeff-su → req.attributionData = { partner_id: "uuid", ... }

// During signup, attribution data is saved
UserAttribution.create({
  user_id: newUser.id,
  partner_id: req.attributionData.partner_id,
  attribution_method: "referral_link"
})
```

---

### 4. Signup Integration
**File:** `backend/src/controllers/auth.controller.ts` (modified)

**Attribution Flow:**
1. User visits: `pdflab.pro/partner/jeff-su`
2. User signs up with email
3. System checks for:
   - Promo code (if provided)
   - Referral link data (from middleware)
   - UTM parameters
4. Creates `UserAttribution` record linking user → partner
5. Console logs: `[Attribution] User test@example.com signed up via jeff-su`

**Supports:**
- ✅ Referral links
- ✅ Promo codes
- ✅ Organic signups (partner_id = NULL)

---

### 5. Partner Dashboard API
**File:** `backend/src/controllers/partner.controller.ts`

**Endpoints Created:**

#### GET /api/partners/:slug/dashboard
Partner performance overview

**Example Response:**
```json
{
  "partner": {
    "name": "Jeff Su",
    "slug": "jeff-su",
    "commission_rate": 40.0,
    "referral_link": "https://pdflab.pro/partner/jeff-su"
  },
  "stats": {
    "all_time": {
      "signups": 45,
      "conversions": 12,
      "conversion_rate": "26.67%",
      "revenue_generated": 359.88,
      "commission_earned": "143.95",
      "commission_pending": "143.95"
    },
    "current_month": {
      "signups": 8,
      "conversions": 3
    }
  },
  "recent_referrals": [...]
}
```

#### GET /api/partners/:slug/referrals
Detailed referral list with pagination

#### POST /api/admin/partners (Admin only)
Create new partner

#### GET /api/admin/partners (Admin only)
Get all partners with stats

#### POST /api/admin/partners/:id/promo-code (Admin only)
Create promo code for partner

#### GET /api/admin/attribution/stats (Admin only)
Overall attribution statistics

---

### 6. API Routes
**File:** `backend/src/routes/partner.routes.ts`

All partner endpoints configured and ready to use.

---

### 7. Comprehensive Documentation
**File:** `docs/marketing/ATTRIBUTION_TRACKING_SYSTEM.md`

**Includes:**
- Complete system overview
- Database schema documentation
- API endpoint reference with examples
- Commission calculation guide
- Implementation guide
- Deployment instructions
- Partner onboarding checklist
- FAQ section
- Monitoring queries

---

## How It Works - Example

### Scenario: User discovers PDFLab through Jeff Su's YouTube video

```
1. USER ACTION:
   Clicks link in video description:
   → https://pdflab.pro/partner/jeff-su

2. ATTRIBUTION MIDDLEWARE:
   Captures partner_id from URL
   → req.attributionData = { partner_id: "uuid-jeff-su" }

3. USER SIGNS UP:
   POST /api/auth/register
   {
     "email": "customer@example.com",
     "password": "SecurePass123"
   }

4. AUTH CONTROLLER:
   Creates UserAttribution record:
   {
     user_id: "uuid-user",
     partner_id: "uuid-jeff-su",
     attribution_method: "referral_link",
     referral_url: "https://pdflab.pro/partner/jeff-su"
   }

5. DATABASE TRIGGER:
   Auto-updates partners.total_signups += 1

6. USER UPGRADES TO PRO ($29.99/month):
   PayFast webhook fires → User converted

7. COMMISSION CALCULATION:
   $29.99 × 40% = $11.99

8. DATABASE UPDATES:
   user_attribution:
     converted_to_paid = TRUE
     first_payment_amount = 29.99
     commission_due = 11.99

   partners:
     total_conversions += 1
     total_revenue_generated += 29.99
     total_commission_earned += 11.99

9. PARTNER DASHBOARD:
   Jeff Su sees: +1 conversion, +$11.99 commission pending
```

---

## Commission Tiers

| Tier   | Rate | Profile                                    |
|--------|------|--------------------------------------------|
| Bronze | 30%  | 5K-20K followers, new partnership          |
| Silver | 40%  | 20K-100K followers (Jeff Su, Sandi)        |
| Gold   | 50%  | 100K+ followers, high-converting audience  |

---

## Next Steps to Deploy

### 1. Test Locally

```bash
# Run migration
cd backend
mysql -u pdflab -p pdflab < src/migrations/006_add_influencer_attribution.sql

# Start backend (routes not yet added to server.ts)
npm run dev

# Test attribution:
# Visit: http://localhost:3000/partner/jeff-su
# Sign up for account
# Check database:
SELECT * FROM user_attribution;
```

### 2. Add Routes to Server

Edit `backend/src/server.ts`:

```typescript
// Add imports
import partnerRoutes from './routes/partner.routes'
import { captureAttribution } from './middleware/attribution.middleware'

// Add middleware (BEFORE routes)
app.use(captureAttribution)

// Add routes
app.use('/api/partners', partnerRoutes)
```

### 3. Test API Endpoints

```bash
# Create partner (admin only)
POST http://localhost:3006/api/admin/partners
{
  "name": "Jeff Su",
  "email": "jeff@jeffsu.com",
  "slug": "jeff-su",
  "platform": "youtube",
  "commission_tier": "silver"
}

# Get partner dashboard
GET http://localhost:3006/api/partners/jeff-su/dashboard
```

### 4. Integrate with PayFast Webhooks

When user upgrades to paid plan, mark attribution as converted:

Edit `backend/src/controllers/payfast.controller.ts`:

```typescript
// In ITN handler, after payment success:

const attribution = await UserAttribution.findOne({ where: { user_id: user.id } })
if (attribution && !attribution.converted_to_paid) {
  const partner = await Partner.findByPk(attribution.partner_id)
  if (partner) {
    await attribution.markAsConverted(paymentAmount, partner.commission_rate)
    console.log(`[Attribution] User ${user.email} converted via ${partner.name}`)
  }
}
```

### 5. Deploy to Production

```bash
# Run migration on VPS
ssh root@141.136.44.168
cd /var/pdflab/app/backend
mysql -u pdflab -p pdflab_production < src/migrations/006_add_influencer_attribution.sql

# Build and push Docker image
docker build -t mkelam/pdflab-backend:v1.3.0-attribution .
docker push mkelam/pdflab-backend:v1.3.0-attribution

# Deploy on VPS
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## Files Created

### Backend
1. `backend/src/migrations/006_add_influencer_attribution.sql` - Database schema
2. `backend/src/models/Partner.ts` - Partner model
3. `backend/src/models/PromoCode.ts` - Promo code model
4. `backend/src/models/UserAttribution.ts` - Attribution model
5. `backend/src/models/index.ts` - Updated exports
6. `backend/src/middleware/attribution.middleware.ts` - Attribution capture
7. `backend/src/controllers/partner.controller.ts` - Partner API
8. `backend/src/routes/partner.routes.ts` - Partner routes
9. `backend/src/controllers/auth.controller.ts` - Modified (attribution integration)

### Documentation
10. `docs/marketing/ATTRIBUTION_TRACKING_SYSTEM.md` - Complete documentation
11. `ATTRIBUTION_SYSTEM_IMPLEMENTATION_COMPLETE.md` - This summary

---

## Key Features

### For You (PDFLab Owner)
✅ **Know exactly** which influencer brought which customer
✅ **Automatic commission calculation** (30%/40%/50% based on tier)
✅ **Real-time tracking** of signups, conversions, revenue per partner
✅ **Admin dashboard** to manage all partners in one place
✅ **Flexible attribution** via referral links, promo codes, or UTM parameters

### For Partners (Influencers)
✅ **Unique referral link** (pdflab.pro/partner/jeff-su)
✅ **Custom promo codes** (JEFFSU10)
✅ **Real-time dashboard** showing their performance
✅ **Transparent commission tracking** (earned, paid, pending)
✅ **Free licenses** for their audience (10 Pro licenses per partner)

### For Users (Customers)
✅ **Seamless experience** (attribution happens in background)
✅ **Promo code discounts** (10-20% off)
✅ **No impact on signup flow** (optional promo code field)

---

## Testing Checklist

Before deploying to production:

- [ ] Run migration on local MySQL
- [ ] Add routes to server.ts
- [ ] Create test partner via admin API
- [ ] Test referral link attribution
- [ ] Test promo code attribution
- [ ] Test partner dashboard API
- [ ] Test commission calculation
- [ ] Integrate with PayFast webhook
- [ ] Test full user journey (visit → signup → upgrade → commission)
- [ ] Deploy to VPS
- [ ] Create real partners (Jeff Su, Sandi, etc.)

---

## Attribution Methods Summary

| Method         | Format                           | Priority | Use Case                          |
|----------------|----------------------------------|----------|-----------------------------------|
| Promo Code     | JEFFSU10                         | Highest  | User-initiated, explicit credit   |
| Referral Link  | pdflab.pro/partner/jeff-su       | High     | Direct link from partner content  |
| Query Param    | ?ref=jeff-su                     | High     | Flexible, works with any URL      |
| UTM Parameters | ?utm_source=jeff-su              | Medium   | Campaign tracking, analytics      |
| Manual         | Admin assigns attribution        | Lowest   | Edge cases, corrections           |

**First-touch attribution:** If user visits from multiple sources, first partner they interacted with gets credit.

**Exception:** Promo code overrides referral link (promo code is explicit user action).

---

## Commission Payment Workflow (Future)

1. **Generate monthly payout report:**
   ```sql
   SELECT * FROM unpaid_commissions;
   ```

2. **Process payments** (PayPal, Stripe, bank transfer)

3. **Mark as paid:**
   ```sql
   UPDATE user_attribution
   SET commission_paid = TRUE, commission_paid_at = NOW()
   WHERE partner_id = 'uuid-jeff-su' AND commission_paid = FALSE;
   ```

4. **Create payout record:**
   ```sql
   INSERT INTO partner_payouts (partner_id, amount, period_start, period_end, status)
   VALUES ('uuid-jeff-su', 143.95, '2025-11-01', '2025-11-30', 'completed');
   ```

---

## Success Metrics

After implementing with 10-20 partners, you'll be able to answer:

- Which influencer drives the highest conversion rate?
- Which platform (YouTube/Twitter/LinkedIn) performs best?
- What's the average commission per partner?
- What's the ROI on influencer partnerships vs paid ads?
- Which UTM campaigns drive the most revenue?

---

## Status

✅ **Database schema:** Complete (5 tables, 2 views, 3 triggers)
✅ **Backend models:** Complete (Partner, PromoCode, UserAttribution)
✅ **Attribution capture:** Complete (middleware + signup integration)
✅ **API endpoints:** Complete (7 endpoints)
✅ **Documentation:** Complete (comprehensive guide)
⏳ **Server integration:** TODO (add routes to server.ts)
⏳ **PayFast integration:** TODO (mark conversions on payment)
⏳ **Frontend dashboard:** TODO (partner performance UI)
⏳ **Admin panel:** TODO (partner management UI)
⏳ **Production deployment:** TODO (run migration + deploy)

---

## Questions Answered

**Q: "How do I know which influencer brought which customer?"**
**A:** Check the `user_attribution` table. Every user has ONE attribution record linking them to a partner (or NULL for organic).

**Q: "Can I see Jeff Su's performance?"**
**A:** Yes. Visit `/api/partners/jeff-su/dashboard` or query:
```sql
SELECT * FROM partner_performance WHERE slug = 'jeff-su';
```

**Q: "How are commissions calculated?"**
**A:** Automatically. When user upgrades to paid, system calculates:
```
commission_due = first_payment_amount × commission_rate
```

**Q: "What if user came from multiple sources?"**
**A:** First-touch attribution wins. First partner they interacted with gets credit.

**Q: "Can I manually change attribution?"**
**A:** Yes. Update `user_attribution.partner_id` via SQL or (future) admin panel.

---

**Implementation Complete! Ready for testing and deployment.**

**Next Action:** Add routes to server.ts and test locally before deploying to production.
