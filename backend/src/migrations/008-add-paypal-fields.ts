import { QueryInterface, DataTypes } from 'sequelize'

/**
 * Migration: Add PayPal payment gateway support
 *
 * This migration adds PayPal-specific fields to subscriptions and payment_logs tables
 * to support PayPal as an additional payment provider alongside PayFast and PayGenius.
 */

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // ========================================
    // 1. Update payment_provider ENUM to include 'paypal'
    // ========================================

    // For subscriptions table
    await queryInterface.sequelize.query(`
      ALTER TABLE subscriptions
      MODIFY COLUMN payment_provider ENUM('payfast', 'paygenius', 'paypal')
      DEFAULT 'paygenius'
    `, { transaction })

    // For payment_logs table
    await queryInterface.sequelize.query(`
      ALTER TABLE payment_logs
      MODIFY COLUMN payment_provider ENUM('payfast', 'paygenius', 'paypal')
      DEFAULT 'paygenius'
    `, { transaction })

    // ========================================
    // 2. Add PayPal fields to subscriptions table
    // ========================================

    // PayPal subscription ID (for recurring subscriptions)
    await queryInterface.addColumn(
      'subscriptions',
      'paypal_subscription_id',
      {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayPal subscription ID for recurring payments'
      },
      { transaction }
    )

    // PayPal order ID (for one-time payments)
    await queryInterface.addColumn(
      'subscriptions',
      'paypal_order_id',
      {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayPal order ID for one-time payments'
      },
      { transaction }
    )

    // ========================================
    // 3. Add PayPal fields to payment_logs table
    // ========================================

    // PayPal payment/capture ID
    await queryInterface.addColumn(
      'payment_logs',
      'paypal_payment_id',
      {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayPal payment or capture ID'
      },
      { transaction }
    )

    // PayPal order ID
    await queryInterface.addColumn(
      'payment_logs',
      'paypal_order_id',
      {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayPal order ID'
      },
      { transaction }
    )

    // ========================================
    // 4. Create indexes for PayPal fields
    // ========================================

    await queryInterface.addIndex(
      'subscriptions',
      ['paypal_subscription_id'],
      {
        name: 'idx_subscriptions_paypal_subscription_id',
        transaction
      }
    )

    await queryInterface.addIndex(
      'subscriptions',
      ['paypal_order_id'],
      {
        name: 'idx_subscriptions_paypal_order_id',
        transaction
      }
    )

    await queryInterface.addIndex(
      'payment_logs',
      ['paypal_payment_id'],
      {
        name: 'idx_payment_logs_paypal_payment_id',
        transaction
      }
    )

    await queryInterface.addIndex(
      'payment_logs',
      ['paypal_order_id'],
      {
        name: 'idx_payment_logs_paypal_order_id',
        transaction
      }
    )

    await transaction.commit()
    console.log('Migration 008-add-paypal-fields completed successfully')
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Remove indexes
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_paypal_subscription_id', { transaction })
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_paypal_order_id', { transaction })
    await queryInterface.removeIndex('payment_logs', 'idx_payment_logs_paypal_payment_id', { transaction })
    await queryInterface.removeIndex('payment_logs', 'idx_payment_logs_paypal_order_id', { transaction })

    // Remove PayPal columns from payment_logs
    await queryInterface.removeColumn('payment_logs', 'paypal_order_id', { transaction })
    await queryInterface.removeColumn('payment_logs', 'paypal_payment_id', { transaction })

    // Remove PayPal columns from subscriptions
    await queryInterface.removeColumn('subscriptions', 'paypal_order_id', { transaction })
    await queryInterface.removeColumn('subscriptions', 'paypal_subscription_id', { transaction })

    // Revert payment_provider ENUM (remove 'paypal')
    await queryInterface.sequelize.query(`
      ALTER TABLE subscriptions
      MODIFY COLUMN payment_provider ENUM('payfast', 'paygenius')
      DEFAULT 'paygenius'
    `, { transaction })

    await queryInterface.sequelize.query(`
      ALTER TABLE payment_logs
      MODIFY COLUMN payment_provider ENUM('payfast', 'paygenius')
      DEFAULT 'paygenius'
    `, { transaction })

    await transaction.commit()
    console.log('Migration 008-add-paypal-fields rolled back successfully')
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
