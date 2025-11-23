import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Integration Test Configuration
 * For API and service integration tests
 */

// Determine API URL based on environment
const API_URL = (process.env.TEST_ENV === 'vps' || process.env.TEST_ENV === 'staging')
  ? 'http://141.136.44.168:3007'  // Staging/VPS
  : 'http://localhost:3006'        // Local development

export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.test.ts',
  fullyParallel: false, // Run serially to avoid database conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions
  timeout: 60000, // 60 seconds per test
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-integration' }],
    ['json', { outputFile: 'test-results/integration-results.json' }]
  ],

  use: {
    baseURL: API_URL, // Environment-aware backend API URL
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'integration-tests',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
