import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum PaymentStatus {
  COMPLETE = 'complete',
  FAILED = 'failed',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  SUBSCRIPTION_PAYMENT = 'subscription_payment',
  ONE_TIME = 'one_time',
  REFUND = 'refund'
}

export enum PaymentProvider {
  PAYFAST = 'payfast',
  PAYGENIUS = 'paygenius',
  PAYPAL = 'paypal'
}

interface PaymentLogAttributes {
  id: string
  user_id: string
  subscription_id?: string
  transaction_id: string
  payment_provider?: PaymentProvider
  // PayFast fields (legacy)
  payfast_payment_id?: string
  itn_data?: any
  // PayGenius fields
  paygenius_payment_id?: string
  webhook_data?: any
  // PayPal fields
  paypal_payment_id?: string
  paypal_order_id?: string
  payment_type: PaymentType
  status: PaymentStatus
  amount_gross: number
  amount_fee: number
  amount_net: number
  currency: string
  plan: string
  payment_method?: string
  name_first: string
  name_last?: string
  email_address: string
  item_name: string
  item_description?: string
  custom_data?: any
  error_message?: string
  processed_at?: Date
  created_at: Date
  updated_at: Date
}

interface PaymentLogCreationAttributes extends Optional<PaymentLogAttributes, 'id' | 'created_at' | 'updated_at'> {}

class PaymentLog extends Model<PaymentLogAttributes, PaymentLogCreationAttributes> implements PaymentLogAttributes {
  declare id: string
  declare user_id: string
  declare subscription_id?: string
  declare transaction_id: string
  declare payment_provider?: PaymentProvider
  // PayFast fields (legacy)
  declare payfast_payment_id?: string
  declare itn_data?: any
  // PayGenius fields
  declare paygenius_payment_id?: string
  declare webhook_data?: any
  // PayPal fields
  declare paypal_payment_id?: string
  declare paypal_order_id?: string
  declare payment_type: PaymentType
  declare status: PaymentStatus
  declare amount_gross: number
  declare amount_fee: number
  declare amount_net: number
  declare currency: string
  declare plan: string
  declare payment_method?: string
  declare name_first: string
  declare name_last?: string
  declare email_address: string
  declare item_name: string
  declare item_description?: string
  declare custom_data?: any
  declare error_message?: string
  declare processed_at?: Date
  declare created_at: Date
  declare updated_at: Date
}

PaymentLog.init(
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Our internal transaction ID'
    },
    payment_provider: {
      type: DataTypes.ENUM('payfast', 'paygenius', 'paypal'),
      allowNull: true,
      defaultValue: 'paygenius',
      comment: 'Payment provider used for this transaction'
    },
    payfast_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayFast payment ID (pf_payment_id) - legacy'
    },
    paygenius_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayGenius payment reference'
    },
    paypal_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayPal payment or capture ID'
    },
    paypal_order_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'PayPal order ID'
    },
    payment_type: {
      type: DataTypes.ENUM('subscription', 'subscription_payment', 'one_time', 'refund'),
      allowNull: false,
      defaultValue: 'one_time'
    },
    status: {
      type: DataTypes.ENUM('complete', 'failed', 'pending', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    amount_gross: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Gross amount before fees'
    },
    amount_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'PayFast processing fee'
    },
    amount_net: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Net amount after fees'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    plan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Plan name (free, starter, pro, enterprise)'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment method used (eft, credit_card, etc.)'
    },
    name_first: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name_last: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email_address: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    item_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    item_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    custom_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Custom data sent to PayFast'
    },
    itn_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Full ITN notification data from PayFast (legacy)'
    },
    webhook_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Full webhook notification data from PayGenius'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if payment failed'
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the payment was processed'
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
    tableName: 'payment_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['subscription_id'] },
      { fields: ['payfast_payment_id'] },
      { fields: ['paygenius_payment_id'] },
      { fields: ['paypal_payment_id'] },
      { fields: ['paypal_order_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  }
)

export { PaymentLog }
