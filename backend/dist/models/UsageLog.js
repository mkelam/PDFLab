"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageLog = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
const ConversionJob_1 = require("./ConversionJob");
class UsageLog extends sequelize_1.Model {
}
exports.UsageLog = UsageLog;
UsageLog.init({
    id: {
        type: sequelize_1.DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
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
    job_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'conversion_jobs',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    operation_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    success: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    processing_time: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: 'Processing time in milliseconds'
    },
    file_size: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false
    },
    error_code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'usage_logs',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['timestamp']
        },
        {
            fields: ['operation_type']
        },
        {
            fields: ['job_id']
        }
    ]
});
// Define associations
User_1.User.hasMany(UsageLog, {
    foreignKey: 'user_id',
    as: 'usage_logs'
});
UsageLog.belongsTo(User_1.User, {
    foreignKey: 'user_id',
    as: 'user'
});
ConversionJob_1.ConversionJob.hasMany(UsageLog, {
    foreignKey: 'job_id',
    as: 'usage_logs'
});
UsageLog.belongsTo(ConversionJob_1.ConversionJob, {
    foreignKey: 'job_id',
    as: 'job'
});
//# sourceMappingURL=UsageLog.js.map