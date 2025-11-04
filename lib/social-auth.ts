// Social authentication providers for PDFLab
// Currently configured for future implementation

export interface SocialProvider {
  id: string
  name: string
  icon: string
  enabled: boolean
}

export const socialProviders: SocialProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'google',
    enabled: false, // Not implemented yet
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    enabled: false, // Not implemented yet
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: 'microsoft',
    enabled: false, // Not implemented yet
  },
]

/**
 * Initiate social authentication flow
 * @param providerId - The social provider ID (google, github, microsoft)
 */
export async function initiateOAuth(providerId: string): Promise<void> {
  // TODO: Implement OAuth flow
  console.warn(`OAuth not implemented yet for provider: ${providerId}`)
  throw new Error('Social authentication is not available yet. Please use email/password login.')
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
