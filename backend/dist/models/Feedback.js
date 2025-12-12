"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Feedback extends sequelize_1.Model {
}
Feedback.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    user_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    user_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('bug', 'feature', 'general', 'other'),
        allowNull: false,
        defaultValue: 'general'
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    page_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    screenshot_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('new', 'in_progress', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'new'
    },
    priority: {
        type: sequelize_1.DataTypes.ENUM('normal', 'high'),
        allowNull: false,
        defaultValue: 'normal'
    },
    is_founder: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    admin_reply: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    admin_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    resolved_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'feedback',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['status'] },
        { fields: ['type'] },
        { fields: ['user_id'] },
        { fields: ['created_at'] },
        { fields: ['priority'] },
        { fields: ['is_founder'] }
    ]
});
exports.default = Feedback;
//# sourceMappingURL=Feedback.js.map