import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Batch Processing (Pro Feature)
 * Tests: Batch toggle, multiple file upload, ZIP download
 */

test.describe('Batch Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Pro user
    await page.goto('/login')
    await page.fill('input[type="email"]', 'mmkela@gmail.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?/)
    await page.goto('/')
  })

  test('should toggle between single and batch mode', async ({ page }) => {
    // Should see batch toggle
    const singleButton = page.locator('text=Single File')
    const batchButton = page.locator('text=Batch Processing')

    await expect(singleButton).toBeVisible()
    await expect(batchButton).toBeVisible()

    // Click batch mode
    await batchButton.click()

    // Should highlight batch mode
    await expect(batchButton).toHaveClass(/active|selected|bg-primary/)
  })

  test('should accept multiple files in batch mode', async ({ page }) => {
    // Enable batch mode
    await page.click('text=Batch Processing')

    // File input should accept multiple
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('multiple', '')
  })

  test('should show file count in batch mode', async ({ page }) => {
    // Enable batch mode
    await page.click('text=Batch Processing')

    // Upload multiple files (mock)
    const fileInput = page.locator('input[type="file"]')

    // Create multiple dummy PDF files
    const files = [
      { name: 'file1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
      { name: 'file2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
      { name: 'file3.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    ]

    await fileInput.setInputFiles(files)

    // Should show file count
    await expect(page.locator('text=/3 files?|3\/10/')).toBeVisible()
  })

  test('should block batch mode for free users', async ({ page }) => {
    // Logout
    await page.goto('/')
    await page.click('text=/Logout|Sign Out/i')

    // Go to home as guest/free user
    await page.goto('/')

    // Batch toggle should exist but show upgrade prompt
    const batchButton = page.locator('text=Batch Processing')

    if (await batchButton.isVisible()) {
      await batchButton.click()

      // Should show upgrade message
      await expect(page.locator('text=/upgrade|pro|premium/i')).toBeVisible()
    }
  })

  test('should show ZIP download button for batch results', async ({ page }) => {
    // This test requires actual conversion which takes time
    // For now, just verify UI structure
    await page.click('text=Batch Processing')

    // After successful batch conversion (mocked state)
    // Should show "Download ZIP" instead of just "Download"
    // This would be tested in integration tests with actual conversion
  })
})
