-- Migration: Add missing partner columns to match model expectations
-- Date: 2025-11-22
-- Purpose: Fix schema mismatch between Partner model and database

-- Add missing columns to partners table (skip if already exists)
ALTER TABLE partners
ADD COLUMN free_licenses_allocated INT DEFAULT 0 COMMENT 'Total free licenses given to partner';

ALTER TABLE partners
ADD COLUMN free_licenses_used INT DEFAULT 0 COMMENT 'How many free licenses have been redeemed';

ALTER TABLE partners
ADD COLUMN total_signups INT DEFAULT 0 COMMENT 'Total users who signed up via this partner';

ALTER TABLE partners
ADD COLUMN total_commission_paid DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total commission already paid out';

ALTER TABLE partners
ADD COLUMN contract_signed_at TIMESTAMP NULL COMMENT 'When partner signed contract';

ALTER TABLE partners
ADD COLUMN notes TEXT NULL COMMENT 'Admin notes about partner';

-- Update existing records to have default values
UPDATE partners
SET free_licenses_allocated = 10,
    free_licenses_used = 0,
    total_signups = 0,
    total_commission_paid = 0.00
WHERE free_licenses_allocated IS NULL;
