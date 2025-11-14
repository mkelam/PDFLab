-- Migration: Add feedback table
-- Created: 2025-11-12
-- Description: Create feedback table to store user feedback, bug reports, and feature requests

CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  user_email VARCHAR(255) NULL,
  user_name VARCHAR(255) NULL,
  type ENUM('bug', 'feature', 'general', 'other') NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  page_url VARCHAR(500) NULL,
  user_agent TEXT NULL,
  screenshot_url VARCHAR(500) NULL,
  status ENUM('new', 'in_progress', 'resolved', 'dismissed') NOT NULL DEFAULT 'new',
  admin_reply TEXT NULL,
  admin_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,

  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_admin FOREIGN KEY (admin_id)
    REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_feedback_status (status),
  INDEX idx_feedback_type (type),
  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
