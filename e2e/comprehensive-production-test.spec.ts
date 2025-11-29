import { test, expect } from '@playwright/test'

test.describe('Comprehensive Production Testing', () => {
  test('Health check endpoint works', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/health')
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    console.log('✅ Health check:', data)
    expect(data.status).toBe('OK')
  })

  test('No Mixed Content errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(3000)

    const mixedContentErrors = errors.filter(e =>
      e.includes('Mixed Content') || e.includes('http://141.136.44.168')
    )

    console.log(`Mixed Content errors: ${mixedContentErrors.length}`)
    expect(mixedContentErrors.length).toBe(0)
  })

  test('No HTTP/2 protocol errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('ERR_HTTP2')) {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(3000)

    console.log(`HTTP/2 errors: ${errors.length}`)
    expect(errors.length).toBe(0)
  })

  test('Backend health check logs success', async ({ page }) => {
    let healthCheckSuccess = false

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Backend API is healthy') || text.includes('✅')) {
        healthCheckSuccess = true
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(5000)

    console.log(`Health check success: ${healthCheckSuccess}`)
    expect(healthCheckSuccess).toBe(true)
  })

  test('Founder Edition spots API works', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/api/founder/spots')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    console.log('✅ Founder spots:', data)

    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data.total_spots).toBe(100)
  })

  test('Login page loads without errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro/login', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')

    const criticalErrors = errors.filter(e =>
      e.includes('Mixed Content') ||
      e.includes('ERR_HTTP2') ||
      e.includes('CONNECTION_REFUSED')
    )

    console.log(`Login page errors: ${criticalErrors.length}`)
    expect(criticalErrors.length).toBe(0)

    // Check page content loaded
    await expect(page.locator('h1, h2')).toContainText(/sign in|login/i, { timeout: 10000 })
  })

  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')

    // Check title
    await expect(page).toHaveTitle(/PDF Lab Pro/i)

    // Check page is interactive
    const bodyVisible = await page.locator('body').isVisible()
    expect(bodyVisible).toBe(true)

    console.log('✅ Homepage loaded successfully')
  })

  test('All static assets load successfully', async ({ page }) => {
    const failedAssets: string[] = []

    page.on('requestfailed', request => {
      if (request.url().includes('/_next/') || request.url().includes('/static/')) {
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

  test('API endpoints respond correctly', async ({ page }) => {
    const endpoints = [
      { url: 'https://pdflab.pro/health', name: 'Health' },
      { url: 'https://pdflab.pro/api/founder/spots', name: 'Founder spots' },
    ]

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.url)
      console.log(`${endpoint.name}: ${response.status()}`)
      expect(response.ok()).toBeTruthy()
    }
  })

  test('HTTPS is enforced everywhere', async ({ page }) => {
    const httpRequests: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.startsWith('http://') && !url.includes('localhost')) {
        httpRequests.push(url)
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    console.log(`HTTP requests: ${httpRequests.length}`)
    if (httpRequests.length > 0) {
      console.log('HTTP requests found:', httpRequests)
    }

    expect(httpRequests.length).toBe(0)
  })
})
