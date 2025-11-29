import { test, expect } from '@playwright/test'

test.describe('Final Production Verification', () => {
  test('Health check endpoint works', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/health')

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    console.log('Health check:', data)

    expect(data).toHaveProperty('status')
    expect(data.status).toBe('OK')
    expect(data).toHaveProperty('checks')
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
      e.includes('Mixed Content') ||
      e.includes('http://141.136.44.168')
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
    let healthCheckFound = false
    let healthCheckSuccess = false

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Backend API is healthy') || text.includes('✅')) {
        healthCheckFound = true
        healthCheckSuccess = true
      }
      if (text.includes('Backend returned 404') || text.includes('Cannot reach backend')) {
        healthCheckFound = true
        healthCheckSuccess = false
      }
    })

    await page.goto('https://pdflab.pro', { timeout: 30000 })
    await page.waitForTimeout(5000)

    console.log(`Health check found: ${healthCheckFound}, Success: ${healthCheckSuccess}`)
    expect(healthCheckFound).toBe(true)
    expect(healthCheckSuccess).toBe(true)
  })

  test('Founder Edition API accessible', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/api/founder/spots')

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    console.log('Founder spots:', data)
    expect(data).toHaveProperty('spots_remaining')
  })

  test('All critical endpoints respond', async ({ page }) => {
    const endpoints = [
      { url: 'https://pdflab.pro/health', desc: 'Health check' },
      { url: 'https://pdflab.pro/api/founder/spots', desc: 'Founder spots' },
    ]

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.url)
      console.log(`${endpoint.desc}: ${response.status()}`)
      expect(response.ok()).toBeTruthy()
    }
  })
})
