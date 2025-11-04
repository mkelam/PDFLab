import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { redisClient } from '../config/redis'

/**
 * Guest Session Service
 * Manages ephemeral sessions for unauthenticated users
 * Uses Redis for session storage with automatic expiry
 */

export interface GuestSession {
  sessionId: string
  createdAt: Date
  conversionsUsed: number
  lastConversionAt?: Date
  ipAddress: string
}

export class GuestSessionService {
  // Session TTL: 7 days (allows tracking across multiple visits)
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60 // seconds

  // Conversion quota TTL: 24 hours (reset daily)
  private static readonly QUOTA_TTL = 24 * 60 * 60 // seconds

  // Maximum conversions per guest session
  private static readonly MAX_CONVERSIONS = 10 // Temporarily increased for testing

  /**
   * Generate a new guest session ID
   */
  static generateSessionId(): string {
    return `guest_${uuidv4()}`
  }

  /**
   * Create a new guest session
   */
  static async createSession(ipAddress: string): Promise<GuestSession> {
    const sessionId = this.generateSessionId()
    const session: GuestSession = {
      sessionId,
      createdAt: new Date(),
      conversionsUsed: 0,
      ipAddress
    }

    // Store session in Redis
    const sessionKey = `guest:session:${sessionId}`
    await redisClient.setEx(
      sessionKey,
      this.SESSION_TTL,
      JSON.stringify(session)
    )

    return session
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<GuestSession | null> {
    const sessionKey = `guest:session:${sessionId}`
    const data = await redisClient.get(sessionKey)

    if (!data) {
      return null
    }

    const session = JSON.parse(data)
    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt)
    if (session.lastConversionAt) {
      session.lastConversionAt = new Date(session.lastConversionAt)
    }

    return session
  }

  /**
   * Update session data
   */
  static async updateSession(session: GuestSession): Promise<void> {
    const sessionKey = `guest:session:${session.sessionId}`
    await redisClient.setEx(
      sessionKey,
      this.SESSION_TTL,
      JSON.stringify(session)
    )
  }

  /**
   * Hash IP address for privacy (one-way hash)
   */
  static hashIpAddress(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex')
  }

  /**
   * Check if IP address has reached conversion quota
   */
  static async checkIpQuota(ipAddress: string): Promise<{
    allowed: boolean
    conversionsUsed: number
    resetAt: Date
  }> {
    const ipHash = this.hashIpAddress(ipAddress)
    const ipKey = `guest:ip:${ipHash}:conversions`

    const conversions = await redisClient.get(ipKey)
    const conversionsUsed = conversions ? parseInt(conversions, 10) : 0

    // Get TTL to calculate reset time
    const ttl = await redisClient.ttl(ipKey)
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : this.QUOTA_TTL * 1000))

    return {
      allowed: conversionsUsed < this.MAX_CONVERSIONS,
      conversionsUsed,
      resetAt
    }
  }

  /**
   * Increment IP conversion count
   */
  static async incrementIpConversions(ipAddress: string): Promise<void> {
    const ipHash = this.hashIpAddress(ipAddress)
    const ipKey = `guest:ip:${ipHash}:conversions`

    const current = await redisClient.get(ipKey)

    if (current) {
      await redisClient.incr(ipKey)
    } else {
      await redisClient.setEx(ipKey, this.QUOTA_TTL, '1')
    }
  }

  /**
   * Check if session has reached conversion quota
   */
  static async checkSessionQuota(sessionId: string): Promise<{
    allowed: boolean
    conversionsUsed: number
  }> {
    const session = await this.getSession(sessionId)

    if (!session) {
      return { allowed: true, conversionsUsed: 0 }
    }

    return {
      allowed: session.conversionsUsed < this.MAX_CONVERSIONS,
      conversionsUsed: session.conversionsUsed
    }
  }

  /**
   * Increment session conversion count
   */
  static async incrementSessionConversions(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    session.conversionsUsed += 1
    session.lastConversionAt = new Date()

    await this.updateSession(session)
  }

  /**
   * Validate guest conversion request
   * Checks both IP and session quotas
   */
  static async validateConversion(
    sessionId: string | null,
    ipAddress: string
  ): Promise<{
    allowed: boolean
    reason?: string
    session?: GuestSession
    resetAt?: Date
  }> {
    // Check IP quota first (most restrictive)
    const ipQuota = await this.checkIpQuota(ipAddress)
    if (!ipQuota.allowed) {
      return {
        allowed: false,
        reason: `Guest conversion limit reached. You can convert again in ${Math.ceil(
          (ipQuota.resetAt.getTime() - Date.now()) / (60 * 60 * 1000)
        )} hours, or create a free account for 3 conversions per month.`,
        resetAt: ipQuota.resetAt
      }
    }

    // If no session ID, create a new session
    if (!sessionId) {
      const newSession = await this.createSession(ipAddress)
      return {
        allowed: true,
        session: newSession
      }
    }

    // Check session quota
    const session = await this.getSession(sessionId)
    if (!session) {
      // Session expired or invalid, create new one
      const newSession = await this.createSession(ipAddress)
      return {
        allowed: true,
        session: newSession
      }
    }

    const sessionQuota = await this.checkSessionQuota(sessionId)
    if (!sessionQuota.allowed) {
      return {
        allowed: false,
        reason: 'Guest conversion limit reached. Create a free account for 3 conversions per month.',
        session
      }
    }

    return {
      allowed: true,
      session
    }
  }

  /**
   * Record a guest conversion
   */
  static async recordConversion(
    sessionId: string,
    ipAddress: string
  ): Promise<void> {
    await Promise.all([
      this.incrementSessionConversions(sessionId),
      this.incrementIpConversions(ipAddress)
    ])
  }

  /**
   * Delete a guest session (e.g., after migration to registered user)
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const sessionKey = `guest:session:${sessionId}`
    await redisClient.del(sessionKey)
  }

  /**
   * Get guest session statistics (for monitoring)
   */
  static async getStats(): Promise<{
    activeSessions: number
    totalIpAddresses: number
  }> {
    // Get all guest session keys
    const sessionKeys = await redisClient.keys('guest:session:*')
    const ipKeys = await redisClient.keys('guest:ip:*')

    return {
      activeSessions: sessionKeys.length,
      totalIpAddresses: ipKeys.length
    }
  }
}

export default GuestSessionService
