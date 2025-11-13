import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

// Template format enum
export enum TemplateFormat {
  PPTX = 'pptx',
  DOCX = 'docx',
  XLSX = 'xlsx',
  PNG = 'png'
}

// OnboardingTemplate attributes interface
export interface OnboardingTemplateAttributes {
  id: string
  name: string
  description: string
  file_path: string
  file_size: number
  recommended_format: TemplateFormat
  category: string
  preview_image: string | null
  usage_count: number
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

// Optional attributes for creation
export interface OnboardingTemplateCreationAttributes
  extends Optional<
    OnboardingTemplateAttributes,
    'id' | 'preview_image' | 'usage_count' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'
  > {}

// OnboardingTemplate model class
export class OnboardingTemplate
  extends Model<OnboardingTemplateAttributes, OnboardingTemplateCreationAttributes>
  implements OnboardingTemplateAttributes
{
  declare id: string
  declare name: string
  declare description: string
  declare file_path: string
  declare file_size: number
  declare recommended_format: TemplateFormat
  declare category: string
  declare preview_image: string | null
  declare usage_count: number
  declare is_active: boolean
  declare sort_order: number
  declare readonly created_at: Date
  declare readonly updated_at: Date

  /**
   * Increment usage count
   */
  async incrementUsage(): Promise<void> {
    this.usage_count += 1
    await this.save()
  }

  /**
   * Get formatted file size (e.g., "250 KB")
   */
  getFormattedFileSize(): string {
    const kb = Math.round(this.file_size / 1024)
    if (kb < 1024) {
      return `${kb} KB`
    }
    const mb = (this.file_size / (1024 * 1024)).toFixed(1)
    return `${mb} MB`
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(): string {
    const categoryMap: Record<string, string> = {
      invoice: 'Invoice',
      report: 'Business Report',
      presentation: 'Presentation',
      form: 'Form',
      contract: 'Contract',
      resume: 'Resume'
    }
    return categoryMap[this.category] || this.category
  }
}

// Initialize model
OnboardingTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    recommended_format: {
      type: DataTypes.ENUM(...Object.values(TemplateFormat)),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    preview_image: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    tableName: 'onboarding_templates',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['category'] },
      { fields: ['is_active'] },
      { fields: ['sort_order'] }
    ]
  }
)

export default OnboardingTemplate
