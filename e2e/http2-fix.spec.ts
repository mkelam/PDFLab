import { test, expect } from '@playwright/test'

test.describe('HTTP/2 Protocol Error Fix', () => {
  test('Should load Next.js static chunks without protocol errors', async ({ page }) => {
    const protocolErrors: string[] = []

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        protocolErrors.push(msg.text())
      }
    })

    // Capture request failures
    page.on('requestfailed', request => {
      protocolErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`)
    })

    await page.goto('https://pdflab.pro')
    await page.waitForLoadState('networkidle')

    // Filter for HTTP/2 protocol errors
    const http2Errors = protocolErrors.filter(error =>
      error.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
      error.includes('net::ERR_HTTP2')
    )

    console.log('All errors:', protocolErrors)
    console.log('HTTP/2 errors:', http2Errors)

    expect(http2Errors.length).toBe(0)
  })

  test('Should successfully load all Next.js static chunks', async ({ page }) => {
    const staticChunks: string[] = []
    const failedChunks: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/_next/static/chunks/')) {
        staticChunks.push(url)
      }
    })

    page.on('requestfailed', request => {
      const url = request.url()
      if (url.includes('/_next/static/chunks/')) {
        failedChunks.push(url)
      }
    })

    await page.goto('https://pdflab.pro')
    await page.waitForLoadState('networkidle')

    console.log(`Loaded ${staticChunks.length} static chunks`)
    console.log(`Failed chunks: ${failedChunks.length}`)

    expect(failedChunks.length).toBe(0)
    expect(staticChunks.length).toBeGreaterThan(0)
  })

  test('Login page should load without HTTP/2 errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('https://pdflab.pro/login')
    await page.waitForLoadState('networkidle')

    const protocolErrors = errors.filter(e =>
      e.includes('ERR_HTTP2') || e.includes('protocol error')
    )

    expect(protocolErrors.length).toBe(0)
    await expect(page.locator('h1')).toContainText(/sign in|login/i)
  })

  test('Static files should have proper cache headers', async ({ page }) => {
    const response = await page.request.get('https://pdflab.pro/_next/static/chunks/main-app-cfb5a26e626f9dd4.js')

    expect(response.ok()).toBeTruthy()

    const cacheControl = response.headers()['cache-control']
    expect(cacheControl).toContain('max-age=31536000')
    expect(cacheControl).toContain('immutable')
  })

  test('All critical pages should load without errors', async ({ page }) => {
    const pages = [
      'https://pdflab.pro',
      'https://pdflab.pro/login',
      'https://pdflab.pro/register',
    ]

    for (const url of pages) {
      const errors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto(url)
      await page.waitForLoadState('networkidle')

      const criticalErrors = errors.filter(e =>
        e.includes('ERR_HTTP2') ||
        e.includes('ERR_CONNECTION') ||
        e.includes('Mixed Content')
      )

      console.log(`${url}: ${criticalErrors.length} critical errors`)
      expect(criticalErrors.length).toBe(0)
    }
  })
})
