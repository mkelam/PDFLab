import { test } from '@playwright/test'
import percySnapshot from '@percy/playwright'

/**
 * Visual Regression Tests with Percy
 *
 * Tests: Homepage, Dashboard, Pricing, Admin, Mobile views
 * Purpose: Detect unintended visual changes across releases
 * Tool: Percy.io for visual diff comparison
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(':3006', ':3000') || 'http://localhost:3000'

test.describe('Visual Regression Tests - Desktop', () => {
  test('Homepage snapshot', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Wait for any animations to complete
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Homepage - Desktop')
  })

  test('Pricing page snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Pricing Page - Desktop')
  })

  test('Login page snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await percySnapshot(page, 'Login Page - Desktop')
  })

  test('Dashboard snapshot (authenticated)', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Dashboard - Desktop - Free Plan')
  })

  test('Admin panel snapshot', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'admin@pdflab.test')
    await page.fill('input[type="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/admin`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Admin Panel - Desktop')
  })
})

test.describe('Visual Regression Tests - Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  })

  test('Homepage snapshot (mobile)', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Homepage - Mobile')
  })

  test('Pricing page snapshot (mobile)', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Pricing Page - Mobile')
  })

  test('Dashboard snapshot (mobile)', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await percySnapshot(page, 'Dashboard - Mobile - Free Plan')
  })
})
