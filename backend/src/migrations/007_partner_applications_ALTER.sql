-- ALTER existing partners table to add new columns for partner application system
-- This fixes the schema mismatch between the model and the database

-- Add new columns to partners table
ALTER TABLE partners
    ADD COLUMN application_id VARCHAR(36) AFTER id,
    ADD COLUMN user_id VARCHAR(36) AFTER application_id,
    ADD COLUMN brand_name VARCHAR(255) AFTER slug,
    ADD COLUMN referral_code VARCHAR(50) AFTER brand_name,
    ADD COLUMN primary_platform VARCHAR(50) AFTER referral_code,
    ADD COLUMN platform_url VARCHAR(500) AFTER follower_count,
    ADD COLUMN audience_size VARCHAR(50) AFTER platform_url,
    ADD COLUMN tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze' AFTER audience_size,
    ADD COLUMN total_clicks INT DEFAULT 0 AFTER contract_signed_at,
    ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0 AFTER total_commission_earned,
    ADD COLUMN current_month_conversions INT DEFAULT 0 AFTER total_commission_paid,
    ADD COLUMN last_conversion_at TIMESTAMP NULL AFTER current_month_conversions,
    ADD COLUMN payment_method ENUM('paypal', 'bank_transfer', 'stripe') DEFAULT 'paypal' AFTER last_conversion_at,
    ADD COLUMN payment_email VARCHAR(255) AFTER payment_method,
    ADD COLUMN payment_details JSON AFTER payment_email,
    ADD COLUMN activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER status;

-- Update commission_tier enum to include platinum
ALTER TABLE partners
    MODIFY COLUMN commission_tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze';
