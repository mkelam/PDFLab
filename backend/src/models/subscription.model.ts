import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  PENDING = 'pending'
}

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

interface SubscriptionAttributes {
  id: string
  user_id: string
  plan: PlanType
  status: SubscriptionStatus
  payfast_token?: string
  payfast_subscription_id?: string
  amount: number
  currency: string
  billing_date?: Date
  next_billing_date?: Date
  cancel_at?: Date
  canceled_at?: Date
  trial_end?: Date
  started_at: Date
  ended_at?: Date
  created_at: Date
  updated_at: Date
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  declare id: string
  declare user_id: string
  declare plan: PlanType
  declare status: SubscriptionStatus
  declare payfast_token?: string
  declare payfast_subscription_id?: string
  declare amount: number
  declare currency: string
  declare billing_date?: Date
  declare next_billing_date?: Date
  declare cancel_at?: Date
  declare canceled_at?: Date
  declare trial_end?: Date
  declare started_at: Date
  declare ended_at?: Date
  declare created_at: Date
  declare updated_at: Date
}

Subscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    plan: {
      type: DataTypes.ENUM('free', 'starter', 'pro', 'enterprise'),
      allowNull: false,
      defaultValue: 'free'
    },
    status: {
      type: DataTypes.ENUM('active', 'canceled', 'past_due', 'trialing', 'pending'),
      allowNull: false,
      defaultValue: 'pending'
    },
    payfast_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayFast subscription token for recurring payments'
    },
    payfast_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayFast subscription ID'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Subscription amount in currency'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Currency code (USD for United States Dollar)'
    },
    billing_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'First billing date'
    },
    next_billing_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next billing date for recurring subscription'
    },
    cancel_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Scheduled cancellation date'
    },
    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Actual cancellation timestamp'
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Trial period end date'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Subscription start date'
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Subscription end date (if canceled)'
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
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['payfast_token'] },
      { fields: ['next_billing_date'] }
    ]
  }
)

export { Subscription }
