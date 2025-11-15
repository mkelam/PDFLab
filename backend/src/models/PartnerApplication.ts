import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface PartnerApplicationAttributes {
  id: string
  email: string
  full_name: string
  brand_name?: string
  country?: string

  // Audience data
  primary_platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'blog' | 'newsletter' | 'other'
  audience_size: 'under_1k' | '1k_10k' | '10k_50k' | '50k_100k' | '100k_500k' | '500k_plus'
  audience_niche: string
  platform_url: string

  // Application content
  why_pdflab?: string
  promotion_methods: string[]
  content_idea?: string
  estimated_conversions?: '1_10' | '10_50' | '50_100' | '100_plus'
  previous_affiliates?: string

  // Review data
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  score: number
  reviewed_by?: string
  reviewed_at?: Date
  rejection_reason?: string
  admin_notes?: string

  // Timestamps
  created_at?: Date
  updated_at?: Date
}

interface PartnerApplicationCreationAttributes extends Optional<PartnerApplicationAttributes, 'id' | 'status' | 'score'> {}

class PartnerApplication extends Model<PartnerApplicationAttributes, PartnerApplicationCreationAttributes> implements PartnerApplicationAttributes {
  public id!: string
  public email!: string
  public full_name!: string
  public brand_name?: string
  public country?: string

  public primary_platform!: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'blog' | 'newsletter' | 'other'
  public audience_size!: 'under_1k' | '1k_10k' | '10k_50k' | '50k_100k' | '100k_500k' | '500k_plus'
  public audience_niche!: string
  public platform_url!: string

  public why_pdflab!: string
  public promotion_methods!: string[]
  public content_idea!: string
  public estimated_conversions?: '1_10' | '10_50' | '50_100' | '100_plus'
  public previous_affiliates?: string

  public status!: 'pending' | 'approved' | 'rejected' | 'flagged'
  public score!: number
  public reviewed_by?: string
  public reviewed_at?: Date
  public rejection_reason?: string
  public admin_notes?: string

  public readonly created_at!: Date
  public readonly updated_at!: Date
}

PartnerApplication.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    brand_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    primary_platform: {
      type: DataTypes.ENUM('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'blog', 'newsletter', 'other'),
      allowNull: false
    },
    audience_size: {
      type: DataTypes.ENUM('under_1k', '1k_10k', '10k_50k', '50k_100k', '100k_500k', '500k_plus'),
      allowNull: false
    },
    audience_niche: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    platform_url: {
      type: DataTypes.STRING(500),
      allowNull: false
      // No URL validation - accepts usernames, handles, or URLs
    },
    why_pdflab: {
      type: DataTypes.TEXT,
      allowNull: true  // Optional field
    },
    promotion_methods: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    content_idea: {
      type: DataTypes.TEXT,
      allowNull: true  // Optional field
    },
    estimated_conversions: {
      type: DataTypes.ENUM('1_10', '10_50', '50_100', '100_plus'),
      allowNull: true
    },
    previous_affiliates: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged'),
      defaultValue: 'pending'
    },
    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'partner_applications',
    timestamps: true,
    underscored: true
  }
)

export default PartnerApplication
