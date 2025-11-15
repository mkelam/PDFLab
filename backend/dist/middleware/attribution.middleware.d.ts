import { Request, Response, NextFunction } from 'express';
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
    partner_id?: string;
    partner_slug?: string;
    referral_url?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    attribution_method?: 'referral_link' | 'promo_code' | 'manual';
}
declare global {
    namespace Express {
        interface Request {
            attributionData?: AttributionData;
        }
    }
}
/**
 * Capture Attribution Middleware
 *
 * Extracts attribution data from the request and stores it for later use.
 * This runs on ALL requests to capture attribution touchpoints.
 */
export declare const captureAttribution: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Require Attribution Middleware
 *
 * Ensures that attribution data exists in the request.
 * Use this on partner-only routes (e.g., /partner/:slug/signup)
 */
export declare const requireAttribution: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Helper: Get Attribution Data from Request
 *
 * Safely retrieves attribution data from request object.
 * Returns null if no attribution data exists.
 */
export declare const getAttributionData: (req: Request) => AttributionData | null;
/**
 * Helper: Extract Partner Slug from Various Sources
 *
 * Checks multiple places for partner slug (path, query, utm_source)
 */
export declare const extractPartnerSlug: (req: Request) => string | null;
//# sourceMappingURL=attribution.middleware.d.ts.map