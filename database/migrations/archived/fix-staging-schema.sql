-- Fix Staging Database Schema Drift
-- Add missing columns to users table

-- Add onboarding columns (for user onboarding flow)
ALTER TABLE users
ADD COLUMN onboarding_completed TINYINT(1) DEFAULT 0 AFTER email_verified_at;

ALTER TABLE users
ADD COLUMN onboarding_completed_at DATETIME NULL AFTER onboarding_completed;

ALTER TABLE users
ADD COLUMN onboarding_skipped TINYINT(1) DEFAULT 0 AFTER onboarding_completed_at;

-- Add OAuth integration columns (Google and LinkedIn SSO)
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL AFTER onboarding_skipped;

ALTER TABLE users
ADD COLUMN linkedin_id VARCHAR(255) NULL AFTER google_id;

-- Add indexes for OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_linkedin_id ON users(linkedin_id);

-- Verify schema is correct
SELECT 'Schema updated successfully' AS status;
DESC users;
