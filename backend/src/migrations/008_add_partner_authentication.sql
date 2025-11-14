-- Migration: Add partner authentication fields
-- Date: 2025-11-14
-- Description: Add password_hash and last_login_at to partners table for authentication

-- Add password_hash column
ALTER TABLE partners
ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL
COMMENT 'Hashed password for partner portal login';

-- Add last_login_at column
ALTER TABLE partners
ADD COLUMN last_login_at TIMESTAMP NULL
COMMENT 'Last time partner logged into dashboard';

-- Create index on last_login_at for analytics
CREATE INDEX idx_partners_last_login ON partners(last_login_at);
