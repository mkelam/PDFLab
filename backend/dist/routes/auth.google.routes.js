"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
// Check if Google OAuth is configured
const isGoogleOAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// Middleware to check if Google OAuth is available
const requireGoogleOAuth = (req, res, next) => {
    if (!isGoogleOAuthConfigured) {
        logger_1.default.warn('Google OAuth route accessed but not configured');
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Google OAuth is not configured on this server'
        });
        return;
    }
    next();
};
// Google OAuth login
router.get('/auth/google', requireGoogleOAuth, (req, res, next) => {
    logger_1.default.debug('Google OAuth: Login route accessed');
    next();
}, passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false }));
// Google OAuth callback
router.get('/auth/google/callback', requireGoogleOAuth, passport_1.default.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }), (req, res) => {
    const user = req.user;
    if (!user) {
        logger_1.default.error('Google OAuth callback: No user in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
    }
    logger_1.default.info('Google OAuth: User authenticated', { email: user.email, userId: user.id });
    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const jwtExpiration = process.env.JWT_EXPIRATION || '15m';
    const jwtRefreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '30d';
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiration });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: jwtRefreshExpiration });
    // Update last login
    user.last_login = new Date();
    user.save();
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    logger_1.default.debug('Google OAuth: Redirecting to frontend', { frontendUrl });
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`);
});
exports.default = router;
//# sourceMappingURL=auth.google.routes.js.map