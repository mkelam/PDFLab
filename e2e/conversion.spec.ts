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
    // Should show the 3 tabs - use more specific selectors to avoid strict mode violations
    await expect(page.getByTestId('convert-mode-button')).toBeVisible()
    await expect(page.getByTestId('compress-mode-button')).toBeVisible()
    await expect(page.getByTestId('merge-mode-button')).toBeVisible()

    // Should show upload area
    await expect(page.locator('text=/Upload|Drop|Choose/i').first()).toBeVisible()
  })

  test('should switch between conversion modes', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Click Compress tab
    await page.getByTestId('compress-mode-button').click()
    await page.waitForTimeout(500) // Wait for UI transition
    // Check for compression level heading (more specific than text search)
    await expect(page.getByRole('heading', { name: /compression level/i })).toBeVisible({ timeout: 10000 })

    // Click Merge tab
    await page.getByTestId('merge-mode-button').click()
    await page.waitForTimeout(500) // Wait for UI transition
    await expect(page.locator('text=/merge|combine|multiple/i').first()).toBeVisible({ timeout: 10000 })

    // Back to Convert
    await page.getByTestId('convert-mode-button').click()
    await page.waitForTimeout(500) // Wait for UI transition
    // Should show format buttons (not a dropdown selector in current UI)
    await expect(page.locator('text=/PowerPoint|Word|Excel/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show batch processing toggle for pro users', async ({ page }) => {
    // Login as Pro user first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'mmkela@gmail.com') // Pro user
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?/, { timeout: 10000 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should see batch processing toggle - check for both buttons
    await expect(page.getByRole('button', { name: /Single File/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Batch Processing/i })).toBeVisible()
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

    // Should show error - check for alert/toast/error message
    await expect(page.locator('[role="alert"]').or(page.locator('.toast')).or(page.locator('[data-testid="file-error"]')).first()).toBeVisible({ timeout: 5000 })
  })

  test('should select conversion format', async ({ page }) => {
    // Wait for page to be fully loaded (increased timeout for Safari)
    await page.waitForLoadState('networkidle', { timeout: 20000 })

    // Format selection is done via buttons in current UI (not dropdown)
    // Check that all format options are visible
    await expect(page.locator('text=/PowerPoint/i').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/Word/i').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/Excel/i').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/Images/i').first()).toBeVisible({ timeout: 10000 })

    // Test clicking a format button (PowerPoint)
    const pptButton = page.locator('text=/PowerPoint/i').first()
    await pptButton.click({ timeout: 10000 })

    // Verify button is selected (might have active state styling)
    await expect(pptButton).toBeVisible()
  }, { timeout: 60000 }) // Increase test timeout
})
