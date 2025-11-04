/**
 * API Health Check Utility
 *
 * Provides functions to check backend connectivity and diagnose issues
 */

import { API_URL } from './api-config'

export interface HealthCheckResult {
  healthy: boolean
  message: string
  apiUrl: string
  timestamp: Date
  responseTime?: number
  error?: string
}

/**
 * Check if the backend API is reachable
 * Makes a simple GET request to verify connectivity
 */
export async function checkAPIHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Try to fetch a simple endpoint (status check doesn't require auth)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        healthy: true,
        message: '✅ Backend API is healthy',
        apiUrl: API_URL,
        timestamp: new Date(),
        responseTime,
      }
    } else {
      return {
        healthy: false,
        message: `⚠️ Backend returned ${response.status} ${response.statusText}`,
        apiUrl: API_URL,
        timestamp: new Date(),
        responseTime,
        error: `HTTP ${response.status}`,
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime

    // Diagnose specific error types
    if (error.name === 'AbortError') {
      return {
        healthy: false,
        message: '❌ Backend not responding (timeout after 5s)',
        apiUrl: API_URL,
        timestamp: new Date(),
        responseTime,
        error: 'TIMEOUT',
      }
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
      return {
        healthy: false,
        message: '❌ Cannot reach backend - is it running?',
        apiUrl: API_URL,
        timestamp: new Date(),
        responseTime,
        error: 'CONNECTION_REFUSED',
      }
    }

    return {
      healthy: false,
      message: `❌ Backend error: ${error.message}`,
      apiUrl: API_URL,
      timestamp: new Date(),
      responseTime,
      error: error.message,
    }
  }
}

/**
 * Log health check result to console with colored formatting
 */
export function logHealthCheck(result: HealthCheckResult): void {
  const style = result.healthy
    ? 'color: #10b981; font-weight: bold;'
    : 'color: #ef4444; font-weight: bold;'

  console.log(`%c[PDFLab Health Check]`, style)
  console.log(`  ${result.message}`)
  console.log(`  API URL: ${result.apiUrl}`)
  console.log(`  Time: ${result.timestamp.toLocaleTimeString()}`)

  if (result.responseTime !== undefined) {
    console.log(`  Response Time: ${result.responseTime}ms`)
  }

  if (result.error) {
    console.log(`  Error: ${result.error}`)
  }

  if (!result.healthy) {
    console.log(`%c  💡 Troubleshooting:`, 'color: #f59e0b;')
    console.log(`     1. Check if backend is running: cd backend && npm run dev`)
    console.log(`     2. Verify backend port: ${API_URL}`)
    console.log(`     3. Check for CORS configuration`)
  }
}

/**
 * Perform health check and log result automatically
 * Use this on app startup
 */
export async function performStartupHealthCheck(): Promise<void> {
  console.log('%c[PDFLab] Checking backend connectivity...', 'color: #3b82f6; font-weight: bold;')

  const result = await checkAPIHealth()
  logHealthCheck(result)

  // Return result for potential UI handling
  return
}
