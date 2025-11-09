import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('batch_jobs', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
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
    batch_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    operation_type: {
      type: DataTypes.ENUM('convert', 'compress', 'merge'),
      allowNull: false
    },
    total_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completed_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failed_files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'partial', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    conversion_job_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '[]'
    },
    zip_file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    total_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: '{}'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processing_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processing_completed_at: {
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
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  })

  // Add indexes for performance
  await queryInterface.addIndex('batch_jobs', ['user_id'], {
    name: 'idx_batch_jobs_user_id'
  })

  await queryInterface.addIndex('batch_jobs', ['status'], {
    name: 'idx_batch_jobs_status'
  })

  await queryInterface.addIndex('batch_jobs', ['created_at'], {
    name: 'idx_batch_jobs_created_at'
  })

  await queryInterface.addIndex('batch_jobs', ['expires_at'], {
    name: 'idx_batch_jobs_expires_at'
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('batch_jobs')
}
