import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from './User'
import { ConversionJob } from './ConversionJob'

interface UsageLogAttributes {
  id: number
  user_id: string
  job_id?: string
  operation_type: string
  success: boolean
  processing_time?: number
  file_size: number
  error_code?: string
  timestamp: Date
}

interface UsageLogCreationAttributes extends Optional<UsageLogAttributes, 'id' | 'timestamp'> {}

export class UsageLog extends Model<UsageLogAttributes, UsageLogCreationAttributes>
  implements UsageLogAttributes {

  public id!: number
  public user_id!: string
  public job_id?: string
  public operation_type!: string
  public success!: boolean
  public processing_time?: number
  public file_size!: number
  public error_code?: string
  public readonly timestamp!: Date
}

UsageLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
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
    job_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'conversion_jobs',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    operation_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    processing_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Processing time in milliseconds'
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    error_code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
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
  }
)

// Define associations
User.hasMany(UsageLog, {
  foreignKey: 'user_id',
  as: 'usage_logs'
})

UsageLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})

ConversionJob.hasMany(UsageLog, {
  foreignKey: 'job_id',
  as: 'usage_logs'
})

UsageLog.belongsTo(ConversionJob, {
  foreignKey: 'job_id',
  as: 'job'
})
