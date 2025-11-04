import crypto from 'crypto'
import https from 'https'
import { URLSearchParams } from 'url'

/**
 * PayFast Payment Gateway Service
 * Handles payment initialization, signature generation, and ITN verification
 */

// PayFast configuration from environment
const PAYFAST_CONFIG = {
  merchantId: process.env.PAYFAST_MERCHANT_ID || '',
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
  passphrase: process.env.PAYFAST_PASSPHRASE || '',
  mode: process.env.PAYFAST_MODE || 'sandbox',
  apiUrl: process.env.PAYFAST_MODE === 'production'
    ? 'https://www.payfast.co.za'
    : 'https://sandbox.payfast.co.za'
}

// PayFast valid IP addresses for ITN validation
const PAYFAST_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za'
]

interface PaymentData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  name_first: string
  name_last?: string
  email_address: string
  m_payment_id: string
  amount: string
  item_name: string
  item_description?: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  custom_int1?: string
  custom_int2?: string
  custom_int3?: string
  custom_int4?: string
  custom_int5?: string
  email_confirmation?: string
  confirmation_address?: string
  payment_method?: string
  // Subscription fields
  subscription_type?: string
  billing_date?: string
  recurring_amount?: string
  frequency?: string
  cycles?: string
}

interface SubscriptionPaymentData extends PaymentData {
  subscription_type: string
  billing_date: string
  recurring_amount: string
  frequency: string
  cycles: string
}

interface ITNData {
  m_payment_id: string
  pf_payment_id: string
  payment_status: string
  item_name: string
  item_description?: string
  amount_gross: string
  amount_fee: string
  amount_net: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  custom_int1?: string
  custom_int2?: string
  custom_int3?: string
  custom_int4?: string
  custom_int5?: string
  name_first: string
  name_last?: string
  email_address: string
  merchant_id: string
  signature: string
  // Subscription fields
  token?: string
  billing_date?: string
}

/**
 * Generate MD5 signature for PayFast payment data
 */
export function generateSignature(data: Record<string, any>, passphrase: string = ''): string {
  // Create parameter string
  let paramString = ''
  const sortedKeys = Object.keys(data).sort()

  for (const key of sortedKeys) {
    // Skip signature field and empty values
    if (key !== 'signature' && data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`
    }
  }

  // Remove last ampersand
  paramString = paramString.slice(0, -1)

  // Add passphrase if provided
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }

  // Generate MD5 hash
  return crypto.createHash('md5').update(paramString).digest('hex')
}

/**
 * Create payment data for one-time payment
 */
export function createPaymentData(params: {
  userId: string
  userEmail: string
  userName: string
  planName: string
  planPrice: number
  transactionId: string
}): PaymentData & { signature: string } {
  const apiUrl = process.env['API_URL'] || 'http://localhost:3006'
  const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000'

  const paymentData: PaymentData = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: `${frontendUrl}/payment/success`,
    cancel_url: `${frontendUrl}/payment/cancel`,
    notify_url: process.env['PAYFAST_ITN_URL'] || `${apiUrl}/api/payfast/webhook`,
    name_first: params.userName,
    email_address: params.userEmail,
    m_payment_id: params.transactionId,
    amount: params.planPrice.toFixed(2),
    item_name: `PDFLab ${params.planName} Plan`,
    item_description: `PDFLab ${params.planName} subscription`,
    custom_str1: params.userId,
    custom_str2: params.planName.toLowerCase(),
    email_confirmation: '1',
    confirmation_address: params.userEmail
  }

  const signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase)

  return {
    ...paymentData,
    signature
  }
}

/**
 * Create subscription payment data for recurring billing
 */
export function createSubscriptionPaymentData(params: {
  userId: string
  userEmail: string
  userName: string
  planName: string
  planPrice: number
  transactionId: string
  billingDate?: Date
}): SubscriptionPaymentData & { signature: string } {
  const apiUrl = process.env['API_URL'] || 'http://localhost:3006'
  const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000'
  const billingDate = params.billingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  const paymentData: SubscriptionPaymentData = {
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
    return_url: `${frontendUrl}/payment/success`,
    cancel_url: `${frontendUrl}/payment/cancel`,
    notify_url: process.env['PAYFAST_ITN_URL'] || `${apiUrl}/api/payfast/webhook`,
    name_first: params.userName,
    email_address: params.userEmail,
    m_payment_id: params.transactionId,
    amount: params.planPrice.toFixed(2),
    item_name: `PDFLab ${params.planName} Plan`,
    item_description: `PDFLab ${params.planName} monthly subscription`,
    custom_str1: params.userId,
    custom_str2: params.planName.toLowerCase(),
    email_confirmation: '1',
    confirmation_address: params.userEmail,
    // Subscription specific fields
    subscription_type: '1', // Recurring
    billing_date: billingDate.toISOString().split('T')[0], // YYYY-MM-DD
    recurring_amount: params.planPrice.toFixed(2),
    frequency: '3', // Monthly
    cycles: '0' // Unlimited (0 = continue until cancelled)
  }

  const signature = generateSignature(paymentData, PAYFAST_CONFIG.passphrase)

  return {
    ...paymentData,
    signature
  }
}

/**
 * Validate PayFast ITN signature
 */
export function validateSignature(data: Record<string, any>, receivedSignature: string): boolean {
  const calculatedSignature = generateSignature(data, PAYFAST_CONFIG.passphrase)
  return calculatedSignature === receivedSignature
}

/**
 * Verify payment with PayFast server
 * Makes a request back to PayFast to confirm the payment is legitimate
 */
export async function verifyPaymentWithPayFast(data: Record<string, any>): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const paramString = new URLSearchParams(data as any).toString()

    const options = {
      hostname: PAYFAST_CONFIG.mode === 'production' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za',
      port: 443,
      path: '/eng/query/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(paramString)
      }
    }

    const req = https.request(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        // PayFast returns "VALID" if the payment is legitimate
        resolve(body.trim() === 'VALID')
      })
    })

    req.on('error', (error) => {
      console.error('PayFast verification error:', error)
      reject(error)
    })

    req.write(paramString)
    req.end()
  })
}

/**
 * Validate that the request came from PayFast servers
 */
export function validatePayFastHost(host: string): boolean {
  return PAYFAST_HOSTS.includes(host)
}

/**
 * Validate payment amount matches expected amount
 */
export function validateAmount(receivedAmount: string, expectedAmount: number): boolean {
  const received = parseFloat(receivedAmount)
  const expected = parseFloat(expectedAmount.toFixed(2))

  // Allow for small floating point differences (within 1 cent)
  return Math.abs(received - expected) < 0.01
}

/**
 * Get PayFast payment URL
 */
export function getPayFastUrl(): string {
  return `${PAYFAST_CONFIG.apiUrl}/eng/process`
}

/**
 * Check if PayFast is properly configured
 */
export function isConfigured(): boolean {
  return !!(PAYFAST_CONFIG.merchantId && PAYFAST_CONFIG.merchantKey)
}

/**
 * Get PayFast configuration (without sensitive data)
 */
export function getConfig() {
  return {
    mode: PAYFAST_CONFIG.mode,
    apiUrl: PAYFAST_CONFIG.apiUrl,
    configured: isConfigured()
  }
}

/**
 * Cancel a PayFast subscription
 * Note: PayFast uses token-based subscription cancellation
 */
export async function cancelSubscription(token: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString()

    // Build cancellation request
    const data: Record<string, string> = {
      'merchant-id': PAYFAST_CONFIG.merchantId,
      'version': 'v1',
      'timestamp': timestamp
    }

    // Generate signature for API authentication
    const signature = generateApiSignature(data)

    const requestData = {
      ...data,
      'signature': signature
    }

    const paramString = new URLSearchParams(requestData).toString()
    const hostname = PAYFAST_CONFIG.mode === 'production' ? 'api.payfast.co.za' : 'api.payfast.co.za'

    const options = {
      hostname,
      port: 443,
      path: `/subscriptions/${token}/cancel?${paramString}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'merchant-id': PAYFAST_CONFIG.merchantId,
        'version': 'v1',
        'timestamp': timestamp,
        'signature': signature
      }
    }

    const req = https.request(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(body)

          if (res.statusCode === 200 && response.status === 'success') {
            resolve({
              success: true,
              message: 'Subscription cancelled successfully'
            })
          } else {
            resolve({
              success: false,
              message: response.message || `Failed to cancel subscription (HTTP ${res.statusCode})`
            })
          }
        } catch (error) {
          reject(new Error(`Failed to parse PayFast response: ${body}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error('PayFast subscription cancellation error:', error)
      reject(error)
    })

    req.end()
  })
}

/**
 * Generate API signature for PayFast API requests (different from payment signature)
 */
function generateApiSignature(data: Record<string, string>): string {
  const passphrase = PAYFAST_CONFIG.passphrase || ''

  // Sort keys and build parameter string
  const sortedKeys = Object.keys(data).sort()
  let paramString = ''

  for (const key of sortedKeys) {
    if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`
    }
  }

  // Remove last ampersand
  paramString = paramString.slice(0, -1)

  // Add passphrase
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }

  // Generate MD5 hash
  return crypto.createHash('md5').update(paramString).digest('hex')
}

/**
 * Pause a PayFast subscription
 * Note: Pausing sets cycles remaining to 0 temporarily
 */
export async function pauseSubscription(token: string, cycles: number = 0): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString()

    const data: Record<string, string> = {
      'merchant-id': PAYFAST_CONFIG.merchantId,
      'version': 'v1',
      'timestamp': timestamp
    }

    const signature = generateApiSignature(data)

    const requestData = {
      ...data,
      'signature': signature,
      'cycles': cycles.toString()
    }

    const paramString = new URLSearchParams(requestData).toString()
    const hostname = PAYFAST_CONFIG.mode === 'production' ? 'api.payfast.co.za' : 'api.payfast.co.za'

    const options = {
      hostname,
      port: 443,
      path: `/subscriptions/${token}/pause`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(paramString)
      },
      body: paramString
    }

    const req = https.request(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(body)

          if (res.statusCode === 200 && response.status === 'success') {
            resolve({
              success: true,
              message: 'Subscription paused successfully'
            })
          } else {
            resolve({
              success: false,
              message: response.message || `Failed to pause subscription (HTTP ${res.statusCode})`
            })
          }
        } catch (error) {
          reject(new Error(`Failed to parse PayFast response: ${body}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error('PayFast subscription pause error:', error)
      reject(error)
    })

    req.write(paramString)
    req.end()
  })
}

export default {
  generateSignature,
  createPaymentData,
  createSubscriptionPaymentData,
  validateSignature,
  verifyPaymentWithPayFast,
  validatePayFastHost,
  validateAmount,
  getPayFastUrl,
  isConfigured,
  getConfig,
  cancelSubscription,
  pauseSubscription
}
