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
 * Requirements:
 * - Minimum 10 characters (NIST recommends at least 8, we use 10 for better security)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a commonly used password
 */
export declare const isValidPassword: (password: string) => {
    valid: boolean;
    errors: string[];
};
/**
 * Legacy password validation (simple check for backwards compatibility)
 * @deprecated Use isValidPassword() which returns detailed errors
 */
export declare const isPasswordValid: (password: string) => boolean;
/**
 * Hash a refresh token for secure storage
 * We store the hash, not the raw token, in the database
 */
export declare const hashRefreshToken: (token: string) => string;
/**
 * Generate a new refresh token with server-side storage support
 * Returns both the JWT token (to send to client) and the hash (to store in DB)
 */
export declare const generateRefreshTokenWithStorage: (payload: JWTPayload, familyId?: string) => {
    token: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
};
/**
 * Verify refresh token and extract payload including family ID
 */
export declare const verifyRefreshToken: (token: string) => (JWTPayload & {
    familyId?: string;
    type?: string;
}) | null;
//# sourceMappingURL=auth.utils.d.ts.map