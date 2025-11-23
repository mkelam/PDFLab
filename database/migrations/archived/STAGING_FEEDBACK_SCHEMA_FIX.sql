-- Staging Feedback Table Schema Fix
-- Date: 2025-11-19
-- Purpose: Add missing columns to feedback table to match backend model

-- Add missing columns to feedback table
ALTER TABLE feedback
  ADD COLUMN user_email VARCHAR(255) NULL AFTER user_id,
  ADD COLUMN user_name VARCHAR(255) NULL AFTER user_email,
  ADD COLUMN screenshot_url VARCHAR(500) NULL AFTER user_agent,
  ADD COLUMN admin_id VARCHAR(36) NULL AFTER admin_reply,
  ADD COLUMN resolved_at DATETIME NULL AFTER updated_at;

-- Add foreign key constraint for admin_id
ALTER TABLE feedback
  ADD CONSTRAINT fk_feedback_admin
  FOREIGN KEY (admin_id) REFERENCES users(id)
  ON DELETE SET NULL;

-- Add index on admin_id for performance
CREATE INDEX idx_feedback_admin_id ON feedback(admin_id);

-- Verify the changes
DESCRIBE feedback;

-- Expected columns after fix:
-- id, user_id, user_email, user_name, type, message, page_url, user_agent,
-- screenshot_url, status, admin_reply, admin_id, created_at, updated_at, resolved_at
