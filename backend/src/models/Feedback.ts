import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export type FeedbackType = 'bug' | 'feature' | 'general' | 'other'
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed'

export interface FeedbackAttributes {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  type: FeedbackType
  message: string
  page_url: string | null
  user_agent: string | null
  screenshot_url: string | null
  status: FeedbackStatus
  admin_reply: string | null
  admin_id: string | null
  created_at?: Date
  updated_at?: Date
  resolved_at?: Date | null
}

export interface FeedbackCreationAttributes extends Optional<FeedbackAttributes, 'id' | 'user_id' | 'user_email' | 'user_name' | 'page_url' | 'user_agent' | 'screenshot_url' | 'status' | 'admin_reply' | 'admin_id' | 'resolved_at'> {}

class Feedback extends Model<FeedbackAttributes, FeedbackCreationAttributes> implements FeedbackAttributes {
  declare id: string
  declare user_id: string | null
  declare user_email: string | null
  declare user_name: string | null
  declare type: FeedbackType
  declare message: string
  declare page_url: string | null
  declare user_agent: string | null
  declare screenshot_url: string | null
  declare status: FeedbackStatus
  declare admin_reply: string | null
  declare admin_id: string | null
  declare readonly created_at: Date
  declare readonly updated_at: Date
  declare resolved_at: Date | null
}

Feedback.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('bug', 'feature', 'general', 'other'),
      allowNull: false,
      defaultValue: 'general'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    page_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    screenshot_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('new', 'in_progress', 'resolved', 'dismissed'),
      allowNull: false,
      defaultValue: 'new'
    },
    admin_reply: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
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
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'feedback',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['type'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] }
    ]
  }
)

export default Feedback
