"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestSessionService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../config/redis");
class GuestSessionService {
    /**
     * Generate a new guest session ID
     */
    static generateSessionId() {
        return `guest_${(0, uuid_1.v4)()}`;
    }
    /**
     * Create a new guest session
     */
    static async createSession(ipAddress) {
        const sessionId = this.generateSessionId();
        const session = {
            sessionId,
            createdAt: new Date(),
            conversionsUsed: 0,
            ipAddress
        };
        // Store session in Redis
        const sessionKey = `guest:session:${sessionId}`;
        await redis_1.redisClient.setEx(sessionKey, this.SESSION_TTL, JSON.stringify(session));
        return session;
    }
    /**
     * Get session by ID
     */
    static async getSession(sessionId) {
        const sessionKey = `guest:session:${sessionId}`;
        const data = await redis_1.redisClient.get(sessionKey);
        if (!data) {
            return null;
        }
        const session = JSON.parse(data);
        // Convert date strings back to Date objects
        session.createdAt = new Date(session.createdAt);
        if (session.lastConversionAt) {
            session.lastConversionAt = new Date(session.lastConversionAt);
        }
        return session;
    }
    /**
     * Update session data
     */
    static async updateSession(session) {
        const sessionKey = `guest:session:${session.sessionId}`;
        await redis_1.redisClient.setEx(sessionKey, this.SESSION_TTL, JSON.stringify(session));
    }
    /**
     * Hash IP address for privacy (one-way hash)
     */
    static hashIpAddress(ip) {
        return crypto_1.default.createHash('sha256').update(ip).digest('hex');
    }
    /**
     * Check if IP address has reached conversion quota
     */
    static async checkIpQuota(ipAddress) {
        const ipHash = this.hashIpAddress(ipAddress);
        const ipKey = `guest:ip:${ipHash}:conversions`;
        const conversions = await redis_1.redisClient.get(ipKey);
        const conversionsUsed = conversions ? parseInt(conversions, 10) : 0;
        // Get TTL to calculate reset time
        const ttl = await redis_1.redisClient.ttl(ipKey);
        const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.QUOTA_TTL * 1000));
        return {
            allowed: conversionsUsed < this.MAX_CONVERSIONS,
            conversionsUsed,
            resetAt
        };
    }
    /**
     * Increment IP conversion count
     */
    static async incrementIpConversions(ipAddress) {
        const ipHash = this.hashIpAddress(ipAddress);
        const ipKey = `guest:ip:${ipHash}:conversions`;
        const current = await redis_1.redisClient.get(ipKey);
        if (current) {
            await redis_1.redisClient.incr(ipKey);
        }
        else {
            await redis_1.redisClient.setEx(ipKey, this.QUOTA_TTL, '1');
        }
    }
    /**
     * Check if session has reached conversion quota
     */
    static async checkSessionQuota(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            return { allowed: true, conversionsUsed: 0 };
        }
        return {
            allowed: session.conversionsUsed < this.MAX_CONVERSIONS,
            conversionsUsed: session.conversionsUsed
        };
    }
    /**
     * Increment session conversion count
     */
    static async incrementSessionConversions(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        session.conversionsUsed += 1;
        session.lastConversionAt = new Date();
        await this.updateSession(session);
    }
    /**
     * Validate guest conversion request
     * Checks both IP and session quotas
     */
    static async validateConversion(sessionId, ipAddress) {
        // Check IP quota first (most restrictive)
        const ipQuota = await this.checkIpQuota(ipAddress);
        if (!ipQuota.allowed) {
            return {
                allowed: false,
                reason: `Guest conversion limit reached. You can convert again in ${Math.ceil((ipQuota.resetAt.getTime() - Date.now()) / (60 * 60 * 1000))} hours, or create a free account for 3 conversions per month.`,
                resetAt: ipQuota.resetAt
            };
        }
        // If no session ID, create a new session
        if (!sessionId) {
            const newSession = await this.createSession(ipAddress);
            return {
                allowed: true,
                session: newSession
            };
        }
        // Check session quota
        const session = await this.getSession(sessionId);
        if (!session) {
            // Session expired or invalid, create new one
            const newSession = await this.createSession(ipAddress);
            return {
                allowed: true,
                session: newSession
            };
        }
        const sessionQuota = await this.checkSessionQuota(sessionId);
        if (!sessionQuota.allowed) {
            return {
                allowed: false,
                reason: 'Guest conversion limit reached. Create a free account for 3 conversions per month.',
                session
            };
        }
        return {
            allowed: true,
            session
        };
    }
    /**
     * Record a guest conversion
     */
    static async recordConversion(sessionId, ipAddress) {
        await Promise.all([
            this.incrementSessionConversions(sessionId),
            this.incrementIpConversions(ipAddress)
        ]);
    }
    /**
     * Delete a guest session (e.g., after migration to registered user)
     */
    static async deleteSession(sessionId) {
        const sessionKey = `guest:session:${sessionId}`;
        await redis_1.redisClient.del(sessionKey);
    }
    /**
     * Get guest session statistics (for monitoring)
     */
    static async getStats() {
        // Get all guest session keys
        const sessionKeys = await redis_1.redisClient.keys('guest:session:*');
        const ipKeys = await redis_1.redisClient.keys('guest:ip:*');
        return {
            activeSessions: sessionKeys.length,
            totalIpAddresses: ipKeys.length
        };
    }
}
exports.GuestSessionService = GuestSessionService;
// Session TTL: 7 days (allows tracking across multiple visits)
GuestSessionService.SESSION_TTL = 7 * 24 * 60 * 60; // seconds
// Conversion quota TTL: 24 hours (reset daily)
GuestSessionService.QUOTA_TTL = 24 * 60 * 60; // seconds
// Maximum conversions per guest session
GuestSessionService.MAX_CONVERSIONS = 10; // Temporarily increased for testing
exports.default = GuestSessionService;
//# sourceMappingURL=guest-session.service.js.map