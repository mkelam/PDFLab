import { Request, Response, NextFunction } from 'express'
import {
  requireAdmin,
  requireRole,
  requirePermission,
  hasPermission,
  isAdmin,
  PERMISSIONS
} from '../../../src/middleware/admin.middleware'
import { User, UserRole } from '../../../src/models'
import logger from '../../../src/config/logger'

// Mock dependencies
jest.mock('../../../src/config/logger')

describe('Admin Middleware Tests', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      user: undefined
    }

    // Setup mock response
    const jsonMock = jest.fn()
    const statusMock = jest.fn(() => mockResponse)
    mockResponse = {
      status: statusMock as any,
      json: jsonMock
    }

    // Setup mock next
    mockNext = jest.fn()
  })

  // ============================================================================
  // requireAdmin
  // ============================================================================

  describe('requireAdmin', () => {
    it('should reject requests without authenticated user', async () => {
      mockRequest.user = undefined

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject regular users', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER
      } as User

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Admin access required',
        current_role: UserRole.USER
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow support role', async () => {
      mockRequest.user = {
        id: 'support-123',
        email: 'support@example.com',
        role: UserRole.SUPPORT
      } as User

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow finance role', async () => {
      mockRequest.user = {
        id: 'finance-123',
        email: 'finance@example.com',
        role: UserRole.FINANCE
      } as User

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow admin role', async () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      } as User

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow super_admin role', async () => {
      mockRequest.user = {
        id: 'superadmin-123',
        email: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN
      } as User

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      // Create a user object that throws when accessing role
      Object.defineProperty(mockRequest, 'user', {
        get: () => {
          throw new Error('Unexpected error')
        }
      })

      await requireAdmin(mockRequest as Request, mockResponse as Response, mockNext)

      expect(logger.error).toHaveBeenCalledWith('Admin middleware error:', { error: 'Unexpected error' })
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization failed',
        message: 'An error occurred during authorization'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // requireRole
  // ============================================================================

  describe('requireRole', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requireRole(UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow users with exact role match', () => {
      mockRequest.user = {
        id: 'admin-123',
        role: UserRole.ADMIN
      } as User
      const middleware = requireRole(UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow users with one of multiple allowed roles', () => {
      mockRequest.user = {
        id: 'support-123',
        role: UserRole.SUPPORT
      } as User
      const middleware = requireRole(UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject users without required role', () => {
      mockRequest.user = {
        id: 'support-123',
        role: UserRole.SUPPORT
      } as User
      const middleware = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${UserRole.ADMIN}, ${UserRole.SUPER_ADMIN}`,
        current_role: UserRole.SUPPORT,
        required_roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      Object.defineProperty(mockRequest, 'user', {
        get: () => {
          throw new Error('Role check error')
        }
      })
      const middleware = requireRole(UserRole.ADMIN)

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(logger.error).toHaveBeenCalledWith('Role check error:', { error: 'Role check error' })
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization failed',
        message: 'An error occurred during role verification'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // requirePermission
  // ============================================================================

  describe('requirePermission', () => {
    it('should reject unauthenticated users', () => {
      mockRequest.user = undefined
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow users with permission for users.view', () => {
      mockRequest.user = {
        id: 'support-123',
        role: UserRole.SUPPORT
      } as User
      const middleware = requirePermission('users.view')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow admin for users.edit', () => {
      mockRequest.user = {
        id: 'admin-123',
        role: UserRole.ADMIN
      } as User
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject support for users.edit', () => {
      mockRequest.user = {
        id: 'support-123',
        role: UserRole.SUPPORT
      } as User
      const middleware = requirePermission('users.edit')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions for: users.edit',
        current_role: UserRole.SUPPORT,
        required_permission: 'users.edit'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should only allow super_admin for system.configure', () => {
      mockRequest.user = {
        id: 'admin-123',
        role: UserRole.ADMIN
      } as User
      const middleware = requirePermission('system.configure')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow finance for payments.view', () => {
      mockRequest.user = {
        id: 'finance-123',
        role: UserRole.FINANCE
      } as User
      const middleware = requirePermission('payments.view')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject support for payments.manage', () => {
      mockRequest.user = {
        id: 'support-123',
        role: UserRole.SUPPORT
      } as User
      const middleware = requirePermission('payments.manage')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      Object.defineProperty(mockRequest, 'user', {
        get: () => {
          throw new Error('Permission check error')
        }
      })
      const middleware = requirePermission('users.view')

      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(logger.error).toHaveBeenCalledWith('Permission check error:', { error: 'Permission check error' })
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization failed',
        message: 'An error occurred during permission verification'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // hasPermission helper
  // ============================================================================

  describe('hasPermission helper', () => {
    it('should return true when user has permission', () => {
      const user = { role: UserRole.ADMIN } as User

      expect(hasPermission(user, 'users.edit')).toBe(true)
      expect(hasPermission(user, 'users.view')).toBe(true)
      expect(hasPermission(user, 'system.view')).toBe(true)
    })

    it('should return false when user lacks permission', () => {
      const user = { role: UserRole.SUPPORT } as User

      expect(hasPermission(user, 'users.edit')).toBe(false)
      expect(hasPermission(user, 'users.delete')).toBe(false)
      expect(hasPermission(user, 'system.configure')).toBe(false)
    })

    it('should check finance permissions correctly', () => {
      const user = { role: UserRole.FINANCE } as User

      expect(hasPermission(user, 'payments.view')).toBe(true)
      expect(hasPermission(user, 'payments.manage')).toBe(true)
      expect(hasPermission(user, 'users.edit')).toBe(false)
    })

    it('should check super_admin has all permissions', () => {
      const user = { role: UserRole.SUPER_ADMIN } as User

      expect(hasPermission(user, 'users.delete')).toBe(true)
      expect(hasPermission(user, 'system.configure')).toBe(true)
      expect(hasPermission(user, 'payments.manage')).toBe(true)
    })
  })

  // ============================================================================
  // isAdmin helper
  // ============================================================================

  describe('isAdmin helper', () => {
    it('should return false for regular users', () => {
      const user = { role: UserRole.USER } as User
      expect(isAdmin(user)).toBe(false)
    })

    it('should return true for support role', () => {
      const user = { role: UserRole.SUPPORT } as User
      expect(isAdmin(user)).toBe(true)
    })

    it('should return true for finance role', () => {
      const user = { role: UserRole.FINANCE } as User
      expect(isAdmin(user)).toBe(true)
    })

    it('should return true for admin role', () => {
      const user = { role: UserRole.ADMIN } as User
      expect(isAdmin(user)).toBe(true)
    })

    it('should return true for super_admin role', () => {
      const user = { role: UserRole.SUPER_ADMIN } as User
      expect(isAdmin(user)).toBe(true)
    })
  })

  // ============================================================================
  // PERMISSIONS constant
  // ============================================================================

  describe('PERMISSIONS constant', () => {
    it('should define admin.access permission', () => {
      expect(PERMISSIONS['admin.access']).toEqual([
        UserRole.SUPPORT,
        UserRole.FINANCE,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN
      ])
    })

    it('should define restrictive permissions for user deletion', () => {
      expect(PERMISSIONS['users.delete']).toEqual([UserRole.SUPER_ADMIN])
    })

    it('should define restrictive permissions for system configuration', () => {
      expect(PERMISSIONS['system.configure']).toEqual([UserRole.SUPER_ADMIN])
    })

    it('should allow multiple roles for conversions management', () => {
      const roles = PERMISSIONS['conversions.manage']
      expect(roles).toContain(UserRole.SUPPORT)
      expect(roles).toContain(UserRole.ADMIN)
      expect(roles).toContain(UserRole.SUPER_ADMIN)
    })

    it('should have appropriate payment permissions', () => {
      const viewRoles = PERMISSIONS['payments.view']
      const manageRoles = PERMISSIONS['payments.manage']

      expect(viewRoles).toContain(UserRole.FINANCE)
      expect(manageRoles).toContain(UserRole.FINANCE)
      expect(manageRoles).toContain(UserRole.SUPER_ADMIN)
      expect(manageRoles).not.toContain(UserRole.SUPPORT)
    })
  })
})
