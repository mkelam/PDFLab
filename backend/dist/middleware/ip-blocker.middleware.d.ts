import { Request, Response, NextFunction } from 'express';
/**
 * IP Blocker Middleware
 * Checks if incoming request is from a blocked IP
 */
export declare const ipBlockerMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=ip-blocker.middleware.d.ts.map