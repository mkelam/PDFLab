"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Google OAuth login
router.get('/auth/google', (req, res, next) => {
    console.log('[Google Routes] /auth/google route accessed');
    console.log('[Google Routes] Redirecting to Google OAuth...');
    next();
}, passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false }));
// Google OAuth callback
router.get('/auth/google/callback', passport_1.default.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }), (req, res) => {
    console.log('[Google Routes] Callback route hit');
    const user = req.user;
    if (!user) {
        console.error('[Google Routes] ERROR: No user in request');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
    }
    console.log('[Google Routes] User authenticated:', user.email);
    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const jwtExpiration = process.env.JWT_EXPIRATION || '15m';
    const jwtRefreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '30d';
    console.log('[Google Routes] Generating JWT tokens');
    const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiration });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: jwtRefreshExpiration });
    console.log('[Google Routes] Tokens generated successfully');
    // Update last login
    user.last_login = new Date();
    user.save();
    console.log('[Google Routes] Last login updated');
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('[Google Routes] Redirecting to:', `${frontendUrl}/auth/callback`);
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`);
});
exports.default = router;
//# sourceMappingURL=auth.google.routes.js.map