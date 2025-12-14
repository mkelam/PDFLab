# PayPal Webhook Setup Guide

This guide explains how to configure PayPal webhooks for production-ready payment notifications.

## Overview

PayPal webhooks notify your application about payment events in real-time, such as:
- Payment completed
- Payment failed
- Subscription activated
- Subscription cancelled
- Refunds processed

## Step 1: Create a Webhook in PayPal Dashboard

### For Sandbox (Testing)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Select **Sandbox** mode
4. Click on your app (e.g., "NVP 1765687527096")
5. Scroll down to **Webhooks** section
6. Click **Add Webhook**

### For Production (Live)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Select **Live** mode
4. Click on your production app
5. Scroll down to **Webhooks** section
6. Click **Add Webhook**

## Step 2: Configure Webhook URL

### Development (with tunnel)

For local development, you need a public URL. Use ngrok or localtunnel:

```bash
# Using ngrok
ngrok http 3006

# Using localtunnel
npx localtunnel --port 3006
```

Then set your webhook URL to:
```
https://your-tunnel-url.ngrok.io/api/paypal/webhook
```

### Production

Set your webhook URL to:
```
https://api.pdflab.pro/api/paypal/webhook
```

Or if using the main domain:
```
https://pdflab.pro/api/paypal/webhook
```

## Step 3: Select Webhook Events

Select the following events for full payment tracking:

### Payment Events (Required)
- `PAYMENT.CAPTURE.COMPLETED` - Payment successfully captured
- `PAYMENT.CAPTURE.DENIED` - Payment capture denied
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded

### Subscription Events (For Recurring Payments)
- `BILLING.SUBSCRIPTION.CREATED` - New subscription created
- `BILLING.SUBSCRIPTION.ACTIVATED` - Subscription activated
- `BILLING.SUBSCRIPTION.UPDATED` - Subscription updated
- `BILLING.SUBSCRIPTION.CANCELLED` - Subscription cancelled
- `BILLING.SUBSCRIPTION.SUSPENDED` - Subscription suspended (payment failed)
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED` - Subscription payment failed

### Order Events (Optional but Recommended)
- `CHECKOUT.ORDER.APPROVED` - Order approved by customer
- `CHECKOUT.ORDER.COMPLETED` - Order completed

## Step 4: Get Your Webhook ID

After creating the webhook:

1. The webhook will appear in your webhooks list
2. Click on the webhook to view details
3. Copy the **Webhook ID** (looks like: `5GP028318U3802254`)

## Step 5: Update Environment Variables

Add the webhook ID to your `.env` file:

```env
# Development
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id

# Production (.env.production)
PAYPAL_WEBHOOK_ID=your_live_webhook_id
```

## Step 6: Test the Webhook

### Using PayPal Webhook Simulator

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Webhooks** → **Webhooks Simulator**
3. Select your webhook
4. Choose an event type (e.g., `PAYMENT.CAPTURE.COMPLETED`)
5. Click **Send Test**
6. Check your server logs for the webhook receipt

### Using cURL (Manual Test)

```bash
curl -X POST http://localhost:3006/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "id": "TEST123",
      "custom_id": "your-transaction-id",
      "amount": {
        "value": "9.99",
        "currency_code": "USD"
      }
    }
  }'
```

## Webhook Event Reference

### PAYMENT.CAPTURE.COMPLETED

Triggered when a payment is successfully captured.

```json
{
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "5O190127TN364715T",
    "status": "COMPLETED",
    "amount": {
      "value": "9.99",
      "currency_code": "USD"
    },
    "custom_id": "your-transaction-reference"
  }
}
```

### BILLING.SUBSCRIPTION.ACTIVATED

Triggered when a subscription becomes active.

```json
{
  "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
  "resource": {
    "id": "I-BW452GLLEP1G",
    "status": "ACTIVE",
    "custom_id": "your-subscription-reference",
    "billing_info": {
      "next_billing_time": "2024-02-15T10:00:00Z"
    }
  }
}
```

### BILLING.SUBSCRIPTION.CANCELLED

Triggered when a subscription is cancelled.

```json
{
  "event_type": "BILLING.SUBSCRIPTION.CANCELLED",
  "resource": {
    "id": "I-BW452GLLEP1G",
    "status": "CANCELLED",
    "custom_id": "your-subscription-reference"
  }
}
```

## Webhook Security

### Signature Verification

PayPal signs all webhook notifications. Our webhook handler verifies signatures using:

1. `PAYPAL-TRANSMISSION-ID` - Unique ID for this notification
2. `PAYPAL-TRANSMISSION-TIME` - Timestamp
3. `PAYPAL-TRANSMISSION-SIG` - Signature
4. `PAYPAL-CERT-URL` - Certificate URL
5. `PAYPAL-AUTH-ALGO` - Algorithm used

The verification is handled automatically by our `verifyWebhookSignature` function.

### Best Practices

1. **Always verify signatures** - Never trust webhook data without verification
2. **Use HTTPS** - Always use HTTPS for webhook URLs in production
3. **Respond quickly** - Return 200 OK within 30 seconds
4. **Handle duplicates** - PayPal may retry webhooks; use idempotent operations
5. **Log everything** - Log all webhook events for debugging

## Troubleshooting

### Webhook Not Receiving Events

1. Check your tunnel is running (for local development)
2. Verify the webhook URL is correct in PayPal dashboard
3. Check server logs for errors
4. Ensure your server is responding with 200 OK

### Signature Verification Failing

1. Ensure `PAYPAL_WEBHOOK_ID` is set correctly
2. Check that you're using the correct credentials (sandbox vs live)
3. Verify the webhook ID matches the one in PayPal dashboard

### Missing Events

1. Ensure all required events are selected in PayPal dashboard
2. Check that your subscription/order is using the correct PayPal app

## Production Checklist

- [ ] Create production webhook in PayPal Live dashboard
- [ ] Set production webhook URL (https://api.pdflab.pro/api/paypal/webhook)
- [ ] Select all required events
- [ ] Copy production webhook ID to `.env.production`
- [ ] Test with PayPal webhook simulator
- [ ] Monitor webhook logs after go-live
