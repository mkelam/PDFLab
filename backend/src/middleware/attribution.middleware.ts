import { Request, Response, NextFunction } from 'express'
import { Partner } from '../models/Partner'
import logger from '../config/logger'

/**
 * Attribution Middleware
 *
 * Captures referral tracking data from URL parameters and stores them in the session.
 * This middleware should run BEFORE any authentication middleware.
 *
 * Supported URL patterns:
 * 1. Partner slug: /partner/:slug (e.g., /partner/jeff-su)
 * 2. Query parameter: ?ref=jeff-su
 * 3. UTM parameters: ?utm_source=jeff-su&utm_medium=youtube&utm_campaign=workflow-tips
 * 4. Promo code: Handled separately in auth controller during signup
 *
 * Attribution data is stored in req.attributionData and can be used during signup.
 */

export interface AttributionData {
  partner_id?: string
  partner_slug?: string
  referral_url?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  attribution_method?: 'referral_link' | 'promo_code' | 'manual'
}

declare global {
  namespace Express {
    interface Request {
      attributionData?: AttributionData
    }
  }
}

/**
 * Capture Attribution Middleware
 *
 * Extracts attribution data from the request and stores it for later use.
 * This runs on ALL requests to capture attribution touchpoints.
 */
export const captureAttribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attributionData: AttributionData = {}

    // 1. Check for partner slug in URL path (e.g., /partner/jeff-su)
    const partnerSlugMatch = req.path.match(/^\/partner\/([a-z0-9-]+)/)
    if (partnerSlugMatch) {
      const slug = partnerSlugMatch[1]
      attributionData.partner_slug = slug
      attributionData.attribution_method = 'referral_link'

      // Look up partner by slug
      const partner = await Partner.findOne({ where: { slug } })
      if (partner && partner.canAcceptMoreReferrals()) {
        attributionData.partner_id = partner.id
      }
    }

    // 2. Check for ?ref=slug query parameter
    if (req.query.ref && typeof req.query.ref === 'string') {
      const refSlug = req.query.ref.toLowerCase()
      attributionData.partner_slug = refSlug
      attributionData.attribution_method = 'referral_link'

      // Look up partner by slug
      const partner = await Partner.findOne({ where: { slug: refSlug } })
      if (partner && partner.canAcceptMoreReferrals()) {
        attributionData.partner_id = partner.id
      }
    }

    // 3. Capture UTM parameters
    if (req.query.utm_source && typeof req.query.utm_source === 'string') {
      attributionData.utm_source = req.query.utm_source
    }
    if (req.query.utm_medium && typeof req.query.utm_medium === 'string') {
      attributionData.utm_medium = req.query.utm_medium
    }
    if (req.query.utm_campaign && typeof req.query.utm_campaign === 'string') {
      attributionData.utm_campaign = req.query.utm_campaign
    }

    // 4. Capture full referral URL (for debugging and analytics)
    attributionData.referral_url = `${req.protocol}://${req.get('host')}${req.originalUrl}`

    // 5. Store attribution data in request object
    if (Object.keys(attributionData).length > 0) {
      req.attributionData = attributionData

      console.log('[Attribution] Captured:', {
        partner_id: attributionData.partner_id,
        partner_slug: attributionData.partner_slug,
        utm_source: attributionData.utm_source,
        path: req.path
      })
    }

    next()
  } catch (error) {
    logger.error('[Attribution] Error capturing attribution:', { error: error instanceof Error ? error.message : String(error) })
    // Don't block the request if attribution capture fails
    next()
  }
}

/**
 * Require Attribution Middleware
 *
 * Ensures that attribution data exists in the request.
 * Use this on partner-only routes (e.g., /partner/:slug/signup)
 */
export const requireAttribution = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.attributionData || !req.attributionData.partner_id) {
    res.status(400).json({
      error: 'Invalid or missing partner reference'
    })
    return
  }
  next()
}

/**
 * Helper: Get Attribution Data from Request
 *
 * Safely retrieves attribution data from request object.
 * Returns null if no attribution data exists.
 */
export const getAttributionData = (req: Request): AttributionData | null => {
  return req.attributionData || null
}

/**
 * Helper: Extract Partner Slug from Various Sources
 *
 * Checks multiple places for partner slug (path, query, utm_source)
 */
export const extractPartnerSlug = (req: Request): string | null => {
  // Check URL path
  const pathMatch = req.path.match(/^\/partner\/([a-z0-9-]+)/)
  if (pathMatch) {
    return pathMatch[1]
  }

  // Check query parameter
  if (req.query.ref && typeof req.query.ref === 'string') {
    return req.query.ref.toLowerCase()
  }

  // Check utm_source (common pattern)
  if (req.query.utm_source && typeof req.query.utm_source === 'string') {
    return req.query.utm_source.toLowerCase()
  }

  return null
}
