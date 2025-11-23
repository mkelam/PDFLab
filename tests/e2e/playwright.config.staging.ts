import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration for PDFLab - STAGING ENVIRONMENT
 * Tests critical user flows against staging server: http://141.136.44.168
 *
 * Main App: http://141.136.44.168:3002
 * Partner Portal: http://141.136.44.168:3003
 * Backend API: http://141.136.44.168:3007
 *
 * Location: tests/e2e/playwright.config.staging.ts
 */
export default defineConfig({
  testDir: '../..',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once for staging (network issues)
  workers: process.env.CI ? 1 : 2, // Limit workers for remote testing
  timeout: 60000, // Increased timeout for remote server
  reporter: [
    ['html', { outputFolder: '../../playwright-report-staging' }],
    ['json', { outputFile: '../../test-results/staging-results.json' }],
    ['line']
  ],

  use: {
    baseURL: 'http://141.136.44.168:3002', // Staging main app
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000, // Increased for remote server
    navigationTimeout: 30000, // Increased for remote server
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Partner Portal Tests
    {
      name: 'partner-portal-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://141.136.44.168:3003', // Partner portal staging
      },
      testMatch: /.*partner.*\.spec\.ts/,
    },
  ],

  // Don't start local server - we're testing against remote staging
  // webServer: undefined,
})
