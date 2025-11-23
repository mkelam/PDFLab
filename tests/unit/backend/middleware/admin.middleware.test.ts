import { Request, Response, NextFunction } from 'express'
import {
  requireAdmin,
  requireRole,
  requirePermission,
  hasPermission,
  isAdmin,
  PERMISSIONS,
} from '@backend/middleware/admin.middleware'
import { UserRole } from '@backend/models'

/**
 * Unit Tests: Admin Middleware
 *
 * Tests: requireAdmin, requireRole, requirePermission, hasPermission, isAdmin
 * Coverage: 100%
 */

describe('Admin Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFunction = jest.fn()
    jest.clearAllMocks()
  })

  describe('requireAdmin', () => {
    it('should reject unauthenticated users', async () => {
      mockRequest.user = undefined

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject regular users', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Admin access required',
        current_role: 'user',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow support role', async () => {
      mockRequest.user = {
        id: 'support-123',
        email: 'support@example.com',
        role: UserRole.SUPPORT,
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow finance role', async () => {
      mockRequest.user = {
        id: 'finance-123',
        email: 'finance@example.com',
        role: UserRole.FINANCE,
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow admin role', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow super_admin role', async () => {
      mockRequest.user = {
        id: 'superadmin-123',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockRequest.user = {
        get role() {
          throw new Error('Database error')
        },
      } as any

      await requireAdmin(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization failed',
        message: 'An error occurred during authorization',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requireRole', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requireRole(UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow users with required role', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as any
      const middleware = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users without required role', () => {
      mockRequest.user = {
        id: 'support-123',
        email: 'support@example.com',
        role: UserRole.SUPPORT,
      } as any
      const middleware = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${UserRole.ADMIN}, ${UserRole.SUPER_ADMIN}`,
        current_role: UserRole.SUPPORT,
        required_roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow any role in the list', () => {
      mockRequest.user = {
        id: 'finance-123',
        email: 'finance@example.com',
        role: UserRole.FINANCE,
      } as any
      const middleware = requireRole(UserRole.FINANCE, UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      mockRequest.user = {
        get role() {
          throw new Error('Database error')
        },
      } as any
      const middleware = requireRole(UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization failed',
        message: 'An error occurred during role verification',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requirePermission', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow users with required permission', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as any
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users without required permission', () => {
      mockRequest.user = {
        id: 'support-123',
        email: 'support@example.com',
        role: UserRole.SUPPORT,
      } as any
      const middleware = requirePermission('users.delete')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions for: users.delete',
        current_role: UserRole.SUPPORT,
        required_permission: 'users.delete',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow super_admin for all permissions', () => {
      mockRequest.user = {
        id: 'superadmin-123',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
      } as any

      // Test all permissions
      const permissions: (keyof typeof PERMISSIONS)[] = [
        'admin.access',
        'users.view',
        'users.edit',
        'users.delete',
        'conversions.view',
        'payments.view',
        'system.configure',
      ]

      permissions.forEach((permission) => {
        jest.clearAllMocks()
        const middleware = requirePermission(permission)
        middleware(mockRequest as Request, mockResponse as Response, nextFunction)
        expect(nextFunction).toHaveBeenCalled()
      })
    })

    it('should allow finance role to view payments', () => {
      mockRequest.user = {
        id: 'finance-123',
        email: 'finance@example.com',
        role: UserRole.FINANCE,
      } as any
      const middleware = requirePermission('payments.view')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
    })

    it('should reject finance role from editing users', () => {
      mockRequest.user = {
        id: 'finance-123',
        email: 'finance@example.com',
        role: UserRole.FINANCE,
      } as any
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      mockRequest.user = {
        get role() {
          throw new Error('Database error')
        },
      } as any
      const middleware = requirePermission('users.view')

      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('hasPermission helper', () => {
    it('should return true when user has permission', () => {
      const adminUser = {
        role: UserRole.ADMIN,
      } as any

      expect(hasPermission(adminUser, 'users.edit')).toBe(true)
    })

    it('should return false when user lacks permission', () => {
      const supportUser = {
        role: UserRole.SUPPORT,
      } as any

      expect(hasPermission(supportUser, 'users.delete')).toBe(false)
    })

    it('should return true for super_admin on all permissions', () => {
      const superAdminUser = {
        role: UserRole.SUPER_ADMIN,
      } as any

      const permissions: (keyof typeof PERMISSIONS)[] = [
        'admin.access',
        'users.view',
        'users.edit',
        'users.delete',
        'system.configure',
      ]

      permissions.forEach((permission) => {
        expect(hasPermission(superAdminUser, permission)).toBe(true)
      })
    })

    it('should check feedback permissions correctly', () => {
      const supportUser = { role: UserRole.SUPPORT } as any
      const financeUser = { role: UserRole.FINANCE } as any

      expect(hasPermission(supportUser, 'feedback.view')).toBe(true)
      expect(hasPermission(supportUser, 'feedback.manage')).toBe(true)
      expect(hasPermission(supportUser, 'feedback.delete')).toBe(false)

      expect(hasPermission(financeUser, 'feedback.view')).toBe(false)
    })
  })

  describe('isAdmin helper', () => {
    it('should return true for support role', () => {
      const supportUser = { role: UserRole.SUPPORT } as any
      expect(isAdmin(supportUser)).toBe(true)
    })

    it('should return true for finance role', () => {
      const financeUser = { role: UserRole.FINANCE } as any
      expect(isAdmin(financeUser)).toBe(true)
    })

    it('should return true for admin role', () => {
      const adminUser = { role: UserRole.ADMIN } as any
      expect(isAdmin(adminUser)).toBe(true)
    })

    it('should return true for super_admin role', () => {
      const superAdminUser = { role: UserRole.SUPER_ADMIN } as any
      expect(isAdmin(superAdminUser)).toBe(true)
    })

    it('should return false for regular user', () => {
      const regularUser = { role: 'user' } as any
      expect(isAdmin(regularUser)).toBe(false)
    })

    it('should return false for partner_admin', () => {
      const partnerAdmin = { role: 'partner_admin' } as any
      expect(isAdmin(partnerAdmin)).toBe(false)
    })
  })

  describe('PERMISSIONS matrix', () => {
    it('should have correct permissions for admin.access', () => {
      expect(PERMISSIONS['admin.access']).toEqual([
        UserRole.SUPPORT,
        UserRole.FINANCE,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ])
    })

    it('should have correct permissions for users.delete', () => {
      expect(PERMISSIONS['users.delete']).toEqual([UserRole.SUPER_ADMIN])
    })

    it('should have correct permissions for payments.view', () => {
      expect(PERMISSIONS['payments.view']).toEqual([
        UserRole.FINANCE,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ])
    })

    it('should have correct permissions for system.configure', () => {
      expect(PERMISSIONS['system.configure']).toEqual([UserRole.SUPER_ADMIN])
    })
  })
})
