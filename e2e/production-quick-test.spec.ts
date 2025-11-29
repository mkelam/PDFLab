import { test, expect } from '@playwright/test'

test.describe('Production Quick Test', () => {
  test('Production fixes verification', async ({ page }) => {
    const errors: string[] = []
    const apiRequests: string[] = []
    const failedRequests: string[] = []

    // Track console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Track API requests
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/')) {
        apiRequests.push(url)
      }
    })

    // Track failed requests
    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`)
    })

    // Visit homepage
    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 })

    // Wait a bit for any async requests
    await page.waitForTimeout(3000)

    // Check for Mixed Content errors
    const mixedContentErrors = errors.filter(e =>
      e.includes('Mixed Content') ||
      e.includes('http://141.136.44.168')
    )

    // Check for HTTP/2 protocol errors
    const http2Errors = errors.filter(e =>
      e.includes('ERR_HTTP2')
    )

    // Check for HTTP API requests (should be HTTPS only)
    const httpApiRequests = apiRequests.filter(url => url.startsWith('http://'))

    // Log results
    console.log('=== Test Results ===')
    console.log(`Total console errors: ${errors.length}`)
    console.log(`Mixed Content errors: ${mixedContentErrors.length}`)
    console.log(`HTTP/2 protocol errors: ${http2Errors.length}`)
    console.log(`HTTP API requests: ${httpApiRequests.length}`)
    console.log(`HTTPS API requests: ${apiRequests.filter(url => url.startsWith('https://')).length}`)
    console.log(`Failed requests: ${failedRequests.length}`)

    if (mixedContentErrors.length > 0) {
      console.log('Mixed Content errors:', mixedContentErrors)
    }
    if (http2Errors.length > 0) {
      console.log('HTTP/2 errors:', http2Errors)
    }
    if (httpApiRequests.length > 0) {
      console.log('HTTP API requests:', httpApiRequests)
    }

    // Assertions
    expect(mixedContentErrors.length).toBe(0)
    expect(http2Errors.length).toBe(0)
    expect(httpApiRequests.length).toBe(0)
  })

  test('Founder Edition API works', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/api/founder/spots')

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    console.log('Founder spots data:', data)

    expect(data).toHaveProperty('spots_remaining')
    expect(data).toHaveProperty('total_spots')
    expect(data).toHaveProperty('is_available')
  })
})
