-- Migration: 005_onboarding_system
-- Description: Add user onboarding flow with progress tracking and sample templates
-- Created: 2025-11-12
-- Phase: 2 (Revenue Optimization)

-- =====================================================
-- Table: onboarding_progress
-- Purpose: Track user's progress through onboarding flow
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
  status ENUM('not_started', 'in_progress', 'completed', 'skipped') DEFAULT 'not_started',

  -- Tour progress
  tour_completed BOOLEAN DEFAULT FALSE,
  tour_step_completed INT DEFAULT 0,
  tour_last_seen_at TIMESTAMP NULL,

  -- Conversion progress
  first_conversion_completed BOOLEAN DEFAULT FALSE,
  first_conversion_at TIMESTAMP NULL,

  -- Wizard progress
  wizard_started BOOLEAN DEFAULT FALSE,
  wizard_completed BOOLEAN DEFAULT FALSE,
  wizard_last_step INT DEFAULT 0,

  -- Template usage
  sample_template_used VARCHAR(50) NULL,

  -- Email drip campaign tracking
  email_day0_sent BOOLEAN DEFAULT FALSE,
  email_day2_sent BOOLEAN DEFAULT FALSE,
  email_day5_sent BOOLEAN DEFAULT FALSE,
  email_day9_sent BOOLEAN DEFAULT FALSE,
  email_day14_sent BOOLEAN DEFAULT FALSE,

  email_day2_opened BOOLEAN DEFAULT FALSE,
  email_day5_opened BOOLEAN DEFAULT FALSE,
  email_day9_opened BOOLEAN DEFAULT FALSE,
  email_day14_opened BOOLEAN DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  skipped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_email_tracking (email_day2_sent, email_day5_sent, email_day9_sent, email_day14_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Table: onboarding_templates
-- Purpose: Store sample PDF templates for new users to try
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  recommended_format ENUM('pptx', 'docx', 'xlsx', 'png') NOT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'invoice, report, presentation, etc.',
  preview_image VARCHAR(255) NULL,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sample Data: Insert 3 onboarding templates
-- (Uses INSERT IGNORE to skip if already exists)
-- =====================================================
INSERT IGNORE INTO onboarding_templates (id, name, description, file_path, file_size, recommended_format, category, sort_order, is_active) VALUES
(
  'template_invoice_001',
  'Sample Invoice',
  'Convert invoice tables to Excel for easy accounting. Perfect for testing table extraction and data analysis.',
  '/templates/sample_invoice.pdf',
  250000,
  'xlsx',
  'invoice',
  1,
  TRUE
),
(
  'template_report_001',
  'Business Report',
  'Convert business reports to Word for easy editing. Ideal for testing document conversion and formatting.',
  '/templates/sample_report.pdf',
  580000,
  'docx',
  'report',
  2,
  TRUE
),
(
  'template_presentation_001',
  'Marketing Presentation',
  'Convert slide decks to PowerPoint for editing. Great for testing presentation conversion and layout preservation.',
  '/templates/sample_presentation.pdf',
  1250000,
  'pptx',
  'presentation',
  3,
  TRUE
);

-- =====================================================
-- Add onboarding tracking columns to users table
-- (for quick reference without joining onboarding_progress)
-- Note: Using separate ALTER TABLE statements for compatibility
-- =====================================================

-- Check and add onboarding_completed column
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'onboarding_completed';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE AFTER beta_expires_at;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add onboarding_completed_at column
SET @columnname = 'onboarding_completed_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL AFTER onboarding_completed;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add onboarding_skipped column
SET @columnname = 'onboarding_skipped';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE AFTER onboarding_completed_at;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- Indexes for performance optimization
-- Note: Skipping index on users table due to MySQL 64 index limit
-- The onboarding_completed and onboarding_skipped columns will still work
-- efficiently for queries without an index since they are boolean columns
-- =====================================================
-- Index intentionally skipped to avoid "Too many keys" error

-- =====================================================
-- Migration rollback (for reference - DO NOT RUN)
-- =====================================================
-- DROP TABLE IF EXISTS onboarding_progress;
-- DROP TABLE IF EXISTS onboarding_templates;
-- ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;
-- ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS onboarding_skipped;
