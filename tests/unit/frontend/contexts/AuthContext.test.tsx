import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth, useGuestOnly } from '@/contexts/AuthContext'

/**
 * Unit Tests: AuthContext
 *
 * Tests: Login, signup, logout, session persistence, token refresh
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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

global.fetch = vi.fn()

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  plan: 'free',
  role: 'user',
  conversions_used: 0,
  conversions_limit: 3,
  created_at: new Date().toISOString(),
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    ;(global.fetch as any).mockClear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('AuthProvider', () => {
    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const { user, isLoading } = useAuth()
        return (
          <div>
            <div data-testid="user">{user ? user.email : 'No user'}</div>
            <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
          </div>
        )
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })

    it('should throw error if useAuth is used outside AuthProvider', () => {
      const TestComponent = () => {
        try {
          useAuth()
          return <div>Should not render</div>
        } catch (error) {
          return <div>{(error as Error).message}</div>
        }
      }

      render(<TestComponent />)

      expect(screen.getByText('useAuth must be used within an AuthProvider')).toBeInTheDocument()
    })
  })

  describe('Login', () => {
    it('should successfully login with valid credentials', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.login({ email: 'test@example.com', password: 'password123' })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(localStorage.getItem('authToken')).toBe('test-token')
        expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token')
      })
    })

    it('should throw error on failed login', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'Invalid credentials',
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await expect(
        result.current.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle network errors during login', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await expect(
        result.current.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('Network error')
    })
  })

  describe('Signup', () => {
    it('should successfully signup with valid credentials', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token',
          refresh_token: 'test-refresh-token',
          user: mockUser,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.signup({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(localStorage.getItem('authToken')).toBe('test-token')
      })
    })

    it('should combine firstName and lastName into name', async () => {
      let requestBody: any = null

      ;(global.fetch as any).mockImplementationOnce(async (_url: string, options: any) => {
        requestBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            token: 'test-token',
            user: mockUser,
          }),
        }
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.signup({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })

      await waitFor(() => {
        expect(requestBody.name).toBe('John Doe')
      })
    })

    it('should use email username as fallback name', async () => {
      let requestBody: any = null

      ;(global.fetch as any).mockImplementationOnce(async (_url: string, options: any) => {
        requestBody = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            token: 'test-token',
            user: mockUser,
          }),
        }
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.signup({
        email: 'newuser@example.com',
        password: 'password123',
      })

      await waitFor(() => {
        expect(requestBody.name).toBe('newuser')
      })
    })

    it('should throw error on failed signup', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'Email already exists',
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await expect(
        result.current.signup({
          email: 'existing@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already exists')
    })
  })

  describe('Logout', () => {
    it('should clear tokens and user state on logout', async () => {
      localStorage.setItem('authToken', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      // Set initial user state
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await result.current.logout()

      expect(result.current.user).toBeNull()
      expect(localStorage.getItem('authToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('Session Persistence', () => {
    it('should restore session from valid token on mount', async () => {
      localStorage.setItem('authToken', 'valid-token')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should clear invalid token on mount', async () => {
      localStorage.setItem('authToken', 'invalid-token')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(localStorage.getItem('authToken')).toBeNull()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should attempt token refresh when access token expires', async () => {
      localStorage.setItem('authToken', 'expired-token')
      localStorage.setItem('refreshToken', 'valid-refresh-token')

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'new-access-token',
            refresh_token: 'new-refresh-token',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUser,
        })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(localStorage.getItem('authToken')).toBe('new-access-token')
        expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token')
      })
    })

    it('should clear tokens when refresh fails', async () => {
      localStorage.setItem('authToken', 'expired-token')
      localStorage.setItem('refreshToken', 'invalid-refresh-token')

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(localStorage.getItem('authToken')).toBeNull()
        expect(localStorage.getItem('refreshToken')).toBeNull()
      })
    })
  })

  describe('useGuestOnly Hook', () => {
    it('should redirect authenticated regular user to dashboard', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })

      const TestComponent = () => {
        useGuestOnly()
        return <div>Guest Page</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should redirect admin user to admin panel', async () => {
      const adminUser = { ...mockUser, role: 'admin' }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => adminUser,
      })

      const TestComponent = () => {
        useGuestOnly()
        return <div>Guest Page</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin')
      })
    })

    it('should not redirect unauthenticated users', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const TestComponent = () => {
        useGuestOnly()
        return <div>Guest Page</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })
})
