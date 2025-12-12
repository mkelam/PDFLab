# PayFast Payment Integration Documentation

**Last Updated**: 2025-11-06
**Status**: Production Ready ✅
**Currency**: Dual-System (USD Display, ZAR Processing)

---

## 📚 Documentation Index

### Core Documentation

1. **[PAYFAST_INTEGRATION_AUDIT.md](PAYFAST_INTEGRATION_AUDIT.md)**
   - Complete PayFast integration overview
   - Dual-currency system explanation
   - Architecture and implementation details
   - **Start here** for understanding the integration

2. **[PAYFAST_TESTING_GUIDE.md](PAYFAST_TESTING_GUIDE.md)**
   - Manual testing procedures
   - Test scenarios and expected results
   - **Use this** for testing payment flows

3. **[PAYFAST_ITN_TESTING_GUIDE.md](PAYFAST_ITN_TESTING_GUIDE.md)**
   - ITN (Instant Transaction Notification) webhook testing
   - Signature validation testing
   - **Use this** for webhook integration testing

### Reference Documentation

4. **[PAYFAST_SIGNATURE_FIX.md](PAYFAST_SIGNATURE_FIX.md)**
   - Technical details of signature implementation
   - **Reference** for signature troubleshooting

5. **[PAYFAST_MULTICURRENCY_ANALYSIS.md](PAYFAST_MULTICURRENCY_ANALYSIS.md)**
   - Analysis of PayFast currency limitations
   - Why dual-currency system was necessary
   - **Reference** for understanding currency constraints

---

## 🎯 Quick Start

### Understanding PayFast Integration

**CRITICAL**: PayFast only accepts ZAR (South African Rands), not USD.

**Our Solution**: Dual-Currency System
- **Frontend**: Displays USD prices ($9.99, $29.99, $99.99)
- **Backend**: Converts to ZAR before sending to PayFast (R185, R555, R1850)
- **Database**: Stores USD amounts for customer records

### Pricing Configuration

| Plan | Display (USD) | PayFast (ZAR) | Conversions | File Size |
|------|---------------|---------------|-------------|-----------|
| **Free** | $0 | R0 | 3/month | 10MB |
| **Starter** | $9.99/mo | R185/mo | 100/month | 25MB |
| **Pro** | $29.99/mo | R555/mo | Unlimited | 100MB |
| **Enterprise** | $99.99/mo | R1850/mo | Unlimited | 500MB |

### Merchant Credentials

```env
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
PAYFAST_PASSPHRASE= (optional, empty for now)
PAYFAST_MODE=production
```

---

## 🔗 Key Endpoints

### Frontend

- **Pricing Page**: `/pricing`
- **Get Started**: `/get-started?plan=starter`
- **Payment Selection**: User chooses plan → redirects to PayFast

### Backend API

- **GET /api/payfast/plans**: List all pricing plans
- **POST /api/payfast/initialize**: Initialize payment
- **POST /api/payfast/webhook**: ITN webhook handler
- **GET /api/payfast/return**: Payment success redirect
- **GET /api/payfast/cancel**: Payment cancel redirect

---

## 🧪 Testing

### Manual Testing

1. **Read**: [PAYFAST_TESTING_GUIDE.md](PAYFAST_TESTING_GUIDE.md)
2. **Test**: Choose a plan on `/pricing`
3. **Verify**: Payment redirects to PayFast
4. **Confirm**: Check subscription created in database

### ITN Webhook Testing

1. **Read**: [PAYFAST_ITN_TESTING_GUIDE.md](PAYFAST_ITN_TESTING_GUIDE.md)
2. **Setup**: Use ngrok for local testing
3. **Test**: Trigger payment and verify ITN received
4. **Verify**: Signature validation passes

---

## 🔧 Implementation Files

### Backend

**Controllers**:
- `backend/src/controllers/payfast.controller.ts` - Payment endpoints

**Services**:
- `backend/src/services/payfast.service.ts` - PayFast API integration

**Models**:
- `backend/src/models/Subscription.ts` - Subscription data
- `backend/src/models/PaymentLog.ts` - Payment audit trail

**Routes**:
- `backend/src/routes/payfast.routes.ts` - API routes

### Frontend

**Pages**:
- `app/pricing/page.tsx` - Pricing plans display
- `app/get-started/page.tsx` - Payment selection

**Components**:
- `components/PricingCard.tsx` - Plan display component

---

## ⚠️ Important Notes

### Dual-Currency System

**Never send USD amounts to PayFast!**

```typescript
// ❌ WRONG - Will be rejected (below R50 minimum)
amount: 9.99 // USD

// ✅ CORRECT - Converted to ZAR
amount: 185 // ZAR (R185)
```

### Signature Validation

PayFast uses MD5 signature validation:
1. Sort parameters alphabetically
2. URL-encode values
3. Add passphrase (if configured)
4. Generate MD5 hash

See [PAYFAST_SIGNATURE_FIX.md](PAYFAST_SIGNATURE_FIX.md) for details.

### ITN Webhook Requirements

1. **Public URL**: Must be accessible from PayFast servers
2. **HTTPS**: Recommended for production
3. **Response**: Must return 200 OK within 10 seconds

---

## 🐛 Troubleshooting

### Payment Rejected

**Cause**: Amount below R50 minimum (PayFast requirement)
**Solution**: Ensure using `payfastPrice` (ZAR), not `displayPrice` (USD)

### Signature Mismatch

**Cause**: Incorrect parameter ordering or passphrase
**Solution**: Verify parameter sorting and passphrase configuration

### ITN Not Received

**Cause**: Webhook URL not accessible
**Solution**:
- Check firewall settings
- Use ngrok for local testing
- Verify URL in PayFast dashboard

---

## 📊 Database Schema

### Subscriptions Table

```sql
id, user_id, plan, status, amount (USD), currency (USD),
payfast_token, billing_date, next_billing_date,
started_at, ended_at, created_at
```

### Payment Logs Table

```sql
id, user_id, subscription_id, transaction_id, payfast_payment_id,
payment_type, status, amount_gross (USD), amount_fee, amount_net (USD),
currency (USD), itn_data (JSON), created_at
```

**Note**: Database stores USD for customer records, but PayFast processes ZAR.

---

## 🔐 Security

### ITN Validation (3-Step Process)

1. **Host Validation**: Verify request from PayFast IP
2. **Signature Validation**: Verify MD5 signature
3. **Server Validation**: Confirm transaction with PayFast API

### Passphrase (Optional)

**Current**: Not configured (empty passphrase)
**Recommendation**: Add passphrase for enhanced security

To enable:
1. Generate: `openssl rand -base64 24`
2. Configure in PayFast dashboard
3. Update `PAYFAST_PASSPHRASE` in .env

---

## 📈 Monitoring

### Payment Logs

All payments logged in `payment_logs` table with:
- Transaction details
- Amount and currency
- ITN raw data (JSON)
- Timestamps

### Subscription Status

Monitor subscription status:
- `pending` - Payment initiated
- `active` - Payment confirmed
- `cancelled` - User cancelled
- `failed` - Payment failed

---

## 🔄 Recent Changes

- ✅ **2025-11-06**: Dual-currency system documented
- ✅ **2025-11-05**: Signature validation fixed
- ✅ **2025-11-04**: ITN webhook stabilized
- ✅ **2025-10-29**: PayFast integration completed

---

## 📞 Support

**PayFast Dashboard**: https://www.payfast.co.za/
**PayFast Support**: support@payfast.co.za
**Documentation**: https://developers.payfast.co.za/

**For Issues**:
1. Check payment_logs table for error details
2. Review [PAYFAST_SIGNATURE_FIX.md](PAYFAST_SIGNATURE_FIX.md)
3. Test with [PAYFAST_ITN_TESTING_GUIDE.md](PAYFAST_ITN_TESTING_GUIDE.md)

---

**Status**: Production Ready ✅
**Next Review**: Before major pricing changes
