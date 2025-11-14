import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
declare global {
    namespace Express {
        interface Request {
            user?: User;
            userId?: string;
            userPlan?: string;
            userRole?: string;
        }
    }
}
/**
 * Middleware to authenticate JWT token
 */
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check if user has reached conversion limit
 * Skips check for guest users (they have separate quota check via guest middleware)
 */
export declare const checkConversionQuota: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require specific plan
 */
export declare const requirePlan: (...requiredPlans: string[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map