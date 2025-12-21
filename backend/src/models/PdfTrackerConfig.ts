import type { Optional } from 'sequelize';
import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../config/database'

export interface PdfTrackerConfigAttributes {
  id: string
  subreddits: string[]
  pdf_keywords: string[]
  complaint_keywords: string[]
  viral_threshold: number
  is_active: boolean
  created_at?: Date
  updated_at?: Date
}

export interface PdfTrackerConfigCreationAttributes extends Optional<PdfTrackerConfigAttributes, 'id' | 'is_active' | 'created_at' | 'updated_at'> {}

class PdfTrackerConfig extends Model<PdfTrackerConfigAttributes, PdfTrackerConfigCreationAttributes> implements PdfTrackerConfigAttributes {
  declare id: string
  declare subreddits: string[]
  declare pdf_keywords: string[]
  declare complaint_keywords: string[]
  declare viral_threshold: number
  declare is_active: boolean
  declare readonly created_at: Date
  declare readonly updated_at: Date

  /**
   * Get the active configuration (there should only be one)
   */
  static async getActiveConfig(): Promise<PdfTrackerConfig | null> {
    return this.findOne({ where: { is_active: true } })
  }

  /**
   * Update or create the active configuration
   */
  static async upsertConfig(config: Partial<PdfTrackerConfigCreationAttributes>): Promise<PdfTrackerConfig> {
    const existing = await this.getActiveConfig()

    if (existing) {
      await existing.update(config)
      return existing
    }

    return this.create({
      subreddits: config.subreddits ?? [],
      pdf_keywords: config.pdf_keywords ?? [],
      complaint_keywords: config.complaint_keywords ?? [],
      viral_threshold: typeof config.viral_threshold === 'number' ? config.viral_threshold : 10,
      is_active: true
    })
  }
}

PdfTrackerConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subreddits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    pdf_keywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    complaint_keywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    viral_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    }
  },
  {
    sequelize,
    tableName: 'pdf_tracker_config',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['is_active'] }
    ]
  }
)

export default PdfTrackerConfig
