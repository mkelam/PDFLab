import { QueryInterface, DataTypes } from 'sequelize'

/**
 * Migration: Add PayGenius payment provider support
 *
 * This migration adds fields to support PayGenius as the new payment provider
 * while maintaining PayFast fields for legacy/historical data.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add PayGenius fields to subscriptions table
  await queryInterface.addColumn('subscriptions', 'payment_provider', {
    type: DataTypes.ENUM('payfast', 'paygenius'),
    allowNull: true,
    defaultValue: 'paygenius',
    comment: 'Payment provider used for this subscription'
  })

  await queryInterface.addColumn('subscriptions', 'paygenius_reference', {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'PayGenius payment reference'
  })

  await queryInterface.addColumn('subscriptions', 'paygenius_subscription_id', {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'PayGenius subscription reference for recurring payments'
  })

  // Add indexes for PayGenius fields on subscriptions
  await queryInterface.addIndex('subscriptions', ['paygenius_reference'], {
    name: 'subscriptions_paygenius_reference_idx'
  })

  await queryInterface.addIndex('subscriptions', ['paygenius_subscription_id'], {
    name: 'subscriptions_paygenius_subscription_id_idx'
  })

  // Add PayGenius fields to payment_logs table
  await queryInterface.addColumn('payment_logs', 'payment_provider', {
    type: DataTypes.ENUM('payfast', 'paygenius'),
    allowNull: true,
    defaultValue: 'paygenius',
    comment: 'Payment provider used for this transaction'
  })

  await queryInterface.addColumn('payment_logs', 'paygenius_payment_id', {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'PayGenius payment reference'
  })

  await queryInterface.addColumn('payment_logs', 'webhook_data', {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full webhook notification data from PayGenius'
  })

  // Add index for PayGenius payment ID on payment_logs
  await queryInterface.addIndex('payment_logs', ['paygenius_payment_id'], {
    name: 'payment_logs_paygenius_payment_id_idx'
  })

  // Update existing records to mark them as PayFast
  await queryInterface.sequelize.query(`
    UPDATE subscriptions
    SET payment_provider = 'payfast'
    WHERE payfast_token IS NOT NULL OR payfast_subscription_id IS NOT NULL
  `)

  await queryInterface.sequelize.query(`
    UPDATE payment_logs
    SET payment_provider = 'payfast'
    WHERE payfast_payment_id IS NOT NULL
  `)
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove indexes first
  await queryInterface.removeIndex('subscriptions', 'subscriptions_paygenius_reference_idx')
  await queryInterface.removeIndex('subscriptions', 'subscriptions_paygenius_subscription_id_idx')
  await queryInterface.removeIndex('payment_logs', 'payment_logs_paygenius_payment_id_idx')

  // Remove columns from subscriptions
  await queryInterface.removeColumn('subscriptions', 'payment_provider')
  await queryInterface.removeColumn('subscriptions', 'paygenius_reference')
  await queryInterface.removeColumn('subscriptions', 'paygenius_subscription_id')

  // Remove columns from payment_logs
  await queryInterface.removeColumn('payment_logs', 'payment_provider')
  await queryInterface.removeColumn('payment_logs', 'paygenius_payment_id')
  await queryInterface.removeColumn('payment_logs', 'webhook_data')
}
