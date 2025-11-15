import { Request, Response } from 'express';
/**
 * Submit partner application (PUBLIC)
 * POST /api/partner-applications/submit
 */
export declare const submitApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all partner applications (ADMIN ONLY)
 * GET /api/partner-applications
 */
export declare const getApplications: (req: Request, res: Response) => Promise<void>;
/**
 * Get single application details (ADMIN ONLY)
 * GET /api/partner-applications/:id
 */
export declare const getApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Approve partner application (ADMIN ONLY)
 * POST /api/partner-applications/:id/approve
 */
export declare const approveApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Reject partner application (ADMIN ONLY)
 * POST /api/partner-applications/:id/reject
 */
export declare const rejectApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Flag application for review (ADMIN ONLY)
 * POST /api/partner-applications/:id/flag
 */
export declare const flagApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=partnerApplication.controller.d.ts.map