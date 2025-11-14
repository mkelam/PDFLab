"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.hasPermission = exports.requirePermission = exports.requireRole = exports.requireAdmin = exports.PERMISSIONS = void 0;
const models_1 = require("../models");
/**
 * Permission matrix defining which roles can access which resources
 */
exports.PERMISSIONS = {
    'admin.access': [models_1.UserRole.SUPPORT, models_1.UserRole.FINANCE, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'users.view': [models_1.UserRole.SUPPORT, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'users.edit': [models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'users.delete': [models_1.UserRole.SUPER_ADMIN],
    'conversions.view': [models_1.UserRole.SUPPORT, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'conversions.manage': [models_1.UserRole.SUPPORT, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'payments.view': [models_1.UserRole.FINANCE, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'payments.manage': [models_1.UserRole.FINANCE, models_1.UserRole.SUPER_ADMIN],
    'system.view': [models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'system.configure': [models_1.UserRole.SUPER_ADMIN],
    'audit.view': [models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'feedback.view': [models_1.UserRole.SUPPORT, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'feedback.manage': [models_1.UserRole.SUPPORT, models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN],
    'feedback.delete': [models_1.UserRole.ADMIN, models_1.UserRole.SUPER_ADMIN]
};
/**
 * Middleware to require any admin role (support, finance, admin, or super_admin)
 */
const requireAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
            return;
        }
        // Check if user has any admin role
        const adminRoles = [
            models_1.UserRole.SUPPORT,
            models_1.UserRole.FINANCE,
            models_1.UserRole.ADMIN,
            models_1.UserRole.SUPER_ADMIN
        ];
        if (!adminRoles.includes(user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required',
                current_role: user.role
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            error: 'Authorization failed',
            message: 'An error occurred during authorization'
        });
    }
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to require specific admin role(s)
 * Usage: requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
                return;
            }
            if (!allowedRoles.includes(user.role)) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
                    current_role: user.role,
                    required_roles: allowedRoles
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                error: 'Authorization failed',
                message: 'An error occurred during role verification'
            });
        }
    };
};
exports.requireRole = requireRole;
/**
 * Middleware to check if user has specific permission
 * Usage: requirePermission('users.edit')
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
                return;
            }
            const allowedRoles = exports.PERMISSIONS[permission];
            if (!allowedRoles.includes(user.role)) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: `Insufficient permissions for: ${permission}`,
                    current_role: user.role,
                    required_permission: permission
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                error: 'Authorization failed',
                message: 'An error occurred during permission verification'
            });
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Helper function to check if a user has a specific permission
 * (for use outside middleware)
 */
const hasPermission = (user, permission) => {
    const allowedRoles = exports.PERMISSIONS[permission];
    return allowedRoles.includes(user.role);
};
exports.hasPermission = hasPermission;
/**
 * Helper function to check if a user has admin access
 */
const isAdmin = (user) => {
    const adminRoles = [
        models_1.UserRole.SUPPORT,
        models_1.UserRole.FINANCE,
        models_1.UserRole.ADMIN,
        models_1.UserRole.SUPER_ADMIN
    ];
    return adminRoles.includes(user.role);
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=admin.middleware.js.map