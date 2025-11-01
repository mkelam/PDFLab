import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface PasswordHistoryAttributes {
  id: string
  user_id: string
  password_hash: string
  created_at: Date
}

interface PasswordHistoryCreationAttributes extends Optional<PasswordHistoryAttributes, 'id' | 'created_at'> {}

export class PasswordHistory extends Model<PasswordHistoryAttributes, PasswordHistoryCreationAttributes> implements PasswordHistoryAttributes {
  public id!: string
  public user_id!: string
  public password_hash!: string
  public readonly created_at!: Date
}

PasswordHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'password_history',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      }
    ]
  }
)
