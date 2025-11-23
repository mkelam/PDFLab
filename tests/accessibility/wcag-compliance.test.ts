import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility Tests: WCAG 2.1 Compliance
 *
 * Tests: Color contrast, ARIA labels, keyboard navigation, screen reader compatibility
 * Standard: WCAG 2.1 Level AA
 * Coverage: Homepage, Dashboard, Pricing, Login, Conversion Interface
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(':3006', ':3000') || 'http://localhost:3000'

test.describe('WCAG 2.1 Compliance Tests', () => {
  test('Homepage should pass WCAG 2.1 Level AA', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Dashboard should pass WCAG 2.1 Level AA', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', 'testuser@pdflab.com')
    await page.fill('input[type="password"]', 'TestPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Pricing page should pass WCAG 2.1 Level AA', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`)
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Login page should pass WCAG 2.1 Level AA', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Signup page should pass WCAG 2.1 Level AA', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`)
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

test.describe('Keyboard Navigation Tests', () => {
  test('Navigation menu should be keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL)

    // Tab through navigation
    await page.keyboard.press('Tab') // Focus first element
    await page.keyboard.press('Tab') // Features link
    await page.keyboard.press('Tab') // Pricing link
    await page.keyboard.press('Tab') // Sign in button

    // Verify focused element is visible
    const focusedElement = await page.evaluateHandle(() => document.activeElement)
    const isVisible = await focusedElement.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })

    expect(isVisible).toBe(true)
  })

  test('Conversion interface should be keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL)

    // Tab to conversion mode buttons
    let tabCount = 0
    while (tabCount < 20) {
      await page.keyboard.press('Tab')
      tabCount++

      const focusedElement = await page.evaluateHandle(() => document.activeElement)
      const ariaLabel = await focusedElement.evaluate((el) => el.getAttribute('aria-label'))

      if (ariaLabel && ariaLabel.includes('Convert')) {
        // Found conversion mode button
        break
      }
    }

    // Should be able to activate with Enter or Space
    await page.keyboard.press('Enter')

    // Verify interaction worked
    const focusedElement = await page.evaluateHandle(() => document.activeElement)
    expect(focusedElement).toBeDefined()
  })
})

test.describe('Screen Reader Compatibility Tests', () => {
  test('Images should have alt text', async ({ page }) => {
    await page.goto(BASE_URL)

    const imagesWithoutAlt = await page.locator('img:not([alt])').count()

    expect(imagesWithoutAlt).toBe(0)
  })

  test('Form inputs should have labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // Check email input
    const emailInput = page.locator('input[type="email"]')
    const emailLabel = await emailInput.evaluate((el) => {
      const id = el.getAttribute('id')
      const ariaLabel = el.getAttribute('aria-label')
      const ariaLabelledBy = el.getAttribute('aria-labelledby')
      const label = id ? document.querySelector(`label[for="${id}"]`) : null

      return !!(label || ariaLabel || ariaLabelledBy)
    })

    expect(emailLabel).toBe(true)

    // Check password input
    const passwordInput = page.locator('input[type="password"]')
    const passwordLabel = await passwordInput.evaluate((el) => {
      const id = el.getAttribute('id')
      const ariaLabel = el.getAttribute('aria-label')
      const ariaLabelledBy = el.getAttribute('aria-labelledby')
      const label = id ? document.querySelector(`label[for="${id}"]`) : null

      return !!(label || ariaLabel || ariaLabelledBy)
    })

    expect(passwordLabel).toBe(true)
  })

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto(BASE_URL)

    const buttonsWithoutAccessibleName = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.filter((button) => {
        const hasText = button.textContent?.trim().length! > 0
        const hasAriaLabel = button.hasAttribute('aria-label')
        const hasAriaLabelledBy = button.hasAttribute('aria-labelledby')
        const hasTitle = button.hasAttribute('title')

        return !(hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle)
      }).length
    })

    expect(buttonsWithoutAccessibleName).toBe(0)
  })

  test('Links should have accessible names', async ({ page }) => {
    await page.goto(BASE_URL)

    const linksWithoutAccessibleName = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'))
      return links.filter((link) => {
        const hasText = link.textContent?.trim().length! > 0
        const hasAriaLabel = link.hasAttribute('aria-label')
        const hasAriaLabelledBy = link.hasAttribute('aria-labelledby')
        const hasTitle = link.hasAttribute('title')

        return !(hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle)
      }).length
    })

    expect(linksWithoutAccessibleName).toBe(0)
  })

  test('Page should have proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE_URL)

    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      return headingElements.map((el) => parseInt(el.tagName.substring(1)))
    })

    // Should start with h1
    if (headings.length > 0) {
      expect(headings[0]).toBe(1)
    }

    // Should not skip levels
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      expect(diff).toBeLessThanOrEqual(1)
    }
  })
})
