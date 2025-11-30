import { QueryInterface, DataTypes } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add 'founder' to user plan enum
  // Note: For PostgreSQL, you need to add the enum value
  // For SQLite/MySQL, the enum is stored as string so no change needed

  try {
    // Try PostgreSQL syntax first
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_plan" ADD VALUE IF NOT EXISTS 'founder';
    `)
  } catch (error) {
    // If it fails (e.g., SQLite doesn't use enum types), ignore
    console.log('Note: Could not add enum value (may not be needed for this database type)')
  }

  // Add priority column to feedback table
  await queryInterface.addColumn('feedback', 'priority', {
    type: DataTypes.ENUM('normal', 'high'),
    allowNull: false,
    defaultValue: 'normal'
  })

  // Add is_founder column to feedback table
  await queryInterface.addColumn('feedback', 'is_founder', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })

  // Add indexes for the new columns
  await queryInterface.addIndex('feedback', ['priority'], {
    name: 'idx_feedback_priority'
  })

  await queryInterface.addIndex('feedback', ['is_founder'], {
    name: 'idx_feedback_is_founder'
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove indexes
  await queryInterface.removeIndex('feedback', 'idx_feedback_priority')
  await queryInterface.removeIndex('feedback', 'idx_feedback_is_founder')

  // Remove columns
  await queryInterface.removeColumn('feedback', 'priority')
  await queryInterface.removeColumn('feedback', 'is_founder')

  // Note: Removing enum value from PostgreSQL is complex and usually not done in down migrations
}
