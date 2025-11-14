"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionJob = exports.JobStatus = exports.ConversionType = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
var ConversionType;
(function (ConversionType) {
    ConversionType["PDF_TO_PPTX"] = "pdf_to_pptx";
    ConversionType["PDF_TO_DOCX"] = "pdf_to_docx";
    ConversionType["PDF_TO_XLSX"] = "pdf_to_xlsx";
    ConversionType["PDF_TO_PNG"] = "pdf_to_png";
    ConversionType["PDF_TO_IMAGES"] = "pdf_to_images";
    ConversionType["PDF_MERGE"] = "pdf_merge";
    ConversionType["PDF_COMPRESS"] = "pdf_compress";
})(ConversionType || (exports.ConversionType = ConversionType = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["QUEUED"] = "queued";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
class ConversionJob extends sequelize_1.Model {
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
    getOutputFormat() {
        switch (this.type) {
            case ConversionType.PDF_TO_PPTX:
                return 'pptx';
            case ConversionType.PDF_TO_DOCX:
                return 'docx';
            case ConversionType.PDF_TO_XLSX:
                return 'xlsx';
            case ConversionType.PDF_TO_PNG:
                return 'png';
            case ConversionType.PDF_TO_IMAGES:
                return 'zip';
            case ConversionType.PDF_MERGE:
                return 'pdf';
            case ConversionType.PDF_COMPRESS:
                return 'pdf';
            default:
                return 'bin';
        }
    }
}
exports.ConversionJob = ConversionJob;
ConversionJob.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true // Allow NULL for guest conversions
        // Note: Foreign key constraint removed to allow guest conversions
        // Guest conversions have user_id = NULL
    },
    type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(ConversionType)),
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(JobStatus)),
        defaultValue: JobStatus.PENDING,
        allowNull: false
    },
    progress: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
            max: 100
        }
    },
    input_file: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    output_file: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    file_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    file_size: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false
    },
    cloudconvert_job_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    error_message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    estimated_time: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated processing time in seconds'
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
        defaultValue: () => new Date(Date.now() + 3600000) // 1 hour from now
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'conversion_jobs',
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
        },
        {
            fields: ['cloudconvert_job_id']
        }
    ]
});
// Define associations
User_1.User.hasMany(ConversionJob, {
    foreignKey: 'user_id',
    as: 'conversion_jobs',
    constraints: false // Don't enforce foreign key constraint
});
ConversionJob.belongsTo(User_1.User, {
    foreignKey: {
        name: 'user_id',
        allowNull: true // Allow guest conversions without user
    },
    as: 'user',
    constraints: false // Don't enforce foreign key constraint in DB
});
//# sourceMappingURL=ConversionJob.js.map