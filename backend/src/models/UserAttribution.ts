import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from './User'
import { Partner } from './Partner'
import { PromoCode } from './PromoCode'

export enum AttributionMethod {
  REFERRAL_LINK = 'referral_link',
  PROMO_CODE = 'promo_code',
  MANUAL = 'manual'
}

interface UserAttributionAttributes {
  id: string
  user_id: string
  partner_id?: string // NULL if organic signup
  promo_code_id?: string

  // Attribution Details
  attribution_method: AttributionMethod
  referral_url?: string // Full URL they came from
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string

  // Conversion Tracking
  converted_to_paid: boolean // Did they become a paying customer?
  converted_at?: Date
  first_payment_amount: number

  // Commission Status
  commission_due: number // Commission owed for this referral
  commission_paid: boolean
  commission_paid_at?: Date

  // Metadata
  created_at: Date // When user signed up
  updated_at: Date
}

interface UserAttributionCreationAttributes
  extends Optional<
    UserAttributionAttributes,
    | 'id'
    | 'partner_id'
    | 'promo_code_id'
    | 'referral_url'
    | 'utm_source'
    | 'utm_medium'
    | 'utm_campaign'
    | 'converted_to_paid'
    | 'converted_at'
    | 'first_payment_amount'
    | 'commission_due'
    | 'commission_paid'
    | 'commission_paid_at'
    | 'created_at'
    | 'updated_at'
  > {}

export class UserAttribution extends Model<UserAttributionAttributes, UserAttributionCreationAttributes>
  implements UserAttributionAttributes {

  public id!: string
  public user_id!: string
  public partner_id?: string
  public promo_code_id?: string

  public attribution_method!: AttributionMethod
  public referral_url?: string
  public utm_source?: string
  public utm_medium?: string
  public utm_campaign?: string

  public converted_to_paid!: boolean
  public converted_at?: Date
  public first_payment_amount!: number

  public commission_due!: number
  public commission_paid!: boolean
  public commission_paid_at?: Date

  public readonly created_at!: Date
  public readonly updated_at!: Date

  // Association properties (populated when included in queries)
  public user?: User
  public partner?: Partner
  public promo_code?: PromoCode

  // Helper methods
  public async markAsConverted(paymentAmount: number, commissionRate: number): Promise<void> {
    this.converted_to_paid = true
    this.converted_at = new Date()
    this.first_payment_amount = paymentAmount
    this.commission_due = (paymentAmount * commissionRate) / 100
    await this.save()
  }

  public async markCommissionPaid(): Promise<void> {
    this.commission_paid = true
    this.commission_paid_at = new Date()
    await this.save()
  }

  public isOrganic(): boolean {
    return !this.partner_id
  }

  public getDaysSinceSignup(): number {
    const now = new Date()
    const signup = new Date(this.created_at)
    const diff = now.getTime() - signup.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  public getDaysSinceConversion(): number | null {
    if (!this.converted_at) return null
    const now = new Date()
    const conversion = new Date(this.converted_at)
    const diff = now.getTime() - conversion.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }
}

UserAttribution.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    partner_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'NULL if organic signup',
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    promo_code_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'promo_codes',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    attribution_method: {
      type: DataTypes.ENUM(...Object.values(AttributionMethod)),
      allowNull: false,
      comment: 'How they were attributed'
    },
    referral_url: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'Full URL they came from'
    },
    utm_source: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    utm_medium: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    utm_campaign: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    converted_to_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Did they become a paying customer?'
    },
    converted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    first_payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    commission_due: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Commission owed for this referral'
    },
    commission_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    commission_paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When user signed up'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'user_attribution',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id'] },
      { fields: ['partner_id'] },
      { fields: ['converted_to_paid'] },
      { fields: ['commission_paid'] },
      { fields: ['created_at'] },
      { fields: ['partner_id', 'converted_to_paid'] }
    ]
  }
)

// Define associations
User.hasOne(UserAttribution, {
  foreignKey: 'user_id',
  as: 'attribution'
})

UserAttribution.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})

Partner.hasMany(UserAttribution, {
  foreignKey: 'partner_id',
  as: 'attributions'
})

UserAttribution.belongsTo(Partner, {
  foreignKey: 'partner_id',
  as: 'partner'
})

PromoCode.hasMany(UserAttribution, {
  foreignKey: 'promo_code_id',
  as: 'attributions'
})

UserAttribution.belongsTo(PromoCode, {
  foreignKey: 'promo_code_id',
  as: 'promo_code'
})
