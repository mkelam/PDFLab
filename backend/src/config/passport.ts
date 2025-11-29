import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as OAuth2Strategy } from 'passport-oauth2'
import { User } from '../models'
import axios from 'axios'
import logger from './logger'

// Google OAuth Strategy - Only configure if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  logger.info('Configuring Google OAuth strategy')
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3006/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        logger.debug('Google OAuth callback received', { profileId: profile.id })

        const email = profile.emails?.[0]?.value

        if (!email) {
          logger.error('Google OAuth: No email found in profile', { profileId: profile.id })
          return done(new Error('No email found in Google profile'))
        }

        // Find or create user
        let user = await User.findOne({ where: { email } })
        logger.debug('Google OAuth user lookup', { email, found: !!user })

        if (!user) {
          // Create new user
          logger.info('Google OAuth: Creating new user', { email })
          user = await User.create({
            email,
            name: profile.displayName || email.split('@')[0],
            password_hash: '', // No password for OAuth users
            plan: 'free' as import('../models/User').UserPlan,
            conversions_used: 0,
            conversions_limit: 3,
            google_id: profile.id,
          })
          logger.info('Google OAuth: New user created', { userId: user.id, email })
        } else if (!user.google_id) {
          // Link existing user to Google
          logger.info('Google OAuth: Linking existing user', { userId: user.id })
          user.google_id = profile.id
          await user.save()
          logger.info('Google OAuth: User linked to Google', { userId: user.id })
        } else {
          logger.debug('Google OAuth: User already linked', { userId: user.id })
        }

        return done(null, user)
      } catch (error) {
        logger.error('Google OAuth error', { error: error instanceof Error ? error.message : String(error) })
        return done(error as Error)
      }
    }
  )
  )
} else {
  logger.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables required')
}

// LinkedIn OAuth Strategy (OpenID Connect) - Disabled for now
// Only enable if LINKEDIN_CLIENT_ID is configured
if (process.env.LINKEDIN_CLIENT_ID) {
const linkedInStrategy = new OAuth2Strategy(
  {
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3006/api/auth/linkedin/callback',
    scope: ['openid', 'profile', 'email'],
    state: false,  // Disable state for stateless JWT auth
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      // Manually fetch user profile from LinkedIn OpenID Connect endpoint
      const { data: userInfo } = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const email = userInfo.email
      const linkedinId = userInfo.sub
      const name = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || email.split('@')[0]

      if (!email) {
        return done(new Error('No email found in LinkedIn profile'))
      }

      // Find or create user
      let user = await User.findOne({ where: { email } })

      if (!user) {
        // Create new user
        user = await User.create({
          email,
          name,
          password_hash: '', // No password for OAuth users
          plan: 'free' as import('../models/User').UserPlan,
          conversions_used: 0,
          conversions_limit: 3,
          linkedin_id: linkedinId,
        })
      } else if (!user.linkedin_id) {
        // Link existing user to LinkedIn
        user.linkedin_id = linkedinId
        await user.save()
      }

      return done(null, user)
    } catch (error) {
      logger.error('LinkedIn OAuth error', { error: error instanceof Error ? error.message : String(error) })
      return done(error as Error)
    }
  }
)

// Override userProfile to use LinkedIn OpenID Connect
linkedInStrategy.userProfile = function(accessToken: string, done: (err: Error | null, profile?: any) => void) {
  axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  .then(({ data }) => {
    const profile = {
      provider: 'linkedin',
      id: data.sub,
      displayName: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      name: {
        familyName: data.family_name,
        givenName: data.given_name,
      },
      emails: [{ value: data.email }],
      email: data.email,
      _raw: JSON.stringify(data),
      _json: data,
    }
    done(null, profile)
  })
  .catch((error) => {
    logger.error('LinkedIn userProfile error', { error: error instanceof Error ? error.message : String(error) })
    done(error)
  })
}

passport.use('linkedin', linkedInStrategy)
}

export default passport
