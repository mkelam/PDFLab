import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

/**
 * Analytics Middleware
 * Tracks user behavior and conversion funnel metrics
 * In production, this would send events to analytics services (Google Analytics, Mixpanel, etc.)
 * For now, logs events to console with structured format for easy parsing
 */

export interface AnalyticsEvent {
  timestamp: Date
  event: string
  userId?: string
  guestSessionId?: string
  isGuest: boolean
  properties?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an analytics event
 */
function logEvent(event: AnalyticsEvent): void {
  // In production, send to analytics service
  // For now, log to console in JSON format for easy parsing
  console.log('[ANALYTICS]', JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString()
  }))
}

/**
 * Track guest conversion funnel events
 */
export const trackGuestConversion = (eventName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    const guestSession = req.guestSession
    const isGuest = !user && !!guestSession

    // Log event
    logEvent({
      timestamp: new Date(),
      event: eventName,
      userId: user?.id,
      guestSessionId: guestSession?.sessionId,
      isGuest,
      properties: {
        conversion_type: req.body?.conversion_type,
        file_size: req.file?.size,
        user_agent: req.get('user-agent')
      },
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent')
    })

    next()
  }
}

/**
 * Track signup events (conversion from guest to registered user)
 */
export const trackSignup = async (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res)

  res.json = function(body: any) {
    // Only track successful signups
    if (res.statusCode === 201 && body.user) {
      const hadGuestSession = !!req.cookies?.guest_session_id
      const migratedJobs = body.migrated_jobs || 0

      logEvent({
        timestamp: new Date(),
        event: 'user_signup',
        userId: body.user.id,
        guestSessionId: req.cookies?.guest_session_id,
        isGuest: false,
        properties: {
          had_guest_session: hadGuestSession,
          migrated_jobs: migratedJobs,
          signup_method: 'email',
          user_plan: body.user.plan
        },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      })

      // Track conversion funnel completion if user came from guest
      if (hadGuestSession && migratedJobs > 0) {
        logEvent({
          timestamp: new Date(),
          event: 'guest_to_user_conversion',
          userId: body.user.id,
          guestSessionId: req.cookies?.guest_session_id,
          isGuest: false,
          properties: {
            migrated_jobs: migratedJobs,
            funnel_step: 'completed'
          },
          ipAddress: getClientIp(req),
          userAgent: req.get('user-agent')
        })
      }
    }

    return originalJson(body)
  }

  next()
}

/**
 * Track file upload events
 */
export const trackUpload = async (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res)

  res.json = function(body: any) {
    // Only track successful uploads
    if (res.statusCode === 201 && body.job_id) {
      const user = req.user
      const guestSession = req.guestSession
      const isGuest = body.is_guest === true

      logEvent({
        timestamp: new Date(),
        event: isGuest ? 'guest_file_upload' : 'user_file_upload',
        userId: user?.id,
        guestSessionId: guestSession?.sessionId,
        isGuest,
        properties: {
          job_id: body.job_id,
          conversion_type: req.body?.conversion_type,
          file_size: req.file?.size,
          file_name: req.file?.originalname,
          funnel_step: isGuest ? 'guest_upload' : 'user_upload'
        },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      })
    }

    return originalJson(body)
  }

  next()
}

/**
 * Track download events
 */
export const trackDownload = async (req: Request, res: Response, next: NextFunction) => {
  const originalOn = res.on.bind(res)

  res.on = function(event: string, listener: any) {
    if (event === 'finish' && res.statusCode === 200) {
      const user = req.user
      const isGuest = !user

      logEvent({
        timestamp: new Date(),
        event: isGuest ? 'guest_file_download' : 'user_file_download',
        userId: user?.id,
        isGuest,
        properties: {
          job_id: req.params?.job_id,
          funnel_step: isGuest ? 'guest_download' : 'user_download'
        },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      })
    }

    return originalOn(event, listener)
  }

  next()
}

/**
 * Track guest quota reached events
 */
export const trackQuotaReached = async (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res)

  res.json = function(body: any) {
    // Track quota reached errors
    if (res.statusCode === 429 && body.error === 'Guest quota exceeded') {
      const guestSession = req.guestSession

      logEvent({
        timestamp: new Date(),
        event: 'guest_quota_reached',
        guestSessionId: guestSession?.sessionId,
        isGuest: true,
        properties: {
          reset_at: body.reset_at,
          funnel_step: 'quota_reached'
        },
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')
      })
    }

    return originalJson(body)
  }

  next()
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

/**
 * Get analytics summary (for admin dashboard)
 */
export async function getAnalyticsSummary(): Promise<{
  totalEvents: number
  guestUploads: number
  guestDownloads: number
  userSignups: number
  guestConversions: number
  conversionRate: number
}> {
  // In production, query analytics database
  // For now, return placeholder data
  return {
    totalEvents: 0,
    guestUploads: 0,
    guestDownloads: 0,
    userSignups: 0,
    guestConversions: 0,
    conversionRate: 0
  }
}
