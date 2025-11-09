"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.optionalAuth = exports.requirePlan = exports.checkConversionQuota = exports.authMiddleware = void 0;
const auth_utils_1 = require("../utils/auth.utils");
const models_1 = require("../models");
/**
 * Middleware to authenticate JWT token
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'Please log in to access this feature',
                cta: {
                    text: 'Log In',
                    url: '/login'
                }
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify token
        const decoded = (0, auth_utils_1.verifyToken)(token);
        if (!decoded) {
            res.status(401).json({
                error: 'Invalid token',
                message: 'Token is invalid or expired'
            });
            return;
        }
        // Fetch user from database
        const user = await models_1.User.findByPk(decoded.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found',
                message: 'User associated with this token does not exist'
            });
            return;
        }
        // Attach user to request object
        req.user = user;
        req.userId = user.id;
        req.userPlan = user.plan;
        req.userRole = user.role;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            message: 'An error occurred during authentication'
        });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Middleware to check if user has reached conversion limit
 * Skips check for guest users (they have separate quota check via guest middleware)
 */
const checkConversionQuota = async (req, res, next) => {
    try {
        const user = req.user;
        // Skip quota check for guest users (handled by guest middleware)
        if (!user) {
            next();
            return;
        }
        if (!user.canConvert()) {
            // Calculate reset date (first day of next month)
            const now = new Date();
            const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            res.status(429).json({
                error: 'Monthly limit reached',
                message: `You've used all ${user.conversions_limit} conversions on your ${user.plan} plan`,
                conversions_used: user.conversions_used,
                conversions_limit: user.conversions_limit,
                plan: user.plan,
                reset_date: resetDate.toISOString().split('T')[0],
                days_until_reset: daysUntilReset,
                upgrade_required: true,
                upgrade_options: [
                    {
                        plan: 'starter',
                        conversions: 100,
                        price: '$9.99/month',
                        cta: 'Upgrade to Starter',
                        url: '/pricing',
                        highlight: user.plan === 'free'
                    },
                    {
                        plan: 'pro',
                        conversions: 'unlimited',
                        price: '$29.99/month',
                        cta: 'Go Pro',
                        url: '/pricing',
                        highlight: user.plan === 'starter' || user.plan === 'free'
                    },
                    {
                        plan: 'enterprise',
                        conversions: 'unlimited',
                        price: '$99.99/month',
                        features: ['API access', '500MB files', 'Priority support'],
                        cta: 'Go Enterprise',
                        url: '/pricing',
                        highlight: false
                    }
                ].filter(option => {
                    const planOrder = { free: 0, starter: 1, pro: 2, enterprise: 3 };
                    return planOrder[option.plan] > planOrder[user.plan];
                })
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Quota check error:', error);
        res.status(500).json({
            error: 'Quota check failed',
            message: 'An error occurred while checking your quota'
        });
    }
};
exports.checkConversionQuota = checkConversionQuota;
/**
 * Middleware to require specific plan
 */
const requirePlan = (...requiredPlans) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!requiredPlans.includes(user.plan)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                message: `This feature requires a ${requiredPlans.join(' or ')} plan`,
                current_plan: user.plan,
                required_plans: requiredPlans
            });
            return;
        }
        next();
    };
};
exports.requirePlan = requirePlan;
/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const decoded = (0, auth_utils_1.verifyToken)(token);
        if (decoded) {
            const user = await models_1.User.findByPk(decoded.userId);
            if (user) {
                req.user = user;
                req.userId = user.id;
                req.userPlan = user.plan;
                req.userRole = user.role;
            }
        }
        next();
    }
    catch (error) {
        // Continue without user if auth fails
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Alias for better naming
exports.optionalAuthMiddleware = exports.optionalAuth;
//# sourceMappingURL=auth.middleware.js.map