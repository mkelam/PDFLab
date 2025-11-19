-- =====================================================
-- PDFLab Security Tables Migration
-- Created: November 17, 2025
-- Purpose: Create security monitoring and IP blocking tables
-- =====================================================

-- Table: authentication_logs
-- Purpose: Track all authentication attempts for security monitoring
CREATE TABLE IF NOT EXISTS `authentication_logs` (
  `id` VARCHAR(36) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `success` BOOLEAN NOT NULL DEFAULT FALSE,
  `failure_reason` VARCHAR(255) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_ip_address` (`ip_address`),
  INDEX `idx_email` (`email`),
  INDEX `idx_success` (`success`),
  INDEX `idx_composite_security` (`ip_address`, `success`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: blocked_ips
-- Purpose: Store temporarily or permanently blocked IP addresses
CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `id` VARCHAR(36) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `block_type` ENUM('temporary', 'permanent') NOT NULL DEFAULT 'temporary',
  `blocked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  `unblocked_at` DATETIME DEFAULT NULL,
  `failed_attempts` INT DEFAULT 0,
  `last_attempt_email` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ip_address` (`ip_address`),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_blocked_at` (`blocked_at`),
  INDEX `idx_block_type` (`block_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- You can uncomment these lines to insert test data
-- INSERT INTO `authentication_logs` (`id`, `ip_address`, `email`, `success`, `failure_reason`, `timestamp`) VALUES
-- (UUID(), '127.0.0.1', 'test@example.com', TRUE, NULL, NOW()),
-- (UUID(), '192.168.1.100', 'attacker@bad.com', FALSE, 'Invalid credentials', NOW());

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify tables were created
-- SHOW TABLES LIKE '%authentication%';
-- SHOW TABLES LIKE '%blocked%';

-- Check table structures
-- DESCRIBE authentication_logs;
-- DESCRIBE blocked_ips;

-- =====================================================
-- Notes
-- =====================================================

/*
USAGE:
1. Run this migration:
   mysql -u pdflab -p pdflab < migrations/create_security_tables.sql

2. Or execute via MySQL client:
   USE pdflab;
   SOURCE migrations/create_security_tables.sql;

3. Or via npm script (if migration runner is set up):
   npm run migrate

FEATURES:
- Authentication logs track all login attempts (success/failure)
- Blocked IPs can be temporary (expires_at set) or permanent
- Indexes optimized for security queries (IP-based lookups)
- Composite index for fast failed login aggregation

CLEANUP:
To remove these tables (not recommended in production):
  DROP TABLE IF EXISTS authentication_logs;
  DROP TABLE IF EXISTS blocked_ips;
*/
