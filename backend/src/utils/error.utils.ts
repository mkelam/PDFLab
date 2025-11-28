import { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import logger from '../config/logger'

/**
 * Error Response Utility
 * Provides consistent error formatting across the application
 * with support tracking IDs for 500 errors
 */

export interface ErrorResponse {
  error: string
  message: string
  error_id?: string
  timestamp?: string
  [key: string]: any
}

/**
 * Generate a unique error ID for tracking
 */
export function generateErrorId(): string {
  return `err_${uuidv4().split('-')[0]}`
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  const response: ErrorResponse = {
    error,
    message,
    timestamp: new Date().toISOString(),
    ...additionalData
  }

  // Add error ID for 500 errors for support tracking
  if (statusCode >= 500) {
    response.error_id = generateErrorId()
    logger.error(`Server error ${response.error_id}`, {
      error_id: response.error_id,
      statusCode,
      error,
      message,
      ...additionalData
    })
  }

  res.status(statusCode).json(response)
}

/**
 * Send a 400 Bad Request error
 */
export function sendBadRequest(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 400, 'Bad request', message, additionalData)
}

/**
 * Send a 401 Unauthorized error
 */
export function sendUnauthorized(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 401, 'Authentication required', message, additionalData)
}

/**
 * Send a 403 Forbidden error
 */
export function sendForbidden(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 403, 'Forbidden', message, additionalData)
}

/**
 * Send a 404 Not Found error
 */
export function sendNotFound(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 404, 'Not found', message, additionalData)
}

/**
 * Send a 410 Gone error (for expired resources)
 */
export function sendGone(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 410, 'File expired', message, additionalData)
}

/**
 * Send a 413 Payload Too Large error
 */
export function sendPayloadTooLarge(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 413, 'File too large', message, additionalData)
}

/**
 * Send a 422 Unprocessable Entity error
 */
export function sendUnprocessableEntity(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 422, 'Validation failed', message, additionalData)
}

/**
 * Send a 429 Too Many Requests error
 */
export function sendTooManyRequests(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 429, 'Rate limit exceeded', message, additionalData)
}

/**
 * Send a 500 Internal Server Error
 * Automatically includes error ID for support tracking
 */
export function sendInternalServerError(
  res: Response,
  message: string = 'An unexpected error occurred',
  additionalData: Record<string, any> = {}
): void {
  const errorId = generateErrorId()

  sendErrorResponse(res, 500, 'Internal server error', message, {
    ...additionalData,
    error_id: errorId,
    support_message: `Please contact support with error ID: ${errorId}`
  })
}

/**
 * Send a 503 Service Unavailable error
 */
export function sendServiceUnavailable(
  res: Response,
  message: string,
  additionalData: Record<string, any> = {}
): void {
  sendErrorResponse(res, 503, 'Service unavailable', message, additionalData)
}

/**
 * Log error with context for debugging
 */
export function logError(
  context: string,
  error: any,
  additionalInfo: Record<string, any> = {}
): void {
  const errorId = generateErrorId()

  logger.error(`${context} [${errorId}]`, {
    error_id: errorId,
    error: error.message || String(error),
    stack: error.stack,
    ...additionalInfo,
    timestamp: new Date().toISOString()
  })
}
