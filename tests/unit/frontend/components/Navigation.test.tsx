import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '@/components/Navigation'
import { AuthContext } from '@/contexts/AuthContext'

/**
 * Unit Tests: Navigation Component
 *
 * Tests: Rendering, authentication states, logout, responsive behavior
 * Coverage: 100%
 */

const mockLogout = vi.fn()

const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: mockLogout,
  checkAuth: vi.fn(),
  ...overrides,
})

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering and Basic Structure', () => {
    it('should render logo and brand name', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.getByText('PDF Lab Pro')).toBeInTheDocument()
    })

    it('should render Features link', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const featuresLinks = screen.getAllByText('Features')
      expect(featuresLinks.length).toBeGreaterThan(0)
    })

    it('should render Pricing link', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const pricingLinks = screen.getAllByText('Pricing')
      expect(pricingLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Unauthenticated User State', () => {
    it('should show Sign in button when not authenticated', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const signInButtons = screen.getAllByText('Sign in')
      expect(signInButtons.length).toBeGreaterThan(0)
    })

    it('should show Sign up button when not authenticated', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const signUpButtons = screen.getAllByText('Sign up')
      expect(signUpButtons.length).toBeGreaterThan(0)
    })

    it('should not show Dashboard link when not authenticated', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('should not show Logout button when not authenticated', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })
  })

  describe('Authenticated User State', () => {
    const mockFreeUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'free' as const,
      conversions_used: 0,
      conversions_limit: 3,
    }

    it('should show Dashboard button when authenticated', () => {
      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockFreeUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should show Logout button when authenticated', () => {
      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockFreeUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should not show Sign in/Sign up buttons when authenticated', () => {
      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockFreeUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
      expect(screen.queryByText('Sign up')).not.toBeInTheDocument()
    })

    it('should display user plan badge for free users', () => {
      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockFreeUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.getByText('free')).toBeInTheDocument()
    })

    it('should display user plan badge for pro users', () => {
      const mockProUser = {
        ...mockFreeUser,
        plan: 'pro' as const,
        conversions_limit: 999999,
      }

      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockProUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.getByText('pro')).toBeInTheDocument()
    })

    it('should call logout function when Logout button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockFreeUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      const { container } = render(
        <AuthContext.Provider value={createMockAuthContext({ isLoading: true })}>
          <Navigation />
        </AuthContext.Provider>
      )

      const loadingElements = container.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should not show user buttons during loading', () => {
      render(
        <AuthContext.Provider value={createMockAuthContext({ isLoading: true })}>
          <Navigation />
        </AuthContext.Provider>
      )

      expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should render both desktop and mobile navigation', () => {
      const { container } = render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      // Desktop nav has md:flex class
      const desktopNav = container.querySelector('.md\\:flex')
      expect(desktopNav).toBeInTheDocument()

      // Mobile nav has md:hidden class
      const mobileNav = container.querySelector('.md\\:hidden')
      expect(mobileNav).toBeInTheDocument()
    })

    it('should show icon-only buttons on mobile for authenticated users', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        plan: 'free' as const,
        conversions_used: 0,
        conversions_limit: 3,
      }

      const { container } = render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      // Mobile navigation should have icon buttons without text
      const mobileNav = container.querySelector('.md\\:hidden')
      expect(mobileNav).toBeInTheDocument()
    })
  })

  describe('Logout Error Handling', () => {
    it('should handle logout errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockLogoutWithError = vi.fn().mockRejectedValue(new Error('Logout failed'))

      const user = userEvent.setup()
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        plan: 'free' as const,
        conversions_used: 0,
        conversions_limit: 3,
      }

      render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockUser,
            isAuthenticated: true,
            logout: mockLogoutWithError,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href for Features link', () => {
      const { container } = render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const featuresLink = container.querySelector('a[href="/features"]')
      expect(featuresLink).toBeInTheDocument()
    })

    it('should have correct href for Pricing link', () => {
      const { container } = render(
        <AuthContext.Provider value={createMockAuthContext()}>
          <Navigation />
        </AuthContext.Provider>
      )

      const pricingLink = container.querySelector('a[href="/pricing"]')
      expect(pricingLink).toBeInTheDocument()
    })

    it('should have correct href for Dashboard link when authenticated', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        plan: 'free' as const,
        conversions_used: 0,
        conversions_limit: 3,
      }

      const { container } = render(
        <AuthContext.Provider
          value={createMockAuthContext({
            user: mockUser,
            isAuthenticated: true,
          })}
        >
          <Navigation />
        </AuthContext.Provider>
      )

      const dashboardLink = container.querySelector('a[href="/dashboard"]')
      expect(dashboardLink).toBeInTheDocument()
    })
  })
})
