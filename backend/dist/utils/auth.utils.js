"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshTokenWithStorage = exports.hashRefreshToken = exports.isPasswordValid = exports.isValidPassword = exports.isValidEmail = exports.verifyToken = exports.generatePasswordResetToken = exports.generateRefreshToken = exports.generateAccessToken = exports.verifyPassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Lazy logger import to avoid circular dependencies during startup
const getLogger = () => {
    try {
        return require('../config/logger').default;
    }
    catch {
        return console; // Fallback to console if logger not available
    }
};
const SALT_ROUNDS = 12;
// JWT_SECRET validation - fail fast in production if missing or weak
const JWT_SECRET_RAW = process.env['JWT_SECRET'];
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
if (!JWT_SECRET_RAW) {
    if (IS_PRODUCTION) {
        throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production');
    }
    getLogger().warn('JWT_SECRET not set - using insecure default for development only');
}
if (JWT_SECRET_RAW && JWT_SECRET_RAW.length < 32) {
    if (IS_PRODUCTION) {
        throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters in production');
    }
    getLogger().warn('JWT_SECRET is too short - use at least 32 characters for security');
}
// Use configured secret or development fallback (NEVER use fallback in production due to above checks)
const JWT_SECRET = JWT_SECRET_RAW || 'INSECURE_DEV_SECRET_DO_NOT_USE_IN_PRODUCTION';
const JWT_EXPIRATION = process.env['JWT_EXPIRATION'] || '15m'; // Short-lived access token (15 minutes)
const JWT_REFRESH_EXPIRATION = process.env['JWT_REFRESH_EXPIRATION'] || '30d'; // Long-lived refresh token (30 days)
/**
 * Hash a plain text password
 */
const hashPassword = async (password) => {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
    return bcrypt_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
/**
 * Generate JWT access token
 */
const generateAccessToken = (payload, expiresIn) => {
    const options = {
        expiresIn: (expiresIn || JWT_EXPIRATION)
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
    const options = {
        expiresIn: JWT_REFRESH_EXPIRATION
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, options);
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate password reset token (expires in 1 hour)
 */
const generatePasswordResetToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
};
exports.generatePasswordResetToken = generatePasswordResetToken;
/**
 * Verify and decode JWT token
 */
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Validate password strength
 * Requirements:
 * - Minimum 10 characters (NIST recommends at least 8, we use 10 for better security)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a commonly used password
 */
const isValidPassword = (password) => {
    const errors = [];
    if (password.length < 10) {
        errors.push('Password must be at least 10 characters long');
    }
    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
    }
    // Check for common passwords (basic list - expand in production)
    const commonPasswords = [
        'password123', 'qwerty123', '123456789', 'letmein123', 'welcome123',
        'admin123', 'password1', 'Password1!', 'Password123!', 'Passw0rd!'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more unique password');
    }
    return { valid: errors.length === 0, errors };
};
exports.isValidPassword = isValidPassword;
/**
 * Legacy password validation (simple check for backwards compatibility)
 * @deprecated Use isValidPassword() which returns detailed errors
 */
const isPasswordValid = (password) => {
    return (0, exports.isValidPassword)(password).valid;
};
exports.isPasswordValid = isPasswordValid;
// ============================================================================
// REFRESH TOKEN MANAGEMENT (Server-Side Storage)
// ============================================================================
/**
 * Hash a refresh token for secure storage
 * We store the hash, not the raw token, in the database
 */
const hashRefreshToken = (token) => {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
};
exports.hashRefreshToken = hashRefreshToken;
/**
 * Generate a new refresh token with server-side storage support
 * Returns both the JWT token (to send to client) and the hash (to store in DB)
 */
const generateRefreshTokenWithStorage = (payload, familyId) => {
    // Generate or use existing family ID
    const tokenFamilyId = familyId || (0, uuid_1.v4)();
    // Create JWT with family ID embedded
    const options = {
        expiresIn: JWT_REFRESH_EXPIRATION
    };
    const token = jsonwebtoken_1.default.sign({ ...payload, familyId: tokenFamilyId, type: 'refresh' }, JWT_SECRET, options);
    // Calculate expiration date
    const expiresAt = new Date();
    const expirationMs = typeof JWT_REFRESH_EXPIRATION === 'string'
        ? parseExpirationString(JWT_REFRESH_EXPIRATION)
        : JWT_REFRESH_EXPIRATION * 1000;
    expiresAt.setTime(expiresAt.getTime() + expirationMs);
    return {
        token,
        tokenHash: (0, exports.hashRefreshToken)(token),
        familyId: tokenFamilyId,
        expiresAt
    };
};
exports.generateRefreshTokenWithStorage = generateRefreshTokenWithStorage;
/**
 * Parse expiration string like '30d' or '7d' into milliseconds
 */
const parseExpirationString = (expiration) => {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
        return 30 * 24 * 60 * 60 * 1000; // Default: 30 days
    }
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 30 * 24 * 60 * 60 * 1000;
    }
};
/**
 * Verify refresh token and extract payload including family ID
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify this is actually a refresh token
        if (decoded.type !== 'refresh') {
            return null;
        }
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=auth.utils.js.map