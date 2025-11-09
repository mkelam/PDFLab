/**
 * Guest Session Service
 * Manages ephemeral sessions for unauthenticated users
 * Uses Redis for session storage with automatic expiry
 */
export interface GuestSession {
    sessionId: string;
    createdAt: Date;
    conversionsUsed: number;
    lastConversionAt?: Date;
    ipAddress: string;
}
export declare class GuestSessionService {
    private static readonly SESSION_TTL;
    private static readonly QUOTA_TTL;
    private static readonly MAX_CONVERSIONS;
    /**
     * Generate a new guest session ID
     */
    static generateSessionId(): string;
    /**
     * Create a new guest session
     */
    static createSession(ipAddress: string): Promise<GuestSession>;
    /**
     * Get session by ID
     */
    static getSession(sessionId: string): Promise<GuestSession | null>;
    /**
     * Update session data
     */
    static updateSession(session: GuestSession): Promise<void>;
    /**
     * Hash IP address for privacy (one-way hash)
     */
    static hashIpAddress(ip: string): string;
    /**
     * Check if IP address has reached conversion quota
     */
    static checkIpQuota(ipAddress: string): Promise<{
        allowed: boolean;
        conversionsUsed: number;
        resetAt: Date;
    }>;
    /**
     * Increment IP conversion count
     */
    static incrementIpConversions(ipAddress: string): Promise<void>;
    /**
     * Check if session has reached conversion quota
     */
    static checkSessionQuota(sessionId: string): Promise<{
        allowed: boolean;
        conversionsUsed: number;
    }>;
    /**
     * Increment session conversion count
     */
    static incrementSessionConversions(sessionId: string): Promise<void>;
    /**
     * Validate guest conversion request
     * Checks both IP and session quotas
     */
    static validateConversion(sessionId: string | null, ipAddress: string): Promise<{
        allowed: boolean;
        reason?: string;
        session?: GuestSession;
        resetAt?: Date;
    }>;
    /**
     * Record a guest conversion
     */
    static recordConversion(sessionId: string, ipAddress: string): Promise<void>;
    /**
     * Delete a guest session (e.g., after migration to registered user)
     */
    static deleteSession(sessionId: string): Promise<void>;
    /**
     * Get guest session statistics (for monitoring)
     */
    static getStats(): Promise<{
        activeSessions: number;
        totalIpAddresses: number;
    }>;
}
export default GuestSessionService;
//# sourceMappingURL=guest-session.service.d.ts.map