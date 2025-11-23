/**
 * Staging Test Configuration
 *
 * This file configures environment-specific test behavior for staging.
 *
 * Key Features:
 * - X-Test-Mode header: Bypasses rate limiting for non-rate-limit tests
 * - Environment-aware: Only works in staging (security-safe)
 * - Selective: Rate limit tests DON'T use the header (to test actual limits)
 */

export const STAGING_CONFIG = {
  /**
   * Test Secret for X-Test-Mode header
   *
   * This allows non-rate-limit tests to bypass rate limiting in staging.
   * Security: Only enabled in staging, requires secret, rotated monthly.
   */
  TEST_SECRET: process.env.TEST_SECRET || 'staging_test_secret_2024',

  /**
   * API Base URL
   */
  API_BASE_URL: process.env.API_BASE_URL || 'http://141.136.44.168:3007',

  /**
   * Test Mode Headers
   *
   * Include these headers in requests that should bypass rate limiting.
   * DO NOT include in rate limit tests - they specifically test rate limiting!
   */
  testModeHeaders: {
    'X-Test-Mode': process.env.TEST_SECRET || 'staging_test_secret_2024',
  },
}

/**
 * Helper function: Get headers for non-rate-limit tests
 *
 * Use this for tests that should run fast without rate limit interference.
 */
export function getTestHeaders(includeTestMode: boolean = true) {
  return includeTestMode ? STAGING_CONFIG.testModeHeaders : {}
}

/**
 * Helper function: Get headers for rate limit tests
 *
 * Rate limit tests should NOT include X-Test-Mode header
 */
export function getRateLimitTestHeaders() {
  return {} // No test mode header - we want rate limiting to trigger
}
