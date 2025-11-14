import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Authentication Flow
 * Tests: Login, Signup, Session Persistence, Logout
 */

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    // Check URL instead of title (more reliable)
    await expect(page).toHaveURL(/\/login/)
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in credentials
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect away from login page (increased timeout for Safari)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Check for authenticated state - look for Dashboard button (use .first() for strict mode)
    await expect(
      page.getByRole('button', { name: /dashboard/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message - try multiple selector strategies
    // Wait a bit for error to appear
    await page.waitForTimeout(1000)

    // Try to find error message using multiple approaches
    const errorVisible = await page.locator('[role="alert"]').first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('.text-red-500').first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('.text-destructive').first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('text=/invalid|incorrect|wrong|failed/i').first().isVisible({ timeout: 3000 }).catch(() => false)

    expect(errorVisible).toBeTruthy()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Find signup link - exact text is "Create a new account"
    const signupLink = page.getByRole('link', { name: /create.*account|sign.*up/i })
    await signupLink.waitFor({ state: 'visible', timeout: 10000 })
    await signupLink.click()
    await expect(page).toHaveURL(/signup/, { timeout: 10000 })
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Should still be logged in - look for Dashboard button (use .first() for strict mode)
    await expect(
      page.getByRole('button', { name: /dashboard/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
