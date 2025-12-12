import crypto from 'crypto'
import logger from '../config/logger'

/**
 * PayGenius Payment Gateway Service
 * Handles payment initialization, signature generation, and webhook verification
 *
 * API Reference: https://developer.paygenius.co.za/docs/reference.html
 */

// PayGenius configuration from environment
const PAYGENIUS_CONFIG = {
  apiToken: process.env.PAYGENIUS_API_TOKEN || '',
  apiKey: process.env.PAYGENIUS_API_KEY || '',
  mode: process.env.PAYGENIUS_MODE || 'sandbox',
  baseUrl: process.env.PAYGENIUS_MODE === 'production'
    ? 'https://www.paygenius.co.za'
    : 'https://developer.paygenius.co.za',
  successUrl: process.env.PAYGENIUS_SUCCESS_URL || '',
  cancelUrl: process.env.PAYGENIUS_CANCEL_URL || '',
  errorUrl: process.env.PAYGENIUS_ERROR_URL || '',
  notifyUrl: process.env.PAYGENIUS_WEBHOOK_URL || ''
}

// Response codes from PayGenius
export const PAYGENIUS_RESPONSE_CODES = {
  APPROVED: 1,
  PENDING_3DS: 2,
  ERROR: 3,
  FAILURE: -1,
  PENDING_REFUND: 7,
  PAGE_NOT_CONFIGURED: 19
}

// Transaction statuses from PayGenius
export enum PayGeniusTransactionStatus {
  AUTHORIZED = 'AUTHORIZED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  THREE_D_SECURE = 'THREE_D_SECURE',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  NEW = 'NEW'
}

interface Consumer {
  name: string
  surname: string
  email: string
  consumerAddress?: {
    addressLineOne?: string
    city?: string
    postCode?: string
    country?: string
  }
}

interface Transaction {
  reference: string
  currency: string
  amount: number // in cents
  source?: string
  displayCurrency?: string
}

interface SubscriptionData {
  reference: string
  interval: 'MONTHLY' | 'DAILY' | 'YEARLY'
  trialDays?: number
  firstname: string
  lastname: string
  email: string
}

interface RedirectUrls {
  success: string
  cancel: string
  error: string
  notify: string // webhook URL
}

interface CreateRedirectPaymentParams {
  transaction: Transaction
  consumer: Consumer
  urls: RedirectUrls
  subscription?: SubscriptionData
}

interface PayGeniusApiResponse {
  code: number
  message?: string
  reference?: string
  redirectUrl?: string
  transaction?: {
    reference: string
    amount: number
    currency: string
    status: string
    pending: boolean
  }
}

interface PaymentLookupResult {
  reference: string
  amount: number
  currency: string
  status: PayGeniusTransactionStatus
  pending: boolean
}

interface RefundResult {
  success: boolean
  code: number
  message?: string
  pending?: boolean
}

/**
 * Generate HMAC-SHA256 signature for PayGenius API requests
 *
 * For GET requests: Sign the full request URI
 * For POST requests: Sign `{full_uri}\n{json_body}`
 */
export function generateSignature(
  method: 'GET' | 'POST',
  fullUri: string,
  body?: object
): string {
  let dataToSign: string

  if (method === 'GET') {
    dataToSign = fullUri.trim()
  } else {
    // For POST: concatenate URI + newline + JSON body (no extra whitespace)
    const jsonBody = body ? JSON.stringify(body) : ''
    dataToSign = `${fullUri.trim()}\n${jsonBody}`
  }

  // Generate HMAC-SHA256 using the API key as secret
  const hmac = crypto.createHmac('sha256', PAYGENIUS_CONFIG.apiKey)
  hmac.update(dataToSign)

  // Return hex-encoded signature (64 characters)
  return hmac.digest('hex')
}

/**
 * Make authenticated API request to PayGenius
 */
async function makeApiRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: object
): Promise<T> {
  const fullUrl = `${PAYGENIUS_CONFIG.baseUrl}${endpoint}`
  const signature = generateSignature(method, fullUrl, body)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Token': PAYGENIUS_CONFIG.apiToken,
    'X-Signature': signature
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (method === 'POST' && body) {
    options.body = JSON.stringify(body)
  }

  logger.debug('PayGenius API request:', {
    method,
    endpoint,
    body: body ? JSON.stringify(body) : undefined
  })

  const response = await fetch(fullUrl, options)
  const data = await response.json()

  logger.debug('PayGenius API response:', {
    status: response.status,
    data
  })

  if (!response.ok) {
    throw new Error(`PayGenius API error: ${response.status} - ${JSON.stringify(data)}`)
  }

  return data as T
}

/**
 * Create a redirect payment (hosted payment page)
 * This is the primary payment method - redirects user to PayGenius for payment
 */
export async function createRedirectPayment(params: CreateRedirectPaymentParams): Promise<{
  redirectUrl: string
  reference: string
}> {
  const endpoint = '/pg/api/v2/redirect/create'

  const requestBody: any = {
    transaction: {
      reference: params.transaction.reference,
      currency: params.transaction.currency,
      amount: params.transaction.amount // Amount in cents
    },
    consumer: {
      name: params.consumer.name,
      surname: params.consumer.surname,
      email: params.consumer.email
    },
    urls: {
      success: params.urls.success,
      cancel: params.urls.cancel,
      error: params.urls.error,
      notify: params.urls.notify
    }
  }

  // Add subscription data if provided (for recurring payments)
  if (params.subscription) {
    requestBody.subscription = {
      reference: params.subscription.reference,
      interval: params.subscription.interval,
      firstname: params.subscription.firstname,
      lastname: params.subscription.lastname,
      email: params.subscription.email
    }

    if (params.subscription.trialDays) {
      requestBody.subscription.trialDays = params.subscription.trialDays
    }
  }

  const response = await makeApiRequest<PayGeniusApiResponse>('POST', endpoint, requestBody)

  if (response.code !== PAYGENIUS_RESPONSE_CODES.APPROVED || !response.redirectUrl) {
    throw new Error(`Failed to create payment: ${response.message || 'Unknown error'}`)
  }

  return {
    redirectUrl: response.redirectUrl,
    reference: response.reference || params.transaction.reference
  }
}

/**
 * Lookup payment status by reference
 */
export async function lookupPayment(reference: string): Promise<PaymentLookupResult> {
  const endpoint = `/pg/api/v2/redirect/${reference}`

  const response = await makeApiRequest<PayGeniusApiResponse>('GET', endpoint)

  if (!response.transaction) {
    throw new Error(`Payment not found: ${reference}`)
  }

  return {
    reference: response.transaction.reference,
    amount: response.transaction.amount,
    currency: response.transaction.currency,
    status: response.transaction.status as PayGeniusTransactionStatus,
    pending: response.transaction.pending
  }
}

/**
 * Get transaction details by reference
 */
export async function getTransaction(reference: string): Promise<PaymentLookupResult> {
  const endpoint = `/pg/api/v2/payment/${reference}`

  const response = await makeApiRequest<PayGeniusApiResponse>('GET', endpoint)

  if (!response.transaction) {
    throw new Error(`Transaction not found: ${reference}`)
  }

  return {
    reference: response.transaction.reference,
    amount: response.transaction.amount,
    currency: response.transaction.currency,
    status: response.transaction.status as PayGeniusTransactionStatus,
    pending: response.transaction.pending
  }
}

/**
 * Process a full refund
 */
export async function refundPaymentFull(reference: string): Promise<RefundResult> {
  const endpoint = `/pg/api/v2/payment/${reference}/refund`

  const response = await makeApiRequest<PayGeniusApiResponse>('GET', endpoint)

  return {
    success: response.code === PAYGENIUS_RESPONSE_CODES.APPROVED,
    code: response.code,
    message: response.message,
    pending: response.code === PAYGENIUS_RESPONSE_CODES.PENDING_REFUND
  }
}

/**
 * Process a partial refund
 */
export async function refundPaymentPartial(reference: string, amount: number): Promise<RefundResult> {
  const endpoint = `/pg/api/v2/payment/${reference}/refund`

  const response = await makeApiRequest<PayGeniusApiResponse>('POST', endpoint, { amount })

  return {
    success: response.code === PAYGENIUS_RESPONSE_CODES.APPROVED,
    code: response.code,
    message: response.message,
    pending: response.code === PAYGENIUS_RESPONSE_CODES.PENDING_REFUND
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionReference: string): Promise<{ success: boolean; message: string }> {
  const endpoint = '/pg/api/v2/subscription/cancel'

  try {
    const response = await makeApiRequest<PayGeniusApiResponse>('POST', endpoint, {
      reference: subscriptionReference
    })

    return {
      success: response.code === PAYGENIUS_RESPONSE_CODES.APPROVED,
      message: response.message || 'Subscription cancelled successfully'
    }
  } catch (error) {
    logger.error('PayGenius subscription cancellation error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel subscription'
    }
  }
}

/**
 * Edit/update a subscription (e.g., link new card)
 */
export async function editSubscription(
  subscriptionReference: string,
  cardToken?: string
): Promise<{ success: boolean; message: string }> {
  const endpoint = '/pg/api/v2/subscription/edit'

  const body: any = {
    reference: subscriptionReference
  }

  if (cardToken) {
    body.creditCard = { token: cardToken }
  }

  try {
    const response = await makeApiRequest<PayGeniusApiResponse>('POST', endpoint, body)

    return {
      success: response.code === PAYGENIUS_RESPONSE_CODES.APPROVED,
      message: response.message || 'Subscription updated successfully'
    }
  } catch (error) {
    logger.error('PayGenius subscription edit error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update subscription'
    }
  }
}

/**
 * Register a card for future use (card vaulting)
 */
export async function registerCard(cardData: {
  number: string
  cardHolder: string
  expiryYear: number
  expiryMonth: number
  cvv: string
  type: 'visa' | 'mastercard' | 'amex'
}): Promise<{ success: boolean; token?: string; message?: string }> {
  const endpoint = '/pg/api/v2/card/register'

  try {
    const response = await makeApiRequest<any>('POST', endpoint, {
      creditCard: {
        number: cardData.number,
        cardHolder: cardData.cardHolder,
        expiryYear: cardData.expiryYear,
        expiryMonth: cardData.expiryMonth,
        cvv: cardData.cvv,
        type: cardData.type
      }
    })

    return {
      success: response.code === PAYGENIUS_RESPONSE_CODES.APPROVED,
      token: response.token,
      message: response.message
    }
  } catch (error) {
    logger.error('PayGenius card registration error:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to register card'
    }
  }
}

/**
 * Validate webhook request signature
 * PayGenius sends webhook notifications to the notify URL
 */
export function validateWebhookSignature(
  requestUri: string,
  body: string,
  receivedSignature: string
): boolean {
  // Webhook is a POST, so sign URI + newline + body
  const dataToSign = `${requestUri.trim()}\n${body}`

  const hmac = crypto.createHmac('sha256', PAYGENIUS_CONFIG.apiKey)
  hmac.update(dataToSign)
  const calculatedSignature = hmac.digest('hex')

  return calculatedSignature === receivedSignature
}

/**
 * Test API connection and signature generation
 */
export async function validateConnection(): Promise<{ success: boolean; message: string }> {
  const endpoint = '/pg/api/v2/util/validate'

  try {
    await makeApiRequest<any>('GET', endpoint)
    return {
      success: true,
      message: 'API connection validated successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to validate API connection'
    }
  }
}

/**
 * Check if PayGenius is properly configured
 */
export function isConfigured(): boolean {
  return !!(PAYGENIUS_CONFIG.apiToken && PAYGENIUS_CONFIG.apiKey)
}

/**
 * Get PayGenius configuration (without sensitive data)
 */
export function getConfig() {
  return {
    mode: PAYGENIUS_CONFIG.mode,
    baseUrl: PAYGENIUS_CONFIG.baseUrl,
    configured: isConfigured(),
    successUrl: PAYGENIUS_CONFIG.successUrl,
    cancelUrl: PAYGENIUS_CONFIG.cancelUrl,
    errorUrl: PAYGENIUS_CONFIG.errorUrl,
    notifyUrl: PAYGENIUS_CONFIG.notifyUrl
  }
}

/**
 * Get default URLs from configuration
 */
export function getDefaultUrls(): RedirectUrls {
  const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000'
  const apiUrl = process.env['API_URL'] || 'http://localhost:3006'

  return {
    success: PAYGENIUS_CONFIG.successUrl || `${frontendUrl}/payment/success`,
    cancel: PAYGENIUS_CONFIG.cancelUrl || `${frontendUrl}/payment/cancel`,
    error: PAYGENIUS_CONFIG.errorUrl || `${frontendUrl}/payment/error`,
    notify: PAYGENIUS_CONFIG.notifyUrl || `${apiUrl}/api/paygenius/webhook`
  }
}

/**
 * Convert dollars to cents (PayGenius uses cents)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Map PayGenius status to our internal status
 */
export function mapPayGeniusStatus(pgStatus: PayGeniusTransactionStatus): 'complete' | 'failed' | 'pending' | 'cancelled' {
  switch (pgStatus) {
    case PayGeniusTransactionStatus.SETTLED:
      return 'complete'
    case PayGeniusTransactionStatus.AUTHORIZED:
      return 'pending' // Authorized but not yet settled
    case PayGeniusTransactionStatus.CANCELLED:
      return 'cancelled'
    case PayGeniusTransactionStatus.FAILED:
      return 'failed'
    case PayGeniusTransactionStatus.REFUNDED:
      return 'complete' // Refund completed
    case PayGeniusTransactionStatus.REVERSED:
      return 'cancelled'
    case PayGeniusTransactionStatus.THREE_D_SECURE:
      return 'pending'
    case PayGeniusTransactionStatus.NEW:
      return 'pending'
    default:
      return 'pending'
  }
}

export default {
  generateSignature,
  createRedirectPayment,
  lookupPayment,
  getTransaction,
  refundPaymentFull,
  refundPaymentPartial,
  cancelSubscription,
  editSubscription,
  registerCard,
  validateWebhookSignature,
  validateConnection,
  isConfigured,
  getConfig,
  getDefaultUrls,
  dollarsToCents,
  centsToDollars,
  mapPayGeniusStatus,
  PAYGENIUS_RESPONSE_CODES,
  PayGeniusTransactionStatus
}
