import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from './User'

export enum BatchOperationType {
  CONVERT = 'convert',
  COMPRESS = 'compress',
  MERGE = 'merge'
}

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL = 'partial', // Some files succeeded, some failed
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BatchOptions {
  output_format?: 'pptx' | 'docx' | 'xlsx' | 'png' | 'jpg' // For convert operation
  compression_level?: 'good' | 'recommended' | 'extreme' // For compress operation
}

interface BatchJobAttributes {
  id: string
  user_id: string // Required - no guest batch processing
  batch_name: string
  operation_type: BatchOperationType
  total_files: number
  completed_files: number
  failed_files: number
  status: BatchStatus
  progress: number // 0-100
  conversion_job_ids: string[] // Array of ConversionJob IDs
  zip_file_path?: string
  total_size: number // Total size of all input files in bytes
  options: BatchOptions
  error_message?: string
  processing_started_at?: Date
  processing_completed_at?: Date
  created_at: Date
  updated_at: Date
  expires_at: Date
}

interface BatchJobCreationAttributes
  extends Optional<
    BatchJobAttributes,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'progress'
    | 'status'
    | 'completed_files'
    | 'failed_files'
  > {}

export class BatchJob
  extends Model<BatchJobAttributes, BatchJobCreationAttributes>
  implements BatchJobAttributes
{
  public id!: string
  public user_id!: string
  public batch_name!: string
  public operation_type!: BatchOperationType
  public total_files!: number
  public completed_files!: number
  public failed_files!: number
  public status!: BatchStatus
  public progress!: number
  public conversion_job_ids!: string[]
  public zip_file_path?: string
  public total_size!: number
  public options!: BatchOptions
  public error_message?: string
  public processing_started_at?: Date
  public processing_completed_at?: Date
  public readonly created_at!: Date
  public readonly updated_at!: Date
  public expires_at!: Date

  // Helper methods
  public getProcessingTime(): number | null {
    if (this.processing_started_at && this.processing_completed_at) {
      return this.processing_completed_at.getTime() - this.processing_started_at.getTime()
    }
    return null
  }

  public isExpired(): boolean {
    return new Date() > this.expires_at
  }

  public isComplete(): boolean {
    return this.status === BatchStatus.COMPLETED || this.status === BatchStatus.PARTIAL
  }

  public canCancel(): boolean {
    return this.status === BatchStatus.PENDING || this.status === BatchStatus.PROCESSING
  }

  public updateProgress(): void {
    if (this.total_files === 0) {
      this.progress = 0
      return
    }

    this.progress = Math.round((this.completed_files / this.total_files) * 100)

    // Update status based on completion
    if (this.completed_files === this.total_files) {
      if (this.failed_files === 0) {
        this.status = BatchStatus.COMPLETED
      } else {
        this.status = BatchStatus.PARTIAL
      }
      this.processing_completed_at = new Date()
    } else if (this.completed_files > 0 || this.failed_files > 0) {
      this.status = BatchStatus.PROCESSING
    }
  }

  public getSuccessRate(): number {
    if (this.total_files === 0) return 0
    return Math.round((this.completed_files / this.total_files) * 100)
  }

  public getFailureRate(): number {
    if (this.total_files === 0) return 0
    return Math.round((this.failed_files / this.total_files) * 100)
  }
}

BatchJob.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    batch_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    operation_type: {
      type: DataTypes.ENUM(...Object.values(BatchOperationType)),
      allowNull: false
    },
    total_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completed_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failed_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BatchStatus)),
      allowNull: false,
      defaultValue: BatchStatus.PENDING
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    conversion_job_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    zip_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    total_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processing_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processing_completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 7 * 24 * 3600000) // 7 days
    }
  },
  {
    sequelize,
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
  }
)

// Association with User
User.hasMany(BatchJob, {
  foreignKey: 'user_id',
  as: 'batchJobs'
})
BatchJob.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})
