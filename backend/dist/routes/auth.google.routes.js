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
const express_1 = require("express");
const passport_1 = __importStar(require("../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Google OAuth login
router.get('/auth/google', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!passport_1.isGoogleOAuthConfigured) {
        console.warn('[Google Routes] Google OAuth not configured');
        res.status(503).json({
            error: 'Google OAuth not configured',
            message: 'Google login is not available. Please use email/password login or contact support.'
        });
        return;
    }
    console.log('[Google Routes] /auth/google route accessed');
    console.log('[Google Routes] Redirecting to Google OAuth...');
    next();
}, (req, res, next) => {
    // Only call passport.authenticate if Google OAuth is configured
    if (passport_1.isGoogleOAuthConfigured) {
        passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
    }
});
// Google OAuth callback
router.get('/auth/google/callback', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!passport_1.isGoogleOAuthConfigured) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/login?error=google_not_configured`);
        return;
    }
    // Call passport authenticate
    passport_1.default.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
    })(req, res, next);
}, (req, res) => {
    console.log('[Google Routes] Callback route hit');
    const user = req.user;
    if (!user) {
        console.error('[Google Routes] ERROR: No user in request');
        res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
        return;
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