"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOrGuest = exports.recordGuestConversion = exports.validateGuestQuota = exports.initializeGuestSession = void 0;
exports.getClientIp = getClientIp;
const guest_session_service_1 = __importDefault(require("../services/guest-session.service"));
/**
 * Get client IP address from request
 */
function getClientIp(req) {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can be a comma-separated list, take the first one
        const ips = forwarded.split(',');
        return ips[0].trim();
    }
    // Check for real IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }
    // Fallback to socket remote address
    return req.socket.remoteAddress || 'unknown';
}
/**
 * Initialize guest session
 * Creates or retrieves guest session from cookie
 */
const initializeGuestSession = async (req, res, next) => {
    try {
        // Skip if user is authenticated
        if (req.user) {
            req.isGuest = false;
            return next();
        }
        // Get session ID from cookie
        const sessionId = req.cookies?.guest_session_id;
        // Get client IP
        const ipAddress = getClientIp(req);
        if (sessionId) {
            // Try to retrieve existing session
            const session = await guest_session_service_1.default.getSession(sessionId);
            if (session) {
                req.guestSession = session;
                req.isGuest = true;
                return next();
            }
        }
        // Create new session
        const newSession = await guest_session_service_1.default.createSession(ipAddress);
        req.guestSession = newSession;
        req.isGuest = true;
        // Set session cookie (7 days)
        res.cookie('guest_session_id', newSession.sessionId, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        next();
    }
    catch (error) {
        console.error('Guest session initialization error:', error);
        // Don't block request on session error
        req.isGuest = true;
        next();
    }
};
exports.initializeGuestSession = initializeGuestSession;
/**
 * Validate guest conversion quota
 * Checks if guest can perform a conversion
 */
const validateGuestQuota = async (req, res, next) => {
    try {
        // Skip validation if user is authenticated
        if (req.user) {
            console.log('[Guest Quota] Skipping - user is authenticated');
            return next();
        }
        const sessionId = req.guestSession?.sessionId || null;
        const ipAddress = getClientIp(req);
        console.log('[Guest Quota] Validating:', { sessionId, ipAddress });
        // Validate conversion eligibility
        const validation = await guest_session_service_1.default.validateConversion(sessionId, ipAddress);
        console.log('[Guest Quota] Validation result:', validation);
        if (!validation.allowed) {
            console.log('[Guest Quota] Blocked:', validation.reason);
            const hoursUntilReset = validation.resetAt
                ? Math.ceil((validation.resetAt.getTime() - Date.now()) / (60 * 60 * 1000))
                : 24;
            res.status(429).json({
                error: 'Daily limit reached',
                message: "You've used your free guest conversion! ✨",
                resetAt: validation.resetAt,
                hoursUntilReset,
                options: [
                    {
                        id: 'signup',
                        title: 'Get 3 free conversions/month',
                        description: '+ 7-day file storage + larger files (10MB)',
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
            });
            return;
        }
        console.log('[Guest Quota] Allowed - proceeding');
        // Update session if new one was created
        if (validation.session && !sessionId) {
            req.guestSession = validation.session;
            res.cookie('guest_session_id', validation.session.sessionId, {
                maxAge: 7 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
        }
        next();
    }
    catch (error) {
        console.error('Guest quota validation error:', error);
        res.status(500).json({
            error: 'Validation failed',
            message: 'Unable to validate guest quota. Please try again.'
        });
    }
};
exports.validateGuestQuota = validateGuestQuota;
/**
 * Record guest conversion
 * Increments conversion count for guest session and IP
 */
const recordGuestConversion = async (req, res, next) => {
    try {
        // Skip if user is authenticated
        if (req.user) {
            return next();
        }
        const sessionId = req.guestSession?.sessionId;
        const ipAddress = getClientIp(req);
        if (!sessionId) {
            throw new Error('Guest session not found');
        }
        await guest_session_service_1.default.recordConversion(sessionId, ipAddress);
        next();
    }
    catch (error) {
        console.error('Record guest conversion error:', error);
        // Don't block the request, just log the error
        next();
    }
};
exports.recordGuestConversion = recordGuestConversion;
/**
 * Require authentication or guest session
 * Allows endpoint to be accessed by both authenticated users and guests
 */
const authOrGuest = async (req, res, next) => {
    // If authenticated user, proceed
    if (req.user) {
        return next();
    }
    // If guest session exists, proceed
    if (req.guestSession) {
        return next();
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
    });
};
exports.authOrGuest = authOrGuest;
//# sourceMappingURL=guest.middleware.js.map