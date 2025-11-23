import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration - FOR RUNNING ON VPS
 * This config is used when tests run ON the staging server itself
 *
 * Tests hit external IP to test full network stack (firewall, proxy, etc.)
 * Main App: http://141.136.44.168:3002
 * Partner Portal: http://141.136.44.168:3003
 * Backend API: http://141.136.44.168:3007
 *
 * Location: tests/e2e/playwright.config.vps.ts
 */
export default defineConfig({
  testDir: '..',  // tests/ directory (one level up from e2e/)
  fullyParallel: false, // Run sequentially on server to avoid resource issues
  forbidOnly: !!process.env.CI,
  retries: 1, // Retry once for flaky tests
  workers: 1, // Single worker to avoid overloading server
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: 'playwright-report-vps' }],
    ['json', { outputFile: 'test-results/vps-results.json' }],
    ['line']
  ],

  use: {
    baseURL: 'http://141.136.44.168:3002', // External IP to test full stack
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Partner Portal Tests
    {
      name: 'partner-portal',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://141.136.44.168:3003', // External IP for partner portal
      },
      testMatch: /.*partner.*\.spec\.ts/,
    },
  ],

  // Don't start web server - services already running in Docker
  // webServer: undefined,
})
