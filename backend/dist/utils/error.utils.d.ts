import { Response } from 'express';
/**
 * Error Response Utility
 * Provides consistent error formatting across the application
 * with support tracking IDs for 500 errors
 */
export interface ErrorResponse {
    error: string;
    message: string;
    error_id?: string;
    timestamp?: string;
    [key: string]: any;
}
/**
 * Generate a unique error ID for tracking
 */
export declare function generateErrorId(): string;
/**
 * Send a standardized error response
 */
export declare function sendErrorResponse(res: Response, statusCode: number, error: string, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 400 Bad Request error
 */
export declare function sendBadRequest(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 401 Unauthorized error
 */
export declare function sendUnauthorized(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 403 Forbidden error
 */
export declare function sendForbidden(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 404 Not Found error
 */
export declare function sendNotFound(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 410 Gone error (for expired resources)
 */
export declare function sendGone(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 413 Payload Too Large error
 */
export declare function sendPayloadTooLarge(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 422 Unprocessable Entity error
 */
export declare function sendUnprocessableEntity(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 429 Too Many Requests error
 */
export declare function sendTooManyRequests(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Send a 500 Internal Server Error
 * Automatically includes error ID for support tracking
 */
export declare function sendInternalServerError(res: Response, message?: string, additionalData?: Record<string, any>): void;
/**
 * Send a 503 Service Unavailable error
 */
export declare function sendServiceUnavailable(res: Response, message: string, additionalData?: Record<string, any>): void;
/**
 * Log error with context for debugging
 */
export declare function logError(context: string, error: any, additionalInfo?: Record<string, any>): void;
//# sourceMappingURL=error.utils.d.ts.map