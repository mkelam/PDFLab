import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E Tests: PDF Conversion Flow
 * Tests: Single file conversion, format selection, download
 */

test.describe('PDF Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display conversion interface', async ({ page }) => {
    // Should show the 3 tabs
    await expect(page.locator('text=Convert')).toBeVisible()
    await expect(page.locator('text=Compress')).toBeVisible()
    await expect(page.locator('text=Merge')).toBeVisible()

    // Should show upload area
    await expect(page.locator('text=/Upload|Drop|Choose/i')).toBeVisible()
  })

  test('should switch between conversion modes', async ({ page }) => {
    // Click Compress tab
    await page.click('text=Compress')
    await expect(page.locator('text=/compression level|good|recommended/i')).toBeVisible()

    // Click Merge tab
    await page.click('text=Merge')
    await expect(page.locator('text=/merge|combine|multiple/i')).toBeVisible()

    // Back to Convert
    await page.click('text=Convert')
    await expect(page.locator('select, [role="combobox"]')).toBeVisible() // Format selector
  })

  test('should show batch processing toggle for pro users', async ({ page }) => {
    // Login as Pro user first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'mmkela@gmail.com') // Pro user
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?/)

    await page.goto('/')

    // Should see batch processing toggle
    await expect(page.locator('text=/batch|single/i')).toBeVisible()
    await expect(page.locator('text=Pro')).toBeVisible() // Pro badge
  })

  test('should validate file type', async ({ page }) => {
    // Try to upload non-PDF file
    const fileInput = page.locator('input[type="file"]')

    // Create a dummy text file
    const buffer = Buffer.from('This is not a PDF')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer,
    })

    // Should show error
    await expect(page.locator('text=/invalid|only PDF|not supported/i')).toBeVisible()
  })

  test('should select conversion format', async ({ page }) => {
    // Find format selector
    const formatSelector = page.locator('select, [role="combobox"]').first()

    // Should have PPTX, DOCX, XLSX options
    await formatSelector.click()
    await expect(page.locator('text=/PowerPoint|pptx/i')).toBeVisible()
    await expect(page.locator('text=/Word|docx/i')).toBeVisible()
    await expect(page.locator('text=/Excel|xlsx/i')).toBeVisible()
  })
})
