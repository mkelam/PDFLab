import { Page } from '@playwright/test'

/**
 * Test Helper: Authentication
 * Provides utilities for login, logout, and user management in tests
 */

export interface TestUser {
  email: string
  password: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  conversions_limit: number
}

export const TEST_USERS: Record<string, TestUser> = {
  free: {
    email: 'testuser@pdflab.com',
    password: 'TestPass123!',
    plan: 'free',
    conversions_limit: 3,
  },
  pro: {
    email: 'mmkela@gmail.com',
    password: 'TestPass123!',
    plan: 'pro',
    conversions_limit: 999999,
  },
  admin: {
    email: 'admin@pdflab.test',
    password: 'Admin123!',
    plan: 'enterprise',
    conversions_limit: 999999,
  },
}

/**
 * Login as a specific user type
 * @param page - Playwright page object
 * @param userType - Type of user to login as
 * @returns User credentials
 */
export async function loginAsUser(
  page: Page,
  userType: 'free' | 'pro' | 'admin'
): Promise<TestUser> {
  const user = TEST_USERS[userType]

  await page.goto('/login')
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')

  // Wait for redirect (admin goes to /admin, others to /)
  const expectedUrl = userType === 'admin' ? /\/admin/ : /\/(dashboard)?/
  await page.waitForURL(expectedUrl, { timeout: 20000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  return user
}

/**
 * Login with custom credentials
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle', { timeout: 15000 })

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/(dashboard|admin)?/, { timeout: 20000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 })
}

/**
 * Logout current user
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i }).first()

  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click({ force: true, timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  }
}

/**
 * Get authentication token from localStorage
 * @param page - Playwright page object
 * @returns JWT token or null
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('authToken'))
}

/**
 * Set authentication token in localStorage
 * @param page - Playwright page object
 * @param token - JWT token
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((token) => {
    localStorage.setItem('authToken', token)
  }, token)
}

/**
 * Clear authentication token
 * @param page - Playwright page object
 */
export async function clearAuthToken(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
  })
}

/**
 * Check if user is authenticated
 * @param page - Playwright page object
 * @returns True if authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await getAuthToken(page)
  return token !== null && token.length > 0
}

/**
 * Get current user from API
 * @param page - Playwright page object
 * @returns User object or null
 */
export async function getCurrentUser(page: Page): Promise<any | null> {
  const token = await getAuthToken(page)
  if (!token) return null

  const response = await page.request.get('http://localhost:3006/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.ok()) {
    return await response.json()
  }

  return null
}

/**
 * Create a test user via API
 * @param email - User email
 * @param password - User password
 * @param plan - User plan
 * @returns User object
 */
export async function createTestUser(
  page: Page,
  email: string,
  password: string,
  plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free'
): Promise<any> {
  const response = await page.request.post('http://localhost:3006/api/auth/register', {
    data: {
      email,
      password,
      name: `Test User ${Date.now()}`,
      plan,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to create test user: ${response.statusText()}`)
  }

  return await response.json()
}

/**
 * Delete a test user via direct DB access (requires backend endpoint)
 * @param page - Playwright page object
 * @param email - User email to delete
 */
export async function deleteTestUser(page: Page, email: string): Promise<void> {
  // Note: This requires a test-only endpoint in the backend
  // POST /api/test/users/delete (only available in test environment)
  const response = await page.request.post('http://localhost:3006/api/test/users/delete', {
    data: { email },
  })

  if (!response.ok()) {
    console.warn(`Failed to delete test user ${email}: ${response.statusText()}`)
  }
}
