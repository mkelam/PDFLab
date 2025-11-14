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
const auth_utils_1 = require("../utils/auth.utils");
const email_service_1 = __importDefault(require("../services/email.service"));
const guest_session_service_1 = __importDefault(require("../services/guest-session.service"));
/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
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
        if (!(0, auth_utils_1.isValidPassword)(password)) {
            res.status(422).json({
                error: 'Weak password',
                message: 'Password must be at least 8 characters long and contain letters and numbers'
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
        // Create user
        const user = await models_1.User.create({
            email,
            password_hash,
            name: name || undefined,
            plan: models_1.UserPlan.FREE,
            conversions_used: 0,
            conversions_limit: parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3'),
            created_at: new Date(),
            updated_at: new Date()
        });
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
                        console.log(`✅ Migrated ${migratedJobs} guest conversion job(s) to user ${user.email}`);
                        // Update user's conversion count
                        user.conversions_used = migratedJobs;
                        await user.save();
                    }
                    // Delete guest session from Redis
                    await guest_session_service_1.default.deleteSession(guestSessionId);
                    console.log(`✅ Deleted guest session ${guestSessionId}`);
                    // Clear guest session cookie
                    res.clearCookie('guest_session_id');
                }
            }
            catch (error) {
                console.error('Guest session migration error:', error);
                // Don't fail registration if migration fails
            }
        }
        // Send welcome email (non-blocking)
        email_service_1.default.sendWelcomeEmail(user.email, user.name || undefined).catch((error) => {
            console.error('Failed to send welcome email:', error);
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
            refresh_token: refreshToken,
            migrated_jobs: migratedJobs
        });
    }
    catch (error) {
        console.error('Registration error:', error);
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
            refresh_token: refreshToken
        });
    }
    catch (error) {
        console.error('Login error:', error);
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
        console.error('Get profile error:', error);
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
        const { refresh_token } = req.body;
        if (!refresh_token) {
            res.status(400).json({
                error: 'Missing refresh token',
                message: 'Refresh token is required'
            });
            return;
        }
        // Verify refresh token (using same verifyToken function)
        const { verifyToken } = await Promise.resolve().then(() => __importStar(require('../utils/auth.utils')));
        const decoded = verifyToken(refresh_token);
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
            refresh_token: newRefreshToken
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
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
        console.error('Forgot password error:', error);
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
        if (!(0, auth_utils_1.isValidPassword)(new_password)) {
            res.status(422).json({
                error: 'Weak password',
                message: 'Password must be at least 8 characters long and contain letters and numbers'
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
        console.log(`Password reset successful for user: ${user.email}`);
        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Reset failed',
            message: 'An error occurred while resetting your password'
        });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=auth.controller.js.map