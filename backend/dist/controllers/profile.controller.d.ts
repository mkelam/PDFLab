import { Request, Response } from 'express';
/**
 * Get user profile
 * @route GET /api/profile
 */
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Update user profile
 * @route PUT /api/profile
 */
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Change password
 * @route PUT /api/profile/password
 */
export declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Delete account
 * @route DELETE /api/profile
 */
export declare const deleteAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Get account statistics
 * @route GET /api/profile/stats
 */
export declare const getAccountStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=profile.controller.d.ts.map