import { Request, Response, NextFunction } from 'express'
import { User, UserRole } from '../models'

/**
 * Permission matrix defining which roles can access which resources
 */
export const PERMISSIONS = {
  'admin.access': [UserRole.SUPPORT, UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'users.view': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'users.edit': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'users.delete': [UserRole.SUPER_ADMIN],
  'conversions.view': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'conversions.manage': [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'payments.view': [UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'payments.manage': [UserRole.FINANCE, UserRole.SUPER_ADMIN],
  'system.view': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  'system.configure': [UserRole.SUPER_ADMIN],
  'audit.view': [UserRole.ADMIN, UserRole.SUPER_ADMIN]
} as const

/**
 * Middleware to require any admin role (support, finance, admin, or super_admin)
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      return
    }

    // Check if user has any admin role
    const adminRoles: UserRole[] = [
      UserRole.SUPPORT,
      UserRole.FINANCE,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN
    ]

    if (!adminRoles.includes(user.role as UserRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
        current_role: user.role
      })
      return
    }

    next()
  } catch (error) {
    console.error('Admin middleware error:', error)
    res.status(500).json({
      error: 'Authorization failed',
      message: 'An error occurred during authorization'
    })
  }
}

/**
 * Middleware to require specific admin role(s)
 * Usage: requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
        return
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        res.status(403).json({
          error: 'Forbidden',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          current_role: user.role,
          required_roles: allowedRoles
        })
        return
      }

      next()
    } catch (error) {
      console.error('Role check error:', error)
      res.status(500).json({
        error: 'Authorization failed',
        message: 'An error occurred during role verification'
      })
    }
  }
}

/**
 * Middleware to check if user has specific permission
 * Usage: requirePermission('users.edit')
 */
export const requirePermission = (permission: keyof typeof PERMISSIONS) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
        return
      }

      const allowedRoles = PERMISSIONS[permission]

      if (!(allowedRoles as readonly UserRole[]).includes(user.role as UserRole)) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions for: ${permission}`,
          current_role: user.role,
          required_permission: permission
        })
        return
      }

      next()
    } catch (error) {
      console.error('Permission check error:', error)
      res.status(500).json({
        error: 'Authorization failed',
        message: 'An error occurred during permission verification'
      })
    }
  }
}

/**
 * Helper function to check if a user has a specific permission
 * (for use outside middleware)
 */
export const hasPermission = (user: User, permission: keyof typeof PERMISSIONS): boolean => {
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly UserRole[]).includes(user.role as UserRole)
}

/**
 * Helper function to check if a user has admin access
 */
export const isAdmin = (user: User): boolean => {
  const adminRoles: UserRole[] = [
    UserRole.SUPPORT,
    UserRole.FINANCE,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ]
  return adminRoles.includes(user.role as UserRole)
}
