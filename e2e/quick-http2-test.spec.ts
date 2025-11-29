import { test, expect } from '@playwright/test'

test.describe('Quick HTTP/2 Fix Verification', () => {
  test('Homepage should load without HTTP/2 protocol errors', async ({ page }) => {
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

    console.log(`Protocol errors: ${protocolErrors.length}`)
    console.log(`Failed requests: ${failedRequests.length}`)

    if (protocolErrors.length > 0) {
      console.log('Protocol errors:', protocolErrors)
    }
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests)
    }

    expect(protocolErrors.length).toBe(0)
    expect(failedRequests.length).toBe(0)
  })
})
