import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

// Onboarding status enum
export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

// OnboardingProgress attributes interface
export interface OnboardingProgressAttributes {
  id: string
  user_id: string
  status: OnboardingStatus

  // Tour progress
  tour_completed: boolean
  tour_step_completed: number
  tour_last_seen_at: Date | null

  // Conversion progress
  first_conversion_completed: boolean
  first_conversion_at: Date | null

  // Wizard progress
  wizard_started: boolean
  wizard_completed: boolean
  wizard_last_step: number

  // Template usage
  sample_template_used: string | null

  // Email drip campaign tracking
  email_day0_sent: boolean
  email_day2_sent: boolean
  email_day5_sent: boolean
  email_day9_sent: boolean
  email_day14_sent: boolean

  email_day2_opened: boolean
  email_day5_opened: boolean
  email_day9_opened: boolean
  email_day14_opened: boolean

  // Timestamps
  started_at: Date | null
  completed_at: Date | null
  skipped_at: Date | null
  created_at: Date
  updated_at: Date
}

// Optional attributes for creation (id, timestamps auto-generated)
export interface OnboardingProgressCreationAttributes
  extends Optional<
    OnboardingProgressAttributes,
    | 'id'
    | 'status'
    | 'tour_completed'
    | 'tour_step_completed'
    | 'tour_last_seen_at'
    | 'first_conversion_completed'
    | 'first_conversion_at'
    | 'wizard_started'
    | 'wizard_completed'
    | 'wizard_last_step'
    | 'sample_template_used'
    | 'email_day0_sent'
    | 'email_day2_sent'
    | 'email_day5_sent'
    | 'email_day9_sent'
    | 'email_day14_sent'
    | 'email_day2_opened'
    | 'email_day5_opened'
    | 'email_day9_opened'
    | 'email_day14_opened'
    | 'started_at'
    | 'completed_at'
    | 'skipped_at'
    | 'created_at'
    | 'updated_at'
  > {}

// OnboardingProgress model class
export class OnboardingProgress
  extends Model<OnboardingProgressAttributes, OnboardingProgressCreationAttributes>
  implements OnboardingProgressAttributes
{
  declare id: string
  declare user_id: string
  declare status: OnboardingStatus

  // Tour progress
  declare tour_completed: boolean
  declare tour_step_completed: number
  declare tour_last_seen_at: Date | null

  // Conversion progress
  declare first_conversion_completed: boolean
  declare first_conversion_at: Date | null

  // Wizard progress
  declare wizard_started: boolean
  declare wizard_completed: boolean
  declare wizard_last_step: number

  // Template usage
  declare sample_template_used: string | null

  // Email drip campaign tracking
  declare email_day0_sent: boolean
  declare email_day2_sent: boolean
  declare email_day5_sent: boolean
  declare email_day9_sent: boolean
  declare email_day14_sent: boolean

  declare email_day2_opened: boolean
  declare email_day5_opened: boolean
  declare email_day9_opened: boolean
  declare email_day14_opened: boolean

  // Timestamps
  declare started_at: Date | null
  declare completed_at: Date | null
  declare skipped_at: Date | null
  declare readonly created_at: Date
  declare readonly updated_at: Date

  /**
   * Calculate completion percentage (0-100)
   */
  getCompletionPercentage(): number {
    let completed = 0
    const total = 4 // tour, first_conversion, wizard, template_used

    if (this.tour_completed) completed++
    if (this.first_conversion_completed) completed++
    if (this.wizard_completed) completed++
    if (this.sample_template_used) completed++

    return Math.round((completed / total) * 100)
  }

  /**
   * Check if user should receive specific drip email
   */
  shouldReceiveEmail(day: 2 | 5 | 9 | 14): boolean {
    const daysSinceSignup = Math.floor(
      (Date.now() - this.created_at.getTime()) / (1000 * 60 * 60 * 24)
    )

    const emailSentField = `email_day${day}_sent` as keyof OnboardingProgressAttributes
    const emailSent = this[emailSentField] as boolean

    return daysSinceSignup >= day && !emailSent
  }
}

// Initialize model
OnboardingProgress.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OnboardingStatus)),
      allowNull: false,
      defaultValue: OnboardingStatus.NOT_STARTED
    },

    // Tour progress
    tour_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    tour_step_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    tour_last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Conversion progress
    first_conversion_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    first_conversion_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Wizard progress
    wizard_started: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    wizard_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    wizard_last_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    // Template usage
    sample_template_used: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    // Email drip campaign tracking
    email_day0_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day2_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day5_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day9_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day14_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    email_day2_opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day5_opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day9_opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_day14_opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    // Timestamps
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    skipped_at: {
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
    }
  },
  {
    sequelize,
    tableName: 'onboarding_progress',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'], unique: true, name: 'onboarding_user_id_idx' },
      { fields: ['status'], name: 'onboarding_status_idx' },
      { fields: ['created_at'], name: 'onboarding_created_at_idx' },
      {
        fields: ['email_day2_sent', 'email_day5_sent', 'email_day9_sent', 'email_day14_sent'],
        name: 'onboarding_email_drip_idx'
      }
    ]
  }
)

export default OnboardingProgress
