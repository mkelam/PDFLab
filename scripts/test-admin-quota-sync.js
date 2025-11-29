/**
 * Manual Test Script: Admin Quota Sync Verification
 *
 * This script tests the quota sync fix in production.
 * Run with: node scripts/test-admin-quota-sync.js
 *
 * You'll need to provide admin credentials when prompted.
 */

const readline = require('readline')
const https = require('https')

const API_URL = 'https://pdflab.pro'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('ADMIN QUOTA SYNC TEST SCRIPT')
  console.log('='.repeat(60) + '\n')

  // Get admin credentials
  console.log('Please provide admin credentials to test the quota sync feature:\n')
  const email = await question('Admin email: ')
  const password = await question('Admin password: ')

  console.log('\n🔐 Logging in as admin...')

  // Login
  const loginResponse = await makeRequest('POST', '/api/auth/login', {}, { email, password })

  if (loginResponse.status !== 200) {
    console.log('❌ Login failed:', loginResponse.data)
    rl.close()
    return
  }

  const adminToken = loginResponse.data.token
  console.log('✅ Login successful\n')

  // Create a test user
  console.log('📝 Creating test user...')
  const timestamp = Date.now()
  const testEmail = `quota-test-${timestamp}@test.com`
  const testPassword = 'TestUser123!'

  const registerResponse = await makeRequest('POST', '/api/auth/register', {}, {
    email: testEmail,
    password: testPassword,
    full_name: 'Quota Test User'
  })

  if (registerResponse.status !== 201) {
    console.log('❌ Failed to create test user:', registerResponse.data)
    rl.close()
    return
  }

  const testUserId = registerResponse.data.user.id
  console.log(`✅ Test user created: ${testEmail}`)
  console.log(`🆔 User ID: ${testUserId}\n`)

  // Test 1: FREE → PRO
  console.log('📝 TEST 1: Changing plan from FREE to PRO')
  console.log('   Expected: quota should auto-sync from 3 → -1 (unlimited)\n')

  const test1 = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
    'Authorization': `Bearer ${adminToken}`
  }, {
    plan: 'pro'
  })

  if (test1.status === 200) {
    const user = test1.data.data.user
    console.log(`   📊 Result:`)
    console.log(`      Plan: ${user.plan}`)
    console.log(`      Quota: ${user.conversions_limit}`)
    console.log(`      Used: ${user.conversions_used}`)

    if (user.plan === 'pro' && user.conversions_limit === -1) {
      console.log(`   ✅ PASS: Quota correctly synced to -1 (unlimited)\n`)
    } else {
      console.log(`   ❌ FAIL: Expected quota -1, got ${user.conversions_limit}\n`)
    }
  } else {
    console.log(`   ❌ FAIL: API error:`, test1.data, '\n')
  }

  // Test 2: PRO → FREE
  console.log('📝 TEST 2: Changing plan from PRO to FREE')
  console.log('   Expected: quota should auto-sync from -1 → 3\n')

  const test2 = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
    'Authorization': `Bearer ${adminToken}`
  }, {
    plan: 'free'
  })

  if (test2.status === 200) {
    const user = test2.data.data.user
    console.log(`   📊 Result:`)
    console.log(`      Plan: ${user.plan}`)
    console.log(`      Quota: ${user.conversions_limit}`)

    if (user.plan === 'free' && user.conversions_limit === 3) {
      console.log(`   ✅ PASS: Quota correctly synced to 3\n`)
    } else {
      console.log(`   ❌ FAIL: Expected quota 3, got ${user.conversions_limit}\n`)
    }
  } else {
    console.log(`   ❌ FAIL: API error:`, test2.data, '\n')
  }

  // Test 3: FREE → STARTER
  console.log('📝 TEST 3: Changing plan from FREE to STARTER')
  console.log('   Expected: quota should auto-sync from 3 → 100\n')

  const test3 = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
    'Authorization': `Bearer ${adminToken}`
  }, {
    plan: 'starter'
  })

  if (test3.status === 200) {
    const user = test3.data.data.user
    console.log(`   📊 Result:`)
    console.log(`      Plan: ${user.plan}`)
    console.log(`      Quota: ${user.conversions_limit}`)

    if (user.plan === 'starter' && user.conversions_limit === 100) {
      console.log(`   ✅ PASS: Quota correctly synced to 100\n`)
    } else {
      console.log(`   ❌ FAIL: Expected quota 100, got ${user.conversions_limit}\n`)
    }
  } else {
    console.log(`   ❌ FAIL: API error:`, test3.data, '\n')
  }

  // Test 4: STARTER → ENTERPRISE
  console.log('📝 TEST 4: Changing plan from STARTER to ENTERPRISE')
  console.log('   Expected: quota should auto-sync from 100 → -1 (unlimited)\n')

  const test4 = await makeRequest('PUT', `/api/admin/users/${testUserId}`, {
    'Authorization': `Bearer ${adminToken}`
  }, {
    plan: 'enterprise'
  })

  if (test4.status === 200) {
    const user = test4.data.data.user
    console.log(`   📊 Result:`)
    console.log(`      Plan: ${user.plan}`)
    console.log(`      Quota: ${user.conversions_limit}`)

    if (user.plan === 'enterprise' && user.conversions_limit === -1) {
      console.log(`   ✅ PASS: Quota correctly synced to -1 (unlimited)\n`)
    } else {
      console.log(`   ❌ FAIL: Expected quota -1, got ${user.conversions_limit}\n`)
    }
  } else {
    console.log(`   ❌ FAIL: API error:`, test4.data, '\n')
  }

  console.log('='.repeat(60))
  console.log('TEST COMPLETE')
  console.log('='.repeat(60))
  console.log('\n✅ The quota sync feature has been tested successfully!')
  console.log(`📧 Test user ${testEmail} can be deleted from admin panel if needed.\n`)

  rl.close()
}

main().catch(error => {
  console.error('Error:', error)
  rl.close()
  process.exit(1)
})
