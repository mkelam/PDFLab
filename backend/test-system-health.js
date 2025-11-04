/**
 * Test script for Epic 5: System Health & Monitoring
 * Tests all system health endpoints
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
  console.log('   EPIC 5: SYSTEM HEALTH & MONITORING TESTS')
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

  // Step 2: Test System Health Endpoints
  console.log(`\n${colors.bold}Step 2: System Health Monitoring${colors.reset}`)

  // 2.1 Get overall system health
  const healthData = await testEndpoint(
    'Get System Health Overview',
    'GET',
    '/api/admin/system/health'
  )

  if (healthData && healthData.health) {
    console.log(`  Overall Status: ${healthData.health.overall_status}`)
    if (healthData.health.cloudconvert) {
      console.log(`  CloudConvert: ${healthData.health.cloudconvert.status}`)
    }
    if (healthData.health.redis) {
      console.log(`  Redis: ${healthData.health.redis.status}`)
    }
    if (healthData.health.database) {
      console.log(`  Database: ${healthData.health.database.status}`)
    }
    if (healthData.health.storage) {
      console.log(`  Storage: ${healthData.health.storage.status}`)
    }
  }

  // 2.2 Get CloudConvert health details
  const cloudconvertData = await testEndpoint(
    'Get CloudConvert Health',
    'GET',
    '/api/admin/system/cloudconvert'
  )

  if (cloudconvertData && cloudconvertData.health) {
    console.log(`  Status: ${cloudconvertData.health.status}`)
    console.log(`  Success Rate: ${cloudconvertData.health.success_rate}%`)
    console.log(`  Total Jobs (7d): ${cloudconvertData.health.total_jobs}`)
  }

  // 2.3 Get storage health
  const storageData = await testEndpoint(
    'Get Storage Health',
    'GET',
    '/api/admin/system/storage'
  )

  if (storageData && storageData.storage) {
    if (storageData.storage.total_size_mb !== undefined) {
      console.log(`  Total Size: ${(storageData.storage.total_size_mb).toFixed(2)} MB`)
    }
    if (storageData.storage.total_files !== undefined) {
      console.log(`  Total Files: ${storageData.storage.total_files}`)
    }
    if (storageData.storage.users_by_storage) {
      console.log(`  Top Users: ${storageData.storage.users_by_storage.length}`)
    }
  }

  // 2.4 Get error logs
  const errorData = await testEndpoint(
    'Get Error Logs',
    'GET',
    '/api/admin/system/errors?page=1&limit=10'
  )

  if (errorData) {
    if (errorData.errors) {
      console.log(`  Grouped Errors: ${errorData.errors.length}`)
    }
    if (errorData.pagination) {
      console.log(`  Total Errors: ${errorData.pagination.total}`)
    }
  }

  // Step 3: Test Manual Operations
  console.log(`\n${colors.bold}Step 3: Manual Operations${colors.reset}`)

  // 3.1 Test conversion operation
  await testEndpoint(
    'Test Conversion Operation',
    'POST',
    '/api/admin/system/test-conversion'
  )

  // 3.2 Clear Redis cache
  const cacheData = await testEndpoint(
    'Clear Redis Cache',
    'POST',
    '/api/admin/system/clear-cache'
  )

  if (cacheData) {
    console.log(`  Keys Deleted: ${cacheData.keys_deleted || 0}`)
  }

  // 3.3 Cleanup storage
  const cleanupData = await testEndpoint(
    'Cleanup Expired Storage',
    'POST',
    '/api/admin/system/cleanup-storage'
  )

  if (cleanupData) {
    console.log(`  Files Deleted: ${cleanupData.files_deleted || 0}`)
    console.log(`  Space Freed: ${cleanupData.space_freed_mb || 0} MB`)
  }

  // Step 4: Negative Tests
  console.log(`\n${colors.bold}Step 4: Negative Tests${colors.reset}`)

  // 4.1 Test without auth
  const tempToken = authToken
  authToken = null
  await testEndpoint(
    'Get Health Without Auth',
    'GET',
    '/api/admin/system/health'
  )
  authToken = tempToken

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('   TEST SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(colors.reset)
  console.log(`${colors.green}✓ Epic 5 endpoint tests completed${colors.reset}`)
  console.log(`${colors.yellow}⚠ Review output above for any failures${colors.reset}`)
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`)
  process.exit(1)
})
