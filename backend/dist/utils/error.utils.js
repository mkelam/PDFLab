"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateErrorId = generateErrorId;
exports.sendErrorResponse = sendErrorResponse;
exports.sendBadRequest = sendBadRequest;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
exports.sendNotFound = sendNotFound;
exports.sendGone = sendGone;
exports.sendPayloadTooLarge = sendPayloadTooLarge;
exports.sendUnprocessableEntity = sendUnprocessableEntity;
exports.sendTooManyRequests = sendTooManyRequests;
exports.sendInternalServerError = sendInternalServerError;
exports.sendServiceUnavailable = sendServiceUnavailable;
exports.logError = logError;
const uuid_1 = require("uuid");
/**
 * Generate a unique error ID for tracking
 */
function generateErrorId() {
    return `err_${(0, uuid_1.v4)().split('-')[0]}`;
}
/**
 * Send a standardized error response
 */
function sendErrorResponse(res, statusCode, error, message, additionalData = {}) {
    const response = {
        error,
        message,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    // Add error ID for 500 errors for support tracking
    if (statusCode >= 500) {
        response.error_id = generateErrorId();
        console.error(`[Error ${response.error_id}]`, {
            statusCode,
            error,
            message,
            ...additionalData
        });
    }
    res.status(statusCode).json(response);
}
/**
 * Send a 400 Bad Request error
 */
function sendBadRequest(res, message, additionalData = {}) {
    sendErrorResponse(res, 400, 'Bad request', message, additionalData);
}
/**
 * Send a 401 Unauthorized error
 */
function sendUnauthorized(res, message, additionalData = {}) {
    sendErrorResponse(res, 401, 'Authentication required', message, additionalData);
}
/**
 * Send a 403 Forbidden error
 */
function sendForbidden(res, message, additionalData = {}) {
    sendErrorResponse(res, 403, 'Forbidden', message, additionalData);
}
/**
 * Send a 404 Not Found error
 */
function sendNotFound(res, message, additionalData = {}) {
    sendErrorResponse(res, 404, 'Not found', message, additionalData);
}
/**
 * Send a 410 Gone error (for expired resources)
 */
function sendGone(res, message, additionalData = {}) {
    sendErrorResponse(res, 410, 'File expired', message, additionalData);
}
/**
 * Send a 413 Payload Too Large error
 */
function sendPayloadTooLarge(res, message, additionalData = {}) {
    sendErrorResponse(res, 413, 'File too large', message, additionalData);
}
/**
 * Send a 422 Unprocessable Entity error
 */
function sendUnprocessableEntity(res, message, additionalData = {}) {
    sendErrorResponse(res, 422, 'Validation failed', message, additionalData);
}
/**
 * Send a 429 Too Many Requests error
 */
function sendTooManyRequests(res, message, additionalData = {}) {
    sendErrorResponse(res, 429, 'Rate limit exceeded', message, additionalData);
}
/**
 * Send a 500 Internal Server Error
 * Automatically includes error ID for support tracking
 */
function sendInternalServerError(res, message = 'An unexpected error occurred', additionalData = {}) {
    const errorId = generateErrorId();
    sendErrorResponse(res, 500, 'Internal server error', message, {
        ...additionalData,
        error_id: errorId,
        support_message: `Please contact support with error ID: ${errorId}`
    });
}
/**
 * Send a 503 Service Unavailable error
 */
function sendServiceUnavailable(res, message, additionalData = {}) {
    sendErrorResponse(res, 503, 'Service unavailable', message, additionalData);
}
/**
 * Log error with context for debugging
 */
function logError(context, error, additionalInfo = {}) {
    const errorId = generateErrorId();
    console.error(`[Error ${errorId}] ${context}:`, {
        error: error.message || error,
        stack: error.stack,
        ...additionalInfo,
        timestamp: new Date().toISOString()
    });
}
//# sourceMappingURL=error.utils.js.map