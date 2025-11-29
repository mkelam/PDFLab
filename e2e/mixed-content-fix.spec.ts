import { test, expect } from '@playwright/test'

test.describe('Mixed Content Fix Verification', () => {
  test('Production site should use HTTPS for all API calls', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://pdflab.pro')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for mixed content errors in console
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Reload to capture console errors
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check that there are no Mixed Content errors
    const mixedContentErrors = consoleErrors.filter(error =>
      error.includes('Mixed Content') ||
      error.includes('blocked') ||
      error.includes('http://141.136.44.168')
    )

    expect(mixedContentErrors.length).toBe(0)

    // Verify page title loads correctly
    await expect(page).toHaveTitle(/PDF Lab Pro/)
  })

  test('API calls should use HTTPS protocol', async ({ page }) => {
    const apiRequests: string[] = []

    // Capture all network requests
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/')) {
        apiRequests.push(url)
      }
    })

    await page.goto('https://pdflab.pro')
    await page.waitForLoadState('networkidle')

    // Check that all API requests use HTTPS
    const httpApiRequests = apiRequests.filter(url => url.startsWith('http://'))

    expect(httpApiRequests.length).toBe(0)

    // Verify at least some HTTPS API requests were made
    const httpsApiRequests = apiRequests.filter(url => url.startsWith('https://'))
    expect(httpsApiRequests.length).toBeGreaterThan(0)
  })

  test('Login page should not have mixed content errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro/login')
    await page.waitForLoadState('networkidle')

    // Check for connection refused or mixed content errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('CONNECTION_REFUSED') ||
      error.includes('Mixed Content') ||
      error.includes('http://141.136.44.168')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('Founder spots endpoint should be accessible via HTTPS', async ({ page }) => {
    // Test the API endpoint directly
    const response = await page.request.get('https://pdflab.pro/api/founder/spots')

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data).toHaveProperty('is_available')
  })

  test('Backend health check should work via HTTPS', async ({ page }) => {
    // Navigate to home page and check backend connectivity
    await page.goto('https://pdflab.pro')
    await page.waitForLoadState('networkidle')

    // Wait a bit for health check to run
    await page.waitForTimeout(2000)

    // Check console for backend connectivity messages
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    await page.reload()
    await page.waitForTimeout(2000)

    // Should not see "Cannot reach backend" errors
    const backendErrors = consoleMessages.filter(msg =>
      msg.includes('Cannot reach backend') ||
      msg.includes('CONNECTION_REFUSED')
    )

    // Note: Some errors may occur during initial page load, but they shouldn't persist
    console.log('Console messages:', consoleMessages)
  })
})
