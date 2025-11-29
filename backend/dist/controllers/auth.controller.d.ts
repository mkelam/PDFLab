import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
/**
 * Login user
 */
export declare const login: (req: Request, res: Response) => Promise<void>;
/**
 * Get current user profile
 */
export declare const getProfile: (req: Request, res: Response) => Promise<void>;
/**
 * Refresh access token
 */
export declare const refreshToken: (req: Request, res: Response) => Promise<void>;
/**
 * Request password reset
 */
export declare const forgotPassword: (req: Request, res: Response) => Promise<void>;
/**
 * Reset password with token
 */
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map