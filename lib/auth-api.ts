// Authentication API client for PDFLab
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: {
    id: string
    email: string
    name: string
    plan: string
  }
}

class AuthAPI {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Registration failed')
    }

    return result
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Login failed')
    }

    return result
  }

  /**
   * Get current user profile
   */
  async getProfile(token: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to get profile')
    }

    return result
  }

  /**
   * Logout user (client-side only for now)
   */
  async logout(): Promise<void> {
    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate password strength
   * Password must be at least 8 characters with uppercase, lowercase, and number
   */
  validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 8) {
      return { isValid: false, message: "Password must be at least 8 characters long" }
    }

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUpperCase) {
      return { isValid: false, message: "Password must contain at least one uppercase letter" }
    }

    if (!hasLowerCase) {
      return { isValid: false, message: "Password must contain at least one lowercase letter" }
    }

    if (!hasNumber) {
      return { isValid: false, message: "Password must contain at least one number" }
    }

    return { isValid: true, message: "Password is strong" }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.detail || result.message || 'Email verification failed'
      }
    }

    return {
      success: true,
      message: result.message || 'Email verified successfully'
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.detail || result.message || 'Failed to resend verification email'
      }
    }

    return {
      success: true,
      message: result.message || 'Verification email resent successfully'
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.detail || result.message || 'Failed to send reset email'
      }
    }

    return {
      success: true,
      message: result.message || 'Password reset email sent'
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, new_password: newPassword }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.detail || result.message || 'Failed to reset password'
      }
    }

    return {
      success: true,
      message: result.message || 'Password reset successfully'
    }
  }
}

export default new AuthAPI()
