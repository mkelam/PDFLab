import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

// Types for the JSON fields
export interface TrackerStats {
  total_posts_scanned: number
  pdf_posts_found: number
  complaints_found: number
  comments_with_pdf: number
  comments_with_complaints: number
}

export interface TrackerComment {
  body: string
  score: number
  is_complaint: boolean
  complaint_keywords: string[]
}

export interface TrackerPost {
  title: string
  url: string
  score: number
  num_comments: number
  content_preview: string
  pdf_keywords: string[]
  is_complaint: boolean
  complaint_keywords: string[]
  comments: TrackerComment[]
}

export interface SubredditResult {
  name: string
  posts: TrackerPost[]
  error: string | null
}

export interface ConfigSnapshot {
  subreddits: string[]
  pdf_keywords: string[]
  complaint_keywords: string[]
  viral_threshold: number
}

export interface PdfTrackerReportAttributes {
  id: string
  report_date: string
  generated_at: Date
  stats: TrackerStats
  subreddit_results: SubredditResult[]
  config_snapshot: ConfigSnapshot
  created_at?: Date
  updated_at?: Date
}

export interface PdfTrackerReportCreationAttributes extends Optional<PdfTrackerReportAttributes, 'id' | 'created_at' | 'updated_at'> {}

class PdfTrackerReport extends Model<PdfTrackerReportAttributes, PdfTrackerReportCreationAttributes> implements PdfTrackerReportAttributes {
  declare id: string
  declare report_date: string
  declare generated_at: Date
  declare stats: TrackerStats
  declare subreddit_results: SubredditResult[]
  declare config_snapshot: ConfigSnapshot
  declare readonly created_at: Date
  declare readonly updated_at: Date
}

PdfTrackerReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    report_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    stats: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        total_posts_scanned: 0,
        pdf_posts_found: 0,
        complaints_found: 0,
        comments_with_pdf: 0,
        comments_with_complaints: 0
      }
    },
    subreddit_results: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    config_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        subreddits: [],
        pdf_keywords: [],
        complaint_keywords: [],
        viral_threshold: 10
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
    }
  },
  {
    sequelize,
    tableName: 'pdf_tracker_reports',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['report_date'], unique: true },
      { fields: ['generated_at'] },
      { fields: ['created_at'] }
    ]
  }
)

export default PdfTrackerReport
