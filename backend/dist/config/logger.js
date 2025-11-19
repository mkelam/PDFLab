"use strict";
/**
 * Simple logger configuration
 * Wraps console methods for consistent logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};
exports.default = logger;
//# sourceMappingURL=logger.js.map