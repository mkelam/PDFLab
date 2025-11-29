-- Migration: Add Founder's Edition Application Fields
-- Description: Adds application and approval workflow fields for Founder's Edition
-- Created: 2025-11-29

-- Add application fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_status VARCHAR(20) DEFAULT 'none' CHECK (founder_application_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_use_case TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_submitted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reviewed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_application_reviewed_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS founder_rejection_reason TEXT;

-- Create index for filtering applications
CREATE INDEX IF NOT EXISTS idx_users_founder_application_status ON users(founder_application_status);

-- Add comment for documentation
COMMENT ON COLUMN users.founder_application_status IS 'Application status: none (not applied), pending (awaiting review), approved (accepted), rejected (declined)';
COMMENT ON COLUMN users.founder_application_reason IS 'Why user wants to join Founder''s Edition';
COMMENT ON COLUMN users.founder_application_use_case IS 'What user plans to use PDFLab for';
COMMENT ON COLUMN users.founder_application_submitted_at IS 'When application was submitted';
COMMENT ON COLUMN users.founder_application_reviewed_at IS 'When admin reviewed the application';
COMMENT ON COLUMN users.founder_application_reviewed_by IS 'Admin user ID who reviewed the application';
COMMENT ON COLUMN users.founder_rejection_reason IS 'Reason for rejection (if rejected)';
