import { Request, Response, NextFunction } from 'express';
/**
 * HTTP Request Metrics Middleware
 *
 * Tracks duration and status of all HTTP requests.
 */
export declare function metricsMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Metrics Error Handler
 *
 * Optional: Catches and records errors that occur during request processing.
 * Use this after all other middleware/routes for complete error tracking.
 */
export declare function metricsErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=metrics.middleware.d.ts.map