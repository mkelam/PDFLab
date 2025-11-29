import { test, expect } from '@playwright/test'

/**
 * E2E Test: Admin Panel Quota Sync (Production)
 *
 * Tests the fix for quota synchronization when changing user plans
 * in the admin panel. This verifies that when an admin changes a user's
 * plan (e.g., free → pro), the conversions_limit automatically updates
 * to match the new plan tier.
 *
 * Plan limits:
 * - free: 3 conversions
 * - starter: 100 conversions
 * - pro: -1 (unlimited)
 * - enterprise: -1 (unlimited)
 *
 * IMPORTANT: This test uses the PRODUCTION environment
 */

const API_URL = 'https://pdflab.pro'
const FRONTEND_URL = 'https://pdflab.pro'

test.describe('Admin Panel - Quota Sync on Plan Change (Production)', () => {
  let adminToken: string
  let testUserId: number
  let testUserEmail: string

  test.beforeAll(async ({ browser }) => {
    // Create a new page for setup
    const context = await browser.newContext()
    const page = await context.newPage()

    // Step 1: Create an admin account and get token
    const timestamp = Date.now()
    const adminEmail = `admin-test-${timestamp}@test.com`
    const adminPassword = 'AdminTest123!'

    console.log(`\n🔧 Setting up test environment on PRODUCTION...`)
    console.log(`📧 Admin email: ${adminEmail}`)

    // Register admin user
    const registerResponse = await page.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: adminEmail,
        password: adminPassword,
        full_name: 'Admin Test User'
      }
    })

    if (!registerResponse.ok()) {
      const errorText = await registerResponse.text()
      throw new Error(`Failed to register admin: ${errorText}`)
    }

    // Login as admin
    const loginResponse = await page.request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: adminEmail,
        password: adminPassword
      }
    })

    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text()
      throw new Error(`Failed to login admin: ${errorText}`)
    }

    const loginData = await loginResponse.json()
    adminToken = loginData.token

    console.log(`✅ Admin logged in successfully`)
    console.log(`   Token: ${adminToken.substring(0, 20)}...`)

    // Step 2: Create a test user to modify
    testUserEmail = `test-user-${timestamp}@test.com`
    const testUserPassword = 'TestUser123!'

    const testUserRegister = await page.request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: testUserEmail,
        password: testUserPassword,
        full_name: 'Test User for Quota Sync'
      }
    })

    if (!testUserRegister.ok()) {
      const errorText = await testUserRegister.text()
      throw new Error(`Failed to register test user: ${errorText}`)
    }

    const testUserData = await testUserRegister.json()
    testUserId = testUserData.user.id

    console.log(`✅ Test user created: ID ${testUserId}`)
    console.log(`📧 Test user email: ${testUserEmail}`)

    await context.close()
  })

  test('should automatically update quota when changing plan via API', async ({ page }) => {
    console.log(`\n🎬 Starting API test: Plan change Free → Pro`)

    // Step 1: Verify initial state (should be free plan with 3 conversions)
    const initialResponse = await page.request.get(`${API_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })

    expect(initialResponse.ok()).toBeTruthy()

    const initialData = await initialResponse.json()
    const initialUser = initialData.data.user

    console.log(`📊 Initial state:`)
    console.log(`   Plan: ${initialUser.plan}`)
    console.log(`   Quota: ${initialUser.conversions_limit}`)

    expect(initialUser.plan).toBe('free')
    expect(initialUser.conversions_limit).toBe(3)

    // Step 2: Update plan to Pro (backend should auto-sync quota)
    console.log(`\n🔄 Changing plan to Pro via API...`)

    const updateResponse = await page.request.put(`${API_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        plan: 'pro'
      }
    })

    if (!updateResponse.ok()) {
      const errorText = await updateResponse.text()
      throw new Error(`Failed to update user: ${errorText}`)
    }

    const updateData = await updateResponse.json()
    const updatedUser = updateData.data.user

    console.log(`\n📊 Updated state (from response):`)
    console.log(`   Plan: ${updatedUser.plan}`)
    console.log(`   Quota: ${updatedUser.conversions_limit}`)

    // Verify the backend synced the quota correctly
    expect(updatedUser.plan).toBe('pro')
    expect(updatedUser.conversions_limit).toBe(-1) // Unlimited for pro

    // Step 3: Verify persistence by fetching again
    console.log(`\n🔍 Verifying quota persistence...`)

    const verifyResponse = await page.request.get(`${API_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })

    expect(verifyResponse.ok()).toBeTruthy()

    const verifyData = await verifyResponse.json()
    const verifiedUser = verifyData.data.user

    console.log(`\n📊 Verified state (after fetch):`)
    console.log(`   Plan: ${verifiedUser.plan}`)
    console.log(`   Quota: ${verifiedUser.conversions_limit}`)

    expect(verifiedUser.plan).toBe('pro')
    expect(verifiedUser.conversions_limit).toBe(-1)

    console.log(`\n✅ Test passed! Quota synced correctly from Free (3) → Pro (-1)`)
  })

  test('should update quota correctly for all plan tiers', async ({ page }) => {
    console.log(`\n🎬 Starting comprehensive plan tier test`)

    const planTests = [
      { plan: 'free', expectedQuota: 3 },
      { plan: 'starter', expectedQuota: 100 },
      { plan: 'pro', expectedQuota: -1 },
      { plan: 'enterprise', expectedQuota: -1 }
    ]

    for (const { plan, expectedQuota } of planTests) {
      console.log(`\n📝 Testing plan: ${plan} (expected quota: ${expectedQuota})`)

      // Update plan via API
      const updateResponse = await page.request.put(`${API_URL}/api/admin/users/${testUserId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          plan: plan
        }
      })

      expect(updateResponse.ok()).toBeTruthy()

      const updateData = await updateResponse.json()
      const updatedUser = updateData.data.user

      console.log(`   ✓ Plan: ${updatedUser.plan}, Quota: ${updatedUser.conversions_limit}`)

      expect(updatedUser.plan).toBe(plan)
      expect(updatedUser.conversions_limit).toBe(expectedQuota)

      // Wait a moment between tests
      await page.waitForTimeout(500)
    }

    console.log(`\n✅ All plan tiers tested successfully!`)
  })

  test('should visually verify quota update in admin UI', async ({ page }) => {
    test.slow() // Mark as slow due to UI navigation

    console.log(`\n🎬 Starting visual UI test`)

    // Step 1: Navigate to login page
    await page.goto(`${FRONTEND_URL}/login`)
    await page.waitForLoadState('networkidle')

    console.log(`🔐 Navigated to login page`)

    // Step 2: Set admin token in localStorage
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token)
    }, adminToken)

    console.log(`✅ Set admin token in localStorage`)

    // Step 3: First reset user to free plan via API
    await page.request.put(`${API_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        plan: 'free'
      }
    })

    console.log(`📝 Reset user to Free plan`)

    // Step 4: Navigate to user edit page
    await page.goto(`${FRONTEND_URL}/admin/users/${testUserId}`)
    await page.waitForLoadState('networkidle')

    console.log(`📄 Navigated to user edit page`)

    // Wait for page to fully load
    try {
      await page.waitForSelector('h1:has-text("Edit User")', { timeout: 15000 })
      console.log(`✅ Page loaded successfully`)
    } catch (error) {
      console.log(`⚠️ Page load timeout, taking screenshot...`)
      await page.screenshot({
        path: `test-results/screenshots/admin-quota-load-error.png`,
        fullPage: true
      })
      throw error
    }

    // Take screenshot of initial state
    await page.screenshot({
      path: `test-results/screenshots/admin-quota-1-initial-free.png`,
      fullPage: true
    })

    // Step 5: Verify initial state shows free plan
    const initialPlan = await page.inputValue('#plan')
    const initialQuota = await page.inputValue('#conversionsLimit')

    console.log(`📊 Initial UI state:`)
    console.log(`   Plan: ${initialPlan}`)
    console.log(`   Quota: ${initialQuota}`)

    expect(initialPlan).toBe('free')
    expect(initialQuota).toBe('3')

    // Step 6: Change plan to Pro using the select dropdown
    console.log(`\n🔄 Changing plan to Pro in UI...`)

    await page.click('#plan')
    await page.waitForTimeout(500)

    // Wait for dropdown to appear
    await page.waitForSelector('[role="option"][data-value="pro"]', { timeout: 5000 })
    await page.click('[role="option"][data-value="pro"]')
    await page.waitForTimeout(500)

    console.log(`✅ Selected Pro plan in dropdown`)

    // Take screenshot after plan selection
    await page.screenshot({
      path: `test-results/screenshots/admin-quota-2-plan-selected.png`,
      fullPage: true
    })

    // Step 7: Update quota field to -1 (unlimited)
    console.log(`✏️ Updating quota field to -1...`)
    await page.fill('#conversionsLimit', '-1')
    await page.waitForTimeout(500)

    // Take screenshot before saving
    await page.screenshot({
      path: `test-results/screenshots/admin-quota-3-before-save.png`,
      fullPage: true
    })

    // Step 8: Save changes
    console.log(`\n💾 Clicking Save Changes button...`)

    await page.click('button:has-text("Save Changes")')

    // Wait for save operation
    await page.waitForTimeout(3000)

    // Take screenshot after save
    await page.screenshot({
      path: `test-results/screenshots/admin-quota-4-after-save.png`,
      fullPage: true
    })

    // Step 9: Verify via API that changes were saved
    console.log(`\n🔍 Verifying changes via API...`)

    const verifyResponse = await page.request.get(`${API_URL}/api/admin/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    })

    const verifyData = await verifyResponse.json()
    const verifiedUser = verifyData.data.user

    console.log(`\n📊 Backend verification:`)
    console.log(`   Plan: ${verifiedUser.plan}`)
    console.log(`   Quota: ${verifiedUser.conversions_limit}`)

    expect(verifiedUser.plan).toBe('pro')
    expect(verifiedUser.conversions_limit).toBe(-1)

    // Step 10: Refresh page and verify persistence
    console.log(`\n🔄 Refreshing page to verify persistence...`)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1:has-text("Edit User")')
    await page.waitForTimeout(1000)

    const refreshedPlan = await page.inputValue('#plan')
    const refreshedQuota = await page.inputValue('#conversionsLimit')

    console.log(`\n📊 After refresh:`)
    console.log(`   Plan: ${refreshedPlan}`)
    console.log(`   Quota: ${refreshedQuota}`)

    expect(refreshedPlan).toBe('pro')
    expect(refreshedQuota).toBe('-1')

    // Final screenshot
    await page.screenshot({
      path: `test-results/screenshots/admin-quota-5-after-refresh.png`,
      fullPage: true
    })

    console.log(`\n✅ Visual UI test completed successfully!`)
    console.log(`📸 Screenshots saved to test-results/screenshots/`)
  })
})
