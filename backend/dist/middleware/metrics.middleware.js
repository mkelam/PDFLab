"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
exports.metricsErrorHandler = metricsErrorHandler;
const metrics_1 = require("../config/metrics");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Metrics Middleware
 *
 * Automatically tracks HTTP request metrics for all routes.
 * This middleware should be registered early in the middleware chain
 * (after request ID but before route handlers).
 */
/**
 * Extract route pattern from Express request
 * Converts /api/users/123 to /api/users/:id
 */
function getRoutePattern(req) {
    // Use the route path if available (from Express routing)
    if (req.route?.path) {
        const baseUrl = req.baseUrl || '';
        return baseUrl + req.route.path;
    }
    // Fallback: normalize common patterns
    let path = req.path;
    // Replace UUIDs with :id
    path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
    // Replace numeric IDs with :id
    path = path.replace(/\/\d+/g, '/:id');
    return path;
}
/**
 * HTTP Request Metrics Middleware
 *
 * Tracks duration and status of all HTTP requests.
 */
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();
    // Capture response finish event
    res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000; // Convert to seconds
        const route = getRoutePattern(req);
        const method = req.method;
        const statusCode = res.statusCode;
        // Record HTTP request metrics
        (0, metrics_1.recordHttpRequest)(method, route, statusCode, duration);
        // Track errors (4xx and 5xx status codes)
        if (statusCode >= 400) {
            const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
            metrics_1.errorTotal.inc({
                type: errorType,
                route,
                status_code: statusCode.toString()
            });
            logger_1.default.debug('HTTP error tracked', {
                method,
                route,
                statusCode,
                duration,
                errorType
            });
        }
    });
    next();
}
/**
 * Metrics Error Handler
 *
 * Optional: Catches and records errors that occur during request processing.
 * Use this after all other middleware/routes for complete error tracking.
 */
function metricsErrorHandler(err, req, res, next) {
    const route = getRoutePattern(req);
    const statusCode = err.statusCode || 500;
    // Record error
    metrics_1.errorTotal.inc({
        type: 'unhandled_error',
        route,
        status_code: statusCode.toString()
    });
    logger_1.default.error('Unhandled error tracked by metrics', {
        error: err.message,
        route,
        statusCode,
        method: req.method
    });
    // Pass error to next error handler
    next(err);
}
//# sourceMappingURL=metrics.middleware.js.map