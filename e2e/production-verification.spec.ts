import { test, expect } from '@playwright/test'

test.describe('Production Deployment Verification', () => {
  test('No Mixed Content errors on production', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    const mixedContentErrors = errors.filter(e =>
      e.includes('Mixed Content') ||
      e.includes('http://141.136.44.168')
    )

    expect(mixedContentErrors.length).toBe(0)
  })

  test('No HTTP/2 protocol errors on production', async ({ page }) => {
    const protocolErrors: string[] = []
    const failedRequests: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('ERR_HTTP2')) {
        protocolErrors.push(msg.text())
      }
    })

    page.on('requestfailed', request => {
      if (request.failure()?.errorText.includes('ERR_HTTP2')) {
        failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`)
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 })

    expect(protocolErrors.length).toBe(0)
    expect(failedRequests.length).toBe(0)
  })

  test('Backend API is healthy and using HTTPS', async ({ page }) => {
    const apiRequests: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/')) {
        apiRequests.push(url)
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // Check no HTTP API requests
    const httpApiRequests = apiRequests.filter(url => url.startsWith('http://'))
    expect(httpApiRequests.length).toBe(0)

    // Verify API endpoints are accessible
    const spotsResponse = await page.request.get('https://pdflab.pro/api/founder/spots')
    expect(spotsResponse.ok()).toBeTruthy()

    const data = await spotsResponse.json()
    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('is_available')
  })

  test('Login page works correctly', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro/login', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // Check page loaded
    await expect(page.locator('h1')).toContainText(/sign in|login/i, { timeout: 10000 })

    // No critical errors
    const criticalErrors = errors.filter(e =>
      e.includes('Mixed Content') ||
      e.includes('ERR_HTTP2') ||
      e.includes('CONNECTION_REFUSED')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('Register page works correctly', async ({ page }) => {
    await page.goto('https://pdflab.pro/register', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // Check page loaded
    await expect(page.locator('h1, h2')).toContainText(/sign up|register|create account/i, { timeout: 10000 })
  })

  test('Founder Edition spots endpoint returns valid data', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/api/founder/spots')

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()

    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data).toHaveProperty('is_available')

    expect(typeof data.spots_remaining).toBe('number')
    expect(typeof data.total_spots).toBe('number')
    expect(typeof data.is_available).toBe('boolean')

    expect(data.total_spots).toBe(100)
    expect(data.spots_remaining).toBeGreaterThanOrEqual(0)
    expect(data.spots_remaining).toBeLessThanOrEqual(100)
  })

  test('All static assets load successfully', async ({ page }) => {
    const failedAssets: string[] = []

    page.on('requestfailed', request => {
      if (request.url().includes('/_next/static/')) {
        failedAssets.push(request.url())
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    console.log(`Failed static assets: ${failedAssets.length}`)
    if (failedAssets.length > 0) {
      console.log('Failed assets:', failedAssets)
    }

    expect(failedAssets.length).toBe(0)
  })

  test('Frontend uses correct API URL (HTTPS)', async ({ page }) => {
    let apiUrlFound = false
    let correctUrl = false

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('API URL:')) {
        apiUrlFound = true
        if (text.includes('https://pdflab.pro')) {
          correctUrl = true
        }
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // API URL should be logged and should be HTTPS
    expect(apiUrlFound).toBe(true)
    expect(correctUrl).toBe(true)
  })
})
