import { QueryInterface } from 'sequelize';
/**
 * Migration: Add PayPal payment gateway support
 *
 * This migration adds PayPal-specific fields to subscriptions and payment_logs tables
 * to support PayPal as an additional payment provider alongside PayFast and PayGenius.
 */
export declare function up(queryInterface: QueryInterface): Promise<void>;
export declare function down(queryInterface: QueryInterface): Promise<void>;
//# sourceMappingURL=008-add-paypal-fields.d.ts.map