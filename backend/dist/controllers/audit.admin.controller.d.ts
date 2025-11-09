import { Request, Response } from 'express';
/**
 * Get all audit logs with filters
 * GET /api/admin/audit-logs
 */
export declare const getAllAuditLogs: (req: Request, res: Response) => Promise<void>;
/**
 * Get audit log by ID
 * GET /api/admin/audit-logs/:id
 */
export declare const getAuditLogById: (req: Request, res: Response) => Promise<void>;
/**
 * Get security events
 * GET /api/admin/audit-logs/security-events
 */
export declare const getSecurityEvents: (req: Request, res: Response) => Promise<void>;
/**
 * Get audit log statistics
 * GET /api/admin/audit-logs/stats
 */
export declare const getAuditLogStats: (req: Request, res: Response) => Promise<void>;
/**
 * Get user activity for GDPR compliance
 * GET /api/admin/audit-logs/user-activity/:user_id
 */
export declare const getUserActivity: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=audit.admin.controller.d.ts.map