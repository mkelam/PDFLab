import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

interface SystemHealthLogAttributes {
  id: string
  metric_name: string
  metric_value?: number
  status: HealthStatus
  details?: object
  created_at: Date
}

interface SystemHealthLogCreationAttributes extends Optional<SystemHealthLogAttributes, 'id' | 'created_at'> {}

export class SystemHealthLog extends Model<SystemHealthLogAttributes, SystemHealthLogCreationAttributes> implements SystemHealthLogAttributes {
  public id!: string
  public metric_name!: string
  public metric_value?: number
  public status!: HealthStatus
  public details?: object
  public readonly created_at!: Date
}

SystemHealthLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    metric_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    metric_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(HealthStatus)),
      defaultValue: HealthStatus.HEALTHY,
      allowNull: false
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'system_health_logs',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['metric_name']
      },
      {
        fields: ['created_at']
      }
    ]
  }
)
