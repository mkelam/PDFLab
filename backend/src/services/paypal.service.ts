import crypto from 'crypto'
import logger from '../config/logger'

/**
 * PayPal Payment Gateway Service
 * Handles payment initialization, webhook verification, and subscription management
 *
 * API Reference: https://developer.paypal.com/docs/api/overview/
 */

// PayPal configuration from environment
const PAYPAL_CONFIG = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  mode: process.env.PAYPAL_MODE || 'sandbox',
  baseUrl: process.env.PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com',
  successUrl: process.env.PAYPAL_SUCCESS_URL || '',
  cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
  webhookId: process.env.PAYPAL_WEBHOOK_ID || ''
}

// PayPal order statuses
export enum PayPalOrderStatus {
  CREATED = 'CREATED',
  SAVED = 'SAVED',
  APPROVED = 'APPROVED',
  VOIDED = 'VOIDED',
  COMPLETED = 'COMPLETED',
  PAYER_ACTION_REQUIRED = 'PAYER_ACTION_REQUIRED'
}

// PayPal subscription statuses
export enum PayPalSubscriptionStatus {
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

// PayPal webhook event types
export enum PayPalWebhookEvent {
  // Payment events
  PAYMENT_CAPTURE_COMPLETED = 'PAYMENT.CAPTURE.COMPLETED',
  PAYMENT_CAPTURE_DENIED = 'PAYMENT.CAPTURE.DENIED',
  PAYMENT_CAPTURE_REFUNDED = 'PAYMENT.CAPTURE.REFUNDED',
  PAYMENT_CAPTURE_REVERSED = 'PAYMENT.CAPTURE.REVERSED',
  PAYMENT_CAPTURE_PENDING = 'PAYMENT.CAPTURE.PENDING',
  // Subscription events
  BILLING_SUBSCRIPTION_CREATED = 'BILLING.SUBSCRIPTION.CREATED',
  BILLING_SUBSCRIPTION_ACTIVATED = 'BILLING.SUBSCRIPTION.ACTIVATED',
  BILLING_SUBSCRIPTION_UPDATED = 'BILLING.SUBSCRIPTION.UPDATED',
  BILLING_SUBSCRIPTION_CANCELLED = 'BILLING.SUBSCRIPTION.CANCELLED',
  BILLING_SUBSCRIPTION_SUSPENDED = 'BILLING.SUBSCRIPTION.SUSPENDED',
  BILLING_SUBSCRIPTION_EXPIRED = 'BILLING.SUBSCRIPTION.EXPIRED',
  BILLING_SUBSCRIPTION_PAYMENT_FAILED = 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  // Order events
  CHECKOUT_ORDER_APPROVED = 'CHECKOUT.ORDER.APPROVED',
  CHECKOUT_ORDER_COMPLETED = 'CHECKOUT.ORDER.COMPLETED'
}

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
  expiresAt: number
}

interface CreateOrderParams {
  reference: string
  amount: number // in dollars
  currency: string
  description: string
  returnUrl: string
  cancelUrl: string
}

interface CreateSubscriptionParams {
  planId: string // PayPal billing plan ID
  reference: string
  email: string
  firstName: string
  lastName: string
  returnUrl: string
  cancelUrl: string
}

interface OrderResult {
  id: string
  status: PayPalOrderStatus
  approveUrl: string
}

interface SubscriptionResult {
  id: string
  status: PayPalSubscriptionStatus
  approveUrl: string
}

interface CaptureResult {
  id: string
  status: string
  captureId?: string
  amount?: number
  currency?: string
}

// Cache access token to avoid repeated auth calls
let cachedToken: PayPalAccessToken | null = null

/**
 * Get PayPal OAuth access token
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.access_token
  }

  const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_CONFIG.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal auth failed: ${error}`)
  }

  const data = await response.json() as {
    access_token: string
    token_type: string
    expires_in: number
  }

  // Cache token with 5-minute buffer before expiry
  cachedToken = {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000
  }

  return cachedToken.access_token
}

/**
 * Make authenticated API request to PayPal
 */
async function makeApiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  endpoint: string,
  body?: object
): Promise<T> {
  const accessToken = await getAccessToken()
  const fullUrl = `${PAYPAL_CONFIG.baseUrl}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  }

  // PayPal requires this header for some endpoints
  if (method === 'POST') {
    headers['PayPal-Request-Id'] = crypto.randomUUID()
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  logger.debug('PayPal API request:', {
    method,
    endpoint,
    body: body ? JSON.stringify(body) : undefined
  })

  const response = await fetch(fullUrl, options)
  const data = await response.json()

  logger.debug('PayPal API response:', {
    status: response.status,
    data
  })

  if (!response.ok) {
    throw new Error(`PayPal API error: ${response.status} - ${JSON.stringify(data)}`)
  }

  return data as T
}

/**
 * Create a PayPal order for one-time payment
 */
export async function createOrder(params: CreateOrderParams): Promise<OrderResult> {
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: params.reference,
      description: params.description,
      amount: {
        currency_code: params.currency,
        value: params.amount.toFixed(2)
      }
    }],
    application_context: {
      brand_name: 'PDFLab',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl
    }
  }

  const response = await makeApiRequest<any>('POST', '/v2/checkout/orders', orderPayload)

  // Find approval URL
  const approveLink = response.links?.find((link: any) => link.rel === 'approve')
  if (!approveLink) {
    throw new Error('No approval URL returned from PayPal')
  }

  return {
    id: response.id,
    status: response.status as PayPalOrderStatus,
    approveUrl: approveLink.href
  }
}

/**
 * Capture a PayPal order after approval
 */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const response = await makeApiRequest<any>('POST', `/v2/checkout/orders/${orderId}/capture`, {})

  const capture = response.purchase_units?.[0]?.payments?.captures?.[0]

  return {
    id: response.id,
    status: response.status,
    captureId: capture?.id,
    amount: capture?.amount ? parseFloat(capture.amount.value) : undefined,
    currency: capture?.amount?.currency_code
  }
}

/**
 * Get order details
 */
export async function getOrder(orderId: string): Promise<any> {
  return makeApiRequest('GET', `/v2/checkout/orders/${orderId}`)
}

/**
 * Create a billing plan for subscriptions
 * Call this once during setup to create plans
 */
export async function createBillingPlan(params: {
  productId: string
  name: string
  description: string
  amount: number
  currency: string
  interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}): Promise<{ planId: string }> {
  const planPayload = {
    product_id: params.productId,
    name: params.name,
    description: params.description,
    status: 'ACTIVE',
    billing_cycles: [{
      frequency: {
        interval_unit: params.interval,
        interval_count: 1
      },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0, // Unlimited
      pricing_scheme: {
        fixed_price: {
          value: params.amount.toFixed(2),
          currency_code: params.currency
        }
      }
    }],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3
    }
  }

  const response = await makeApiRequest<any>('POST', '/v1/billing/plans', planPayload)

  return { planId: response.id }
}

/**
 * Create a subscription for recurring payments
 */
export async function createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
  const subscriptionPayload = {
    plan_id: params.planId,
    custom_id: params.reference,
    subscriber: {
      name: {
        given_name: params.firstName,
        surname: params.lastName
      },
      email_address: params.email
    },
    application_context: {
      brand_name: 'PDFLab',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      payment_method: {
        payer_selected: 'PAYPAL',
        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
      },
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl
    }
  }

  const response = await makeApiRequest<any>('POST', '/v1/billing/subscriptions', subscriptionPayload)

  // Find approval URL
  const approveLink = response.links?.find((link: any) => link.rel === 'approve')
  if (!approveLink) {
    throw new Error('No approval URL returned from PayPal')
  }

  return {
    id: response.id,
    status: response.status as PayPalSubscriptionStatus,
    approveUrl: approveLink.href
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
  return makeApiRequest('GET', `/v1/billing/subscriptions/${subscriptionId}`)
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason: string = 'User requested cancellation'
): Promise<{ success: boolean; message: string }> {
  try {
    await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      reason
    })

    return {
      success: true,
      message: 'Subscription cancelled successfully'
    }
  } catch (error) {
    logger.error('PayPal subscription cancellation error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel subscription'
    }
  }
}

/**
 * Suspend a subscription (pause billing)
 */
export async function suspendSubscription(
  subscriptionId: string,
  reason: string = 'User requested pause'
): Promise<{ success: boolean; message: string }> {
  try {
    await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, {
      reason
    })

    return {
      success: true,
      message: 'Subscription suspended successfully'
    }
  } catch (error) {
    logger.error('PayPal subscription suspension error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to suspend subscription'
    }
  }
}

/**
 * Activate/resume a suspended subscription
 */
export async function activateSubscription(
  subscriptionId: string,
  reason: string = 'User resumed subscription'
): Promise<{ success: boolean; message: string }> {
  try {
    await makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, {
      reason
    })

    return {
      success: true,
      message: 'Subscription activated successfully'
    }
  } catch (error) {
    logger.error('PayPal subscription activation error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate subscription'
    }
  }
}

/**
 * Refund a captured payment
 */
export async function refundPayment(
  captureId: string,
  amount?: number,
  currency?: string
): Promise<{ success: boolean; refundId?: string; message?: string }> {
  try {
    const refundPayload: any = {}

    // Partial refund if amount specified
    if (amount && currency) {
      refundPayload.amount = {
        value: amount.toFixed(2),
        currency_code: currency
      }
    }

    const response = await makeApiRequest<any>(
      'POST',
      `/v2/payments/captures/${captureId}/refund`,
      Object.keys(refundPayload).length > 0 ? refundPayload : undefined
    )

    return {
      success: response.status === 'COMPLETED',
      refundId: response.id,
      message: response.status === 'COMPLETED' ? 'Refund processed successfully' : `Refund status: ${response.status}`
    }
  } catch (error) {
    logger.error('PayPal refund error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process refund'
    }
  }
}

/**
 * Verify webhook signature
 * PayPal uses a complex verification process
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  if (!PAYPAL_CONFIG.webhookId) {
    logger.warn('PayPal webhook ID not configured - skipping signature verification')
    return true
  }

  try {
    const verificationPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: PAYPAL_CONFIG.webhookId,
      webhook_event: JSON.parse(body)
    }

    const response = await makeApiRequest<any>('POST', '/v1/notifications/verify-webhook-signature', verificationPayload)

    return response.verification_status === 'SUCCESS'
  } catch (error) {
    logger.error('PayPal webhook verification error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * Check if PayPal is properly configured
 */
export function isConfigured(): boolean {
  return !!(PAYPAL_CONFIG.clientId && PAYPAL_CONFIG.clientSecret)
}

/**
 * Get PayPal configuration (without sensitive data)
 */
export function getConfig() {
  return {
    mode: PAYPAL_CONFIG.mode,
    baseUrl: PAYPAL_CONFIG.baseUrl,
    configured: isConfigured(),
    successUrl: PAYPAL_CONFIG.successUrl,
    cancelUrl: PAYPAL_CONFIG.cancelUrl
  }
}

/**
 * Get default redirect URLs
 */
export function getDefaultUrls() {
  const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000'
  const apiUrl = process.env['API_URL'] || 'http://localhost:3006'

  return {
    success: PAYPAL_CONFIG.successUrl || `${frontendUrl}/payment/success`,
    cancel: PAYPAL_CONFIG.cancelUrl || `${frontendUrl}/payment/cancel`,
    webhook: `${apiUrl}/api/paypal/webhook`
  }
}

/**
 * Test API connection
 */
export async function validateConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await getAccessToken()
    return {
      success: true,
      message: 'PayPal API connection validated successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to validate API connection'
    }
  }
}

/**
 * Map PayPal subscription status to internal status
 */
export function mapPayPalSubscriptionStatus(
  status: PayPalSubscriptionStatus
): 'active' | 'canceled' | 'past_due' | 'pending' {
  switch (status) {
    case PayPalSubscriptionStatus.ACTIVE:
      return 'active'
    case PayPalSubscriptionStatus.CANCELLED:
    case PayPalSubscriptionStatus.EXPIRED:
      return 'canceled'
    case PayPalSubscriptionStatus.SUSPENDED:
      return 'past_due'
    case PayPalSubscriptionStatus.APPROVAL_PENDING:
    case PayPalSubscriptionStatus.APPROVED:
    default:
      return 'pending'
  }
}

/**
 * Map PayPal order status to internal payment status
 */
export function mapPayPalOrderStatus(
  status: PayPalOrderStatus
): 'complete' | 'failed' | 'pending' | 'cancelled' {
  switch (status) {
    case PayPalOrderStatus.COMPLETED:
      return 'complete'
    case PayPalOrderStatus.VOIDED:
      return 'cancelled'
    case PayPalOrderStatus.CREATED:
    case PayPalOrderStatus.SAVED:
    case PayPalOrderStatus.APPROVED:
    case PayPalOrderStatus.PAYER_ACTION_REQUIRED:
    default:
      return 'pending'
  }
}

export default {
  createOrder,
  captureOrder,
  getOrder,
  createBillingPlan,
  createSubscription,
  getSubscription,
  cancelSubscription,
  suspendSubscription,
  activateSubscription,
  refundPayment,
  verifyWebhookSignature,
  isConfigured,
  getConfig,
  getDefaultUrls,
  validateConnection,
  mapPayPalSubscriptionStatus,
  mapPayPalOrderStatus,
  PayPalOrderStatus,
  PayPalSubscriptionStatus,
  PayPalWebhookEvent
}
