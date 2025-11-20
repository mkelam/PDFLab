"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// LinkedIn OAuth login
router.get('/auth/linkedin', passport_1.default.authenticate('linkedin', { session: false }));
// LinkedIn OAuth callback
router.get('/auth/linkedin/callback', passport_1.default.authenticate('linkedin', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed` }), (req, res) => {
    const user = req.user;
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
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`);
});
exports.default = router;
//# sourceMappingURL=auth.linkedin.routes.js.map