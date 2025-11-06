import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from './User'

export enum ConversionType {
  PDF_TO_PPTX = 'pdf_to_pptx',
  PDF_TO_DOCX = 'pdf_to_docx',
  PDF_TO_XLSX = 'pdf_to_xlsx',
  PDF_TO_IMAGES = 'pdf_to_images',
  PDF_MERGE = 'pdf_merge',
  PDF_COMPRESS = 'pdf_compress'
}

export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface ConversionJobAttributes {
  id: string
  user_id: string | null  // Nullable for guest conversions
  type: ConversionType
  status: JobStatus
  progress: number
  input_file?: string
  output_file?: string
  file_name: string
  file_size: number
  cloudconvert_job_id?: string
  error_message?: string
  estimated_time?: number
  processing_started_at?: Date
  processing_completed_at?: Date
  created_at: Date
  updated_at: Date
  expires_at: Date
}

interface ConversionJobCreationAttributes
  extends Optional<ConversionJobAttributes, 'id' | 'created_at' | 'updated_at' | 'progress' | 'status'> {}

export class ConversionJob extends Model<ConversionJobAttributes, ConversionJobCreationAttributes>
  implements ConversionJobAttributes {

  public id!: string
  public user_id!: string | null  // Nullable for guest conversions
  public type!: ConversionType
  public status!: JobStatus
  public progress!: number
  public input_file?: string
  public output_file?: string
  public file_name!: string
  public file_size!: number
  public cloudconvert_job_id?: string
  public error_message?: string
  public estimated_time?: number
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

  public getOutputFormat(): string {
    switch (this.type) {
      case ConversionType.PDF_TO_PPTX:
        return 'pptx'
      case ConversionType.PDF_TO_DOCX:
        return 'docx'
      case ConversionType.PDF_TO_XLSX:
        return 'xlsx'
      case ConversionType.PDF_TO_IMAGES:
        return 'zip'
      case ConversionType.PDF_MERGE:
        return 'pdf'
      case ConversionType.PDF_COMPRESS:
        return 'pdf'
      default:
        return 'bin'
    }
  }
}

ConversionJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true  // Allow NULL for guest conversions
      // Note: Foreign key constraint removed to allow guest conversions
      // Guest conversions have user_id = NULL
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ConversionType)),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(...Object.values(JobStatus)),
      defaultValue: JobStatus.PENDING,
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    input_file: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    output_file: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    cloudconvert_job_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimated_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Estimated processing time in seconds'
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
      defaultValue: () => new Date(Date.now() + 3600000) // 1 hour from now
    }
  },
  {
    sequelize,
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
  }
)

// Define associations
User.hasMany(ConversionJob, {
  foreignKey: 'user_id',
  as: 'conversion_jobs',
  constraints: false  // Don't enforce foreign key constraint
})

ConversionJob.belongsTo(User, {
  foreignKey: {
    name: 'user_id',
    allowNull: true  // Allow guest conversions without user
  },
  as: 'user',
  constraints: false  // Don't enforce foreign key constraint in DB
})
