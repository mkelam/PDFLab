import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { Partner } from './Partner'

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_TRIAL = 'free_trial'
}

interface PromoCodeAttributes {
  id: string
  partner_id: string
  code: string // Promo code (e.g., 'JEFFSU10')

  // Discount Details
  discount_type: DiscountType
  discount_value: number // Percentage (e.g., 10.00 = 10% off) or fixed amount

  // Limitations
  max_uses?: number // NULL = unlimited uses
  current_uses: number
  expires_at?: Date

  // Status
  is_active: boolean

  // Metadata
  created_at: Date
  updated_at: Date
}

interface PromoCodeCreationAttributes
  extends Optional<
    PromoCodeAttributes,
    | 'id'
    | 'discount_type'
    | 'discount_value'
    | 'max_uses'
    | 'current_uses'
    | 'expires_at'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
  > {}

export class PromoCode extends Model<PromoCodeAttributes, PromoCodeCreationAttributes>
  implements PromoCodeAttributes {

  public id!: string
  public partner_id!: string
  public code!: string

  public discount_type!: DiscountType
  public discount_value!: number

  public max_uses?: number
  public current_uses!: number
  public expires_at?: Date

  public is_active!: boolean

  public readonly created_at!: Date
  public readonly updated_at!: Date

  // Helper methods
  public isValid(): boolean {
    if (!this.is_active) return false
    if (this.expires_at && new Date() > this.expires_at) return false
    if (this.max_uses && this.current_uses >= this.max_uses) return false
    return true
  }

  public getRemainingUses(): number | null {
    if (!this.max_uses) return null // Unlimited
    return this.max_uses - this.current_uses
  }

  public async incrementUse(): Promise<void> {
    this.current_uses += 1
    await this.save()
  }

  public getDiscountAmount(price: number): number {
    if (this.discount_type === DiscountType.PERCENTAGE) {
      return (price * this.discount_value) / 100
    } else if (this.discount_type === DiscountType.FIXED) {
      return Math.min(this.discount_value, price)
    }
    return 0
  }

  public getFinalPrice(originalPrice: number): number {
    const discount = this.getDiscountAmount(originalPrice)
    return Math.max(0, originalPrice - discount)
  }
}

PromoCode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Promo code (e.g., "JEFFSU10")',
      set(value: string) {
        // Always store codes in uppercase
        this.setDataValue('code', value.toUpperCase())
      }
    },
    discount_type: {
      type: DataTypes.ENUM(...Object.values(DiscountType)),
      allowNull: false,
      defaultValue: DiscountType.PERCENTAGE
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      comment: 'Percentage (e.g., 10.00 = 10% off) or fixed amount'
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'NULL = unlimited uses'
    },
    current_uses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'promo_codes',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['partner_id'] },
      { fields: ['is_active'] }
    ]
  }
)

// Define associations
Partner.hasMany(PromoCode, {
  foreignKey: 'partner_id',
  as: 'promo_codes'
})

PromoCode.belongsTo(Partner, {
  foreignKey: 'partner_id',
  as: 'partner'
})
