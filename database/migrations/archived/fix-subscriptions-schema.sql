USE pdflab_staging;

-- Add missing columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN cancel_at DATETIME NULL COMMENT 'Scheduled cancellation date' AFTER next_billing_date;
ALTER TABLE subscriptions ADD COLUMN canceled_at DATETIME NULL COMMENT 'Actual cancellation timestamp' AFTER cancel_at;
ALTER TABLE subscriptions ADD COLUMN trial_end DATETIME NULL COMMENT 'Trial period end date' AFTER canceled_at;

-- Update status enum to include 'pending'
ALTER TABLE subscriptions MODIFY COLUMN status ENUM('active','canceled','past_due','trialing','pending') NOT NULL DEFAULT 'active';

-- Verify the changes
SELECT 'Schema updated successfully' as status;
DESCRIBE subscriptions;
