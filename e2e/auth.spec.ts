import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Authentication Flow
 * Tests: Login, Signup, Session Persistence, Logout
 */

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in credentials
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/\/(dashboard)?/)

    // Should see user menu or dashboard elements
    await expect(page.locator('text=/Dashboard|Profile|Logout/i')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=/Invalid|Error|Failed/i')).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login')
    await page.click('a[href*="signup"]')
    await expect(page).toHaveURL(/signup/)
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard)?/)

    // Reload page
    await page.reload()

    // Should still be logged in
    await expect(page.locator('text=/Dashboard|Profile|Logout/i')).toBeVisible()
  })
})
