export interface JWTPayload {
    userId: string;
    email: string;
    plan: string;
}
/**
 * Hash a plain text password
 */
export declare const hashPassword: (password: string) => Promise<string>;
/**
 * Verify password against hash
 */
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
/**
 * Generate JWT access token
 */
export declare const generateAccessToken: (payload: JWTPayload | any, expiresIn?: string) => string;
/**
 * Generate JWT refresh token
 */
export declare const generateRefreshToken: (payload: JWTPayload) => string;
/**
 * Generate password reset token (expires in 1 hour)
 */
export declare const generatePasswordResetToken: (payload: JWTPayload) => string;
/**
 * Verify and decode JWT token
 */
export declare const verifyToken: (token: string) => JWTPayload | null;
/**
 * Validate email format
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Validate password strength
 * Requirements: min 8 characters, at least one letter and one number
 */
export declare const isValidPassword: (password: string) => boolean;
//# sourceMappingURL=auth.utils.d.ts.map