"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const uuid_1 = require("uuid");
function requestIdMiddleware(req, res, next) {
    // Generate or use existing request ID
    req.id = req.headers['x-request-id'] || (0, uuid_1.v4)();
    // Add to response headers for client tracking
    res.setHeader('X-Request-ID', req.id);
    next();
}
//# sourceMappingURL=request-id.middleware.js.map