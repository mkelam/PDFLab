import { Request, Response } from 'express';
/**
 * Get user profile
 * @route GET /api/profile
 */
export declare const getProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Update user profile
 * @route PUT /api/profile
 */
export declare const updateProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Change password
 * @route PUT /api/profile/password
 */
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
/**
 * Delete account
 * @route DELETE /api/profile
 */
export declare const deleteAccount: (req: Request, res: Response) => Promise<void>;
/**
 * Get account statistics
 * @route GET /api/profile/stats
 */
export declare const getAccountStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map