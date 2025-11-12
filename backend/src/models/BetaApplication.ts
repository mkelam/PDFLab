import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BetaApplicationAttributes {
  id: string;
  full_name: string;
  email: string;
  company?: string;
  role?: string;
  use_case: string;
  monthly_volume?: string;
  plan_requested: 'starter' | 'pro';
  linkedin_url?: string;
  twitter_url?: string;
  website_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  user_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface BetaApplicationCreationAttributes extends Optional<BetaApplicationAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class BetaApplication extends Model<BetaApplicationAttributes, BetaApplicationCreationAttributes> implements BetaApplicationAttributes {
  public id!: string;
  public full_name!: string;
  public email!: string;
  public company?: string;
  public role?: string;
  public use_case!: string;
  public monthly_volume?: string;
  public plan_requested!: 'starter' | 'pro';
  public linkedin_url?: string;
  public twitter_url?: string;
  public website_url?: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public reviewed_by?: string;
  public reviewed_at?: Date;
  public rejection_reason?: string;
  public user_id?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

BetaApplication.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    use_case: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    monthly_volume: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    plan_requested: {
      type: DataTypes.ENUM('starter', 'pro'),
      defaultValue: 'starter',
    },
    linkedin_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    twitter_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    website_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'beta_applications',
    timestamps: true,
    underscored: true,
  }
);
