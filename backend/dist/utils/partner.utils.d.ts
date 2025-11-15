/**
 * Generate URL-friendly slug from partner name
 * Example: "Jeff Su" => "jeff-su"
 */
export declare function generateSlug(name: string): Promise<string>;
/**
 * Generate unique referral code
 * Example: "Jeff Su" => "JEFF25" or "JEFFS30"
 */
export declare function generateReferralCode(name: string): Promise<string>;
/**
 * Calculate partner tier based on monthly conversions
 */
export declare function calculateTier(monthlyConversions: number): 'bronze' | 'silver' | 'gold' | 'platinum';
/**
 * Get commission rate by tier
 */
export declare function getCommissionRate(tier: string): number;
//# sourceMappingURL=partner.utils.d.ts.map