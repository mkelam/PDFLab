"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const sequelize_1 = require("sequelize");
async function up(queryInterface) {
    await queryInterface.createTable('batch_jobs', {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4
        },
        user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        batch_name: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: false
        },
        operation_type: {
            type: sequelize_1.DataTypes.ENUM('convert', 'compress', 'merge'),
            allowNull: false
        },
        total_files: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        completed_files: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        failed_files: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: sequelize_1.DataTypes.ENUM('pending', 'processing', 'completed', 'partial', 'failed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending'
        },
        progress: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        conversion_job_ids: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '[]'
        },
        zip_file_path: {
            type: sequelize_1.DataTypes.STRING(500),
            allowNull: true
        },
        total_size: {
            type: sequelize_1.DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0
        },
        options: {
            type: sequelize_1.DataTypes.JSON,
            allowNull: false,
            defaultValue: '{}'
        },
        error_message: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true
        },
        processing_started_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true
        },
        processing_completed_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true
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
        expires_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false
        }
    });
    // Add indexes for performance
    await queryInterface.addIndex('batch_jobs', ['user_id'], {
        name: 'idx_batch_jobs_user_id'
    });
    await queryInterface.addIndex('batch_jobs', ['status'], {
        name: 'idx_batch_jobs_status'
    });
    await queryInterface.addIndex('batch_jobs', ['created_at'], {
        name: 'idx_batch_jobs_created_at'
    });
    await queryInterface.addIndex('batch_jobs', ['expires_at'], {
        name: 'idx_batch_jobs_expires_at'
    });
}
async function down(queryInterface) {
    await queryInterface.dropTable('batch_jobs');
}
//# sourceMappingURL=005-create-batch-jobs.js.map