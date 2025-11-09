import { Request, Response, NextFunction } from 'express';
/**
 * Guest session middleware
 * Handles guest session creation and validation
 * Works alongside auth middleware to support both authenticated and guest users
 */
declare global {
    namespace Express {
        interface Request {
            guestSession?: {
                sessionId: string;
                createdAt: Date;
                conversionsUsed: number;
                lastConversionAt?: Date;
                ipAddress: string;
            };
            isGuest?: boolean;
        }
    }
}
/**
 * Get client IP address from request
 */
declare function getClientIp(req: Request): string;
/**
 * Initialize guest session
 * Creates or retrieves guest session from cookie
 */
export declare const initializeGuestSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Validate guest conversion quota
 * Checks if guest can perform a conversion
 */
export declare const validateGuestQuota: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Record guest conversion
 * Increments conversion count for guest session and IP
 */
export declare const recordGuestConversion: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Require authentication or guest session
 * Allows endpoint to be accessed by both authenticated users and guests
 */
export declare const authOrGuest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { getClientIp };
//# sourceMappingURL=guest.middleware.d.ts.map