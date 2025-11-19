export declare class SecurityBlockerService {
    private static FAILED_LOGIN_THRESHOLD;
    private static RATE_LIMIT_THRESHOLD;
    private static BLOCK_DURATION_HOURS;
    /**
     * Check failed login attempts and auto-block abusive IPs
     */
    static checkAndBlockFailedLogins(): Promise<void>;
    /**
     * Check rate limit violations and block (if using Redis rate limiting)
     */
    static checkAndBlockRateLimitAbuse(): Promise<void>;
    /**
     * Block IP address using iptables (on Linux) or database tracking
     */
    private static blockIP;
    /**
     * Cleanup expired blocks
     */
    static cleanupExpiredBlocks(): Promise<void>;
    /**
     * Check if IP is currently blocked
     */
    static isIPBlocked(ipAddress: string): Promise<boolean>;
    /**
     * Log authentication attempt
     */
    static logAuthAttempt(ipAddress: string, email: string, success: boolean, userAgent?: string): Promise<void>;
}
export default SecurityBlockerService;
//# sourceMappingURL=security-blocker.service.d.ts.map