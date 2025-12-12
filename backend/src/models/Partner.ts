import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import type { PromoCode } from './PromoCode'

export enum PartnerPlatform {
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  OTHER = 'other'
}

export enum CommissionTier {
  BRONZE = 'bronze',    // 30%
  SILVER = 'silver',    // 40%
  GOLD = 'gold',        // 50%
  PLATINUM = 'platinum' // 60%
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  INACTIVE = 'inactive'
}

interface PartnerAttributes {
  id: string
  name: string
  email: string
  slug: string // URL-friendly identifier (e.g., 'jeff-su')

  // Application linkage
  application_id?: string // Links to partner_applications table
  user_id?: string // Links to users table for authentication

  // Partner Details
  platform?: PartnerPlatform
  follower_count?: number
  website?: string
  brand_name?: string

  // Referral tracking
  referral_code: string // Unique code like JEFF25

  // Commission Structure
  commission_rate: number // Percentage (e.g., 30.00 = 30%)
  commission_tier: CommissionTier

  // Free Licenses
  free_licenses_allocated: number
  free_licenses_used: number

  // Status
  status: PartnerStatus
  contract_signed_at?: Date
  activated_at?: Date

  // Tracking Stats
  total_clicks: number
  total_signups: number
  total_conversions: number
  total_revenue_generated: number
  total_commission_earned: number
  total_commission_paid: number
  current_month_conversions: number
  last_conversion_at?: Date

  // Payment info
  payment_method?: 'paypal' | 'bank_transfer' | 'stripe'
  payment_email?: string

  // Authentication
  password_hash?: string
  last_login_at?: Date

  // Metadata
  notes?: string
  created_at: Date
  updated_at: Date
}

interface PartnerCreationAttributes
  extends Optional<
    PartnerAttributes,
    | 'id'
    | 'slug'
    | 'platform'
    | 'follower_count'
    | 'website'
    | 'commission_rate'
    | 'commission_tier'
    | 'free_licenses_allocated'
    | 'free_licenses_used'
    | 'status'
    | 'contract_signed_at'
    | 'total_signups'
    | 'total_conversions'
    | 'total_revenue_generated'
    | 'total_commission_earned'
    | 'total_commission_paid'
    | 'notes'
    | 'created_at'
    | 'updated_at'
  > {}

export class Partner extends Model<PartnerAttributes, PartnerCreationAttributes>
  implements PartnerAttributes {

  public id!: string
  public name!: string
  public email!: string
  public slug!: string

  public application_id?: string
  public user_id?: string

  public platform?: PartnerPlatform
  public follower_count?: number
  public website?: string
  public brand_name?: string

  public referral_code!: string

  public commission_rate!: number
  public commission_tier!: CommissionTier

  public free_licenses_allocated!: number
  public free_licenses_used!: number

  public status!: PartnerStatus
  public contract_signed_at?: Date
  public activated_at?: Date

  public total_clicks!: number
  public total_signups!: number
  public total_conversions!: number
  public total_revenue_generated!: number
  public total_commission_earned!: number
  public total_commission_paid!: number
  public current_month_conversions!: number
  public last_conversion_at?: Date

  public payment_method?: 'paypal' | 'bank_transfer' | 'stripe'
  public payment_email?: string

  public password_hash?: string
  public last_login_at?: Date

  public notes?: string
  public readonly created_at!: Date
  public readonly updated_at!: Date

  public promo_codes?: PromoCode[]

  // Helper methods
  public getCommissionRateByTier(): number {
    const tierRates: Record<CommissionTier, number> = {
      [CommissionTier.BRONZE]: 30.0,
      [CommissionTier.SILVER]: 40.0,
      [CommissionTier.GOLD]: 50.0,
      [CommissionTier.PLATINUM]: 60.0
    }
    return tierRates[this.commission_tier]
  }

  public getReferralLink(): string {
    return `https://pdflab.pro/partner/${this.slug}`
  }

  public getFreeLicensesRemaining(): number {
    return this.free_licenses_allocated - this.free_licenses_used
  }

  public getConversionRate(): number {
    if (this.total_signups === 0) return 0
    return (this.total_conversions / this.total_signups) * 100
  }

  public getPendingCommission(): number {
    return this.total_commission_earned - this.total_commission_paid
  }

  public canAcceptMoreReferrals(): boolean {
    return this.status === PartnerStatus.ACTIVE
  }
}

Partner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'URL-friendly identifier (e.g., "jeff-su")'
    },
    application_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Links to partner_applications table'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Links to users table for authentication'
    },
    brand_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    referral_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique referral code like JEFF25'
    },
    platform: {
      type: DataTypes.ENUM(...Object.values(PartnerPlatform)),
      allowNull: true,
      comment: 'Primary platform: youtube, twitter, linkedin, etc'
    },
    follower_count: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 30.0,
      comment: 'Percentage commission (e.g., 30.00 = 30%)'
    },
    commission_tier: {
      type: DataTypes.ENUM(...Object.values(CommissionTier)),
      allowNull: false,
      defaultValue: CommissionTier.BRONZE,
      comment: 'bronze=30%, silver=40%, gold=50%, platinum=60%'
    },
    free_licenses_allocated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Total free licenses given to partner'
    },
    free_licenses_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'How many have been redeemed'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PartnerStatus)),
      allowNull: false,
      defaultValue: PartnerStatus.PENDING
    },
    contract_signed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    activated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When partner was activated'
    },
    total_clicks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total clicks on referral link'
    },
    total_signups: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total users who signed up via this partner'
    },
    total_conversions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Users who became paying customers'
    },
    total_revenue_generated: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Total revenue from their referrals'
    },
    total_commission_earned: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Total commission owed to partner'
    },
    total_commission_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Total commission already paid'
    },
    current_month_conversions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Conversions this month for tier upgrades'
    },
    last_conversion_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time a conversion occurred'
    },
    payment_method: {
      type: DataTypes.ENUM('paypal', 'bank_transfer', 'stripe'),
      allowNull: true
    },
    payment_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email for PayPal or Stripe payments'
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Hashed password for partner portal login'
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time partner logged into dashboard'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'partners',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['slug'] },
      { fields: ['status'] }
    ]
  }
)
