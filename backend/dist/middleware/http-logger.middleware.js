"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLoggerMiddleware = httpLoggerMiddleware;
const logger_1 = __importDefault(require("../config/logger"));
function httpLoggerMiddleware(req, res, next) {
    const start = Date.now();
    // Log request
    logger_1.default.http('Incoming request', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        referer: req.get('referer')
    });
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'http';
        logger_1.default.log(logLevel, 'Request completed', {
            requestId: req.id,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.id,
            contentLength: res.get('content-length')
        });
    });
    next();
}
//# sourceMappingURL=http-logger.middleware.js.map