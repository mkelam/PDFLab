"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class PdfTrackerReport extends sequelize_1.Model {
}
PdfTrackerReport.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    report_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        unique: true
    },
    generated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    stats: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            total_posts_scanned: 0,
            pdf_posts_found: 0,
            complaints_found: 0,
            comments_with_pdf: 0,
            comments_with_complaints: 0
        }
    },
    subreddit_results: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    config_snapshot: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: {
            subreddits: [],
            pdf_keywords: [],
            complaint_keywords: [],
            viral_threshold: 10
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
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'pdf_tracker_reports',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['report_date'], unique: true },
        { fields: ['generated_at'] },
        { fields: ['created_at'] }
    ]
});
exports.default = PdfTrackerReport;
//# sourceMappingURL=PdfTrackerReport.js.map