"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    // Add 'founder' to user plan enum
    // Note: For PostgreSQL, you need to add the enum value
    // For SQLite/MySQL, the enum is stored as string so no change needed
    try {
        // Try PostgreSQL syntax first
        await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_plan" ADD VALUE IF NOT EXISTS 'founder';
    `);
    }
    catch (error) {
        // If it fails (e.g., SQLite doesn't use enum types), ignore
        console.log('Note: Could not add enum value (may not be needed for this database type)');
    }
    // Add priority column to feedback table
    await queryInterface.addColumn('feedback', 'priority', {
        type: sequelize_1.DataTypes.ENUM('normal', 'high'),
        allowNull: false,
        defaultValue: 'normal'
    });
    // Add is_founder column to feedback table
    await queryInterface.addColumn('feedback', 'is_founder', {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    });
    // Add indexes for the new columns
    await queryInterface.addIndex('feedback', ['priority'], {
        name: 'idx_feedback_priority'
    });
    await queryInterface.addIndex('feedback', ['is_founder'], {
        name: 'idx_feedback_is_founder'
    });
}
async function down(queryInterface) {
    // Remove indexes
    await queryInterface.removeIndex('feedback', 'idx_feedback_priority');
    await queryInterface.removeIndex('feedback', 'idx_feedback_is_founder');
    // Remove columns
    await queryInterface.removeColumn('feedback', 'priority');
    await queryInterface.removeColumn('feedback', 'is_founder');
    // Note: Removing enum value from PostgreSQL is complex and usually not done in down migrations
}
//# sourceMappingURL=006-add-founder-feedback-fields.js.map