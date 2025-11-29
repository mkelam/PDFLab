import { test, expect } from '@playwright/test'

// Enable video recording for all tests
test.use({
  video: 'on',
  screenshot: 'on'
})

test.describe('Visual Production Testing with Screenshots', () => {
  test('Homepage loads and captures screenshot', async ({ page }) => {
    console.log('📸 Testing homepage...')

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/homepage-full.png',
      fullPage: true
    })
    console.log('✅ Homepage screenshot saved: test-results/homepage-full.png')

    // Verify title
    await expect(page).toHaveTitle(/PDF Lab Pro/i)
  })

  test('Health check endpoint works with screenshot', async ({ page }) => {
    console.log('📸 Testing health check...')

    const response = await page.request.get('https://pdflab.pro/health')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    console.log('✅ Health check response:', JSON.stringify(data, null, 2))

    expect(data.status).toBe('OK')
    expect(data.checks.database).toBe('OK')
    expect(data.checks.redis).toBe('OK')
  })

  test('Login page loads with screenshot', async ({ page }) => {
    console.log('📸 Testing login page...')

    await page.goto('https://pdflab.pro/login', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')

    // Take screenshot
    await page.screenshot({
      path: 'test-results/login-page.png',
      fullPage: true
    })
    console.log('✅ Login page screenshot saved: test-results/login-page.png')

    // Verify page loaded
    await expect(page.locator('h1, h2')).toContainText(/sign in|login/i, { timeout: 10000 })
  })

  test('Register page loads with screenshot', async ({ page }) => {
    console.log('📸 Testing register page...')

    await page.goto('https://pdflab.pro/register', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')

    // Take screenshot
    await page.screenshot({
      path: 'test-results/register-page.png',
      fullPage: true
    })
    console.log('✅ Register page screenshot saved: test-results/register-page.png')

    // Verify page loaded
    await expect(page.locator('h1, h2')).toContainText(/sign up|register|create account/i, { timeout: 10000 })
  })

  test('Founder Edition spots API returns correct data', async ({ page }) => {
    console.log('📸 Testing Founder Edition API...')

    const response = await page.request.get('https://pdflab.pro/api/founder/spots')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    console.log('✅ Founder Edition spots:', JSON.stringify(data, null, 2))

    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data).toHaveProperty('is_available')
    expect(data.total_spots).toBe(100)
    expect(typeof data.spots_remaining).toBe('number')
  })

  test('No Mixed Content or HTTP/2 errors', async ({ page }) => {
    console.log('📸 Testing for security errors...')

    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(5000)

    // Take screenshot after load
    await page.screenshot({
      path: 'test-results/homepage-after-load.png'
    })

    // Check for specific error types
    const mixedContentErrors = errors.filter(e =>
      e.includes('Mixed Content') || e.includes('http://141.136.44.168')
    )

    const http2Errors = errors.filter(e =>
      e.includes('ERR_HTTP2')
    )

    console.log(`Total errors: ${errors.length}`)
    console.log(`Mixed Content errors: ${mixedContentErrors.length}`)
    console.log(`HTTP/2 errors: ${http2Errors.length}`)

    expect(mixedContentErrors.length).toBe(0)
    expect(http2Errors.length).toBe(0)
  })

  test('Backend health check logs success in console', async ({ page }) => {
    console.log('📸 Testing backend health check console logs...')

    let healthCheckSuccess = false
    let apiUrl = ''

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Backend API is healthy')) {
        healthCheckSuccess = true
      }
      if (text.includes('API URL:')) {
        apiUrl = text
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(5000)

    console.log(`✅ Health check success: ${healthCheckSuccess}`)
    console.log(`API URL log: ${apiUrl}`)

    expect(healthCheckSuccess).toBe(true)
    expect(apiUrl).toContain('https://pdflab.pro')
  })

  test('All critical endpoints respond', async ({ page }) => {
    console.log('📸 Testing all critical endpoints...')

    const endpoints = [
      { url: 'https://pdflab.pro/health', name: 'Health check' },
      { url: 'https://pdflab.pro/api/founder/spots', name: 'Founder spots' },
    ]

    const results: any[] = []

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.url)
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        status: response.status(),
        ok: response.ok()
      }
      results.push(result)
      console.log(`${endpoint.name}: ${response.status()} - ${response.ok() ? '✅' : '❌'}`)

      expect(response.ok()).toBeTruthy()
    }

    console.log('✅ All endpoints test results:', JSON.stringify(results, null, 2))
  })

  test('HTTPS is enforced (no HTTP requests)', async ({ page }) => {
    console.log('📸 Testing HTTPS enforcement...')

    const httpRequests: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        httpRequests.push(url)
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    console.log(`HTTP (insecure) requests: ${httpRequests.length}`)
    if (httpRequests.length > 0) {
      console.log('⚠️ HTTP requests found:', httpRequests)
    }

    expect(httpRequests.length).toBe(0)
  })

  test('Static assets load successfully', async ({ page }) => {
    console.log('📸 Testing static asset loading...')

    const failedAssets: string[] = []
    const loadedAssets: string[] = []

    page.on('requestfailed', request => {
      failedAssets.push(request.url())
    })

    page.on('response', response => {
      const url = response.url()
      if ((url.includes('/_next/') || url.includes('/static/')) && response.ok()) {
        loadedAssets.push(url)
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    console.log(`✅ Loaded assets: ${loadedAssets.length}`)
    console.log(`❌ Failed assets: ${failedAssets.length}`)

    if (failedAssets.length > 0) {
      console.log('Failed assets:', failedAssets)
    }

    expect(failedAssets.length).toBe(0)
  })

  test('Complete page interaction flow with video', async ({ page }) => {
    console.log('📹 Recording complete interaction flow...')

    // Navigate to homepage
    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/flow-1-homepage.png' })
    console.log('Step 1: Homepage loaded')

    // Navigate to login
    await page.goto('https://pdflab.pro/login', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({ path: 'test-results/flow-2-login.png' })
    console.log('Step 2: Login page loaded')

    // Navigate to register
    await page.goto('https://pdflab.pro/register', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({ path: 'test-results/flow-3-register.png' })
    console.log('Step 3: Register page loaded')

    // Back to homepage
    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/flow-4-back-home.png' })
    console.log('Step 4: Returned to homepage')

    console.log('✅ Complete flow recorded with screenshots and video')
  })
})
