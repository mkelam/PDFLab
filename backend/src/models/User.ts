import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum UserRole {
  USER = 'user',
  SUPPORT = 'support',
  FINANCE = 'finance',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum UserPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing'
}

interface UserAttributes {
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
  failed_reset_attempts: number
  reset_locked_until?: Date
  created_at: Date
  updated_at: Date
  last_login?: Date
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'created_at' | 'updated_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string
  public email!: string
  public password_hash!: string
  public name?: string
  public role!: UserRole
  public plan!: UserPlan
  public conversions_used!: number
  public conversions_limit!: number
  public stripe_customer_id?: string
  public subscription_id?: string
  public subscription_status?: SubscriptionStatus
  public subscription_end_date?: Date
  public failed_reset_attempts!: number
  public reset_locked_until?: Date
  public readonly created_at!: Date
  public readonly updated_at!: Date
  public last_login?: Date

  // Helper methods
  public canConvert(): boolean {
    if (this.plan === UserPlan.PRO || this.plan === UserPlan.ENTERPRISE) {
      return true // Unlimited
    }
    return this.conversions_used < this.conversions_limit
  }

  public getMaxFileSize(): number {
    switch (this.plan) {
      case UserPlan.FREE:
        return parseInt(process.env.MAX_FILE_SIZE_FREE || '10485760') // 10MB
      case UserPlan.STARTER:
        return parseInt(process.env.MAX_FILE_SIZE_STARTER || '26214400') // 25MB
      case UserPlan.PRO:
        return parseInt(process.env.MAX_FILE_SIZE_PRO || '104857600') // 100MB
      case UserPlan.ENTERPRISE:
        return 524288000 // 500MB
      default:
        return 10485760
    }
  }

  public resetMonthlyUsage(): void {
    this.conversions_used = 0
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      defaultValue: UserRole.USER,
      allowNull: false
    },
    plan: {
      type: DataTypes.ENUM(...Object.values(UserPlan)),
      defaultValue: UserPlan.FREE,
      allowNull: false
    },
    conversions_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    conversions_limit: {
      type: DataTypes.INTEGER,
      defaultValue: parseInt(process.env.CONVERSIONS_LIMIT_FREE || '3'),
      allowNull: false
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    subscription_status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: true
    },
    subscription_end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_reset_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    reset_locked_until: {
      type: DataTypes.DATE,
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
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['stripe_customer_id']
      }
    ]
  }
)
