-- Migration: Create remediation_log table
-- Date: 2025-11-16
-- Purpose: Track auto-remediation actions taken by Elite Health Guardian

CREATE TABLE IF NOT EXISTS remediation_log (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action_type ENUM('restart', 'cache_clear', 'disk_cleanup', 'db_optimize', 'ssl_renew') NOT NULL,
  target VARCHAR(255) NOT NULL COMMENT 'Container name or component affected',
  reason TEXT COMMENT 'Why remediation was triggered',
  metrics_before JSON COMMENT 'State before action (e.g., memory: 82%)',
  metrics_after JSON COMMENT 'State after action (e.g., memory: 12%)',
  duration_seconds INT COMMENT 'How long the action took',
  status ENUM('success', 'failed', 'partial') NOT NULL,
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_action_type (action_type),
  INDEX idx_target (target),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Auto-remediation action history from Elite Guardian Agent';

-- Insert sample data for testing (optional - comment out for production)
-- INSERT INTO remediation_log (id, timestamp, action_type, target, reason, metrics_before, metrics_after, duration_seconds, status)
-- VALUES
--   (UUID(), DATE_SUB(NOW(), INTERVAL 2 HOUR), 'restart', 'pdflab-worker-prod', 'Health check failed (unhealthy)', '{"memory_percent": 0}', '{"memory_percent": 0}', 3, 'success'),
--   (UUID(), DATE_SUB(NOW(), INTERVAL 1 DAY), 'cache_clear', 'redis', 'Memory exceeded 80% threshold', '{"memory_percent": 82, "keys": 15234}', '{"memory_percent": 12, "keys": 0}', 1, 'success'),
--   (UUID(), DATE_SUB(NOW(), INTERVAL 2 DAY), 'disk_cleanup', '/var/pdflab/storage', 'Disk usage exceeded 85% threshold', '{"disk_percent": 87, "files_found": 347}', '{"disk_percent": 72, "files_deleted": 347}', 45, 'success');
