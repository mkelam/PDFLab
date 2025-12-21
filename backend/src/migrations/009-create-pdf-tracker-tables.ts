import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Create pdf_tracker_config table
  await queryInterface.createTable('pdf_tracker_config', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    subreddits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
    },
    pdf_keywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
    },
    complaint_keywords: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
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
  })

  // Add index for is_active
  await queryInterface.addIndex('pdf_tracker_config', ['is_active'], {
    name: 'idx_pdf_tracker_config_is_active'
  })

  // Create pdf_tracker_reports table
  await queryInterface.createTable('pdf_tracker_reports', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
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
      defaultValue: JSON.stringify({
        total_posts_scanned: 0,
        pdf_posts_found: 0,
        complaints_found: 0,
        comments_with_pdf: 0,
        comments_with_complaints: 0
      })
    },
    subreddit_results: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
    },
    config_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: JSON.stringify({
        subreddits: [],
        pdf_keywords: [],
        complaint_keywords: [],
        viral_threshold: 10
      })
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
  })

  // Add indexes for reports table
  await queryInterface.addIndex('pdf_tracker_reports', ['report_date'], {
    name: 'idx_pdf_tracker_reports_date',
    unique: true
  })

  await queryInterface.addIndex('pdf_tracker_reports', ['generated_at'], {
    name: 'idx_pdf_tracker_reports_generated_at'
  })

  await queryInterface.addIndex('pdf_tracker_reports', ['created_at'], {
    name: 'idx_pdf_tracker_reports_created_at'
  })

  // Insert default configuration
  await queryInterface.bulkInsert('pdf_tracker_config', [{
    id: 'a0000000-0000-0000-0000-000000000001',
    subreddits: JSON.stringify(['GetMotivated', 'LifeProTips', 'GetStudying', 'selfimprovement', 'DecidingToBeBetter', 'gtd', 'books']),
    pdf_keywords: JSON.stringify(['pdf', 'ebook', 'template', 'download', 'printable', 'book']),
    complaint_keywords: JSON.stringify(['wont load', 'doesnt work', 'cant open', 'hate', 'broken', 'crash', 'annoying']),
    viral_threshold: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('pdf_tracker_reports')
  await queryInterface.dropTable('pdf_tracker_config')
}
