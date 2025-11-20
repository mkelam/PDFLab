-- ============================================
-- PDFLab Monitoring System Database Schema
-- ============================================
-- Created: 2025-11-16
-- Purpose: Store drift detection and health check data for admin dashboard
-- ============================================

-- Table 1: Health Check Logs
CREATE TABLE IF NOT EXISTS health_checks (
  id VARCHAR(36) PRIMARY KEY,
  environment VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  overall_status ENUM('healthy', 'unhealthy', 'degraded') NOT NULL,
  services_healthy INT NOT NULL DEFAULT 0,
  services_unhealthy INT NOT NULL DEFAULT 0,

  -- Individual service statuses
  backend_status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
  worker_status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
  mysql_status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
  redis_status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',

  -- Additional details
  details JSON,

  -- Indexes
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_environment (environment),
  INDEX idx_status (overall_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Drift Detection Logs
CREATE TABLE IF NOT EXISTS drift_checks (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  drift_score INT NOT NULL DEFAULT 0,
  drift_level ENUM('none', 'minor', 'critical') NOT NULL,

  -- Drift check results
  checks_total INT NOT NULL DEFAULT 6,
  checks_passed INT NOT NULL DEFAULT 0,
  checks_failed INT NOT NULL DEFAULT 0,

  -- Individual check results
  docker_image_parity BOOLEAN DEFAULT TRUE,
  redis_persistence BOOLEAN DEFAULT TRUE,
  environment_variables BOOLEAN DEFAULT TRUE,
  resource_limits BOOLEAN DEFAULT TRUE,
  mysql_mounts BOOLEAN DEFAULT TRUE,
  ssl_certificates BOOLEAN DEFAULT TRUE,

  -- Details
  drift_details TEXT,
  details JSON,

  -- Indexes
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_drift_score (drift_score),
  INDEX idx_drift_level (drift_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Pre-deployment Validation Logs
CREATE TABLE IF NOT EXISTS deployment_validations (
  id VARCHAR(36) PRIMARY KEY,
  environment VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validation_result ENUM('pass', 'warning', 'blocked') NOT NULL,

  -- Validation metrics
  checks_total INT NOT NULL DEFAULT 12,
  checks_passed INT NOT NULL DEFAULT 0,
  checks_warnings INT NOT NULL DEFAULT 0,
  checks_failed INT NOT NULL DEFAULT 0,

  -- Individual check results (12-point checklist)
  docker_images BOOLEAN DEFAULT NULL,
  env_variables BOOLEAN DEFAULT NULL,
  database_connectivity BOOLEAN DEFAULT NULL,
  redis_connectivity BOOLEAN DEFAULT NULL,
  redis_persistence BOOLEAN DEFAULT NULL,
  resource_limits BOOLEAN DEFAULT NULL,
  dangerous_mounts BOOLEAN DEFAULT NULL,
  ssl_certificates BOOLEAN DEFAULT NULL,
  disk_space BOOLEAN DEFAULT NULL,
  network_connectivity BOOLEAN DEFAULT NULL,
  container_health BOOLEAN DEFAULT NULL,
  test_suite BOOLEAN DEFAULT NULL,

  -- Details
  details JSON,

  -- Indexes
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_environment (environment),
  INDEX idx_result (validation_result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 4: System Alerts
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id VARCHAR(36) PRIMARY KEY,
  alert_type ENUM('drift', 'health', 'validation', 'system') NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL,
  environment VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Alert content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details JSON,

  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at DATETIME,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME,

  -- Indexes
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_severity (severity),
  INDEX idx_acknowledged (acknowledged),
  INDEX idx_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 5: Monitoring Metrics (for trend analysis)
CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id VARCHAR(36) PRIMARY KEY,
  metric_type ENUM('uptime', 'drift_score', 'health_score', 'validation_score') NOT NULL,
  environment VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  value DECIMAL(10, 2) NOT NULL,

  -- Additional context
  metadata JSON,

  -- Indexes
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_metric_type (metric_type),
  INDEX idx_environment (environment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Initial Data / Sample Records
-- ============================================

-- Insert initial health check (will be replaced by automation)
INSERT INTO health_checks (
  id, environment, overall_status, services_healthy, services_unhealthy,
  backend_status, worker_status, mysql_status, redis_status
) VALUES (
  UUID(), 'prod', 'healthy', 4, 0,
  'healthy', 'healthy', 'healthy', 'healthy'
) ON DUPLICATE KEY UPDATE id=id;

-- Insert initial drift check
INSERT INTO drift_checks (
  id, drift_score, drift_level, checks_total, checks_passed, checks_failed,
  docker_image_parity, redis_persistence, environment_variables,
  resource_limits, mysql_mounts, ssl_certificates
) VALUES (
  UUID(), 0, 'none', 6, 6, 0,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
) ON DUPLICATE KEY UPDATE id=id;

-- ============================================
-- Cleanup Procedure (keep last 30 days)
-- ============================================

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS cleanup_old_monitoring_data()
BEGIN
  DELETE FROM health_checks WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM drift_checks WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM deployment_validations WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM monitoring_metrics WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM monitoring_alerts WHERE resolved = TRUE AND timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
END$$

DELIMITER ;

-- Schedule cleanup to run daily at 3 AM (if events are enabled)
-- CREATE EVENT IF NOT EXISTS cleanup_monitoring_data
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 03:00:00')
-- DO CALL cleanup_old_monitoring_data();

-- ============================================
-- Useful Queries for Dashboard
-- ============================================

-- Get latest health status
-- SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 1;

-- Get drift trend (last 7 days)
-- SELECT DATE(timestamp) as date, AVG(drift_score) as avg_drift
-- FROM drift_checks
-- WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- GROUP BY DATE(timestamp)
-- ORDER BY date DESC;

-- Get service uptime % (last 7 days)
-- SELECT
--   (SUM(CASE WHEN backend_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as backend_uptime,
--   (SUM(CASE WHEN worker_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as worker_uptime,
--   (SUM(CASE WHEN mysql_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as mysql_uptime,
--   (SUM(CASE WHEN redis_status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as redis_uptime
-- FROM health_checks
-- WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Get unacknowledged alerts
-- SELECT * FROM monitoring_alerts
-- WHERE acknowledged = FALSE
-- ORDER BY severity DESC, timestamp DESC;
