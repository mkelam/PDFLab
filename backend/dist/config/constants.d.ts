/**
 * Application Constants
 * Centralized configuration for business logic
 */
export declare const GUEST_LIMITS: {
    readonly MAX_CONVERSIONS: 3;
    readonly MAX_FILE_SIZE_MB: 10;
    readonly MAX_FILES_PER_UPLOAD: 1;
    readonly SESSION_DURATION_HOURS: 24;
    readonly FILE_RETENTION_HOURS: 1;
    readonly RATE_LIMIT_PER_HOUR: 5;
};
export declare const USER_PLAN_LIMITS: {
    readonly free: {
        readonly MAX_CONVERSIONS: 20;
        readonly MAX_FILE_SIZE_MB: 25;
        readonly FILE_RETENTION_DAYS: 7;
    };
    readonly starter: {
        readonly MAX_CONVERSIONS: 50;
        readonly MAX_FILE_SIZE_MB: 50;
        readonly FILE_RETENTION_DAYS: 30;
    };
    readonly pro: {
        readonly MAX_CONVERSIONS: 500;
        readonly MAX_FILE_SIZE_MB: 100;
        readonly FILE_RETENTION_DAYS: 90;
    };
    readonly enterprise: {
        readonly MAX_CONVERSIONS: -1;
        readonly MAX_FILE_SIZE_MB: 500;
        readonly FILE_RETENTION_DAYS: 365;
    };
};
//# sourceMappingURL=constants.d.ts.map