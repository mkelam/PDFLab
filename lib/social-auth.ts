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
      await initiateOAuth('google')
      return { success: true }
    }
  }
]

/**
 * Initiate social authentication flow
 * @param providerId - The social provider ID (currently only 'google')
 */
export async function initiateOAuth(providerId: string): Promise<void> {
  // Redirect to backend OAuth endpoint
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006'
  window.location.href = `${apiUrl}/api/auth/${providerId}`
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
