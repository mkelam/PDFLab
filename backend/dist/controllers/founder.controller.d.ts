import { Request, Response } from 'express';
/**
 * Get founder challenge progress for authenticated user
 */
export declare const getProgress: (req: Request, res: Response) => Promise<void>;
/**
 * Submit founder feedback form
 */
export declare const submitFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * Increment founder conversion count (called internally after successful conversion)
 */
export declare const incrementConversionCount: (userId: string) => Promise<{
    earned: boolean;
    count: number;
}>;
/**
 * Check and expire founders whose deadline has passed (cron job)
 */
export declare const checkAndExpireFounders: (_req?: Request, res?: Response) => Promise<void>;
/**
 * Get founder edition stats (admin only)
 */
export declare const getFounderStats: (req: Request, res: Response) => Promise<void>;
/**
 * Get remaining founder spots (public endpoint for landing page counter)
 */
export declare const getSpotsRemaining: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=founder.controller.d.ts.map