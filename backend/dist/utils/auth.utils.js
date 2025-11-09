"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPassword = exports.isValidEmail = exports.verifyToken = exports.generatePasswordResetToken = exports.generateRefreshToken = exports.generateAccessToken = exports.verifyPassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-this-in-production';
const JWT_EXPIRATION = process.env['JWT_EXPIRATION'] || '7d';
const JWT_REFRESH_EXPIRATION = process.env['JWT_REFRESH_EXPIRATION'] || '30d';
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
 * Requirements: min 8 characters, at least one letter and one number
 */
const isValidPassword = (password) => {
    if (password.length < 8)
        return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
};
exports.isValidPassword = isValidPassword;
//# sourceMappingURL=auth.utils.js.map