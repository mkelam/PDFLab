import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models';
/**
 * Permission matrix defining which roles can access which resources
 */
export declare const PERMISSIONS: {
    readonly 'admin.access': readonly [UserRole.SUPPORT, UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'users.view': readonly [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'users.edit': readonly [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'users.delete': readonly [UserRole.SUPER_ADMIN];
    readonly 'conversions.view': readonly [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'conversions.manage': readonly [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'payments.view': readonly [UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'payments.manage': readonly [UserRole.FINANCE, UserRole.SUPER_ADMIN];
    readonly 'system.view': readonly [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    readonly 'system.configure': readonly [UserRole.SUPER_ADMIN];
    readonly 'audit.view': readonly [UserRole.ADMIN, UserRole.SUPER_ADMIN];
};
/**
 * Middleware to require any admin role (support, finance, admin, or super_admin)
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to require specific admin role(s)
 * Usage: requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 */
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user has specific permission
 * Usage: requirePermission('users.edit')
 */
export declare const requirePermission: (permission: keyof typeof PERMISSIONS) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Helper function to check if a user has a specific permission
 * (for use outside middleware)
 */
export declare const hasPermission: (user: User, permission: keyof typeof PERMISSIONS) => boolean;
/**
 * Helper function to check if a user has admin access
 */
export declare const isAdmin: (user: User) => boolean;
//# sourceMappingURL=admin.middleware.d.ts.map