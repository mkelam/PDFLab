-- Migration: Add Founder Edition fields
-- Date: 2025-11-28
-- Description: Add founder_status, founder_deadline, founder_feedback_submitted, founder_conversions_count to users table
--              This supports the "Earned Lifetime" GTM strategy (Tier 0)

-- Add founder_status ENUM column
ALTER TABLE users
ADD COLUMN founder_status ENUM('none', 'active', 'earned', 'expired') NOT NULL DEFAULT 'none'
COMMENT 'Status of Founder Edition challenge: none=not enrolled, active=in progress, earned=lifetime access granted, expired=failed challenge';

-- Add founder_deadline column (14 days from signup for founder users)
ALTER TABLE users
ADD COLUMN founder_deadline DATETIME NULL
COMMENT 'Deadline by which founder must complete challenge (10 conversions + feedback)';

-- Add founder_feedback_submitted column
ALTER TABLE users
ADD COLUMN founder_feedback_submitted BOOLEAN NOT NULL DEFAULT FALSE
COMMENT 'Whether founder has submitted required feedback form';

-- Add founder_conversions_count column (separate from conversions_used for clarity)
ALTER TABLE users
ADD COLUMN founder_conversions_count INT NOT NULL DEFAULT 0
COMMENT 'Number of conversions completed during founder challenge period';

-- Create index for querying active founders (for cron job that checks expiry)
CREATE INDEX idx_users_founder_status ON users(founder_status);

-- Create index for deadline queries (find users whose deadline has passed)
CREATE INDEX idx_users_founder_deadline ON users(founder_deadline);

-- Verification queries
SELECT 'Verification: Column additions' AS step;
SHOW COLUMNS FROM users LIKE 'founder%';

SELECT 'Verification: Index creation' AS step;
SHOW INDEX FROM users WHERE Key_name LIKE 'idx_users_founder%';
