-- Migration: Add password security features (password history and account lockout)
-- Date: 2025-11-01
-- Description: Adds password_history table and account lockout fields to users table

-- Create password_history table
CREATE TABLE IF NOT EXISTS `password_history` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_password_history_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add account lockout fields to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `failed_reset_attempts` INT NOT NULL DEFAULT 0 AFTER `subscription_end_date`,
  ADD COLUMN IF NOT EXISTS `reset_locked_until` DATETIME NULL DEFAULT NULL AFTER `failed_reset_attempts`;

-- Add indexes for performance
ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_reset_locked_until` (`reset_locked_until`);

-- Verify tables were created
SELECT 'Password security features migration completed successfully' AS status;
SHOW COLUMNS FROM `users` LIKE 'failed_reset_attempts';
SHOW COLUMNS FROM `users` LIKE 'reset_locked_until';
SHOW TABLES LIKE 'password_history';
