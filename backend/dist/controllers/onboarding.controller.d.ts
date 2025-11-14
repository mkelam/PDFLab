import { Request, Response } from 'express';
/**
 * Get user's onboarding progress
 * GET /api/onboarding/progress
 */
export declare const getOnboardingProgress: (req: Request, res: Response) => Promise<void>;
/**
 * Update onboarding progress
 * POST /api/onboarding/update
 * Body: { tour_step?, first_conversion?, wizard_step?, template_used? }
 */
export declare const updateOnboardingProgress: (req: Request, res: Response) => Promise<void>;
/**
 * Mark onboarding as completed
 * POST /api/onboarding/complete
 */
export declare const completeOnboarding: (req: Request, res: Response) => Promise<void>;
/**
 * Skip onboarding
 * POST /api/onboarding/skip
 */
export declare const skipOnboarding: (req: Request, res: Response) => Promise<void>;
/**
 * Get all active onboarding templates
 * GET /api/onboarding/templates
 */
export declare const getOnboardingTemplates: (req: Request, res: Response) => Promise<void>;
/**
 * Convert a sample template to specified format
 * POST /api/onboarding/templates/:id/convert
 * Body: { output_format: 'pptx' | 'docx' | 'xlsx' | 'png' }
 */
export declare const convertSampleTemplate: (req: Request, res: Response) => Promise<void>;
/**
 * Get onboarding analytics (admin only)
 * GET /api/onboarding/analytics
 */
export declare const getOnboardingAnalytics: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=onboarding.controller.d.ts.map