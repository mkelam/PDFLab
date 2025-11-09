"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackQuotaReached = exports.trackDownload = exports.trackUpload = exports.trackSignup = exports.trackGuestConversion = void 0;
exports.getAnalyticsSummary = getAnalyticsSummary;
/**
 * Log an analytics event
 */
function logEvent(event) {
    // In production, send to analytics service
    // For now, log to console in JSON format for easy parsing
    console.log('[ANALYTICS]', JSON.stringify({
        ...event,
        timestamp: event.timestamp.toISOString()
    }));
}
/**
 * Track guest conversion funnel events
 */
const trackGuestConversion = (eventName) => {
    return (req, res, next) => {
        const user = req.user;
        const guestSession = req.guestSession;
        const isGuest = !user && !!guestSession;
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
        });
        next();
    };
};
exports.trackGuestConversion = trackGuestConversion;
/**
 * Track signup events (conversion from guest to registered user)
 */
const trackSignup = async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Only track successful signups
        if (res.statusCode === 201 && body.user) {
            const hadGuestSession = !!req.cookies?.guest_session_id;
            const migratedJobs = body.migrated_jobs || 0;
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
            });
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
                });
            }
        }
        return originalJson(body);
    };
    next();
};
exports.trackSignup = trackSignup;
/**
 * Track file upload events
 */
const trackUpload = async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Only track successful uploads
        if (res.statusCode === 201 && body.job_id) {
            const user = req.user;
            const guestSession = req.guestSession;
            const isGuest = body.is_guest === true;
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
            });
        }
        return originalJson(body);
    };
    next();
};
exports.trackUpload = trackUpload;
/**
 * Track download events
 */
const trackDownload = async (req, res, next) => {
    const originalOn = res.on.bind(res);
    res.on = function (event, listener) {
        if (event === 'finish' && res.statusCode === 200) {
            const user = req.user;
            const isGuest = !user;
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
            });
        }
        return originalOn(event, listener);
    };
    next();
};
exports.trackDownload = trackDownload;
/**
 * Track guest quota reached events
 */
const trackQuotaReached = async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        // Track quota reached errors
        if (res.statusCode === 429 && body.error === 'Guest quota exceeded') {
            const guestSession = req.guestSession;
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
            });
        }
        return originalJson(body);
    };
    next();
};
exports.trackQuotaReached = trackQuotaReached;
/**
 * Get client IP address
 */
function getClientIp(req) {
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}
/**
 * Get analytics summary (for admin dashboard)
 */
async function getAnalyticsSummary() {
    // In production, query analytics database
    // For now, return placeholder data
    return {
        totalEvents: 0,
        guestUploads: 0,
        guestDownloads: 0,
        userSignups: 0,
        guestConversions: 0,
        conversionRate: 0
    };
}
//# sourceMappingURL=analytics.middleware.js.map