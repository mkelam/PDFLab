import { Partner } from '../models/Partner'

/**
 * Generate URL-friendly slug from partner name
 * Example: "Jeff Su" => "jeff-su"
 */
export async function generateSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Check if slug exists
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await Partner.findOne({ where: { slug } })
    if (!existing) {
      return slug
    }
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

/**
 * Generate unique referral code
 * Example: "Jeff Su" => "JEFF25" or "JEFFS30"
 */
export async function generateReferralCode(name: string): Promise<string> {
  // Extract first name or initials
  const nameParts = name.trim().split(/\s+/)
  const firstName = nameParts[0].toUpperCase()
  const lastName = nameParts[nameParts.length - 1]

  // Try different combinations
  const attempts = [
    firstName.substring(0, 4) + Math.floor(Math.random() * 100), // JEFF25
    firstName.substring(0, 3) + lastName.substring(0, 1) + Math.floor(Math.random() * 100), // JEFS42
    firstName.substring(0, 2) + lastName.substring(0, 2) + Math.floor(Math.random() * 100), // JESU88
    'PARTNER' + Math.floor(Math.random() * 10000) // PARTNER5234
  ]

  for (const code of attempts) {
    const existing = await Partner.findOne({ where: { referral_code: code } })
    if (!existing) {
      return code
    }
  }

  // Fallback: random code
  return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase()
}

/**
 * Calculate partner tier based on monthly conversions
 */
export function calculateTier(monthlyConversions: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (monthlyConversions >= 100) return 'platinum'
  if (monthlyConversions >= 51) return 'gold'
  if (monthlyConversions >= 11) return 'silver'
  return 'bronze'
}

/**
 * Get commission rate by tier
 */
export function getCommissionRate(tier: string): number {
  const rates: Record<string, number> = {
    bronze: 30.0,
    silver: 40.0,
    gold: 50.0,
    platinum: 50.0 // Same as gold but with bonuses
  }
  return rates[tier] || 30.0
}
