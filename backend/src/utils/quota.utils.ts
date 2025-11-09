/**
 * Quota Management Utilities
 * Centralized quota logic to ensure consistency across the application
 */

import { User, UserPlan } from '../models/User'

// Plan quota configuration (source of truth)
export const PLAN_QUOTAS = {
  [UserPlan.FREE]: {
    conversions_limit: 3,
    max_file_size: 10485760, // 10MB
    batch_size: 1 // No batch processing for free
  },
  [UserPlan.STARTER]: {
    conversions_limit: 100,
    max_file_size: 26214400, // 25MB
    batch_size: 10
  },
  [UserPlan.PRO]: {
    conversions_limit: -1, // Unlimited
    max_file_size: 104857600, // 100MB
    batch_size: 10
  },
  [UserPlan.ENTERPRISE]: {
    conversions_limit: -1, // Unlimited
    max_file_size: 524288000, // 500MB
    batch_size: 10
  }
}

/**
 * Sync user quota to match their current plan
 * IMPORTANT: Call this whenever a user's plan changes
 */
export async function syncUserQuota(user: User): Promise<void> {
  const planQuota = PLAN_QUOTAS[user.plan]

  if (!planQuota) {
    console.error(`⚠️  Unknown plan: ${user.plan}`)
    return
  }

  // Update conversions_limit based on plan
  user.conversions_limit = planQuota.conversions_limit

  // Optionally reset usage (depends on business logic)
  // For upgrades, we usually keep existing usage
  // For new subscriptions, we reset to 0 (handled in webhook)

  await user.save()

  console.log(`✓ Quota synced for user ${user.email} - Plan: ${user.plan}, Limit: ${planQuota.conversions_limit === -1 ? 'Unlimited' : planQuota.conversions_limit}`)
}

/**
 * Update user plan and sync quota
 * Use this instead of manually setting user.plan
 */
export async function updateUserPlan(user: User, newPlan: UserPlan, resetUsage: boolean = false): Promise<void> {
  const oldPlan = user.plan
  user.plan = newPlan

  // Sync quota to new plan
  await syncUserQuota(user)

  // Optionally reset usage count
  if (resetUsage) {
    user.conversions_used = 0
    await user.save()
  }

  console.log(`✓ User ${user.email} upgraded: ${oldPlan} → ${newPlan}`)
}

/**
 * Fix quota for existing users (migration utility)
 * Call this to repair users who have incorrect quota limits
 */
export async function fixAllUserQuotas(): Promise<{ fixed: number; total: number }> {
  const users = await User.findAll()
  let fixed = 0

  for (const user of users) {
    const expectedQuota = PLAN_QUOTAS[user.plan]?.conversions_limit

    if (expectedQuota !== undefined && user.conversions_limit !== expectedQuota) {
      console.log(`🔧 Fixing ${user.email}: ${user.plan} plan should have ${expectedQuota === -1 ? 'unlimited' : expectedQuota} conversions, but has ${user.conversions_limit}`)

      user.conversions_limit = expectedQuota
      await user.save()
      fixed++
    }
  }

  console.log(`✓ Fixed ${fixed}/${users.length} users`)
  return { fixed, total: users.length }
}

/**
 * Check if user can perform a conversion
 */
export function canUserConvert(user: User, requiredConversions: number = 1): { allowed: boolean; reason?: string } {
  // Unlimited plans (Pro/Enterprise)
  if (user.conversions_limit === -1) {
    return { allowed: true }
  }

  // Check quota
  if (user.conversions_used + requiredConversions > user.conversions_limit) {
    return {
      allowed: false,
      reason: `Quota exceeded. You have ${user.conversions_limit - user.conversions_used} conversions remaining, but need ${requiredConversions}.`
    }
  }

  return { allowed: true }
}

/**
 * Get quota information for a user
 */
export function getQuotaInfo(user: User) {
  const planQuota = PLAN_QUOTAS[user.plan]

  return {
    plan: user.plan,
    conversions_used: user.conversions_used,
    conversions_limit: user.conversions_limit,
    conversions_remaining: user.conversions_limit === -1 ? 'unlimited' : user.conversions_limit - user.conversions_used,
    expected_limit: planQuota?.conversions_limit,
    is_synced: user.conversions_limit === planQuota?.conversions_limit,
    max_file_size: planQuota?.max_file_size,
    batch_size: planQuota?.batch_size
  }
}
