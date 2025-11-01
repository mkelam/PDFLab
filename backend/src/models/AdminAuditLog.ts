import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum AuditLogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

interface AdminAuditLogAttributes {
  id: string
  admin_user_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: object
  ip_address?: string
  user_agent?: string
  severity: AuditLogSeverity
  checksum?: string
  created_at: Date
}

interface AdminAuditLogCreationAttributes extends Optional<AdminAuditLogAttributes, 'id' | 'created_at'> {}

export class AdminAuditLog extends Model<AdminAuditLogAttributes, AdminAuditLogCreationAttributes> implements AdminAuditLogAttributes {
  public id!: string
  public admin_user_id!: string
  public action!: string
  public entity_type!: string
  public entity_id?: string
  public changes?: object
  public ip_address?: string
  public user_agent?: string
  public severity!: AuditLogSeverity
  public checksum?: string
  public readonly created_at!: Date
}

AdminAuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    admin_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(AuditLogSeverity)),
      defaultValue: AuditLogSeverity.INFO,
      allowNull: false
    },
    checksum: {
      type: DataTypes.STRING(64),
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
    tableName: 'admin_audit_logs',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['admin_user_id']
      },
      {
        fields: ['entity_type', 'entity_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['severity']
      }
    ]
  }
)
