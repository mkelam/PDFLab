# PayFast ITN (Instant Transaction Notification) Testing Guide

**Purpose**: Test PayFast payment integration using sandbox mode and ngrok for local webhook testing
**Date**: 2025-10-31
**Status**: Ready for Testing

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Setup ngrok](#setup-ngrok)
3. [Configure PayFast Sandbox](#configure-payfast-sandbox)
4. [Test Payment Flow](#test-payment-flow)
5. [Verify ITN Processing](#verify-itn-processing)
6. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### Required Tools
- **ngrok**: For exposing local server to internet
- **PayFast Sandbox Account**: [https://sandbox.payfast.co.za](https://sandbox.payfast.co.za)
- **Backend Server**: Running on localhost:3006

### Sandbox Credentials
Your current PayFast configuration (from `.env`):
```env
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production
```

**Note**: For ITN testing, change `PAYFAST_MODE=sandbox` and use sandbox credentials.

---

## 2. Setup ngrok

### 2.1 Install ngrok

**Windows**:
```bash
# Download from https://ngrok.com/download
# Or use Chocolatey
choco install ngrok
```

**Mac/Linux**:
```bash
brew install ngrok
```

### 2.2 Sign Up for ngrok Account

1. Go to [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Create free account
3. Get your authtoken from [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

### 2.3 Configure ngrok

```bash
# Add authtoken
ngrok config add-authtoken <your-authtoken>
```

### 2.4 Start ngrok Tunnel

```bash
# Expose port 3006 to the internet
ngrok http 3006
```

**Expected Output**:
```
ngrok

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       28ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3006

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important**: Copy the `Forwarding` URL (e.g., `https://abc123def456.ngrok-free.app`)

### 2.5 Update Environment Variables

```bash
# Update backend/.env
PAYFAST_MODE=sandbox
API_URL=https://abc123def456.ngrok-free.app
```

**Restart backend** after changing environment:
```bash
pm2 restart pdflab-backend
# OR
cd backend && npm run dev
```

---

## 3. Configure PayFast Sandbox

### 3.1 Log into PayFast Sandbox

1. Go to [https://sandbox.payfast.co.za](https://sandbox.payfast.co.za)
2. Log in with your sandbox credentials
3. Navigate to **Settings** → **Integration**

### 3.2 Update ITN Configuration

**Set Notify URL**:
```
https://abc123def456.ngrok-free.app/api/payfast/webhook
```

**Important Settings**:
- ✅ Enable ITN (Instant Transaction Notifications)
- ✅ Enable subscription notifications
- ✅ Verify notify URL is accessible

### 3.3 Test Notify URL

PayFast will test your webhook URL:
```bash
# Expected request from PayFast:
POST /api/payfast/webhook
Content-Type: application/x-www-form-urlencoded
User-Agent: PayFast ITN

# Your server should respond with HTTP 200
```

**Check ngrok dashboard**: [http://127.0.0.1:4040](http://127.0.0.1:4040)
- You should see the test request from PayFast

---

## 4. Test Payment Flow

### 4.1 Initialize Payment (API Test)

```bash
# Get JWT token first
TOKEN=$(curl -s -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@pdflab.com","password":"TestPass123!"}' \
  | jq -r '.token')

# Initialize payment for Starter plan
curl -s -X POST http://localhost:3006/api/payfast/initialize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "starter",
    "userEmail": "testuser@pdflab.com",
    "userName": "Test User"
  }' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Payment initialized",
  "payment_url": "https://sandbox.payfast.co.za/eng/process",
  "payment_data": {
    "merchant_id": "10000100",
    "merchant_key": "46f0cd694581a",
    "return_url": "https://abc123def456.ngrok-free.app/api/payfast/return",
    "cancel_url": "https://abc123def456.ngrok-free.app/api/payfast/cancel",
    "notify_url": "https://abc123def456.ngrok-free.app/api/payfast/webhook",
    "name_first": "Test User",
    "email_address": "testuser@pdflab.com",
    "m_payment_id": "uuid-here",
    "amount": "9.99",
    "item_name": "PDFLab Starter Plan",
    "subscription_type": "1",
    "billing_date": "2025-11-30",
    "recurring_amount": "9.99",
    "frequency": "3",
    "cycles": "0",
    "signature": "md5-hash-here"
  },
  "transaction_id": "uuid-here",
  "subscription_id": "uuid-here"
}
```

### 4.2 Complete Payment (Browser Test)

1. **Create HTML Form**:

Save this as `test-payment.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>PayFast Sandbox Test</title>
</head>
<body>
    <h2>PayFast Sandbox Payment Test</h2>
    <form action="https://sandbox.payfast.co.za/eng/process" method="POST">
        <!-- Replace with actual values from API response -->
        <input type="hidden" name="merchant_id" value="10000100">
        <input type="hidden" name="merchant_key" value="46f0cd694581a">
        <input type="hidden" name="return_url" value="https://abc123def456.ngrok-free.app/api/payfast/return">
        <input type="hidden" name="cancel_url" value="https://abc123def456.ngrok-free.app/api/payfast/cancel">
        <input type="hidden" name="notify_url" value="https://abc123def456.ngrok-free.app/api/payfast/webhook">
        <input type="hidden" name="name_first" value="Test User">
        <input type="hidden" name="email_address" value="testuser@pdflab.com">
        <input type="hidden" name="m_payment_id" value="test-payment-123">
        <input type="hidden" name="amount" value="9.99">
        <input type="hidden" name="item_name" value="PDFLab Starter Plan">
        <input type="hidden" name="subscription_type" value="1">
        <input type="hidden" name="billing_date" value="2025-11-30">
        <input type="hidden" name="recurring_amount" value="9.99">
        <input type="hidden" name="frequency" value="3">
        <input type="hidden" name="cycles" value="0">
        <input type="hidden" name="signature" value="your-signature-here">

        <button type="submit">Pay with PayFast Sandbox</button>
    </form>
</body>
</html>
```

2. **Open in Browser** and click "Pay with PayFast Sandbox"

3. **Use Sandbox Test Cards**:

| Card Type | Card Number | Expiry | CVV |
|-----------|-------------|--------|-----|
| Visa | 4000 0000 0000 0002 | Any future date | 123 |
| Mastercard | 5200 0000 0000 0015 | Any future date | 123 |
| Failed Payment | 4000 0000 0000 0341 | Any future date | 123 |

4. **Complete Payment**:
   - Enter test card details
   - Click "Pay Now"
   - PayFast will redirect to return URL
   - PayFast will send ITN to your webhook

---

## 5. Verify ITN Processing

### 5.1 Monitor ngrok Dashboard

Open [http://127.0.0.1:4040](http://127.0.0.1:4040) in your browser.

You should see:
- **Request #1**: Payment initialization (from your API)
- **Request #2**: ITN notification (from PayFast)
- **Request #3**: Return redirect (from PayFast)

### 5.2 Check Backend Logs

```bash
# If using PM2
pm2 logs pdflab-backend --lines 50

# If running with npm
# Check console output
```

**Expected Log Output**:
```
[PayFast ITN] Received notification for payment test-payment-123
[PayFast ITN] Host verification: PASSED
[PayFast ITN] Signature verification: PASSED
[PayFast ITN] Server verification: PASSED
[PayFast ITN] Payment status: COMPLETE
[PayFast ITN] Subscription activated for user uuid-here
✓ Subscription updated successfully
✓ User plan upgraded to starter
```

### 5.3 Verify Database Updates

```bash
# Check subscription status
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "
SELECT id, user_id, plan, status, amount, currency
FROM subscriptions
WHERE payfast_token = 'test-payment-123';
"

# Expected output:
# +------+------+------+--------+-------+----------+
# | id   | user | plan | status | amount| currency |
# +------+------+------+--------+-------+----------+
# | uuid | uuid |starter|active | 9.99  | USD      |
# +------+------+------+--------+-------+----------+

# Check payment log
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "
SELECT transaction_id, status, amount_gross, payment_type, created_at
FROM payment_logs
WHERE transaction_id = 'test-payment-123';
"
```

### 5.4 Verify User Account Upgrade

```bash
# Check user plan
curl -s -X GET http://localhost:3006/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.user.plan'

# Expected: "starter"
```

---

## 6. Troubleshooting

### Issue: ngrok Tunnel Not Accessible

**Symptoms**: PayFast can't reach your webhook URL

**Solution**:
```bash
# Check ngrok is running
curl http://127.0.0.1:4040/api/tunnels

# Restart ngrok if needed
ngrok http 3006

# Update PayFast notify URL with new ngrok URL
```

### Issue: Signature Verification Failed

**Symptoms**: ITN rejected with "Invalid signature"

**Check**:
1. Verify `PAYFAST_PASSPHRASE` in `.env` matches PayFast settings
2. Ensure all fields are in correct order for signature generation
3. Check for extra whitespace or URL encoding issues

**Debug**:
```bash
# Add debug logging to payfast.service.ts
console.log('Signature data:', signatureData)
console.log('Generated signature:', signature)
console.log('Received signature:', params.signature)
```

### Issue: Host Verification Failed

**Symptoms**: ITN rejected with "Invalid host"

**Check**:
1. Verify ngrok URL is publicly accessible
2. Check firewall settings
3. Ensure backend is running on correct port

**Test**:
```bash
# Test from external network
curl https://your-ngrok-url.ngrok-free.app/health
```

### Issue: Server Verification Failed

**Symptoms**: PayFast server doesn't confirm payment

**Check**:
1. Verify `PAYFAST_MODE=sandbox` in `.env`
2. Check PayFast sandbox is operational
3. Review ITN data format

---

## 7. Test Scenarios

### 7.1 Successful Payment
1. Initialize payment via API
2. Complete payment with valid test card
3. Verify ITN received and processed
4. Confirm database updates
5. Check user account upgraded

### 7.2 Failed Payment
1. Initialize payment via API
2. Use failed test card (4000 0000 0000 0341)
3. Verify ITN received with "FAILED" status
4. Confirm no database updates
5. Check user account unchanged

### 7.3 Cancelled Payment
1. Initialize payment via API
2. Click "Cancel" on PayFast page
3. Verify redirect to cancel URL
4. Check no subscription created

### 7.4 Recurring Payment (Month 2)
1. Wait for billing date (or manually trigger via PayFast sandbox)
2. Verify ITN received for subscription payment
3. Check payment log entry created
4. Confirm user access remains active

---

## 8. Production Readiness Checklist

Before moving to production:

- [ ] All sandbox tests passing
- [ ] ITN webhook verified working
- [ ] Signature validation tested
- [ ] Database updates confirmed
- [ ] Error handling tested
- [ ] Switch to production credentials
- [ ] Update PayFast account with production webhook URL
- [ ] Use production domain (no ngrok)
- [ ] Enable SSL certificate
- [ ] Test with real payment (small amount)
- [ ] Monitor logs for 24 hours
- [ ] Set up alerts for failed ITNs

---

## 9. Quick Reference

### Start Testing Session

```bash
# Terminal 1: Start ngrok
ngrok http 3006

# Terminal 2: Update .env and restart backend
nano backend/.env
# Change: PAYFAST_MODE=sandbox
# Change: API_URL=https://your-ngrok-url.ngrok-free.app
pm2 restart pdflab-backend

# Terminal 3: Monitor logs
pm2 logs pdflab-backend --lines 0

# Browser: Open ngrok dashboard
http://127.0.0.1:4040
```

### PayFast Sandbox Test Cards

| Purpose | Card Number | Result |
|---------|-------------|--------|
| Success | 4000 0000 0000 0002 | Payment successful |
| Failure | 4000 0000 0000 0341 | Payment declined |
| 3D Secure | 4000 0000 0000 3220 | Requires authentication |

### Useful Commands

```bash
# Check subscription status
curl -s http://localhost:3006/api/payfast/subscription/{subscription_id} \
  -H "Authorization: Bearer $TOKEN" | jq

# Manually trigger ITN (for testing)
curl -X POST http://localhost:3006/api/payfast/webhook \
  -d "m_payment_id=test-123&pf_payment_id=12345&payment_status=COMPLETE&amount_gross=9.99&signature=test"

# View payment logs
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** pdflab -e "
SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 5;"
```

---

**Status**: Ready for ITN Testing ✅
**ngrok Required**: Yes
**Estimated Time**: 30-60 minutes
**Support**: PayFast Sandbox: sandbox@payfast.co.za
