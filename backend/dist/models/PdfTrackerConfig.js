"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class PdfTrackerConfig extends sequelize_1.Model {
    /**
     * Get the active configuration (there should only be one)
     */
    static async getActiveConfig() {
        return this.findOne({ where: { is_active: true } });
    }
    /**
     * Update or create the active configuration
     */
    static async upsertConfig(config) {
        const existing = await this.getActiveConfig();
        if (existing) {
            await existing.update(config);
            return existing;
        }
        return this.create({
            subreddits: config.subreddits ?? [],
            pdf_keywords: config.pdf_keywords ?? [],
            complaint_keywords: config.complaint_keywords ?? [],
            viral_threshold: typeof config.viral_threshold === 'number' ? config.viral_threshold : 10,
            is_active: true
        });
    }
}
PdfTrackerConfig.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    subreddits: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    pdf_keywords: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    complaint_keywords: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    viral_threshold: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'pdf_tracker_config',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['is_active'] }
    ]
});
exports.default = PdfTrackerConfig;
//# sourceMappingURL=PdfTrackerConfig.js.map