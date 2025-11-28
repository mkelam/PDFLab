-- Rollback Migration: Remove Founder Edition fields
-- Date: 2025-11-28
-- Description: Rollback for 009_add_founder_edition.sql

-- Drop indexes first
DROP INDEX idx_users_founder_status ON users;
DROP INDEX idx_users_founder_deadline ON users;

-- Drop columns
ALTER TABLE users DROP COLUMN founder_conversions_count;
ALTER TABLE users DROP COLUMN founder_feedback_submitted;
ALTER TABLE users DROP COLUMN founder_deadline;
ALTER TABLE users DROP COLUMN founder_status;

-- Verification
SELECT 'Rollback verification: Columns removed' AS step;
SHOW COLUMNS FROM users LIKE 'founder%';
