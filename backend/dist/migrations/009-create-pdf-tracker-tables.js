"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    // Create pdf_tracker_config table
    await queryInterface.createTable('pdf_tracker_config', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4
        },
        subreddits: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '[]'
        },
        pdf_keywords: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '[]'
        },
        complaint_keywords: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '[]'
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
    });
    // Add index for is_active
    await queryInterface.addIndex('pdf_tracker_config', ['is_active'], {
        name: 'idx_pdf_tracker_config_is_active'
    });
    // Create pdf_tracker_reports table
    await queryInterface.createTable('pdf_tracker_reports', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4
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
            defaultValue: JSON.stringify({
                total_posts_scanned: 0,
                pdf_posts_found: 0,
                complaints_found: 0,
                comments_with_pdf: 0,
                comments_with_complaints: 0
            })
        },
        subreddit_results: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '[]'
        },
        config_snapshot: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: JSON.stringify({
                subreddits: [],
                pdf_keywords: [],
                complaint_keywords: [],
                viral_threshold: 10
            })
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
    });
    // Add indexes for reports table
    await queryInterface.addIndex('pdf_tracker_reports', ['report_date'], {
        name: 'idx_pdf_tracker_reports_date',
        unique: true
    });
    await queryInterface.addIndex('pdf_tracker_reports', ['generated_at'], {
        name: 'idx_pdf_tracker_reports_generated_at'
    });
    await queryInterface.addIndex('pdf_tracker_reports', ['created_at'], {
        name: 'idx_pdf_tracker_reports_created_at'
    });
    // Insert default configuration
    await queryInterface.bulkInsert('pdf_tracker_config', [{
            id: 'a0000000-0000-0000-0000-000000000001',
            subreddits: JSON.stringify(['GetMotivated', 'LifeProTips', 'GetStudying', 'selfimprovement', 'DecidingToBeBetter', 'gtd', 'books']),
            pdf_keywords: JSON.stringify(['pdf', 'ebook', 'template', 'download', 'printable', 'book']),
            complaint_keywords: JSON.stringify(['wont load', 'doesnt work', 'cant open', 'hate', 'broken', 'crash', 'annoying']),
            viral_threshold: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }]);
}
async function down(queryInterface) {
    await queryInterface.dropTable('pdf_tracker_reports');
    await queryInterface.dropTable('pdf_tracker_config');
}
//# sourceMappingURL=009-create-pdf-tracker-tables.js.map