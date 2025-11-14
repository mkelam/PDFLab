"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetaApplication = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class BetaApplication extends sequelize_1.Model {
}
exports.BetaApplication = BetaApplication;
BetaApplication.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    full_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    company: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    role: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
    },
    use_case: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    monthly_volume: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
    },
    plan_requested: {
        type: sequelize_1.DataTypes.ENUM('starter', 'pro'),
        defaultValue: 'starter',
    },
    linkedin_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    twitter_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    website_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
    },
    reviewed_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
    reviewed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    rejection_reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'created_at',
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
        field: 'updated_at',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'beta_applications',
    timestamps: true,
    underscored: true,
});
//# sourceMappingURL=BetaApplication.js.map