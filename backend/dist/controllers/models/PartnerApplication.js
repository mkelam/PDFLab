"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class PartnerApplication extends sequelize_1.Model {
}
PartnerApplication.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    full_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    brand_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    country: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    primary_platform: {
        type: sequelize_1.DataTypes.ENUM('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'blog', 'newsletter', 'other'),
        allowNull: false
    },
    audience_size: {
        type: sequelize_1.DataTypes.ENUM('under_1k', '1k_10k', '10k_50k', '50k_100k', '100k_500k', '500k_plus'),
        allowNull: false
    },
    audience_niche: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    platform_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false
        // No URL validation - accepts usernames, handles, or URLs
    },
    why_pdflab: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true // Optional field
    },
    promotion_methods: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    content_idea: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true // Optional field
    },
    estimated_conversions: {
        type: sequelize_1.DataTypes.ENUM('1_10', '10_50', '50_100', '100_plus'),
        allowNull: true
    },
    previous_affiliates: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged'),
        defaultValue: 'pending'
    },
    score: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0
    },
    reviewed_by: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true
    },
    reviewed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    rejection_reason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    admin_notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'partner_applications',
    timestamps: true,
    underscored: true
});
exports.default = PartnerApplication;
