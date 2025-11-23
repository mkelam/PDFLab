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
export declare function sanitizeText(input: string | undefined | null): string;
/**
 * Sanitize rich text input (allows safe HTML tags only)
 * Use for: feedback messages, descriptions, comments
 */
export declare function sanitizeRichText(input: string | undefined | null): string;
/**
 * Sanitize array of strings
 */
export declare function sanitizeArray(input: string[] | undefined | null): string[];
/**
 * Sanitize object with string values
 */
export declare function sanitizeObject<T extends Record<string, any>>(input: T, fields: (keyof T)[]): T;
//# sourceMappingURL=sanitize.utils.d.ts.map