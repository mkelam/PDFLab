import { User as UserModel, UserPlan, UserRole, SubscriptionStatus } from '../models/User'

/**
 * Express type extensions for authenticated requests
 * This file extends the Express namespace to add type-safe user properties to Request
 */

declare global {
  namespace Express {
    /**
     * Extended User interface for req.user
     * Includes all User model properties and helper methods
     */
    interface User {
      id: string
      email: string
      password_hash: string
      name?: string
      role: UserRole
      plan: UserPlan
      conversions_used: number
      conversions_limit: number
      stripe_customer_id?: string
      subscription_id?: string
      subscription_status?: SubscriptionStatus
      subscription_end_date?: Date
      is_beta_user: boolean
      beta_expires_at?: Date
      email_verified: boolean
      email_verified_at?: Date
      failed_reset_attempts: number
      reset_locked_until?: Date
      onboarding_completed: boolean
      onboarding_completed_at?: Date
      onboarding_skipped: boolean
      google_id?: string
      linkedin_id?: string
      created_at: Date
      updated_at: Date
      last_login?: Date

      // Helper methods from User model
      canConvert(): boolean
      getMaxFileSize(): number
      getMaxBatchSize(): number
      save(options?: any): Promise<this>
    }

    interface Request {
      /**
       * Authenticated user attached by auth middleware
       */
      user?: User

      /**
       * User ID shorthand (set by auth middleware)
       */
      userId?: string

      /**
       * User plan shorthand (set by auth middleware)
       */
      userPlan?: string
    }
  }
}

export {}
