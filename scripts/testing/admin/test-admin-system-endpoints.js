/**
 * Test script for new Admin System endpoints
 * Run: node test-admin-system-endpoints.js
 *
 * NOTE: You'll need a valid admin auth token
 * Get one by logging in first at http://localhost:3000/login
 */

const API_URL = 'http://localhost:3006'

// You need to replace this with a real admin token
// Get it from: localStorage.getItem('authToken') in browser console after logging in
const ADMIN_TOKEN = process.argv[2] || 'YOUR_ADMIN_TOKEN_HERE'

async function testEndpoint(name, endpoint) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Testing: ${name}`)
  console.log(`Endpoint: ${endpoint}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Success!')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      const error = await response.text()
      console.log('❌ Failed!')
      console.log('Error:', error)
    }
  } catch (error) {
    console.log('❌ Request failed!')
    console.log('Error:', error.message)
  }
}

async function runTests() {
  console.log('\n🧪 Admin System Endpoints Test Suite')
  console.log(`API URL: ${API_URL}`)
  console.log(`Auth Token: ${ADMIN_TOKEN.substring(0, 20)}...`)

  // Test 1: System Health (existing endpoint)
  await testEndpoint(
    'System Health',
    '/api/admin/system/health'
  )

  // Test 2: Flow Health (NEW)
  await testEndpoint(
    'Application Flow Health',
    '/api/admin/system/flow-health'
  )

  // Test 3: Business Metrics (NEW)
  await testEndpoint(
    'Business Metrics',
    '/api/admin/system/business-metrics'
  )

  // Test 4: Environment Config (NEW)
  await testEndpoint(
    'Environment Configuration',
    '/api/admin/system/environment-config'
  )

  // Test 5: Recent Errors (NEW)
  await testEndpoint(
    'Recent Errors',
    '/api/admin/system/recent-errors'
  )

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Test suite complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// Check if token provided
if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
  console.log('\n❌ Error: No admin token provided!')
  console.log('\nUsage:')
  console.log('  1. Login at http://localhost:3000/login')
  console.log('  2. Open browser console (F12)')
  console.log('  3. Run: localStorage.getItem("authToken")')
  console.log('  4. Copy the token')
  console.log('  5. Run: node test-admin-system-endpoints.js "YOUR_TOKEN_HERE"\n')
  process.exit(1)
}

runTests()
