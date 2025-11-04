/**
 * API Error Handler Utility
 *
 * Provides better error messages and consistent error handling across the app
 */

export interface APIError {
  type: 'network' | 'timeout' | 'authentication' | 'authorization' | 'validation' | 'server' | 'unknown'
  message: string
  userMessage: string
  statusCode?: number
  details?: any
}

/**
 * Parse fetch errors and provide user-friendly messages
 */
export function parseAPIError(error: any, response?: Response): APIError {
  // Network errors (no response)
  if (!response) {
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        message: 'Request timed out',
        userMessage: 'The request took too long. Please check your connection and try again.',
      }
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        userMessage: 'Cannot reach the server. Please check if the backend is running and try again.',
      }
    }

    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again.',
    }
  }

  // HTTP status code errors
  const statusCode = response.status

  // 401 Unauthorized
  if (statusCode === 401) {
    return {
      type: 'authentication',
      message: 'Unauthorized - Invalid or expired token',
      userMessage: 'Your session has expired. Please log in again.',
      statusCode,
    }
  }

  // 403 Forbidden
  if (statusCode === 403) {
    return {
      type: 'authorization',
      message: 'Forbidden - Insufficient permissions',
      userMessage: 'You do not have permission to perform this action.',
      statusCode,
    }
  }

  // 404 Not Found
  if (statusCode === 404) {
    return {
      type: 'validation',
      message: 'Resource not found',
      userMessage: 'The requested resource could not be found.',
      statusCode,
    }
  }

  // 422 Validation Error
  if (statusCode === 422) {
    return {
      type: 'validation',
      message: 'Validation failed',
      userMessage: 'The provided data is invalid. Please check your input.',
      statusCode,
    }
  }

  // 429 Rate Limit
  if (statusCode === 429) {
    return {
      type: 'validation',
      message: 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait a moment and try again.',
      statusCode,
    }
  }

  // 500+ Server Errors
  if (statusCode >= 500) {
    return {
      type: 'server',
      message: `Server error (${statusCode})`,
      userMessage: 'The server encountered an error. Please try again later.',
      statusCode,
    }
  }

  // Generic client error
  if (statusCode >= 400) {
    return {
      type: 'validation',
      message: `Client error (${statusCode})`,
      userMessage: 'Something went wrong with your request. Please try again.',
      statusCode,
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    statusCode,
  }
}

/**
 * Enhanced fetch wrapper with better error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<{ data: any; error: null } | { data: null; error: APIError }> {
  try {
    const response = await fetch(url, options)

    // Check if response is ok
    if (!response.ok) {
      // Try to parse error details from response body
      let errorDetails
      try {
        errorDetails = await response.json()
      } catch {
        // Response body is not JSON
      }

      const apiError = parseAPIError(new Error(`HTTP ${response.status}`), response)
      apiError.details = errorDetails

      // If backend provided a message, use it
      if (errorDetails?.message || errorDetails?.error || errorDetails?.detail) {
        apiError.userMessage = errorDetails.message || errorDetails.error || errorDetails.detail
      }

      return { data: null, error: apiError }
    }

    // Parse successful response
    const data = await response.json()
    return { data, error: null }
  } catch (error: any) {
    const apiError = parseAPIError(error)
    return { data: null, error: apiError }
  }
}

/**
 * Log API error with helpful context
 */
export function logAPIError(error: APIError, context?: string): void {
  const prefix = context ? `[${context}]` : '[API Error]'

  console.group(`%c${prefix}`, 'color: #ef4444; font-weight: bold;')
  console.log(`Type: ${error.type}`)
  console.log(`Message: ${error.message}`)
  console.log(`User Message: ${error.userMessage}`)

  if (error.statusCode) {
    console.log(`Status Code: ${error.statusCode}`)
  }

  if (error.details) {
    console.log('Details:', error.details)
  }

  // Provide troubleshooting tips
  console.log('%c💡 Troubleshooting:', 'color: #f59e0b;')

  switch (error.type) {
    case 'network':
      console.log('  • Check if backend server is running')
      console.log('  • Verify API_URL in .env.local')
      console.log('  • Check for firewall/network issues')
      break
    case 'timeout':
      console.log('  • Check backend performance')
      console.log('  • Verify database connectivity')
      console.log('  • Check for slow API endpoints')
      break
    case 'authentication':
      console.log('  • Token may be expired - try logging in again')
      console.log('  • Check localStorage for authToken')
      console.log('  • Verify JWT_SECRET on backend')
      break
    case 'authorization':
      console.log('  • Check user permissions/role')
      console.log('  • Verify admin middleware configuration')
      break
    case 'server':
      console.log('  • Check backend logs for errors')
      console.log('  • Verify database connectivity')
      console.log('  • Check for uncaught exceptions')
      break
  }

  console.groupEnd()
}

/**
 * Handle API errors consistently across the app
 * Returns a user-friendly error message
 */
export function handleAPIError(
  error: any,
  response?: Response,
  context?: string
): string {
  const apiError = parseAPIError(error, response)
  logAPIError(apiError, context)

  // Special handling for authentication errors
  if (apiError.type === 'authentication') {
    // Clear invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
  }

  return apiError.userMessage
}
