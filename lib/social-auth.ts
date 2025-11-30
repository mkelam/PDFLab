// Social authentication providers for PDFLab
// Currently configured for future implementation

export interface SocialProvider {
  id: string
  name: string
  icon: string
  enabled: boolean
  action: () => Promise<{ success: boolean; error?: string; user?: any }>
}

export const socialProviders: SocialProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'google',
    enabled: true, // Configured and working
    action: async () => {
      try {
        await initiateOAuth('google')
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Google sign-in is currently unavailable. Please use email/password login.'
        }
      }
    }
  }
]

/**
 * Initiate social authentication flow
 * @param providerId - The social provider ID (currently only 'google')
 */
export async function initiateOAuth(providerId: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'

  try {
    // Check if OAuth endpoint is available before redirecting
    const checkUrl = `${apiUrl}/api/auth/${providerId}`
    const response = await fetch(checkUrl, {
      method: 'GET',
      redirect: 'manual', // Prevent automatic redirect
      headers: {
        'Accept': 'application/json'
      }
    })

    // Check response status
    if (response.status === 503) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Google sign-in is not available at this time. Please use email/password to sign in.')
    }

    // If status is 302 (redirect) or 200, OAuth is configured - proceed with redirect
    if (response.status === 302 || response.type === 'opaqueredirect' || response.status === 200) {
      window.location.href = checkUrl
      return
    }

    // Any other error status
    throw new Error('Unable to connect to authentication service. Please try again later.')
  } catch (error) {
    // Re-throw the error to be caught by the action handler
    throw error
  }
}

/**
 * Handle OAuth callback
 * @param code - Authorization code from OAuth provider
 * @param state - State parameter for CSRF protection
 */
export async function handleOAuthCallback(code: string, state: string): Promise<void> {
  // TODO: Implement OAuth callback handler
  console.warn('OAuth callback handler not implemented')
}
