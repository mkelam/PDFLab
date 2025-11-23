"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPartnerSlug = exports.getAttributionData = exports.requireAttribution = exports.captureAttribution = void 0;
const Partner_1 = require("../models/Partner");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Capture Attribution Middleware
 *
 * Extracts attribution data from the request and stores it for later use.
 * This runs on ALL requests to capture attribution touchpoints.
 */
const captureAttribution = async (req, res, next) => {
    try {
        const attributionData = {};
        // 1. Check for partner slug in URL path (e.g., /partner/jeff-su)
        const partnerSlugMatch = req.path.match(/^\/partner\/([a-z0-9-]+)/);
        if (partnerSlugMatch) {
            const slug = partnerSlugMatch[1];
            attributionData.partner_slug = slug;
            attributionData.attribution_method = 'referral_link';
            // Look up partner by slug
            const partner = await Partner_1.Partner.findOne({ where: { slug } });
            if (partner && partner.canAcceptMoreReferrals()) {
                attributionData.partner_id = partner.id;
            }
        }
        // 2. Check for ?ref=slug query parameter
        if (req.query.ref && typeof req.query.ref === 'string') {
            const refSlug = req.query.ref.toLowerCase();
            attributionData.partner_slug = refSlug;
            attributionData.attribution_method = 'referral_link';
            // Look up partner by slug
            const partner = await Partner_1.Partner.findOne({ where: { slug: refSlug } });
            if (partner && partner.canAcceptMoreReferrals()) {
                attributionData.partner_id = partner.id;
            }
        }
        // 3. Capture UTM parameters
        if (req.query.utm_source && typeof req.query.utm_source === 'string') {
            attributionData.utm_source = req.query.utm_source;
        }
        if (req.query.utm_medium && typeof req.query.utm_medium === 'string') {
            attributionData.utm_medium = req.query.utm_medium;
        }
        if (req.query.utm_campaign && typeof req.query.utm_campaign === 'string') {
            attributionData.utm_campaign = req.query.utm_campaign;
        }
        // 4. Capture full referral URL (for debugging and analytics)
        attributionData.referral_url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        // 5. Store attribution data in request object
        if (Object.keys(attributionData).length > 0) {
            req.attributionData = attributionData;
            console.log('[Attribution] Captured:', {
                partner_id: attributionData.partner_id,
                partner_slug: attributionData.partner_slug,
                utm_source: attributionData.utm_source,
                path: req.path
            });
        }
        next();
    }
    catch (error) {
        logger_1.default.error('[Attribution] Error capturing attribution:', { error: error instanceof Error ? error.message : String(error) });
        // Don't block the request if attribution capture fails
        next();
    }
};
exports.captureAttribution = captureAttribution;
/**
 * Require Attribution Middleware
 *
 * Ensures that attribution data exists in the request.
 * Use this on partner-only routes (e.g., /partner/:slug/signup)
 */
const requireAttribution = (req, res, next) => {
    if (!req.attributionData || !req.attributionData.partner_id) {
        res.status(400).json({
            error: 'Invalid or missing partner reference'
        });
        return;
    }
    next();
};
exports.requireAttribution = requireAttribution;
/**
 * Helper: Get Attribution Data from Request
 *
 * Safely retrieves attribution data from request object.
 * Returns null if no attribution data exists.
 */
const getAttributionData = (req) => {
    return req.attributionData || null;
};
exports.getAttributionData = getAttributionData;
/**
 * Helper: Extract Partner Slug from Various Sources
 *
 * Checks multiple places for partner slug (path, query, utm_source)
 */
const extractPartnerSlug = (req) => {
    // Check URL path
    const pathMatch = req.path.match(/^\/partner\/([a-z0-9-]+)/);
    if (pathMatch) {
        return pathMatch[1];
    }
    // Check query parameter
    if (req.query.ref && typeof req.query.ref === 'string') {
        return req.query.ref.toLowerCase();
    }
    // Check utm_source (common pattern)
    if (req.query.utm_source && typeof req.query.utm_source === 'string') {
        return req.query.utm_source.toLowerCase();
    }
    return null;
};
exports.extractPartnerSlug = extractPartnerSlug;
//# sourceMappingURL=attribution.middleware.js.map