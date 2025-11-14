import { Request, Response } from 'express';
/**
 * POST /api/feedback
 * Submit new feedback (public endpoint - guests and authenticated users)
 */
export declare const submitFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/feedback
 * Get all feedback with filtering, search, and pagination (admin only)
 */
export declare const getAllFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/feedback/stats
 * Get feedback statistics (admin only)
 */
export declare const getFeedbackStats: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/feedback/:id
 * Get single feedback by ID (admin only)
 */
export declare const getFeedbackById: (req: Request, res: Response) => Promise<void>;
/**
 * PATCH /api/admin/feedback/:id/status
 * Update feedback status (admin only)
 */
export declare const updateFeedbackStatus: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/feedback/:id/reply
 * Reply to feedback (admin only)
 */
export declare const replyToFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/feedback/:id
 * Delete feedback (admin only)
 */
export declare const deleteFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/feedback/bulk-update
 * Bulk update feedback status (admin only)
 */
export declare const bulkUpdateFeedback: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/feedback/bulk-delete
 * Bulk delete feedback (admin only)
 */
export declare const bulkDeleteFeedback: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=feedback.controller.d.ts.map