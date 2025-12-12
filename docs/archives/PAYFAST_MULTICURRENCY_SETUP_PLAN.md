# 🌍 PayFast Multi-Currency Implementation Plan

**Date**: 2025-11-05
**Goal**: Enable USD payments for US-based customers
**Status**: Investigation & Setup Phase
**Priority**: HIGH (better customer experience)

---

## 🎯 Why Multi-Currency Makes Sense

### **Your Customer Base**
- ✅ Primarily US-based customers
- ✅ Expect to see USD pricing
- ✅ Confused by ZAR (South African Rand)

### **Current Experience (Confusing)**
```
Website:         "Subscribe for $4.55/month"
PayFast Page:    Shows "R85.00" ← Customer confused!
Customer thinks: "Wait, what currency is this?"
```

### **With Multi-Currency (Professional)**
```
Website:         "Subscribe for $4.55/month"
PayFast Page:    Shows "$4.55" ← Perfect!
Customer thinks: "This matches, let's pay!"
```

**Result**: Higher conversion rates, better UX, more professional appearance

---

## 📋 Step-by-Step Implementation Plan

### **Phase 1: Investigation (Today)**

#### **Step 1.1: Contact PayFast Support**

**Email Template** (copy and send):

```
To: support@payfast.co.za
Subject: Multi-Currency Pricing Setup - Merchant 25263515

Hello PayFast Support Team,

I am the merchant for account ID 25263515 (pdflab.pro). I am currently
processing subscription payments in ZAR but display prices in USD on my
website, as my customers are primarily US-based.

I would like to enable Multi-Currency Pricing to improve the customer
experience. I have the following questions:

1. ACCOUNT ELIGIBILITY
   - Does my merchant account (25263515) support Multi-Currency Pricing?
   - Are there any requirements or prerequisites to enable it?
   - Are there additional fees for multi-currency transactions?

2. DASHBOARD SETUP
   - How do I enable Multi-Currency Pricing in my dashboard?
   - Which currencies can I accept? (specifically USD)
   - Can I set USD as the primary display currency?

3. TECHNICAL IMPLEMENTATION
   - Do I need to modify my integration code?
   - Should I send USD amounts or ZAR amounts in payment data?
   - Do I need to add a "currency" parameter?
   - Will my signature generation still work with passphrase "<PAYFAST_PASSPHRASE>"?

4. EXCHANGE RATES
   - What exchange rate do you use for USD → ZAR conversion?
   - How often are rates updated?
   - Can I see the current USD rate?

5. SETTLEMENT
   - I understand I still receive ZAR settlements - is that correct?
   - Are there any changes to settlement timing or fees?

CURRENT WORKING SETUP:
- Integration: Subscription billing (recurring payments)
- Passphrase: <PAYFAST_PASSPHRASE>
- Payment data example: amount=85.00 (ZAR)
- Signature generation: Working perfectly
- Website: https://pdflab.pro

DESIRED SETUP:
- Display: $4.55 USD on website AND PayFast page
- Processing: Customer pays $4.55 USD
- Settlement: I receive equivalent in ZAR

Please provide:
- Step-by-step instructions to enable multi-currency
- Any code changes required
- Documentation links for multi-currency integration
- Timeline for setup

Thank you for your assistance!

Best regards,
[Your Name]
PDFLab
pdflab.pro
```

**Send this email NOW and note the response time.**

---

#### **Step 1.2: Check Your PayFast Dashboard**

**Login and investigate:**

1. **Navigate to Dashboard**
   ```
   URL: https://www.payfast.co.za
   Login with your credentials
   ```

2. **Check Settings → Integration**
   - Look for "Multi-Currency Pricing" option
   - Look for "Currency Settings"
   - Look for "International Payments"
   - Take screenshots of what you see

3. **Check Settings → Security**
   - Confirm passphrase is still: <PAYFAST_PASSPHRASE>
   - Note any multi-currency related settings

4. **Check Account Type**
   - What type of account do you have?
   - Is there an "upgrade" option for multi-currency?

**Document your findings here:**
```
□ Multi-Currency option found: YES / NO
□ Location in dashboard: __________
□ Status: Enabled / Disabled / Not Available
□ Supported currencies shown: __________
□ Account upgrade required: YES / NO
```

---

#### **Step 1.3: Research PayFast Documentation**

**Search for these resources:**

1. **PayFast Developer Docs**
   - https://developers.payfast.co.za
   - Look for "Multi-Currency" section
   - Look for API parameter "currency"

2. **PayFast Support Articles**
   - Search for "multi-currency pricing"
   - Search for "USD payments"
   - Search for "international customers"

3. **Integration Examples**
   - Look for code examples with currency parameter
   - Check if signature generation changes

**Document links found:**
```
□ Documentation URL: __________
□ API reference: __________
□ Code examples: __________
```

---

### **Phase 2: Technical Research (After PayFast Response)**

#### **Step 2.1: Understand Technical Requirements**

**Key Questions to Answer:**

1. **Payment Data Format**
   ```javascript
   // Option A: Send USD amounts
   {
     amount: "4.55",           // USD
     currency: "USD",          // New parameter?
     recurring_amount: "4.55"  // USD
   }

   // Option B: Send ZAR amounts, PayFast converts display
   {
     amount: "85.00",          // ZAR (as now)
     currency: "USD",          // Display currency?
     recurring_amount: "85.00" // ZAR
   }

   // Option C: No code changes
   {
     amount: "85.00",          // ZAR
     // PayFast auto-detects from dashboard settings
   }
   ```

2. **Signature Generation**
   ```javascript
   // Does adding "currency" parameter change signature?
   const data = {
     merchant_id: "25263515",
     merchant_key: "<PAYFAST_MERCHANT_KEY>",
     amount: "4.55",
     currency: "USD",  // ← Does this affect signature?
     // ... other fields
   };

   // Is signature order still the same?
   // Is passphrase still required?
   ```

3. **Parameter Order**
   ```javascript
   // Where does "currency" go in PAYFAST_PARAM_ORDER?
   const PAYFAST_PARAM_ORDER = [
     'merchant_id',
     'merchant_key',
     'return_url',
     'cancel_url',
     'notify_url',
     'name_first',
     'name_last',
     'email_address',
     'cell_number',
     'm_payment_id',
     'amount',
     'currency',  // ← Insert here? Or different position?
     'item_name',
     // ...
   ];
   ```

---

#### **Step 2.2: Create Test Scenarios**

**Signature Testing Script:**

Create this file: `backend/test-multicurrency-signature.js`

```javascript
const crypto = require('crypto');

// Test if adding currency parameter works
const PAYFAST_PARAM_ORDER_WITH_CURRENCY = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'currency',  // Adding currency parameter
  'item_name',
  'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles'
];

const testDataUSD = {
  merchant_id: '25263515',
  merchant_key: '<PAYFAST_MERCHANT_KEY>',
  return_url: 'https://pdflab.pro/payment/success',
  cancel_url: 'https://pdflab.pro/payment/cancel',
  notify_url: 'https://pdflab.pro/api/payfast/webhook',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'test@example.com',
  m_payment_id: 'test-usd-123',
  amount: '4.55',       // USD amount
  currency: 'USD',      // Currency code
  item_name: 'PDFLab Starter Plan',
  custom_str1: 'user-123',
  custom_str2: 'starter',
  email_confirmation: '1',
  confirmation_address: 'test@example.com',
  subscription_type: '1',
  billing_date: '2025-12-05',
  recurring_amount: '4.55',  // USD
  frequency: '3',
  cycles: '0'
};

function generateSignature(data, paramOrder, passphrase) {
  let paramString = '';

  for (const key of paramOrder) {
    if (data[key] && data[key] !== '') {
      const value = encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+');
      paramString += `${key}=${value}&`;
    }
  }

  paramString = paramString.slice(0, -1);

  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();
}

console.log('Multi-Currency Signature Test');
console.log('=============================\n');

console.log('Test Data:');
console.log('  Amount: $4.55 USD');
console.log('  Currency: USD');
console.log('  Passphrase: <PAYFAST_PASSPHRASE>\n');

const signature = generateSignature(
  testDataUSD,
  PAYFAST_PARAM_ORDER_WITH_CURRENCY,
  '<PAYFAST_PASSPHRASE>'
);

console.log('Generated Signature:', signature);
console.log('');
console.log('⚠️  IMPORTANT: Do NOT test this in production yet!');
console.log('   Only use after PayFast confirms multi-currency setup.');
```

**Run this ONLY after PayFast confirms setup!**

---

### **Phase 3: Dashboard Setup (After PayFast Approval)**

#### **Step 3.1: Enable Multi-Currency in Dashboard**

**Based on PayFast's instructions:**

1. Login to dashboard
2. Navigate to Settings → Integration
3. Enable "Multi-Currency Pricing"
4. Select USD as supported currency
5. Set USD as primary/default currency
6. Save settings

**Verify:**
```
□ Multi-currency enabled
□ USD currency added
□ Settings saved
□ Test transaction option available
```

---

#### **Step 3.2: Update Pricing Configuration**

**Create: `backend/src/config/multicurrency.config.ts`**

```typescript
export const MULTI_CURRENCY_CONFIG = {
  enabled: true,
  defaultCurrency: 'USD',
  supportedCurrencies: ['USD', 'ZAR'],

  // Pricing in USD (actual charge amounts)
  pricingUSD: {
    starter: 4.55,
    pro: 13.50,
    enterprise: 99.99
  },

  // For reference only (PayFast handles conversion)
  approximateZAR: {
    starter: 85,
    pro: 250,
    enterprise: 1850
  }
};
```

---

### **Phase 4: Code Implementation (After Confirmation)**

#### **Step 4.1: Update PayFast Service**

**File: `backend/src/services/payfast.service.ts`**

**IF PayFast confirms currency parameter is needed:**

```typescript
// Add currency to parameter order (IF CONFIRMED BY PAYFAST)
const PAYFAST_PARAM_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'currency',  // ← ADD THIS (if confirmed)
  'item_name',
  // ... rest of parameters
];

// Update payment data interface
interface SubscriptionPaymentData extends PaymentData {
  currency?: string;  // Add optional currency field
  subscription_type: string;
  billing_date: string;
  recurring_amount: string;
  frequency: string;
  cycles: string;
}

// Update createSubscriptionPaymentData function
export function createSubscriptionPaymentData(params: {
  userId: string
  userEmail: string
  userName: string
  planName: string
  planPrice: number
  transactionId: string
  currency?: string  // Add optional currency parameter
}): SubscriptionPaymentData & { signature: string } {
  const apiUrl = process.env['API_URL'] || 'http://localhost:3006'
  const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000'
  const billingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const nameParts = params.userName.trim().split(' ')
  const firstName = nameParts[0] || 'User'
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Account'

  const paymentData: SubscriptionPaymentData = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: `${frontendUrl}/payment/success`,
    cancel_url: `${frontendUrl}/payment/cancel`,
    notify_url: process.env['PAYFAST_ITN_URL'] || `${apiUrl}/api/payfast/webhook`,
    name_first: firstName,
    name_last: lastName,
    email_address: params.userEmail,
    m_payment_id: params.transactionId,
    amount: params.planPrice.toFixed(2),
    currency: params.currency || 'USD',  // ← ADD THIS (if confirmed)
    item_name: `PDFLab ${params.planName} Plan`,
    item_description: `PDFLab ${params.planName} monthly subscription`,
    custom_str1: params.userId,
    custom_str2: params.planName.toLowerCase(),
    email_confirmation: '1',
    confirmation_address: params.userEmail,
    subscription_type: '1',
    billing_date: billingDate.toISOString().split('T')[0],
    recurring_amount: params.planPrice.toFixed(2),
    frequency: '3',
    cycles: '0'
  }

  const signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase)

  return {
    ...paymentData,
    signature
  }
}
```

---

#### **Step 4.2: Update Controller**

**File: `backend/src/controllers/payfast.controller.ts`**

```typescript
// Update pricing plans to use USD amounts directly
const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 4.55,  // USD - actual charge amount
    currency: 'USD',
    conversions: 100,
    maxFileSize: 26214400,
    // ... features
  },
  pro: {
    name: 'Pro',
    price: 13.50,  // USD - actual charge amount
    currency: 'USD',
    conversions: -1,
    maxFileSize: 104857600,
    // ... features
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,  // USD - actual charge amount
    currency: 'USD',
    conversions: -1,
    maxFileSize: 524288000,
    // ... features
  }
}

// Update payment initialization
const paymentData = payfastService.createSubscriptionPaymentData({
  userId: user.id,
  userEmail: userEmail || user.email,
  userName: userName || user.name || user.email.split('@')[0],
  planName: plan.name,
  planPrice: plan.price,  // Now USD amount
  currency: 'USD',         // ← ADD THIS (if confirmed)
  transactionId
})
```

---

### **Phase 5: Testing (Sandbox First!)**

#### **Step 5.1: Test in Sandbox Environment**

**DO NOT test in production first!**

1. **Setup Sandbox Credentials**
   ```env
   PAYFAST_MERCHANT_ID=10000100
   PAYFAST_MERCHANT_KEY=46f0cd694581a
   PAYFAST_PASSPHRASE=[sandbox passphrase]
   PAYFAST_MODE=sandbox
   ```

2. **Enable Multi-Currency in Sandbox Dashboard**
   - https://sandbox.payfast.co.za
   - Same steps as production

3. **Test Payment Flow**
   - Create test subscription
   - Verify USD amount shown
   - Complete test payment
   - Check ITN webhook

4. **Verify Results**
   ```
   □ Amount displays in USD: $4.55
   □ No signature mismatch error
   □ Payment completes successfully
   □ ITN webhook received
   □ Subscription activated
   ```

---

#### **Step 5.2: Production Testing Plan**

**ONLY after sandbox success:**

1. **Soft Launch**
   - Enable multi-currency in production
   - Test with your own account first
   - Use small amount ($0.50 test if possible)

2. **Monitor Closely**
   - Watch first 10-20 transactions
   - Check signature validation rate
   - Monitor exchange rates
   - Track customer feedback

3. **Success Criteria**
   ```
   ✅ 100% signature validation success
   ✅ USD amounts displayed correctly
   ✅ Customers can complete payments
   ✅ No increase in abandoned carts
   ✅ Settlement amounts match expectations
   ```

---

### **Phase 6: Deployment (After Successful Testing)**

#### **Step 6.1: Update VPS Configuration**

**ONLY if code changes are needed:**

```bash
# Build new Docker image
cd backend
docker build -t mkelam/pdflab-backend:multicurrency .

# Tag as latest
docker tag mkelam/pdflab-backend:multicurrency mkelam/pdflab-backend:latest

# Push to Docker Hub
docker push mkelam/pdflab-backend:multicurrency
docker push mkelam/pdflab-backend:latest

# Deploy to VPS
ssh root@141.136.44.168
docker pull mkelam/pdflab-backend:latest
docker stop pdflab-backend-prod
docker rm pdflab-backend-prod

docker run -d \
  --name pdflab-backend-prod \
  --network app_pdflab-network \
  -p 3006:3006 \
  -v /root/backend.env:/app/.env:ro \
  --restart unless-stopped \
  mkelam/pdflab-backend:latest
```

**IF no code changes needed (dashboard only):**
- Just enable multi-currency in PayFast dashboard
- No deployment required!

---

### **Phase 7: Monitoring & Optimization**

#### **Step 7.1: Track Metrics**

**Monitor these KPIs:**

1. **Payment Success Rate**
   - Before: __%
   - After: __% (should increase)

2. **Abandoned Cart Rate**
   - Before: __%
   - After: __% (should decrease)

3. **Signature Validation**
   - Target: 100% success
   - Alert if < 99%

4. **Exchange Rate Impact**
   - Track ZAR received per USD charged
   - Compare to your manual R85/$4.55 rate
   - Calculate revenue impact

#### **Step 7.2: Customer Feedback**

**Questions to ask:**

1. "Did the payment process seem clear and straightforward?"
2. "Were you comfortable with the USD pricing?"
3. "Did anything confuse you during checkout?"

---

## 📊 Expected Benefits

### **For Customers (US-based)**

**Before Multi-Currency:**
```
😕 "Why is it showing R85? What's my USD rate?"
😕 "Is this a scam? Currency doesn't match website"
😕 "Let me calculate the conversion... *abandons cart*"
```

**After Multi-Currency:**
```
😊 "Perfect! $4.55 matches what I saw"
😊 "Clear USD pricing, I trust this"
😊 "*completes purchase immediately*"
```

### **For Your Business**

✅ **Higher Conversion**: Clearer pricing = fewer abandoned carts
✅ **More Professional**: Matches customer expectations
✅ **Reduced Support**: Fewer "why ZAR?" questions
✅ **Better UX**: Seamless payment experience

---

## ⚠️ Important Considerations

### **Exchange Rate Risk**

**Your Manual Rate:**
- $4.55 = R85.00 (rate: 18.68)

**PayFast's Rate (unknown):**
- $4.55 = R?? (they calculate)

**Potential Scenarios:**

1. **PayFast rate better (R90)**: ✅ You earn more per transaction
2. **PayFast rate same (R85)**: ✅ No change
3. **PayFast rate worse (R75)**: ⚠️ You lose R10 per transaction

**Action:** Ask PayFast about their current USD→ZAR rate before enabling!

### **Fee Structure**

**Questions to ask PayFast:**
- Are there additional fees for multi-currency?
- Do conversion fees apply?
- Are transaction fees different for USD vs ZAR?

---

## 🎯 Immediate Action Items

### **TODAY** (Priority 1)

- [ ] Send email to PayFast support (template above)
- [ ] Login to PayFast dashboard and investigate
- [ ] Take screenshots of dashboard options
- [ ] Document current findings

### **AFTER PAYFAST RESPONSE** (Priority 2)

- [ ] Review PayFast's multi-currency documentation
- [ ] Understand technical requirements
- [ ] Check if code changes needed
- [ ] Verify exchange rates are acceptable

### **TESTING PHASE** (Priority 3)

- [ ] Enable multi-currency in sandbox
- [ ] Test signature generation
- [ ] Test payment flow
- [ ] Verify USD amounts display correctly

### **PRODUCTION** (Priority 4)

- [ ] Enable in production dashboard (if no code changes)
- [ ] Deploy new Docker image (if code changes needed)
- [ ] Monitor first transactions closely
- [ ] Track customer feedback

---

## 📞 Support Contacts

### **PayFast Support**
- **Email**: support@payfast.co.za
- **Phone**: +27 21 447 7952
- **Hours**: Mon-Fri 08:00-17:00 SAST

### **Questions to Ask**
1. Does merchant 25263515 support multi-currency?
2. How do I enable USD payments?
3. What code changes are required?
4. What's the current USD → ZAR exchange rate?
5. Are there additional fees?

---

## ✅ Success Criteria

**Multi-currency is successful if:**

- ✅ Customers see USD ($4.55) on PayFast page
- ✅ No signature mismatch errors
- ✅ Payment completion rate increases
- ✅ Exchange rate is acceptable (≥ R18/$)
- ✅ No increase in fees
- ✅ Customer feedback is positive

---

## 🎓 Key Takeaway

**Multi-currency is likely worth it for your US customer base!**

**BUT** - Get all details from PayFast first:
1. ✅ Confirm account supports it
2. ✅ Understand exchange rates
3. ✅ Know technical requirements
4. ✅ Test thoroughly in sandbox

**Don't rush** - Your current system works perfectly. Take time to set up multi-currency properly.

---

**Next Action:** Send that email to PayFast support NOW! 📧

**Status**: ⏳ Awaiting PayFast response
**Timeline**: 1-2 business days for response
**Risk**: LOW (can test in sandbox first)
**Benefit**: HIGH (better customer experience)

---

*Once you get PayFast's response, we'll create a specific implementation plan based on their requirements.*
