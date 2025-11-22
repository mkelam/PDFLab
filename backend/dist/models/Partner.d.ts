import { Model, Optional } from 'sequelize';
export declare enum PartnerPlatform {
    YOUTUBE = "youtube",
    TWITTER = "twitter",
    LINKEDIN = "linkedin",
    INSTAGRAM = "instagram",
    TIKTOK = "tiktok",
    OTHER = "other"
}
export declare enum CommissionTier {
    BRONZE = "bronze",// 30%
    SILVER = "silver",// 40%
    GOLD = "gold",// 50%
    PLATINUM = "platinum"
}
export declare enum PartnerStatus {
    PENDING = "pending",
    ACTIVE = "active",
    PAUSED = "paused",
    INACTIVE = "inactive"
}
interface PartnerAttributes {
    id: string;
    name: string;
    email: string;
    slug: string;
    application_id?: string;
    user_id?: string;
    platform?: PartnerPlatform;
    follower_count?: number;
    website?: string;
    brand_name?: string;
    referral_code: string;
    commission_rate: number;
    commission_tier: CommissionTier;
    free_licenses_allocated: number;
    free_licenses_used: number;
    status: PartnerStatus;
    contract_signed_at?: Date;
    activated_at?: Date;
    total_clicks: number;
    total_signups: number;
    total_conversions: number;
    total_revenue_generated: number;
    total_commission_earned: number;
    total_commission_paid: number;
    current_month_conversions: number;
    last_conversion_at?: Date;
    payment_method?: 'paypal' | 'bank_transfer' | 'stripe';
    payment_email?: string;
    payment_details?: any;
    password_hash?: string;
    last_login_at?: Date;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
interface PartnerCreationAttributes extends Optional<PartnerAttributes, 'id' | 'slug' | 'platform' | 'follower_count' | 'website' | 'commission_rate' | 'commission_tier' | 'free_licenses_allocated' | 'free_licenses_used' | 'status' | 'contract_signed_at' | 'total_signups' | 'total_conversions' | 'total_revenue_generated' | 'total_commission_earned' | 'total_commission_paid' | 'notes' | 'created_at' | 'updated_at'> {
}
export declare class Partner extends Model<PartnerAttributes, PartnerCreationAttributes> implements PartnerAttributes {
    id: string;
    name: string;
    email: string;
    slug: string;
    application_id?: string;
    user_id?: string;
    platform?: PartnerPlatform;
    follower_count?: number;
    website?: string;
    brand_name?: string;
    referral_code: string;
    commission_rate: number;
    commission_tier: CommissionTier;
    free_licenses_allocated: number;
    free_licenses_used: number;
    status: PartnerStatus;
    contract_signed_at?: Date;
    activated_at?: Date;
    total_clicks: number;
    total_signups: number;
    total_conversions: number;
    total_revenue_generated: number;
    total_commission_earned: number;
    total_commission_paid: number;
    current_month_conversions: number;
    last_conversion_at?: Date;
    payment_method?: 'paypal' | 'bank_transfer' | 'stripe';
    payment_email?: string;
    payment_details?: any;
    password_hash?: string;
    last_login_at?: Date;
    notes?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
    getCommissionRateByTier(): number;
    getReferralLink(): string;
    getFreeLicensesRemaining(): number;
    getConversionRate(): number;
    getPendingCommission(): number;
    canAcceptMoreReferrals(): boolean;
}
export {};
//# sourceMappingURL=Partner.d.ts.map