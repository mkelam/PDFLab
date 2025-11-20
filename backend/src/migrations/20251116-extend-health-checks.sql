-- Migration: Extend health_checks table to support 6 services
-- Date: 2025-11-16
-- Purpose: Add frontend and partners portal monitoring to health checks

-- Add new columns for frontend and partners portal
-- Check if columns exist first, then add if they don't
SET @col_exists_frontend = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pdflab_production' AND TABLE_NAME = 'health_checks' AND COLUMN_NAME = 'frontend_status');
SET @col_exists_partners = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'pdflab_production' AND TABLE_NAME = 'health_checks' AND COLUMN_NAME = 'partners_status');

SET @sql_frontend = IF(@col_exists_frontend = 0, 'ALTER TABLE health_checks ADD COLUMN frontend_status ENUM(''running'', ''stopped'', ''unknown'') DEFAULT ''unknown'' AFTER redis_status', 'SELECT ''Column frontend_status already exists''');
SET @sql_partners = IF(@col_exists_partners = 0, 'ALTER TABLE health_checks ADD COLUMN partners_status ENUM(''running'', ''stopped'', ''unknown'') DEFAULT ''unknown'' AFTER frontend_status', 'SELECT ''Column partners_status already exists''');

PREPARE stmt_frontend FROM @sql_frontend;
EXECUTE stmt_frontend;
DEALLOCATE PREPARE stmt_frontend;

PREPARE stmt_partners FROM @sql_partners;
EXECUTE stmt_partners;
DEALLOCATE PREPARE stmt_partners;

-- Update existing rows to set default values for new columns
UPDATE health_checks
SET
  frontend_status = 'unknown',
  partners_status = 'unknown'
WHERE frontend_status IS NULL OR partners_status IS NULL;

-- Note: We don't automatically update services_healthy/services_unhealthy counts
-- as these are now calculated dynamically in the backend controller to include all 6 services

-- Create view for comprehensive health status (includes all 6 services)
CREATE OR REPLACE VIEW current_health_status AS
SELECT
  id,
  environment,
  timestamp,
  overall_status,
  backend_status,
  worker_status,
  mysql_status,
  redis_status,
  frontend_status,
  partners_status,
  (
    (CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) +
    (CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) +
    (CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) +
    (CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) +
    (CASE WHEN frontend_status = 'running' THEN 1 ELSE 0 END) +
    (CASE WHEN partners_status = 'running' THEN 1 ELSE 0 END)
  ) AS calculated_services_healthy,
  (
    6 - (
      (CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) +
      (CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) +
      (CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) +
      (CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) +
      (CASE WHEN frontend_status = 'running' THEN 1 ELSE 0 END) +
      (CASE WHEN partners_status = 'running' THEN 1 ELSE 0 END)
    )
  ) AS calculated_services_unhealthy,
  details
FROM health_checks
ORDER BY timestamp DESC
LIMIT 1;
