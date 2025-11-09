"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogMiddleware = void 0;
const audit_service_1 = require("../services/audit.service");
/**
 * Middleware to automatically log all admin actions
 * Should be applied after auth and admin middleware
 */
const auditLogMiddleware = (req, res, next) => {
    // Only log if user is authenticated
    if (!req.user) {
        next();
        return;
    }
    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json.bind(res);
    // Capture response for before/after tracking
    let responseBody;
    // Override res.json to capture response
    res.json = function (body) {
        responseBody = body;
        return originalJson(body);
    };
    // Override res.end to log after response
    res.end = function (chunk, encoding, cb) {
        // Log asynchronously after response is sent
        setImmediate(async () => {
            try {
                // Only log successful responses (2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const action = `${req.method} ${req.route?.path || req.path}`;
                    // Determine entity type and ID from route
                    const entityType = extractEntityType(req.path);
                    const entityId = req.params?.id || req.body?.id;
                    // Capture changes (before/after)
                    const changes = captureChanges(req, responseBody);
                    // Determine severity
                    const severity = audit_service_1.AuditService.determineSeverity(req.method, req.path, entityType);
                    await audit_service_1.AuditService.createLogAsync({
                        admin_user_id: req.user.id,
                        action,
                        entity_type: entityType,
                        entity_id: entityId,
                        changes,
                        ip_address: req.ip || req.socket.remoteAddress,
                        user_agent: req.get('user-agent'),
                        severity
                    });
                }
            }
            catch (error) {
                // Log error but don't fail the request
                console.error('Audit logging failed:', error);
            }
        });
        // Call original end function
        return originalEnd.call(res, chunk, encoding, cb);
    };
    next();
};
exports.auditLogMiddleware = auditLogMiddleware;
/**
 * Extract entity type from route path
 */
function extractEntityType(path) {
    // /api/admin/users/:id -> 'user'
    // /api/admin/conversions/:id -> 'conversion'
    // /api/admin/payments/:id -> 'payment'
    const match = path.match(/\/api\/admin\/([^\/]+)/);
    if (match) {
        const entity = match[1];
        // Singularize (remove trailing 's' if present)
        return entity.endsWith('s') ? entity.slice(0, -1) : entity;
    }
    return 'unknown';
}
/**
 * Capture before/after changes from request and response
 */
function captureChanges(req, responseBody) {
    // For updates, capture the request body as "after" state
    if (req.method === 'PUT' || req.method === 'PATCH') {
        return {
            before: null, // Would need to fetch from DB before update
            after: req.body
        };
    }
    // For deletes, capture what was deleted
    if (req.method === 'DELETE') {
        return {
            before: responseBody?.data || responseBody,
            after: null
        };
    }
    // For creates, capture what was created
    if (req.method === 'POST') {
        return {
            before: null,
            after: responseBody?.data || req.body
        };
    }
    // For reads, no changes
    return undefined;
}
//# sourceMappingURL=audit.middleware.js.map