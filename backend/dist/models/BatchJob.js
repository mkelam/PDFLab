"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJob = exports.BatchStatus = exports.BatchOperationType = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
var BatchOperationType;
(function (BatchOperationType) {
    BatchOperationType["CONVERT"] = "convert";
    BatchOperationType["COMPRESS"] = "compress";
    BatchOperationType["MERGE"] = "merge";
})(BatchOperationType || (exports.BatchOperationType = BatchOperationType = {}));
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["PENDING"] = "pending";
    BatchStatus["PROCESSING"] = "processing";
    BatchStatus["COMPLETED"] = "completed";
    BatchStatus["PARTIAL"] = "partial";
    BatchStatus["FAILED"] = "failed";
    BatchStatus["CANCELLED"] = "cancelled";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
class BatchJob extends sequelize_1.Model {
    // Helper methods
    getProcessingTime() {
        if (this.processing_started_at && this.processing_completed_at) {
            return this.processing_completed_at.getTime() - this.processing_started_at.getTime();
        }
        return null;
    }
    isExpired() {
        return new Date() > this.expires_at;
    }
    isComplete() {
        return this.status === BatchStatus.COMPLETED || this.status === BatchStatus.PARTIAL;
    }
    canCancel() {
        return this.status === BatchStatus.PENDING || this.status === BatchStatus.PROCESSING;
    }
    updateProgress() {
        if (this.total_files === 0) {
            this.progress = 0;
            return;
        }
        this.progress = Math.round((this.completed_files / this.total_files) * 100);
        // Update status based on completion
        if (this.completed_files === this.total_files) {
            if (this.failed_files === 0) {
                this.status = BatchStatus.COMPLETED;
            }
            else {
                this.status = BatchStatus.PARTIAL;
            }
            this.processing_completed_at = new Date();
        }
        else if (this.completed_files > 0 || this.failed_files > 0) {
            this.status = BatchStatus.PROCESSING;
        }
    }
    getSuccessRate() {
        if (this.total_files === 0)
            return 0;
        return Math.round((this.completed_files / this.total_files) * 100);
    }
    getFailureRate() {
        if (this.total_files === 0)
            return 0;
        return Math.round((this.failed_files / this.total_files) * 100);
    }
}
exports.BatchJob = BatchJob;
BatchJob.init({
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
        type: sequelize_1.DataTypes.ENUM(...Object.values(BatchOperationType)),
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
        type: sequelize_1.DataTypes.ENUM(...Object.values(BatchStatus)),
        allowNull: false,
        defaultValue: BatchStatus.PENDING
    },
    progress: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100
        }
    },
    conversion_job_ids: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        defaultValue: []
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
        defaultValue: {}
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
        allowNull: false,
        defaultValue: () => new Date(Date.now() + 7 * 24 * 3600000) // 7 days
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'batch_jobs',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['expires_at']
        }
    ]
});
// Association with User
User_1.User.hasMany(BatchJob, {
    foreignKey: 'user_id',
    as: 'batchJobs'
});
BatchJob.belongsTo(User_1.User, {
    foreignKey: 'user_id',
    as: 'user'
});
//# sourceMappingURL=BatchJob.js.map