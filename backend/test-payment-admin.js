/**
 * Test script for Epic 4: Payment & Subscription Management
 * Tests all payment admin endpoints
 */

const API_URL = 'http://localhost:3006'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

let authToken = null
let subscriptionId = null
let transactionId = null

async function testEndpoint(name, method, path, body = null) {
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`)
  console.log(`${colors.blue}${method} ${path}${colors.reset}`)

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${path}`, options)
    const data = await response.json()

    if (response.ok) {
      console.log(`${colors.green}✓ PASS${colors.reset} - Status: ${response.status}`)
      return data
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset} - Status: ${response.status}`)
      console.log(`  Error: ${data.message || data.error}`)
      return null
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`)
    return null
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('   EPIC 4: PAYMENT & SUBSCRIPTION MANAGEMENT TESTS')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(colors.reset)

  // Step 1: Login as admin
  console.log(`\n${colors.bold}Step 1: Authentication${colors.reset}`)
  const loginData = await testEndpoint(
    'Admin Login',
    'POST',
    '/api/auth/login',
    {
      email: 'admin@pdflab.test',
      password: 'AdminPass123'
    }
  )

  if (!loginData || !loginData.token) {
    console.log(`${colors.red}${colors.bold}\n✗ LOGIN FAILED - Cannot proceed with tests${colors.reset}`)
    return
  }

  authToken = loginData.token
  console.log(`${colors.green}✓ Authenticated as super_admin${colors.reset}`)

  // Step 2: Test Subscription Endpoints
  console.log(`\n${colors.bold}Step 2: Subscription Management${colors.reset}`)

  // 2.1 Get all subscriptions
  const subsData = await testEndpoint(
    'Get All Subscriptions',
    'GET',
    '/api/admin/payments/subscriptions?page=1&limit=25'
  )

  if (subsData && subsData.subscriptions && subsData.subscriptions.length > 0) {
    subscriptionId = subsData.subscriptions[0].id
    console.log(`  Found ${subsData.subscriptions.length} subscription(s)`)
    console.log(`  MRR: $${subsData.stats.mrr}`)
    console.log(`  Active: ${subsData.stats.active_count}`)
  }

  // 2.2 Get subscription by ID
  if (subscriptionId) {
    const subDetail = await testEndpoint(
      'Get Subscription By ID',
      'GET',
      `/api/admin/payments/subscriptions/${subscriptionId}`
    )

    if (subDetail && subDetail.subscription) {
      console.log(`  Plan: ${subDetail.subscription.plan}`)
      console.log(`  Status: ${subDetail.subscription.status}`)
      if (subDetail.payment_history) {
        console.log(`  Payment History: ${subDetail.payment_history.length} record(s)`)
      }
    }
  }

  // 2.3 Update subscription (change plan)
  if (subscriptionId) {
    await testEndpoint(
      'Update Subscription Plan',
      'PUT',
      `/api/admin/payments/subscriptions/${subscriptionId}`,
      { plan: 'pro' }
    )
  }

  // 2.4 Pause subscription
  if (subscriptionId) {
    await testEndpoint(
      'Pause Subscription',
      'POST',
      `/api/admin/payments/subscriptions/${subscriptionId}/pause`
    )
  }

  // 2.5 Resume subscription
  if (subscriptionId) {
    await testEndpoint(
      'Resume Subscription',
      'POST',
      `/api/admin/payments/subscriptions/${subscriptionId}/resume`
    )
  }

  // Step 3: Test Transaction Endpoints
  console.log(`\n${colors.bold}Step 3: Transaction Management${colors.reset}`)

  // 3.1 Get all transactions
  const transData = await testEndpoint(
    'Get All Transactions',
    'GET',
    '/api/admin/payments/transactions?page=1&limit=25'
  )

  if (transData && transData.transactions && transData.transactions.length > 0) {
    transactionId = transData.transactions[0].id
    console.log(`  Found ${transData.transactions.length} transaction(s)`)
    console.log(`  Total Revenue: $${transData.stats.total_revenue}`)
    console.log(`  Complete: ${transData.stats.complete_count}`)
  }

  // 3.2 Get transaction by ID
  if (transactionId) {
    const transDetail = await testEndpoint(
      'Get Transaction By ID',
      'GET',
      `/api/admin/payments/transactions/${transactionId}`
    )

    if (transDetail && transDetail.transaction) {
      console.log(`  Amount: $${transDetail.transaction.amount_gross}`)
      console.log(`  Status: ${transDetail.transaction.status}`)
      console.log(`  Type: ${transDetail.transaction.payment_type}`)
    }
  }

  // 3.3 Get ITN logs
  await testEndpoint(
    'Get ITN Logs',
    'GET',
    '/api/admin/payments/itn-logs?page=1&limit=10'
  )

  // Step 4: Test Analytics Endpoints
  console.log(`\n${colors.bold}Step 4: Revenue Analytics${colors.reset}`)

  // 4.1 Get revenue analytics
  const revenueData = await testEndpoint(
    'Get Revenue Analytics',
    'GET',
    '/api/admin/payments/analytics'
  )

  if (revenueData && revenueData.analytics) {
    console.log(`  Current MRR: $${revenueData.analytics.mrr}`)
    console.log(`  ARR: $${revenueData.analytics.arr}`)
    console.log(`  Churn Rate: ${revenueData.analytics.churn_rate}%`)
    console.log(`  Active Subs: ${revenueData.analytics.active_subscriptions}`)
  }

  // Step 5: Negative Tests (should fail gracefully)
  console.log(`\n${colors.bold}Step 5: Negative Tests${colors.reset}`)

  // 5.1 Invalid subscription ID
  await testEndpoint(
    'Get Non-Existent Subscription',
    'GET',
    '/api/admin/payments/subscriptions/invalid-uuid-here'
  )

  // 5.2 Invalid transaction ID
  await testEndpoint(
    'Get Non-Existent Transaction',
    'GET',
    '/api/admin/payments/transactions/invalid-uuid-here'
  )

  // 5.3 Refund with missing data
  if (transactionId) {
    await testEndpoint(
      'Process Refund Without Reason',
      'POST',
      '/api/admin/payments/refund',
      { transaction_id: transactionId, amount: 10.00 } // Missing reason
    )
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('   TEST SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(colors.reset)
  console.log(`${colors.green}✓ Epic 4 endpoint tests completed${colors.reset}`)
  console.log(`${colors.yellow}⚠ Review output above for any failures${colors.reset}`)
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`)
  process.exit(1)
})
