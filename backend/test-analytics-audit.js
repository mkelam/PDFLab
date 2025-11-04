/**
 * Test script for Epic 6 & 7: Analytics Dashboard + Audit Logs
 * Tests all analytics and audit log endpoints
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
  console.log('   EPIC 6 & 7: ANALYTICS + AUDIT LOGS TESTS')
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

  // ========== EPIC 6: ANALYTICS ==========
  console.log(`\n${colors.bold}${colors.cyan}EPIC 6: ANALYTICS DASHBOARD${colors.reset}`)

  // Step 2: Analytics Overview
  console.log(`\n${colors.bold}Step 2: Analytics Overview${colors.reset}`)

  const overviewData = await testEndpoint(
    'Get Analytics Overview',
    'GET',
    '/api/admin/analytics/overview'
  )

  if (overviewData && overviewData.analytics) {
    const metrics = overviewData.analytics.metrics
    console.log(`  Total Users: ${metrics.total_users?.value || 0} (${metrics.total_users?.change_percent || 0}%)`)
    console.log(`  Active Users: ${metrics.active_users?.value || 0}`)
    console.log(`  Total Conversions: ${metrics.total_conversions?.value || 0} (${metrics.total_conversions?.change_percent || 0}%)`)
    console.log(`  MRR: $${metrics.mrr?.value || 0}`)
  }

  // Step 3: User Analytics
  console.log(`\n${colors.bold}Step 3: User Analytics${colors.reset}`)

  const userAnalytics = await testEndpoint(
    'Get User Analytics',
    'GET',
    '/api/admin/analytics/users'
  )

  if (userAnalytics && userAnalytics.users) {
    console.log(`  User Plans: ${userAnalytics.users.distribution_by_plan?.length || 0} plan types`)
    console.log(`  Churn Data: ${userAnalytics.users.churn_rate_trend?.length || 0} months`)
  }

  // Step 4: Conversion Analytics
  console.log(`\n${colors.bold}Step 4: Conversion Analytics${colors.reset}`)

  const conversionAnalytics = await testEndpoint(
    'Get Conversion Analytics',
    'GET',
    '/api/admin/analytics/conversions'
  )

  if (conversionAnalytics && conversionAnalytics.conversions) {
    console.log(`  Success Rate Trend: ${conversionAnalytics.conversions.success_rate_trend?.length || 0} days`)
    console.log(`  File Size Distribution: ${conversionAnalytics.conversions.file_size_distribution?.length || 0} ranges`)
  }

  // Step 5: Revenue Analytics
  console.log(`\n${colors.bold}Step 5: Revenue Analytics${colors.reset}`)

  const revenueAnalytics = await testEndpoint(
    'Get Revenue Analytics',
    'GET',
    '/api/admin/analytics/revenue'
  )

  if (revenueAnalytics && revenueAnalytics.revenue) {
    console.log(`  MRR Trend: ${revenueAnalytics.revenue.mrr_trend?.length || 0} months`)
    console.log(`  Revenue by Plan: ${revenueAnalytics.revenue.revenue_by_plan?.length || 0} plans`)
    console.log(`  Subscription Trend: ${revenueAnalytics.revenue.subscription_trend?.length || 0} months`)
  }

  // Step 6: Feature Analytics
  console.log(`\n${colors.bold}Step 6: Feature Analytics${colors.reset}`)

  const featureAnalytics = await testEndpoint(
    'Get Feature Analytics',
    'GET',
    '/api/admin/analytics/features'
  )

  if (featureAnalytics && featureAnalytics.features) {
    console.log(`  Feature Usage: ${featureAnalytics.features.usage?.length || 0} features`)
    console.log(`  Power Users: ${featureAnalytics.features.power_users?.length || 0} users`)
  }

  // ========== EPIC 7: AUDIT LOGS ==========
  console.log(`\n${colors.bold}${colors.cyan}EPIC 7: AUDIT LOGS & COMPLIANCE${colors.reset}`)

  // Step 7: Audit Logs
  console.log(`\n${colors.bold}Step 7: Audit Log Management${colors.reset}`)

  const auditLogs = await testEndpoint(
    'Get All Audit Logs',
    'GET',
    '/api/admin/audit-logs?page=1&limit=25'
  )

  if (auditLogs && auditLogs.logs) {
    console.log(`  Total Logs: ${auditLogs.pagination?.total || 0}`)
    console.log(`  Current Page Logs: ${auditLogs.logs.length}`)
  }

  // Step 8: Audit Log Stats
  console.log(`\n${colors.bold}Step 8: Audit Log Statistics${colors.reset}`)

  const auditStats = await testEndpoint(
    'Get Audit Log Stats',
    'GET',
    '/api/admin/audit-logs/stats'
  )

  if (auditStats && auditStats.stats) {
    console.log(`  Total Logs: ${auditStats.stats.total_logs || 0}`)
    console.log(`  Top Admins: ${auditStats.stats.top_admins?.length || 0}`)
    console.log(`  Top Actions: ${auditStats.stats.top_actions?.length || 0}`)
  }

  // Step 9: Security Events
  console.log(`\n${colors.bold}Step 9: Security Events${colors.reset}`)

  const securityEvents = await testEndpoint(
    'Get Security Events (24h)',
    'GET',
    '/api/admin/audit-logs/security-events'
  )

  if (securityEvents && securityEvents.events) {
    console.log(`  Security Events: ${securityEvents.events.length}`)
    console.log(`  Critical: ${securityEvents.events.filter(e => e.severity === 'critical').length}`)
    console.log(`  Warning: ${securityEvents.events.filter(e => e.severity === 'warning').length}`)
  }

  // Step 10: Get specific audit log (if any exist)
  if (auditLogs && auditLogs.logs && auditLogs.logs.length > 0) {
    console.log(`\n${colors.bold}Step 10: Audit Log Details${colors.reset}`)

    const logId = auditLogs.logs[0].id
    await testEndpoint(
      'Get Audit Log By ID',
      'GET',
      `/api/admin/audit-logs/${logId}`
    )
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('   TEST SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(colors.reset)
  console.log(`${colors.green}✓ Epic 6 & 7 endpoint tests completed${colors.reset}`)
  console.log(`${colors.yellow}⚠ Review output above for any failures${colors.reset}`)
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`)
  process.exit(1)
})
