-- Migration: Add Batch Processing Feature
-- Description: Creates batch_jobs table and adds batch_job_id to conversion_jobs
-- Date: 2025-11-09
-- Author: Claude Code

-- =====================================================
-- 1. Create batch_jobs table
-- =====================================================

CREATE TABLE IF NOT EXISTS `batch_jobs` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `batch_name` VARCHAR(255) NOT NULL,
  `operation_type` ENUM('convert', 'compress', 'merge') NOT NULL,
  `total_files` INT NOT NULL DEFAULT 0,
  `completed_files` INT NOT NULL DEFAULT 0,
  `failed_files` INT NOT NULL DEFAULT 0,
  `status` ENUM('pending', 'processing', 'completed', 'partial', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  `progress` INT NOT NULL DEFAULT 0,
  `conversion_job_ids` JSON NOT NULL DEFAULT ('[]'),
  `zip_file_path` VARCHAR(500) NULL,
  `total_size` BIGINT NOT NULL DEFAULT 0,
  `options` JSON NOT NULL DEFAULT ('{}'),
  `error_message` TEXT NULL,
  `processing_started_at` DATETIME NULL,
  `processing_completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 7 DAY),

  -- Foreign key constraint
  CONSTRAINT `fk_batch_jobs_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Constraints
  CONSTRAINT `chk_progress` CHECK (`progress` >= 0 AND `progress` <= 100),
  CONSTRAINT `chk_completed_files` CHECK (`completed_files` >= 0),
  CONSTRAINT `chk_failed_files` CHECK (`failed_files` >= 0),
  CONSTRAINT `chk_total_files` CHECK (`total_files` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for batch_jobs
CREATE INDEX `idx_batch_jobs_user_id` ON `batch_jobs`(`user_id`);
CREATE INDEX `idx_batch_jobs_status` ON `batch_jobs`(`status`);
CREATE INDEX `idx_batch_jobs_created_at` ON `batch_jobs`(`created_at`);
CREATE INDEX `idx_batch_jobs_expires_at` ON `batch_jobs`(`expires_at`);

-- =====================================================
-- 2. Add batch_job_id column to conversion_jobs
-- =====================================================

-- Check if column doesn't already exist before adding
SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND COLUMN_NAME = 'batch_job_id'
);

SET @sql = IF(@columnExists = 0,
  'ALTER TABLE `conversion_jobs` ADD COLUMN `batch_job_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL AFTER `user_id`',
  'SELECT "Column batch_job_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if column was just added
SET @fkExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND CONSTRAINT_NAME = 'fk_conversion_jobs_batch_job_id'
);

SET @sql = IF(@fkExists = 0 AND @columnExists = 0,
  'ALTER TABLE `conversion_jobs`
   ADD CONSTRAINT `fk_conversion_jobs_batch_job_id`
   FOREIGN KEY (`batch_job_id`)
   REFERENCES `batch_jobs`(`id`)
   ON DELETE CASCADE
   ON UPDATE CASCADE',
  'SELECT "Foreign key already exists or column not added" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on batch_job_id for faster queries
SET @idxExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND INDEX_NAME = 'idx_conversion_jobs_batch_job_id'
);

SET @sql = IF(@idxExists = 0,
  'CREATE INDEX `idx_conversion_jobs_batch_job_id` ON `conversion_jobs`(`batch_job_id`)',
  'SELECT "Index idx_conversion_jobs_batch_job_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. Verification
-- =====================================================

-- Show batch_jobs table structure
SHOW CREATE TABLE `batch_jobs`;

-- Show updated conversion_jobs structure
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'conversion_jobs'
  AND COLUMN_NAME IN ('id', 'user_id', 'batch_job_id')
ORDER BY ORDINAL_POSITION;

-- Show indexes on batch_jobs
SHOW INDEXES FROM `batch_jobs`;

-- Show foreign keys on batch_jobs
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('batch_jobs', 'conversion_jobs')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =====================================================
-- Migration Complete
-- =====================================================

SELECT
  '✅ Migration 001_add_batch_processing.sql completed successfully' AS status,
  NOW() AS completed_at;
