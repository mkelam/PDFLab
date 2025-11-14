# Partner Dashboard - Visual Mockup

## What Jeff Su Sees When He Visits His Dashboard

**URL:** `https://pdflab.pro/api/partners/jeff-su/dashboard`

---

### Dashboard Response (JSON)

```json
{
  "partner": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
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
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "code": "JEFFSU10",
      "discount_type": "percentage",
      "discount_value": 10.0,
      "uses": 15,
      "max_uses": 100,
      "is_active": true,
      "expires_at": null
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "code": "JEFFSU20",
      "discount_type": "percentage",
      "discount_value": 20.0,
      "uses": 5,
      "max_uses": 50,
      "is_active": true,
      "expires_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "recent_referrals": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "user_email": "john.doe@example.com",
      "user_name": "John Doe",
      "user_plan": "pro",
      "attribution_method": "referral_link",
      "signup_date": "2025-11-10T14:30:00.000Z",
      "converted": true,
      "conversion_date": "2025-11-12T09:15:00.000Z",
      "commission_due": 11.99,
      "commission_paid": false
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "user_email": "sarah.smith@company.com",
      "user_name": "Sarah Smith",
      "user_plan": "starter",
      "attribution_method": "promo_code",
      "signup_date": "2025-11-11T16:45:00.000Z",
      "converted": true,
      "conversion_date": "2025-11-11T16:48:00.000Z",
      "commission_due": 3.99,
      "commission_paid": false
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440005",
      "user_email": "mike.johnson@gmail.com",
      "user_name": "Mike Johnson",
      "user_plan": "free",
      "attribution_method": "referral_link",
      "signup_date": "2025-11-12T10:20:00.000Z",
      "converted": false,
      "conversion_date": null,
      "commission_due": 0,
      "commission_paid": false
    }
  ]
}
```

---

## Visual Representation (How Frontend Would Display This)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Jeff Su's Partner Dashboard                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👤 Partner Profile                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Name:            Jeff Su                                        │
│  Platform:        YouTube (200,000 followers)                    │
│  Commission Tier: Silver (40%)                                   │
│  Status:          🟢 Active                                      │
│                                                                  │
│  🔗 Your Referral Link:                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ https://pdflab.pro/partner/jeff-su            [📋 Copy] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🎟️  Your Promo Codes:                                           │
│  • JEFFSU10 (10% off) - 15/100 uses                             │
│  • JEFFSU20 (20% off) - 5/50 uses                               │
│                                                                  │
│  🎁 Free Licenses: 7 remaining (3/10 used)                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  📊 Performance Stats                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ALL TIME                                                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   Signups    │ Conversions  │ Conv. Rate   │   Revenue    │ │
│  │              │              │              │              │ │
│  │      45      │      12      │   26.67%     │   $359.88    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                  │
│  💰 Commission Breakdown                                         │
│  ┌──────────────┬──────────────┬──────────────────────────┐    │
│  │    Earned    │     Paid     │       Pending            │    │
│  │              │              │                          │    │
│  │   $143.95    │    $0.00     │   $143.95 🟡            │    │
│  └──────────────┴──────────────┴──────────────────────────┘    │
│                                                                  │
│  CURRENT MONTH (November 2025)                                  │
│  ┌──────────────┬──────────────┬────────────────────────┐      │
│  │   Signups    │ Conversions  │     Conv. Rate         │      │
│  │              │              │                        │      │
│  │       8      │       3      │      37.50%            │      │
│  └──────────────┴──────────────┴────────────────────────┘      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  👥 Recent Referrals                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📧 john.doe@example.com                                  │  │
│  │ ├─ Plan: Pro ($29.99/mo)                                 │  │
│  │ ├─ Signed up: Nov 10, 2025 via Referral Link            │  │
│  │ ├─ Converted: Nov 12, 2025 ✅                            │  │
│  │ └─ Commission: $11.99 (pending)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📧 sarah.smith@company.com                               │  │
│  │ ├─ Plan: Starter ($9.99/mo)                              │  │
│  │ ├─ Signed up: Nov 11, 2025 via Promo Code (JEFFSU10)    │  │
│  │ ├─ Converted: Nov 11, 2025 ✅                            │  │
│  │ └─ Commission: $3.99 (pending)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📧 mike.johnson@gmail.com                                │  │
│  │ ├─ Plan: Free                                            │  │
│  │ ├─ Signed up: Nov 12, 2025 via Referral Link            │  │
│  │ └─ Status: Not converted yet ⏳                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [View All Referrals →]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: Comparing Multiple Partners

**What YOU (the admin) see when you check all partners:**

**API:** `GET /api/admin/partners` (Admin only)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏢 PDFLab Partner Management Dashboard                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📊 Overall Stats                                                        │
│  • Total Partners: 5                                                     │
│  • Active Partners: 4                                                    │
│  • Total Signups (Partner-driven): 180 (72% of all signups)            │
│  • Total Revenue (Partner-driven): $5,397.70                            │
│  • Total Commission Owed: $1,943.17                                     │
│  • Total Commission Paid: $0.00                                         │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  👥 Partner Performance                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🥇 #1: Jeff Su                                     [Silver 40%]    │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Platform: YouTube (200K followers)                                 │ │
│  │ Status: 🟢 Active                                                  │ │
│  │ Link: pdflab.pro/partner/jeff-su                                   │ │
│  │ Promo: JEFFSU10, JEFFSU20                                          │ │
│  │                                                                    │ │
│  │ Performance:                                                       │ │
│  │ • Signups: 45                                                      │ │
│  │ • Conversions: 12 (26.67%)                                         │ │
│  │ • Revenue: $359.88                                                 │ │
│  │ • Commission: $143.95 (pending)                                    │ │
│  │                                                                    │ │
│  │ [View Dashboard] [Edit] [Manage Codes] [Pay Commission]           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🥈 #2: Sandi                                       [Bronze 30%]    │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Platform: YouTube (20K followers)                                  │ │
│  │ Status: 🟢 Active                                                  │ │
│  │ Link: pdflab.pro/partner/sandi                                     │ │
│  │ Promo: SANDI15                                                     │ │
│  │                                                                    │ │
│  │ Performance:                                                       │ │
│  │ • Signups: 38                                                      │ │
│  │ • Conversions: 10 (26.32%)                                         │ │
│  │ • Revenue: $299.90                                                 │ │
│  │ • Commission: $89.97 (pending)                                     │ │
│  │                                                                    │ │
│  │ [View Dashboard] [Edit] [Manage Codes] [Pay Commission]           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🥉 #3: Keep Productive                             [Silver 40%]    │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Platform: YouTube (52K followers)                                  │ │
│  │ Status: 🟢 Active                                                  │ │
│  │ Link: pdflab.pro/partner/keep-productive                           │ │
│  │ Promo: KEEPPRO20                                                   │ │
│  │                                                                    │ │
│  │ Performance:                                                       │ │
│  │ • Signups: 32                                                      │ │
│  │ • Conversions: 8 (25.00%)                                          │ │
│  │ • Revenue: $239.92                                                 │ │
│  │ • Commission: $95.97 (pending)                                     │ │
│  │                                                                    │ │
│  │ [View Dashboard] [Edit] [Manage Codes] [Pay Commission]           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ #4: Productivityist                                [Bronze 30%]    │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Platform: YouTube (6.1K followers)                                 │ │
│  │ Status: 🟢 Active                                                  │ │
│  │ Link: pdflab.pro/partner/productivityist                           │ │
│  │ Promo: PRODIST10                                                   │ │
│  │                                                                    │ │
│  │ Performance:                                                       │ │
│  │ • Signups: 25                                                      │ │
│  │ • Conversions: 5 (20.00%)                                          │ │
│  │ • Revenue: $149.95                                                 │ │
│  │ • Commission: $44.99 (pending)                                     │ │
│  │                                                                    │ │
│  │ [View Dashboard] [Edit] [Manage Codes] [Pay Commission]           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ #5: Business Productivity                          [Bronze 30%]    │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Platform: YouTube (20K followers)                                  │ │
│  │ Status: 🟡 Pending (contract not signed)                           │ │
│  │ Link: pdflab.pro/partner/business-productivity                     │ │
│  │ Promo: BIZPRO15                                                    │ │
│  │                                                                    │ │
│  │ Performance:                                                       │ │
│  │ • Signups: 0                                                       │ │
│  │ • Conversions: 0 (0%)                                              │ │
│  │ • Revenue: $0.00                                                   │ │
│  │ • Commission: $0.00                                                │ │
│  │                                                                    │ │
│  │ [Activate] [Edit] [Delete]                                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [+ Add New Partner]                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Real Data Example: Checking Which Influencer Brought Which Customer

**SQL Query:**
```sql
SELECT
  u.email AS customer_email,
  u.name AS customer_name,
  u.plan AS customer_plan,
  p.name AS referred_by_influencer,
  ua.attribution_method AS how_they_found_us,
  pc.code AS promo_code_used,
  ua.utm_campaign AS campaign,
  ua.created_at AS signup_date,
  ua.converted_to_paid AS is_paying_customer,
  ua.first_payment_amount AS revenue,
  ua.commission_due AS commission_owed
FROM users u
LEFT JOIN user_attribution ua ON u.id = ua.user_id
LEFT JOIN partners p ON ua.partner_id = p.id
LEFT JOIN promo_codes pc ON ua.promo_code_id = pc.id
ORDER BY ua.created_at DESC
LIMIT 10;
```

**Result:**
```
┌─────────────────────────┬───────────────┬────────────┬─────────────────────┬─────────────────┬─────────────────┬──────────────────────┬─────────────┬─────────────────────┬─────────┬──────────────┐
│ customer_email          │ customer_name │ plan       │ referred_by         │ how_found_us    │ promo_used      │ campaign             │ signup_date │ is_paying_customer  │ revenue │ commission   │
├─────────────────────────┼───────────────┼────────────┼─────────────────────┼─────────────────┼─────────────────┼──────────────────────┼─────────────┼─────────────────────┼─────────┼──────────────┤
│ john@example.com        │ John Doe      │ pro        │ Jeff Su             │ referral_link   │ NULL            │ workflow-automation  │ 2025-11-10  │ ✅ YES              │ $29.99  │ $11.99       │
│ sarah@company.com       │ Sarah Smith   │ starter    │ Jeff Su             │ promo_code      │ JEFFSU10        │ NULL                 │ 2025-11-11  │ ✅ YES              │ $9.99   │ $3.99        │
│ mike@gmail.com          │ Mike Johnson  │ free       │ Jeff Su             │ referral_link   │ NULL            │ productivity-tips    │ 2025-11-12  │ ❌ NO               │ $0.00   │ $0.00        │
│ lisa@startup.io         │ Lisa Chen     │ pro        │ Sandi               │ referral_link   │ NULL            │ female-founders      │ 2025-11-09  │ ✅ YES              │ $29.99  │ $8.99        │
│ david@consulting.com    │ David Miller  │ enterprise │ Keep Productive     │ promo_code      │ KEEPPRO20       │ NULL                 │ 2025-11-08  │ ✅ YES              │ $99.99  │ $39.99       │
│ emma@design.com         │ Emma Wilson   │ pro        │ Sandi               │ referral_link   │ NULL            │ solopreneur-series   │ 2025-11-07  │ ✅ YES              │ $29.99  │ $8.99        │
│ james@tech.com          │ James Brown   │ free       │ Jeff Su             │ referral_link   │ NULL            │ workflow-automation  │ 2025-11-06  │ ❌ NO               │ $0.00   │ $0.00        │
│ olivia@marketing.co     │ Olivia Davis  │ starter    │ Productivityist     │ promo_code      │ PRODIST10       │ NULL                 │ 2025-11-05  │ ✅ YES              │ $9.99   │ $2.99        │
│ noah@agency.com         │ Noah Garcia   │ pro        │ Keep Productive     │ referral_link   │ NULL            │ app-reviews          │ 2025-11-04  │ ✅ YES              │ $29.99  │ $11.99       │
│ ava@freelance.com       │ Ava Martinez  │ free       │ NULL (Organic)      │ manual          │ NULL            │ NULL                 │ 2025-11-03  │ ❌ NO               │ $0.00   │ $0.00        │
└─────────────────────────┴───────────────┴────────────┴─────────────────────┴─────────────────┴─────────────────┴──────────────────────┴─────────────┴─────────────────────┴─────────┴──────────────┘
```

**Key Insights from Above:**
- Jeff Su brought 3 customers (John, Sarah, Mike, James)
- Sandi brought 2 customers (Lisa, Emma)
- Keep Productive brought 2 customers (David, Noah)
- Productivityist brought 1 customer (Olivia)
- Ava is organic (no influencer)

---

## Admin Panel Integration

Yes, you can integrate this into your existing admin panel!

### Option 1: Add Partner Management Tab to Admin Panel

**File:** `app/admin/partners/page.tsx` (new)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
    try {
      const response = await api.get('/partners/admin/all')
      setPartners(response.data.partners)
    } catch (error) {
      console.error('Failed to load partners:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Partner Management</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Partners"
          value={partners.length}
          icon="👥"
        />
        <StatCard
          title="Total Signups"
          value={partners.reduce((sum, p) => sum + p.total_signups, 0)}
          icon="📝"
        />
        <StatCard
          title="Total Revenue"
          value={`$${partners.reduce((sum, p) => sum + p.total_revenue, 0).toFixed(2)}`}
          icon="💰"
        />
        <StatCard
          title="Commission Owed"
          value={`$${partners.reduce((sum, p) => sum + p.pending_commission, 0).toFixed(2)}`}
          icon="💸"
        />
      </div>

      {/* Partner List */}
      <div className="space-y-4">
        {partners.map(partner => (
          <PartnerCard key={partner.id} partner={partner} />
        ))}
      </div>
    </div>
  )
}
```

### Option 2: Add to Existing Admin Navigation

**File:** `components/admin/AdminNav.tsx` (add new link)

```tsx
<Link href="/admin/partners" className="...">
  👥 Partner Management
</Link>
```

---

## How to Test It Right Now

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Run Migration
```bash
mysql -u pdflab -p pdflab < src/migrations/006_add_influencer_attribution.sql
```

### 3. Add Routes to Server
Edit `backend/src/server.ts`:

```typescript
import partnerRoutes from './routes/partner.routes'
import { captureAttribution } from './middleware/attribution.middleware'

// Add BEFORE other routes
app.use(captureAttribution)

// Add route
app.use('/api/partners', partnerRoutes)
```

### 4. Test in Browser or Postman

**Get Partner Dashboard:**
```bash
GET http://localhost:3006/api/partners/jeff-su/dashboard
```

**Get All Partners (Admin):**
```bash
GET http://localhost:3006/api/admin/partners
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## Summary

**What You'll See:**

1. **As Admin:** List of all partners with their performance stats (signups, conversions, revenue, commission)
2. **As Partner:** Personal dashboard showing their referrals, earnings, promo codes
3. **In Database:** Clear attribution linking each customer to their referring influencer

**Where It Shows:**
- ✅ API endpoints (ready now)
- ✅ Database queries (ready now)
- ⏳ Admin panel UI (needs React component)
- ⏳ Partner public dashboard (needs React component)

The **data and API are complete** - you just need to build the React UI to display it nicely!
