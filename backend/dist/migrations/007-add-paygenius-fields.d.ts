import { QueryInterface } from 'sequelize';
/**
 * Migration: Add PayGenius payment provider support
 *
 * This migration adds fields to support PayGenius as the new payment provider
 * while maintaining PayFast fields for legacy/historical data.
 */
export declare function up(queryInterface: QueryInterface): Promise<void>;
export declare function down(queryInterface: QueryInterface): Promise<void>;
//# sourceMappingURL=007-add-paygenius-fields.d.ts.map