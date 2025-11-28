"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.getProfile = exports.login = exports.register = void 0;
const models_1 = require("../models");
const UserAttribution_1 = require("../models/UserAttribution");
const auth_utils_1 = require("../utils/auth.utils");
const sanitize_utils_1 = require("../utils/sanitize.utils");
const email_service_1 = __importDefault(require("../services/email.service"));
const guest_session_service_1 = __importDefault(require("../services/guest-session.service"));
const attribution_middleware_1 = require("../middleware/attribution.middleware");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const { email, password, name, promo_code } = req.body;
        // Validation
        if (!email || !password) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
            return;
        }
        if (!(0, auth_utils_1.isValidEmail)(email)) {
            res.status(422).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
            return;
        }
        const passwordValidation = (0, auth_utils_1.isValidPassword)(password);
        if (!passwordValidation.valid) {
            res.status(400).json({
                error: 'Weak password',
                message: passwordValidation.errors[0] || 'Password does not meet security requirements',
                errors: passwordValidation.errors
            });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.User.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                error: 'Email already exists',
                message: 'An account with this email already exists'
            });
            return;
        }
        // Hash password
        const password_hash = await (0, auth_utils_1.hashPassword)(password);
        // Sanitize user inputs to prevent XSS
        const sanitizedName = name ? (0, sanitize_utils_1.sanitizeText)(name) : undefined;
        // Create user
        const user = await models_1.User.create({
            email,
            password_hash,
            name: sanitizedName,
            plan: models_1.UserPlan.FREE,
            conversions_used: 0,
            conversions_limit: parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3'),
            created_at: new Date(),
            updated_at: new Date()
        });
        // ===================================
        // ATTRIBUTION TRACKING
        // ===================================
        // Capture attribution data to identify which influencer brought this user
        let attributionMethod;
        let partnerId;
        let promoCodeId;
        let referralUrl;
        let utmSource;
        let utmMedium;
        let utmCampaign;
        // 1. Check for promo code (highest priority)
        if (promo_code) {
            const promoCodeRecord = await models_1.PromoCode.findOne({
                where: { code: promo_code.toUpperCase(), is_active: true },
                include: [{ model: models_1.Partner, as: 'partner' }]
            });
            if (promoCodeRecord && promoCodeRecord.isValid()) {
                partnerId = promoCodeRecord.partner_id;
                promoCodeId = promoCodeRecord.id;
                attributionMethod = UserAttribution_1.AttributionMethod.PROMO_CODE;
                // Increment promo code usage
                await promoCodeRecord.incrementUse();
                logger_1.default.info(`[Attribution] User ${user.email} signed up with promo code ${promo_code}`);
            }
            else {
                logger_1.default.warn(`[Attribution] Invalid or expired promo code: ${promo_code}`);
            }
        }
        // 2. Check for referral link attribution (from middleware)
        if (!partnerId) {
            const attributionData = (0, attribution_middleware_1.getAttributionData)(req);
            if (attributionData && attributionData.partner_id) {
                partnerId = attributionData.partner_id;
                referralUrl = attributionData.referral_url;
                utmSource = attributionData.utm_source;
                utmMedium = attributionData.utm_medium;
                utmCampaign = attributionData.utm_campaign;
                attributionMethod = UserAttribution_1.AttributionMethod.REFERRAL_LINK;
                logger_1.default.info(`[Attribution] User ${user.email} signed up via referral link from partner ${partnerId}`);
            }
        }
        // 3. Create attribution record
        if (partnerId && attributionMethod) {
            await models_1.UserAttribution.create({
                user_id: user.id,
                partner_id: partnerId,
                promo_code_id: promoCodeId,
                attribution_method: attributionMethod,
                referral_url: referralUrl,
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign,
                converted_to_paid: false,
                first_payment_amount: 0,
                commission_due: 0,
                commission_paid: false,
                created_at: new Date()
            });
            logger_1.default.info(`[Attribution] Created attribution record for user ${user.email} → partner ${partnerId}`);
        }
        else {
            // Organic signup (no partner attribution)
            await models_1.UserAttribution.create({
                user_id: user.id,
                partner_id: undefined,
                attribution_method: UserAttribution_1.AttributionMethod.MANUAL,
                created_at: new Date()
            });
            logger_1.default.info(`[Attribution] User ${user.email} is an organic signup (no partner)`);
        }
        // Migrate guest session if exists
        const guestSessionId = req.cookies?.guest_session_id;
        let migratedJobs = 0;
        if (guestSessionId) {
            try {
                // Get guest session to verify it exists
                const guestSession = await guest_session_service_1.default.getSession(guestSessionId);
                if (guestSession) {
                    // Migrate guest conversion jobs to the new user
                    const updatedCount = await models_1.ConversionJob.update({ user_id: user.id }, { where: { user_id: null } });
                    migratedJobs = Array.isArray(updatedCount) ? updatedCount[0] : updatedCount;
                    if (migratedJobs > 0) {
                        logger_1.default.info(`✅ Migrated ${migratedJobs} guest conversion job(s) to user ${user.email}`);
                        // Update user's conversion count
                        user.conversions_used = migratedJobs;
                        await user.save();
                    }
                    // Delete guest session from Redis
                    await guest_session_service_1.default.deleteSession(guestSessionId);
                    logger_1.default.info(`✅ Deleted guest session ${guestSessionId}`);
                    // Clear guest session cookie
                    res.clearCookie('guest_session_id');
                }
            }
            catch (error) {
                logger_1.default.error('Guest session migration error:', { error: error instanceof Error ? error.message : String(error) });
                // Don't fail registration if migration fails
            }
        }
        // Send welcome email (non-blocking)
        email_service_1.default.sendWelcomeEmail(user.email, user.name || undefined).catch((error) => {
            logger_1.default.error('Failed to send welcome email:', { error: error instanceof Error ? error.message : String(error) });
            // Don't fail registration if email fails
        });
        // Generate tokens
        const accessToken = (0, auth_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        const refreshToken = (0, auth_utils_1.generateRefreshToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        res.status(201).json({
            message: migratedJobs > 0
                ? `User registered successfully. ${migratedJobs} conversion${migratedJobs > 1 ? 's' : ''} migrated to your account.`
                : 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plan: user.plan,
                conversions_used: user.conversions_used,
                conversions_limit: user.conversions_limit
            },
            token: accessToken,
            refreshToken: refreshToken,
            migrated_jobs: migratedJobs
        });
    }
    catch (error) {
        logger_1.default.error('Registration error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration'
        });
    }
};
exports.register = register;
/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
            return;
        }
        // Find user
        const user = await models_1.User.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }
        // Verify password
        const isPasswordValid = await (0, auth_utils_1.verifyPassword)(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }
        // Update last login
        user.last_login = new Date();
        await user.save();
        // Generate tokens
        const accessToken = (0, auth_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        const refreshToken = (0, auth_utils_1.generateRefreshToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                plan: user.plan,
                conversions_used: user.conversions_used,
                conversions_limit: user.conversions_limit,
                last_login: user.last_login
            },
            token: accessToken,
            refreshToken: refreshToken
        });
    }
    catch (error) {
        logger_1.default.error('Login error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
};
exports.login = login;
/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            conversions_used: user.conversions_used,
            conversions_limit: user.conversions_limit,
            subscription_status: user.subscription_status,
            subscription_end_date: user.subscription_end_date,
            created_at: user.created_at,
            last_login: user.last_login
        });
    }
    catch (error) {
        logger_1.default.error('Get profile error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Failed to fetch profile',
            message: 'An error occurred while fetching your profile'
        });
    }
};
exports.getProfile = getProfile;
/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
    try {
        // Accept both refreshToken (camelCase) and refresh_token (snake_case) for backwards compatibility
        const { refresh_token, refreshToken: refreshTokenCamel } = req.body;
        const token = refreshTokenCamel || refresh_token;
        if (!token) {
            res.status(400).json({
                error: 'Missing refresh token',
                message: 'Refresh token is required'
            });
            return;
        }
        // Verify refresh token (using same verifyToken function)
        const { verifyToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                error: 'Invalid refresh token',
                message: 'Refresh token is invalid or expired'
            });
            return;
        }
        // Fetch user
        const user = await models_1.User.findByPk(decoded.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found',
                message: 'User associated with this token does not exist'
            });
            return;
        }
        // Generate new tokens
        const newAccessToken = (0, auth_utils_1.generateAccessToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        const newRefreshToken = (0, auth_utils_1.generateRefreshToken)({
            userId: user.id,
            email: user.email,
            plan: user.plan
        });
        res.status(200).json({
            token: newAccessToken,
            refreshToken: newRefreshToken
        });
    }
    catch (error) {
        logger_1.default.error('Refresh token error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Token refresh failed',
            message: 'An error occurred while refreshing your token'
        });
    }
};
exports.refreshToken = refreshToken;
/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        // Validation
        if (!email) {
            res.status(400).json({
                error: 'Missing email',
                message: 'Email is required'
            });
            return;
        }
        if (!(0, auth_utils_1.isValidEmail)(email)) {
            res.status(422).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
            return;
        }
        // Find user
        const user = await models_1.User.findOne({ where: { email } });
        // Always return success (security best practice - don't reveal if email exists)
        // But only send email if user actually exists
        if (user) {
            // Generate password reset token (valid for 1 hour)
            const resetToken = (0, auth_utils_1.generatePasswordResetToken)({
                userId: user.id,
                email: user.email,
                plan: user.plan
            });
            // Send password reset email
            await email_service_1.default.sendPasswordResetEmail(user.email, resetToken);
        }
        // Always return success to prevent email enumeration
        res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        });
    }
    catch (error) {
        logger_1.default.error('Forgot password error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Request failed',
            message: 'An error occurred while processing your request'
        });
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;
        // Validation
        if (!token || !new_password) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'Token and new password are required'
            });
            return;
        }
        const passwordValidation = (0, auth_utils_1.isValidPassword)(new_password);
        if (!passwordValidation.valid) {
            res.status(422).json({
                error: 'Weak password',
                message: passwordValidation.errors[0] || 'Password does not meet security requirements',
                errors: passwordValidation.errors
            });
            return;
        }
        // Verify token
        const { verifyToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const decoded = verifyToken(token);
        if (!decoded || !decoded.userId) {
            res.status(401).json({
                error: 'Invalid token',
                message: 'Password reset token is invalid or has expired'
            });
            return;
        }
        // Verify token type (must be password_reset token)
        if (decoded.type !== 'password_reset') {
            res.status(401).json({
                error: 'Invalid token type',
                message: 'This token is not valid for password reset'
            });
            return;
        }
        // Find user
        const user = await models_1.User.findByPk(decoded.userId);
        if (!user) {
            res.status(404).json({
                error: 'User not found',
                message: 'User associated with this token does not exist'
            });
            return;
        }
        // Check if account is locked due to failed reset attempts
        if (user.reset_locked_until && user.reset_locked_until > new Date()) {
            const minutesRemaining = Math.ceil((user.reset_locked_until.getTime() - Date.now()) / 60000);
            res.status(429).json({
                error: 'Account locked',
                message: `Too many failed password reset attempts. Please try again in ${minutesRemaining} minutes.`
            });
            return;
        }
        // Check if new password matches current password
        const isSameAsCurrentPassword = await (0, auth_utils_1.verifyPassword)(new_password, user.password_hash);
        if (isSameAsCurrentPassword) {
            // Increment failed reset attempts
            user.failed_reset_attempts = (user.failed_reset_attempts || 0) + 1;
            // Lock account after 5 failed attempts (30 minutes)
            if (user.failed_reset_attempts >= 5) {
                user.reset_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                await user.save();
                res.status(400).json({
                    error: 'Too many attempts',
                    message: 'Account has been locked due to too many failed password reset attempts. Please try again in 30 minutes.'
                });
                return;
            }
            await user.save();
            res.status(400).json({
                error: 'Password reuse not allowed',
                message: 'New password cannot be the same as your current password'
            });
            return;
        }
        // Check password history (last 5 passwords)
        const { PasswordHistory } = await Promise.resolve().then(() => __importStar(require('../models')));
        const passwordHistory = await PasswordHistory.findAll({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']],
            limit: 5
        });
        for (const historyEntry of passwordHistory) {
            const isPasswordReused = await (0, auth_utils_1.verifyPassword)(new_password, historyEntry.password_hash);
            if (isPasswordReused) {
                // Increment failed reset attempts
                user.failed_reset_attempts = (user.failed_reset_attempts || 0) + 1;
                // Lock account after 5 failed attempts (30 minutes)
                if (user.failed_reset_attempts >= 5) {
                    user.reset_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                    await user.save();
                    res.status(400).json({
                        error: 'Too many attempts',
                        message: 'Account has been locked due to too many failed password reset attempts. Please try again in 30 minutes.'
                    });
                    return;
                }
                await user.save();
                res.status(400).json({
                    error: 'Password reuse not allowed',
                    message: 'New password cannot be one of your last 5 passwords. Please choose a different password.'
                });
                return;
            }
        }
        // Save current password to history before changing it
        await PasswordHistory.create({
            user_id: user.id,
            password_hash: user.password_hash,
            created_at: new Date()
        });
        // Hash new password
        const password_hash = await (0, auth_utils_1.hashPassword)(new_password);
        // Update password and reset lockout counters
        user.password_hash = password_hash;
        user.failed_reset_attempts = 0;
        user.reset_locked_until = undefined;
        await user.save(); // Sequelize automatically updates updated_at
        logger_1.default.info(`Password reset successful for user: ${user.email}`);
        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Reset password error:', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            error: 'Reset failed',
            message: 'An error occurred while resetting your password'
        });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=auth.controller.js.map