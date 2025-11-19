"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipBlockerMiddleware = void 0;
const security_blocker_service_1 = __importDefault(require("../services/security-blocker.service"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * IP Blocker Middleware
 * Checks if incoming request is from a blocked IP
 */
const ipBlockerMiddleware = async (req, res, next) => {
    try {
        // Get client IP (handle proxy/forwarded cases)
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || req.socket.remoteAddress
            || req.ip;
        if (!clientIP) {
            return next();
        }
        // Check if IP is blocked
        const isBlocked = await security_blocker_service_1.default.isIPBlocked(clientIP);
        if (isBlocked) {
            logger_1.default.warn(`Blocked request from IP: ${clientIP}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address has been temporarily blocked due to suspicious activity. Please contact support if you believe this is an error.'
            });
        }
        next();
    }
    catch (error) {
        logger_1.default.error('IP blocker middleware error:', error);
        // Fail open - don't block on error
        next();
    }
};
exports.ipBlockerMiddleware = ipBlockerMiddleware;
//# sourceMappingURL=ip-blocker.middleware.js.map