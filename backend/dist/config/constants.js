"use strict";
/**
 * Application Constants
 * Centralized configuration for business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_PLAN_LIMITS = exports.GUEST_LIMITS = void 0;
exports.GUEST_LIMITS = {
    // Number of free conversions per guest session
    MAX_CONVERSIONS: 3,
    // Maximum file size for guests (MB)
    MAX_FILE_SIZE_MB: 10,
    // Maximum files per upload
    MAX_FILES_PER_UPLOAD: 1,
    // Guest session duration (hours)
    SESSION_DURATION_HOURS: 24,
    // File retention for guests (hours)
    FILE_RETENTION_HOURS: 1,
    // Rate limit (conversions per hour)
    RATE_LIMIT_PER_HOUR: 5
};
exports.USER_PLAN_LIMITS = {
    free: {
        MAX_CONVERSIONS: 20,
        MAX_FILE_SIZE_MB: 25,
        FILE_RETENTION_DAYS: 7
    },
    starter: {
        MAX_CONVERSIONS: 50,
        MAX_FILE_SIZE_MB: 50,
        FILE_RETENTION_DAYS: 30
    },
    pro: {
        MAX_CONVERSIONS: 500,
        MAX_FILE_SIZE_MB: 100,
        FILE_RETENTION_DAYS: 90
    },
    enterprise: {
        MAX_CONVERSIONS: -1, // Unlimited
        MAX_FILE_SIZE_MB: 500,
        FILE_RETENTION_DAYS: 365
    }
};
//# sourceMappingURL=constants.js.map