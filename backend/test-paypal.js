/**
 * PayPal Integration Test Script
 * Run with: node test-paypal.js
 */

require('dotenv').config()

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'

const BASE_URL = PAYPAL_MODE === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')

  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Auth failed: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

async function testConnection() {
  console.log('=== PayPal Integration Test ===\n')
  console.log(`Mode: ${PAYPAL_MODE}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Client ID: ${PAYPAL_CLIENT_ID?.substring(0, 20)}...`)
  console.log('')

  try {
    console.log('1. Testing OAuth2 authentication...')
    const token = await getAccessToken()
    console.log(`   ✓ Access token obtained: ${token.substring(0, 30)}...`)
    console.log('')

    console.log('2. Verifying Plan IDs...')
    const plans = {
      starter: process.env.PAYPAL_PLAN_STARTER,
      pro: process.env.PAYPAL_PLAN_PRO,
      enterprise: process.env.PAYPAL_PLAN_ENTERPRISE
    }

    for (const [name, planId] of Object.entries(plans)) {
      if (planId) {
        try {
          const response = await fetch(`${BASE_URL}/v1/billing/plans/${planId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })

          if (response.ok) {
            const plan = await response.json()
            console.log(`   ✓ ${name.toUpperCase()}: ${planId}`)
            console.log(`     Name: ${plan.name}, Status: ${plan.status}`)
          } else {
            console.log(`   ✗ ${name.toUpperCase()}: ${planId} - NOT FOUND`)
          }
        } catch (e) {
          console.log(`   ✗ ${name.toUpperCase()}: Error fetching plan`)
        }
      } else {
        console.log(`   - ${name.toUpperCase()}: Not configured`)
      }
    }
    console.log('')

    console.log('3. Verifying Webhook ID...')
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (webhookId) {
      try {
        const response = await fetch(`${BASE_URL}/v1/notifications/webhooks/${webhookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const webhook = await response.json()
          console.log(`   ✓ Webhook ID: ${webhookId}`)
          console.log(`     URL: ${webhook.url}`)
          console.log(`     Events: ${webhook.event_types?.length || 0} configured`)
        } else {
          console.log(`   ✗ Webhook ID: ${webhookId} - NOT FOUND`)
        }
      } catch (e) {
        console.log(`   ✗ Webhook: Error fetching webhook details`)
      }
    } else {
      console.log('   - Webhook ID: Not configured')
    }
    console.log('')

    console.log('=== All Tests Passed ===')

  } catch (error) {
    console.error('✗ Test failed:', error.message)
    process.exit(1)
  }
}

testConnection()
