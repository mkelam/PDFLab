import { Request, Response, NextFunction } from 'express'
import GuestSessionService from '../services/guest-session.service'
import { GUEST_LIMITS, USER_PLAN_LIMITS } from '../config/constants'
import logger from '../config/logger'

/**
 * Guest session middleware
 * Handles guest session creation and validation
 * Works alongside auth middleware to support both authenticated and guest users
 */

declare global {
  namespace Express {
    interface Request {
      guestSession?: {
        sessionId: string
        createdAt: Date
        conversionsUsed: number
        lastConversionAt?: Date
        ipAddress: string
      }
      isGuest?: boolean
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    const ips = (forwarded as string).split(',')
    return ips[0].trim()
  }

  // Check for real IP header
  const realIp = req.headers['x-real-ip']
  if (realIp) {
    return realIp as string
  }

  // Fallback to socket remote address
  return req.socket.remoteAddress || 'unknown'
}

/**
 * Initialize guest session
 * Creates or retrieves guest session from cookie
 */
export const initializeGuestSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip if user is authenticated
    if (req.user) {
      req.isGuest = false
      return next()
    }

    // Get session ID from cookie
    const sessionId = req.cookies?.guest_session_id

    // Get client IP
    const ipAddress = getClientIp(req)

    if (sessionId) {
      // Try to retrieve existing session
      const session = await GuestSessionService.getSession(sessionId)
      if (session) {
        req.guestSession = session
        req.isGuest = true
        return next()
      }
    }

    // Create new session
    const newSession = await GuestSessionService.createSession(ipAddress)
    req.guestSession = newSession
    req.isGuest = true

    // Set session cookie (7 days)
    res.cookie('guest_session_id', newSession.sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    next()
  } catch (error) {
    logger.error('Guest session initialization error:', { error: error instanceof Error ? error.message : String(error) })
    // Don't block request on session error
    req.isGuest = true
    next()
  }
}

/**
 * Validate guest conversion quota
 * Checks if guest can perform a conversion
 */
export const validateGuestQuota = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip validation if user is authenticated
    if (req.user) {
      logger.info('[Guest Quota] Skipping - user is authenticated')
      return next()
    }

    const sessionId = req.guestSession?.sessionId || null
    const ipAddress = getClientIp(req)

    logger.info('[Guest Quota] Validating:', { { sessionId, ipAddress } })

    // Validate conversion eligibility
    const validation = await GuestSessionService.validateConversion(
      sessionId,
      ipAddress
    )

    logger.info('[Guest Quota] Validation result:', { validation })

    if (!validation.allowed) {
      logger.info('[Guest Quota] Blocked:', { validation.reason })

      const hoursUntilReset = validation.resetAt
        ? Math.ceil((validation.resetAt.getTime() - Date.now()) / (60 * 60 * 1000))
        : 24

      res.status(429).json({
        error: 'Guest quota exceeded',
        message: validation.reason,
        resetAt: validation.resetAt,
        hoursUntilReset,
        conversions_used: GUEST_LIMITS.MAX_CONVERSIONS,
        conversions_limit: GUEST_LIMITS.MAX_CONVERSIONS,
        upgrade_required: true,
        upgrade_benefits: {
          free_account: {
            conversions: USER_PLAN_LIMITS.free.MAX_CONVERSIONS,
            file_size_mb: USER_PLAN_LIMITS.free.MAX_FILE_SIZE_MB,
            retention_days: USER_PLAN_LIMITS.free.FILE_RETENTION_DAYS,
            price: 'Free'
          },
          starter_plan: {
            conversions: USER_PLAN_LIMITS.starter.MAX_CONVERSIONS,
            file_size_mb: USER_PLAN_LIMITS.starter.MAX_FILE_SIZE_MB,
            retention_days: USER_PLAN_LIMITS.starter.FILE_RETENTION_DAYS,
            price: '$9.99/month'
          }
        },
        options: [
          {
            id: 'signup',
            title: `Get ${USER_PLAN_LIMITS.free.MAX_CONVERSIONS} free conversions/month`,
            description: `+ ${USER_PLAN_LIMITS.free.FILE_RETENTION_DAYS}-day file storage + larger files (${USER_PLAN_LIMITS.free.MAX_FILE_SIZE_MB}MB)`,
            cta: 'Create Free Account',
            url: '/signup',
            primary: true
          },
          {
            id: 'wait',
            title: 'Wait and try again',
            description: `Come back in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''} for another free conversion`,
            cta: null,
            primary: false
          }
        ]
      })
      return
    }

    logger.info('[Guest Quota] Allowed - proceeding')

    // Update session if new one was created
    if (validation.session && !sessionId) {
      req.guestSession = validation.session
      res.cookie('guest_session_id', validation.session.sessionId, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    }

    next()
  } catch (error) {
    logger.error('Guest quota validation error:', { error: error instanceof Error ? error.message : String(error) })
    res.status(500).json({
      error: 'Validation failed',
      message: 'Unable to validate guest quota. Please try again.'
    })
  }
}

/**
 * Record guest conversion
 * Increments conversion count for guest session and IP
 */
export const recordGuestConversion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip if user is authenticated
    if (req.user) {
      return next()
    }

    const sessionId = req.guestSession?.sessionId
    const ipAddress = getClientIp(req)

    if (!sessionId) {
      throw new Error('Guest session not found')
    }

    await GuestSessionService.recordConversion(sessionId, ipAddress)

    next()
  } catch (error) {
    logger.error('Record guest conversion error:', { error: error instanceof Error ? error.message : String(error) })
    // Don't block the request, just log the error
    next()
  }
}

/**
 * Require authentication or guest session
 * Allows endpoint to be accessed by both authenticated users and guests
 */
export const authOrGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // If authenticated user, proceed
  if (req.user) {
    return next()
  }

  // If guest session exists, proceed
  if (req.guestSession) {
    return next()
  }

  // Neither authenticated nor guest session
  res.status(401).json({
    error: 'Authentication required',
    message: 'Enable cookies in your browser to use guest mode, or sign in to your account',
    options: [
      {
        id: 'enable_cookies',
        title: 'Enable cookies',
        description: 'Required for guest conversions (no account needed)',
        steps: [
          'Check your browser settings',
          'Allow cookies for this site',
          'Refresh the page'
        ]
      },
      {
        id: 'login',
        title: 'Sign in to your account',
        cta: 'Log In',
        url: '/login'
      }
    ]
  })
}

export { getClientIp }
