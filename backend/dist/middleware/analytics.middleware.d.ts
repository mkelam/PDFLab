import { Request, Response, NextFunction } from 'express';
/**
 * Analytics Middleware
 * Tracks user behavior and conversion funnel metrics
 * In production, this would send events to analytics services (Google Analytics, Mixpanel, etc.)
 * For now, logs events to console with structured format for easy parsing
 */
export interface AnalyticsEvent {
    timestamp: Date;
    event: string;
    userId?: string;
    guestSessionId?: string;
    isGuest: boolean;
    properties?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
/**
 * Track guest conversion funnel events
 */
export declare const trackGuestConversion: (eventName: string) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Track signup events (conversion from guest to registered user)
 */
export declare const trackSignup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Track file upload events
 */
export declare const trackUpload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Track download events
 */
export declare const trackDownload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Track guest quota reached events
 */
export declare const trackQuotaReached: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get analytics summary (for admin dashboard)
 */
export declare function getAnalyticsSummary(): Promise<{
    totalEvents: number;
    guestUploads: number;
    guestDownloads: number;
    userSignups: number;
    guestConversions: number;
    conversionRate: number;
}>;
//# sourceMappingURL=analytics.middleware.d.ts.map