-- Rollback Migration: Remove Batch Processing Feature
-- Description: Drops batch_jobs table and removes batch_job_id from conversion_jobs
-- Date: 2025-11-09
-- Author: Claude Code
-- WARNING: This will delete ALL batch processing data!

-- =====================================================
-- 1. Remove batch_job_id from conversion_jobs
-- =====================================================

-- Drop foreign key constraint first
SET @fkExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND CONSTRAINT_NAME = 'fk_conversion_jobs_batch_job_id'
);

SET @sql = IF(@fkExists > 0,
  'ALTER TABLE `conversion_jobs` DROP FOREIGN KEY `fk_conversion_jobs_batch_job_id`',
  'SELECT "Foreign key fk_conversion_jobs_batch_job_id does not exist" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop index
SET @idxExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND INDEX_NAME = 'idx_conversion_jobs_batch_job_id'
);

SET @sql = IF(@idxExists > 0,
  'DROP INDEX `idx_conversion_jobs_batch_job_id` ON `conversion_jobs`',
  'SELECT "Index idx_conversion_jobs_batch_job_id does not exist" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop column
SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversion_jobs'
    AND COLUMN_NAME = 'batch_job_id'
);

SET @sql = IF(@columnExists > 0,
  'ALTER TABLE `conversion_jobs` DROP COLUMN `batch_job_id`',
  'SELECT "Column batch_job_id does not exist" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. Drop batch_jobs table
-- =====================================================

DROP TABLE IF EXISTS `batch_jobs`;

-- =====================================================
-- 3. Verification
-- =====================================================

-- Verify batch_jobs table is gone
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ batch_jobs table successfully dropped'
    ELSE '❌ batch_jobs table still exists'
  END AS table_status
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'batch_jobs';

-- Verify batch_job_id column is gone from conversion_jobs
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ batch_job_id column successfully removed from conversion_jobs'
    ELSE '❌ batch_job_id column still exists in conversion_jobs'
  END AS column_status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'conversion_jobs'
  AND COLUMN_NAME = 'batch_job_id';

-- =====================================================
-- Rollback Complete
-- =====================================================

SELECT
  '✅ Rollback 001_add_batch_processing_rollback.sql completed successfully' AS status,
  'All batch processing data has been removed' AS warning,
  NOW() AS completed_at;
