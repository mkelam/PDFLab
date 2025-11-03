/**
 * Enhanced API Error Handler
 * Supports the new rich error structures from backend UX improvements
 */

import { EnhancedError } from '../components/ErrorDisplay'

export interface APIErrorResponse {
  error: string
  message: string
  error_id?: string
  statusCode: number
  details: EnhancedError | null
  shouldShowModal: boolean
}

/**
 * Parse API error response and extract rich error data
 */
export async function parseEnhancedAPIError(
  response: Response
): Promise<APIErrorResponse> {
  const statusCode = response.status
  let details: EnhancedError | null = null
  let shouldShowModal = false

  try {
    // Try to parse JSON error response
    details = await response.json()

    // Check if this is a rich error that should show a modal
    shouldShowModal = Boolean(
      details && (
        details.options ||
        details.unlock_benefits ||
        details.upgrade_options ||
        details.error_id
      )
    )
  } catch (e) {
    // Response is not JSON, use generic error
    details = null
  }

  // Extract error and message from response
  const error = details?.error || `HTTP ${statusCode}`
  const message = details?.message || getDefaultErrorMessage(statusCode)

  return {
    error,
    message,
    error_id: details?.error_id,
    statusCode,
    details,
    shouldShowModal
  }
}

/**
 * Get default error message based on status code
 */
function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request - please check your input'
    case 401:
      return 'Please log in to access this feature'
    case 403:
      return 'You do not have permission to perform this action'
    case 404:
      return 'The requested resource could not be found'
    case 410:
      return 'This file has expired'
    case 413:
      return 'The file is too large'
    case 422:
      return 'Invalid input - please check your data'
    case 429:
      return 'Too many requests - please wait a moment'
    case 500:
    case 502:
    case 503:
      return 'Server error - please try again later'
    default:
      return 'An error occurred - please try again'
  }
}

/**
 * Check if error should trigger auth redirect
 */
export function shouldRedirectToLogin(error: APIErrorResponse): boolean {
  return (
    error.statusCode === 401 &&
    error.error === 'Authentication required' &&
    !error.details?.options // Don't redirect if it's the cookie error
  )
}

/**
 * Enhanced fetch wrapper with rich error handling
 */
export async function fetchWithEnhancedErrorHandling(
  url: string,
  options?: RequestInit
): Promise<{
  data: any | null
  error: APIErrorResponse | null
}> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await parseEnhancedAPIError(response)
      return { data: null, error }
    }

    // Try to parse successful response
    let data
    try {
      data = await response.json()
    } catch {
      // Response is not JSON, return raw response
      data = await response.text()
    }

    return { data, error: null }
  } catch (networkError: any) {
    // Network error (no response from server)
    return {
      data: null,
      error: {
        error: 'Network Error',
        message: 'Cannot reach the server. Please check your connection.',
        statusCode: 0,
        details: null,
        shouldShowModal: false
      }
    }
  }
}

/**
 * Track error events for analytics
 */
export function trackErrorEvent(error: APIErrorResponse, context?: string): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`%c[Error] ${context || 'API Error'}`, 'color: #ef4444; font-weight: bold')
    console.log('Error:', error.error)
    console.log('Message:', error.message)
    console.log('Status:', error.statusCode)
    if (error.error_id) {
      console.log('Error ID:', error.error_id)
    }
    if (error.details) {
      console.log('Details:', error.details)
    }
    console.groupEnd()
  }

  // TODO: Send to analytics service
  // Example: analytics.track('error_occurred', {
  //   error_type: error.error,
  //   status_code: error.statusCode,
  //   error_id: error.error_id,
  //   context: context,
  //   page: window.location.pathname
  // })
}

/**
 * Track error resolution for conversion funnel
 */
export function trackErrorResolution(
  errorType: string,
  action: string,
  url?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Error Resolution]`, 'color: #10b981; font-weight: bold', {
      errorType,
      action,
      url
    })
  }

  // TODO: Send to analytics service
  // Example: analytics.track('error_resolved', {
  //   error_type: errorType,
  //   action: action,
  //   destination_url: url,
  //   page: window.location.pathname
  // })
}
