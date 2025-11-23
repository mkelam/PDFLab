"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeText = sanitizeText;
exports.sanitizeRichText = sanitizeRichText;
exports.sanitizeArray = sanitizeArray;
exports.sanitizeObject = sanitizeObject;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
/**
 * Sanitization utilities for preventing XSS attacks
 *
 * Usage:
 * - sanitizeText(): For plain text fields (name, email, etc.)
 * - sanitizeRichText(): For rich text fields (comments, descriptions)
 */
/**
 * Sanitize plain text input (removes ALL HTML tags)
 * Use for: names, emails, short text fields
 */
function sanitizeText(input) {
    if (!input)
        return '';
    return (0, sanitize_html_1.default)(input, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
    }).trim();
}
/**
 * Sanitize rich text input (allows safe HTML tags only)
 * Use for: feedback messages, descriptions, comments
 */
function sanitizeRichText(input) {
    if (!input)
        return '';
    return (0, sanitize_html_1.default)(input, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        allowedAttributes: {
            'a': ['href']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        disallowedTagsMode: 'discard'
    }).trim();
}
/**
 * Sanitize array of strings
 */
function sanitizeArray(input) {
    if (!input || !Array.isArray(input))
        return [];
    return input.map(item => sanitizeText(item)).filter(item => item.length > 0);
}
/**
 * Sanitize object with string values
 */
function sanitizeObject(input, fields) {
    const sanitized = { ...input };
    for (const field of fields) {
        if (typeof sanitized[field] === 'string') {
            sanitized[field] = sanitizeText(sanitized[field]);
        }
    }
    return sanitized;
}
//# sourceMappingURL=sanitize.utils.js.map