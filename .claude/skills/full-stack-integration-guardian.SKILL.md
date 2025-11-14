---
name: full-stack-integration-guardian
description: Detects and prevents frontend-backend integration issues including API response handling, type mismatches, null safety, and data transformation errors. Triggered when implementing new API endpoints, debugging API integration, or experiencing "Cannot read property of undefined" errors. Learns from real production incidents.
---

# Full-Stack Integration Guardian

**Mission:** Prevent frontend-backend integration failures through systematic validation of API contracts, data transformations, and type safety across the stack. This skill operates **proactively** - catching data flow issues before they cause runtime crashes.

## Activation Triggers

- User mentions "API not working" or "partners not showing"
- Frontend displaying blank/empty data despite successful API calls
- Console errors: `Cannot read property 'X' of undefined`
- TypeError: `X.toFixed is not a function` or similar
- API response structure mismatches
- Database DECIMAL/number type issues
- Implementing new backend-to-frontend data flow
- "Why is my data null?"

## Critical Patterns from Production Incidents

### 🔴 INCIDENT 1: API Wrapper Response Access Pattern

**Historical Failure:** Frontend accessed `response.data.partners` but API wrapper (`api.get()`) already unwraps responses

**Symptoms:**
```javascript
console.log('[Partners] Response:', response)  // {partners: Array(4)}
console.log('[Partners] Response data:', response.data)  // undefined
console.log('[Partners] No partners in response')
```

**Root Cause:**
- Custom API wrapper (`lib/api.ts`) uses Axios but unwraps the response
- Developer assumed standard Axios pattern: `response.data.partners`
- Actual pattern: API wrapper returns `response.partners` directly

**Red Flags to Scan For:**
- [ ] Custom API client wrappers that modify response structure
- [ ] Frontend accessing `response.data.X` when wrapper already unwraps
- [ ] Console showing successful data but code treating it as undefined
- [ ] Working API calls (HTTP 200) but UI shows "No data"

**Detection Method:**
```typescript
// 1. Read the API client wrapper (lib/api.ts or similar)
// 2. Check if it unwraps response.data automatically:
class ApiClient {
  async get(url: string) {
    const response = await axios.get(url)
    return response.data  // ⚠️ This unwraps! Frontend should NOT use .data again
  }
}

// 3. Check frontend usage
const response = await api.get('/endpoint')
if (response.data.items) {  // ❌ WRONG - .data already unwrapped
  setItems(response.data.items)
}

// ✅ CORRECT
const response = await api.get('/endpoint')
if (response.items) {  // Direct access
  setItems(response.items)
}
```

**Fix Template:**
```typescript
// BEFORE (Broken)
const partnersResponse = await api.get('/partners/admin/all')
setPartners(partnersResponse.data.partners || [])  // ❌ response.data is undefined

// AFTER (Working)
const response = await api.get('/partners/admin/all')
if (response?.partners) {  // ✅ Direct access with null safety
  setPartners(response.partners)
} else {
  setPartners([])
}
```

**Lessons Learned:**
1. **Always check API wrapper implementation** before assuming standard Axios pattern
2. **Add debug logging** to see actual response structure
3. **Use null-safe access patterns** (`response?.items`)
4. **Document API client behavior** in comments

---

### 🔴 INCIDENT 2: Database DECIMAL Types Return as Strings

**Historical Failure:** Sequelize returns MySQL DECIMAL columns as strings, causing `.toFixed()` to fail in React

**Symptoms:**
```javascript
TypeError: partner.total_revenue.toFixed is not a function
// Even after null check:
TypeError: (partner.total_revenue || 0).toFixed is not a function
```

**Root Cause:**
- MySQL `DECIMAL(10,2)` columns return as `"0.00"` (string) through Sequelize
- Frontend calls `.toFixed(2)` assuming number type
- Null check `|| 0` doesn't help because string `"0.00"` is truthy

**Red Flags to Scan For:**
- [ ] Backend models with DECIMAL/FLOAT/NUMERIC columns
- [ ] Frontend using `.toFixed()`, `.toLocaleString()`, math operations
- [ ] No explicit type conversion in backend API response
- [ ] TypeScript types showing `number` but runtime values are strings

**Detection Method:**
```typescript
// 1. Check backend models for DECIMAL fields
// backend/src/models/Partner.ts
Partner.init({
  total_revenue: {
    type: DataTypes.DECIMAL(10, 2),  // ⚠️ Returns string!
  }
})

// 2. Check backend controller response
res.json({
  partners: partners.map(p => ({
    total_revenue: p.total_revenue,  // ❌ Still a string "0.00"
  }))
})

// 3. Check frontend usage
<p>${partner.total_revenue.toFixed(2)}</p>  // ❌ Crashes if string
```

**Fix Template:**

**Backend Fix (Preferred):**
```typescript
// backend/src/controllers/partner.controller.ts
res.status(200).json({
  partners: partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    total_revenue: parseFloat(partner.total_revenue_generated?.toString() || '0'),  // ✅
    total_commission_earned: parseFloat(partner.total_commission_earned?.toString() || '0'),
    pending_commission: parseFloat(partner.getPendingCommission()?.toString() || '0'),
    total_signups: partner.total_signups || 0,  // ✅ Already number
  }))
})
```

**Frontend Defensive Fix (Backup):**
```typescript
// app/admin/partners/page.tsx
<div>
  <p>Revenue</p>
  <p>${(Number(partner.total_revenue) || 0).toFixed(2)}</p>  {/* ✅ Convert first */}
</div>

// Or with type checking
<div>
  <p>Revenue</p>
  <p>${(typeof partner.total_revenue === 'string'
      ? parseFloat(partner.total_revenue)
      : partner.total_revenue || 0).toFixed(2)}</p>
</div>
```

**Lessons Learned:**
1. **Convert DECIMAL to numbers in backend** - single source of truth
2. **Never assume database types match TypeScript types**
3. **Test with real database data** - mock data won't reveal string types
4. **Add defensive frontend parsing** as backup layer
5. **Document type conversions** in API documentation

---

### 🟡 INCIDENT 3: Null/Undefined Fields Causing Rendering Crashes

**Historical Pattern:** Database returns null for optional fields, frontend doesn't handle gracefully

**Symptoms:**
```javascript
TypeError: Cannot read property 'name' of null
TypeError: partner.promo_codes.map is not a function  // null.map()
```

**Root Cause:**
- Database allows NULL for optional foreign keys
- Backend returns `null` instead of empty arrays/default values
- Frontend assumes all fields exist

**Red Flags to Scan For:**
- [ ] Database schema with nullable columns
- [ ] Backend not providing defaults for null values
- [ ] Frontend using `.map()`, `.filter()`, `.length` without null checks
- [ ] Optional chaining (`?.`) used inconsistently

**Fix Template:**

**Backend (Data Normalization):**
```typescript
// backend/src/controllers/partner.controller.ts
res.status(200).json({
  partners: partners.map((partner) => ({
    id: partner.id,
    name: partner.name || 'Unknown',  // ✅ Default string
    total_signups: partner.total_signups || 0,  // ✅ Default number
    promo_codes: partner.promo_codes?.map(c => c.code) || [],  // ✅ Default array
    conversion_rate: partner.getConversionRate()?.toFixed(2) + '%' || '0%',  // ✅ Safe call
  }))
})
```

**Frontend (Defensive Rendering):**
```typescript
// app/admin/partners/page.tsx
{partners.map((partner) => (
  <div key={partner.id}>
    <h3>{partner.name || 'Unknown Partner'}</h3>
    <p>Signups: {partner.total_signups || 0}</p>
    <p>Conversions: {partner.total_conversions || 0}</p>
    <p>Rate: {partner.conversion_rate || '0%'}</p>

    {/* Array handling */}
    {(partner.promo_codes || []).length > 0 && (
      <div>
        {partner.promo_codes.map(code => <span key={code}>{code}</span>)}
      </div>
    )}
  </div>
))}
```

**Lessons Learned:**
1. **Normalize data in backend** - frontend should receive clean data
2. **Use `|| defaultValue` pattern** for primitives (strings, numbers)
3. **Use `|| []` pattern** for arrays before `.map()`
4. **Use optional chaining** (`?.`) for nested objects
5. **Provide TypeScript types** that reflect actual nullability

---

## Systematic Scan Checklist

When implementing new backend-to-frontend data flow, validate **ALL** these checkpoints:

### 1. API Client Architecture
- [ ] Does project use a custom API client wrapper? (Check `lib/api.ts`, `services/api.ts`)
- [ ] Does wrapper unwrap `response.data` automatically?
- [ ] Are all frontend calls using correct access pattern?
- [ ] Is response structure documented?

### 2. Backend Data Types
- [ ] Identify all DECIMAL/FLOAT/NUMERIC database columns
- [ ] Check if backend converts them to actual numbers
- [ ] Verify boolean columns return `true`/`false` (not `1`/`0`)
- [ ] Ensure date columns are ISO strings or proper Date objects

### 3. Null Safety
- [ ] List all nullable database columns
- [ ] Verify backend provides defaults for null values
- [ ] Check frontend uses null-safe operators (`?.`, `||`)
- [ ] Ensure arrays default to `[]` not `null`

### 4. Type Consistency
- [ ] TypeScript interfaces match actual API response structure
- [ ] No `any` types in API response handling
- [ ] Frontend types match backend response types
- [ ] Shared type definitions if using monorepo

### 5. Error Handling
- [ ] Frontend catches API errors gracefully
- [ ] Loading states prevent rendering undefined data
- [ ] Empty states show when data is `[]` vs error vs loading
- [ ] Console errors provide actionable debugging info

### 6. Testing Strategy
- [ ] Test with real database data (not just mocks)
- [ ] Test with null/empty database values
- [ ] Test with edge cases (empty arrays, zero numbers)
- [ ] Console logging removed or behind debug flag

---

## Auto-Scan Report Template

When user asks "why isn't my data showing?" or you detect integration issues:

```
═══════════════════════════════════════════════
🔗 FULL-STACK INTEGRATION SCAN
═══════════════════════════════════════════════

📊 ANALYSIS SCOPE
• API Endpoint: /api/partners/admin/all
• Frontend: app/admin/partners/page.tsx
• Backend: backend/src/controllers/partner.controller.ts
• Database: partners table (MySQL)

🚨 CRITICAL ISSUES FOUND: [count]

❌ ISSUE 1: API Response Access Pattern Mismatch
   File: app/admin/partners/page.tsx:113
   Problem: Accessing response.data.partners but API wrapper unwraps response
   Evidence:
     console.log(response)  // {partners: Array(4)}
     console.log(response.data)  // undefined

   Impact: Frontend receives data but code treats as undefined

   Fix:
   - BEFORE: setPartners(partnersResponse.data.partners || [])
   - AFTER:  setPartners(response.partners || [])

   Affected Lines: page.tsx:113-123

❌ ISSUE 2: DECIMAL Type Returned as String
   File: backend/src/controllers/partner.controller.ts:368
   Problem: total_revenue_generated is DECIMAL, returns as "0.00" string
   Evidence: Frontend calls .toFixed() causing TypeError

   Database Schema:
     total_revenue_generated DECIMAL(10,2)  // ⚠️ Returns string!

   Fix:
   - Add: parseFloat(partner.total_revenue_generated?.toString() || '0')
   - Also fix: total_commission_earned, pending_commission

   Affected Fields: 3 DECIMAL columns

⚠️  WARNING: Null Safety Issues
   • promo_codes can be null, frontend uses .map()
   • conversion_rate calculation not null-safe
   • Recommendation: Add || [] for arrays, || 0 for numbers

💡 OPTIMIZATIONS:
   • Add TypeScript interfaces for API responses
   • Create shared types between frontend/backend
   • Add API response logging in development
   • Document API client wrapper behavior

═══════════════════════════════════════════════
INTEGRATION HEALTH: 6/10
═══════════════════════════════════════════════

🎯 ACTION PLAN:
1. Fix API response access pattern (5 min)
2. Convert DECIMAL types to numbers in backend (10 min)
3. Add null safety to array/number fields (15 min)
4. Remove debug console.log statements (5 min)
5. Test with real database edge cases

Estimated Fix Time: 35 minutes
Risk if not fixed: HIGH (users see blank pages)

═══════════════════════════════════════════════
```

---

## Prevention Strategies

### For New API Endpoints

**Backend Checklist:**
```typescript
// 1. Convert DECIMAL to numbers
const response = {
  revenue: parseFloat(record.revenue?.toString() || '0'),
  commission: parseFloat(record.commission?.toString() || '0'),
}

// 2. Provide defaults for nulls
const response = {
  name: record.name || 'Unknown',
  tags: record.tags || [],
  metadata: record.metadata || {},
}

// 3. Ensure consistent date format
const response = {
  created_at: record.created_at?.toISOString(),  // ISO 8601
}

// 4. Document response structure
/**
 * GET /api/partners/admin/all
 * Returns: { partners: Partner[] }
 * Partner shape: { id, name, total_revenue: number, ... }
 */
```

**Frontend Checklist:**
```typescript
// 1. Check API wrapper pattern
const response = await api.get('/endpoint')
console.log('[Debug] Response structure:', response)  // Temporarily

// 2. Use null-safe access
if (response?.items) {
  setItems(response.items)
}

// 3. Provide defaults
setRevenue((response.revenue || 0).toFixed(2))
setTags(response.tags || [])

// 4. Type the response
interface PartnerResponse {
  partners: Array<{
    id: string
    name: string
    total_revenue: number  // Not string!
    promo_codes: string[]  // Not null!
  }>
}
const response = await api.get<PartnerResponse>('/partners/admin/all')
```

---

## Quick Diagnostic Commands

```bash
# 1. Check API wrapper implementation
cat lib/api.ts | grep "response.data"

# 2. Find DECIMAL columns in models
grep -r "DECIMAL\|FLOAT\|NUMERIC" backend/src/models/

# 3. Find .toFixed() usage in frontend
grep -r "\.toFixed\|\.toLocaleString" app/ components/

# 4. Check for unsafe array access
grep -r "\.map\|\.filter" app/ | grep -v "|| \[\]"

# 5. Test API response structure
curl http://localhost:3006/api/endpoint | jq .
```

---

## Cross-Skill Integration

**When Database Migration Guardian is active:**
- Validate that DECIMAL columns are handled in API layer
- Flag nullable columns that need defaults in backend

**When React/Next.js Guardian is active:**
- Ensure components handle loading/error/empty states
- Validate TypeScript types match runtime data

**When API Endpoint Guardian is active:**
- Verify consistent response structure across endpoints
- Check error responses return expected format

---

## Key Principles

1. **Backend owns data normalization** - convert types, provide defaults
2. **Frontend defends against unexpected data** - null checks, type guards
3. **Always test with real database data** - mocks hide type mismatches
4. **Document API wrapper behavior** - prevent response.data confusion
5. **Use TypeScript strictly** - types should reflect reality
6. **Log response structure during development** - catch issues early

---

## Incident Response Protocol

When user reports "data not showing":

1. **Verify API call succeeds** (check Network tab, backend logs)
2. **Log actual response structure** (console.log full response)
3. **Check API wrapper implementation** (does it unwrap response.data?)
4. **Identify type mismatches** (DECIMAL as string, null as number)
5. **Apply fixes in order**: Backend normalization → Frontend defense
6. **Remove debug logging** after fix confirmed

**Response Time Target:** 30-45 minutes from report to fix

---

## Success Metrics

✅ **Integration is healthy when:**
- API calls return HTTP 200 AND data displays in UI
- No "Cannot read property" errors in console
- No TypeError for .toFixed(), .map(), etc.
- Real database nulls/zeros handled gracefully
- Frontend types match backend response structure
- Debug logging present only in development

❌ **Integration needs attention when:**
- Successful API calls but blank UI
- Console shows data structure but code accesses wrong path
- Type errors on number methods (.toFixed, Math operations)
- Crashes when database returns null
- TypeScript types don't match runtime data
