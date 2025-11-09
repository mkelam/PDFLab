import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to automatically log all admin actions
 * Should be applied after auth and admin middleware
 */
export declare const auditLogMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit.middleware.d.ts.map