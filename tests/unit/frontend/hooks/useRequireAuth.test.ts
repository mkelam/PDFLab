import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import * as AuthContext from '@/contexts/AuthContext'

/**
 * Unit Tests: useRequireAuth Hook
 *
 * Tests: Authentication checks, role-based access, redirects
 * Coverage: 100%
 */

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}))

const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  checkAuth: vi.fn(),
  ...overrides,
})

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unauthenticated User Behavior', () => {
    it('should redirect to login when user is not authenticated', async () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: null })
      )

      renderHook(() => useRequireAuth())

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin')
      })
    })

    it('should not redirect while auth is loading', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: true, user: null })
      )

      renderHook(() => useRequireAuth())

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should return loading state when auth is loading', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: true, user: null })
      )

      const { result } = renderHook(() => useRequireAuth())

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
    })
  })

  describe('Authenticated User Behavior', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free' as const,
      role: 'user',
      conversions_used: 0,
      conversions_limit: 3,
    }

    it('should not redirect when user is authenticated', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth())

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should return user and not loading when authenticated', () => {
      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      const { result } = renderHook(() => useRequireAuth())

      expect(result.current.loading).toBe(false)
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('Role-Based Access Control (Array API)', () => {
    it('should allow access when user has required role (array syntax)', () => {
      const mockAdminUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        plan: 'enterprise' as const,
        role: 'admin',
        conversions_used: 0,
        conversions_limit: 999999,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockAdminUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth(['admin']))

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect when user lacks required role (array syntax)', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        plan: 'free' as const,
        role: 'user',
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth(['admin']))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should allow super_admin to access any page (array syntax)', () => {
      const mockSuperAdmin = {
        id: '1',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        plan: 'enterprise' as const,
        role: 'super_admin',
        conversions_used: 0,
        conversions_limit: 999999,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockSuperAdmin, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth(['admin']))

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Role-Based Access Control (Object API)', () => {
    it('should allow access when user has required role (object syntax)', () => {
      const mockAdminUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        plan: 'enterprise' as const,
        role: 'admin',
        conversions_used: 0,
        conversions_limit: 999999,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockAdminUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth({ requiredRole: 'admin' }))

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect when user lacks required role (object syntax)', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        plan: 'free' as const,
        role: 'user',
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth({ requiredRole: 'admin' }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should always allow super_admin (object syntax)', () => {
      const mockSuperAdmin = {
        id: '1',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        plan: 'enterprise' as const,
        role: 'super_admin',
        conversions_used: 0,
        conversions_limit: 999999,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockSuperAdmin, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth({ requiredRole: 'partner_admin' }))

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('No Role Requirement', () => {
    it('should allow any authenticated user when no role specified', () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        plan: 'free' as const,
        role: 'user',
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth())

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle user without role property', async () => {
      const mockUserWithoutRole = {
        id: '1',
        email: 'user@example.com',
        name: 'User Without Role',
        plan: 'free' as const,
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({
          isLoading: false,
          user: mockUserWithoutRole,
          isAuthenticated: true,
        })
      )

      renderHook(() => useRequireAuth({ requiredRole: 'admin' }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should handle empty array of allowed roles', () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        plan: 'free' as const,
        role: 'user',
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth([]))

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle empty object options', () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        plan: 'free' as const,
        role: 'user',
        conversions_used: 0,
        conversions_limit: 3,
      }

      vi.spyOn(AuthContext, 'useAuth').mockReturnValue(
        createMockAuthContext({ isLoading: false, user: mockUser, isAuthenticated: true })
      )

      renderHook(() => useRequireAuth({}))

      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
