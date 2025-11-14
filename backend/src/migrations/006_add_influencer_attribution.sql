-- =====================================================
-- INFLUENCER ATTRIBUTION TRACKING SYSTEM
-- =====================================================
-- This migration adds complete tracking for influencer referrals,
-- allowing PDFLab to attribute signups to specific partners and
-- calculate commissions accurately.
--
-- Created: 2025-11-13
-- =====================================================

-- 1. PARTNERS TABLE
-- Stores influencer/partner information
CREATE TABLE IF NOT EXISTS partners (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL-friendly identifier (e.g., "jeff-su")',

  -- Partner Details
  platform VARCHAR(50) DEFAULT NULL COMMENT 'Primary platform: youtube, twitter, linkedin, etc',
  follower_count INT DEFAULT NULL,
  website VARCHAR(500) DEFAULT NULL,

  -- Commission Structure
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 30.00 COMMENT 'Percentage commission (e.g., 30.00 = 30%)',
  commission_tier ENUM('bronze', 'silver', 'gold') DEFAULT 'bronze' COMMENT 'bronze=30%, silver=40%, gold=50%',

  -- Free Licenses
  free_licenses_allocated INT DEFAULT 10 COMMENT 'Total free licenses given to partner',
  free_licenses_used INT DEFAULT 0 COMMENT 'How many have been redeemed',

  -- Status
  status ENUM('pending', 'active', 'paused', 'inactive') DEFAULT 'pending',
  contract_signed_at DATETIME DEFAULT NULL,

  -- Tracking
  total_signups INT DEFAULT 0 COMMENT 'Total users who signed up via this partner',
  total_conversions INT DEFAULT 0 COMMENT 'Users who became paying customers',
  total_revenue_generated DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total revenue from their referrals',
  total_commission_earned DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total commission owed to partner',
  total_commission_paid DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total commission already paid',

  -- Metadata
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PROMO CODES TABLE
-- Stores unique promo codes per partner
CREATE TABLE IF NOT EXISTS promo_codes (
  id CHAR(36) PRIMARY KEY,
  partner_id CHAR(36) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Promo code (e.g., "JEFFSU10")',

  -- Discount Details
  discount_type ENUM('percentage', 'fixed', 'free_trial') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Percentage (e.g., 10.00 = 10% off) or fixed amount',

  -- Limitations
  max_uses INT DEFAULT NULL COMMENT 'NULL = unlimited uses',
  current_uses INT DEFAULT 0,
  expires_at DATETIME DEFAULT NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  INDEX idx_code (code),
  INDEX idx_partner (partner_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USER ATTRIBUTION TABLE
-- Tracks which partner referred each user
-- This is the SOURCE OF TRUTH for "who brought this customer"
CREATE TABLE IF NOT EXISTS user_attribution (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  partner_id CHAR(36) DEFAULT NULL COMMENT 'NULL if organic signup',
  promo_code_id CHAR(36) DEFAULT NULL,

  -- Attribution Details
  attribution_method ENUM('referral_link', 'promo_code', 'manual') NOT NULL COMMENT 'How they were attributed',
  referral_url VARCHAR(1000) DEFAULT NULL COMMENT 'Full URL they came from',
  utm_source VARCHAR(255) DEFAULT NULL,
  utm_medium VARCHAR(255) DEFAULT NULL,
  utm_campaign VARCHAR(255) DEFAULT NULL,

  -- Conversion Tracking
  converted_to_paid BOOLEAN DEFAULT FALSE COMMENT 'Did they become a paying customer?',
  converted_at DATETIME DEFAULT NULL,
  first_payment_amount DECIMAL(10,2) DEFAULT 0.00,

  -- Commission Status
  commission_due DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Commission owed for this referral',
  commission_paid BOOLEAN DEFAULT FALSE,
  commission_paid_at DATETIME DEFAULT NULL,

  -- Metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When user signed up',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_attribution (user_id),
  INDEX idx_partner (partner_id),
  INDEX idx_converted (converted_to_paid),
  INDEX idx_commission_paid (commission_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PARTNER PAYOUTS TABLE
-- Tracks commission payments to partners
CREATE TABLE IF NOT EXISTS partner_payouts (
  id CHAR(36) PRIMARY KEY,
  partner_id CHAR(36) NOT NULL,

  -- Payout Details
  amount DECIMAL(10,2) NOT NULL COMMENT 'Amount paid to partner',
  currency VARCHAR(3) DEFAULT 'USD',
  period_start DATE NOT NULL COMMENT 'Start of payout period',
  period_end DATE NOT NULL COMMENT 'End of payout period',

  -- Payment Method
  payment_method ENUM('bank_transfer', 'paypal', 'stripe', 'manual') DEFAULT 'paypal',
  payment_reference VARCHAR(255) DEFAULT NULL COMMENT 'Transaction ID or reference',

  -- Status
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  paid_at DATETIME DEFAULT NULL,

  -- Breakdown
  total_referrals INT DEFAULT 0 COMMENT 'Number of referrals in this period',
  total_revenue DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Revenue generated by referrals',

  -- Metadata
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  INDEX idx_partner (partner_id),
  INDEX idx_status (status),
  INDEX idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ATTRIBUTION EVENTS TABLE
-- Tracks all attribution touchpoints (for multi-touch attribution if needed)
CREATE TABLE IF NOT EXISTS attribution_events (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'NULL if user not signed up yet',
  partner_id CHAR(36) DEFAULT NULL,

  -- Event Details
  event_type ENUM('visit', 'signup', 'conversion', 'promo_applied') NOT NULL,

  -- Tracking Data
  referral_url VARCHAR(1000) DEFAULT NULL,
  utm_source VARCHAR(255) DEFAULT NULL,
  utm_medium VARCHAR(255) DEFAULT NULL,
  utm_campaign VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,

  -- Metadata
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_partner (partner_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Sample Partner: Jeff Su
INSERT INTO partners (id, name, email, slug, platform, follower_count, commission_rate, commission_tier, status, free_licenses_allocated)
VALUES
  (UUID(), 'Jeff Su', 'jeff@jeffsu.com', 'jeff-su', 'youtube', 200000, 40.00, 'silver', 'active', 10);

-- Sample Partner: Sandi
INSERT INTO partners (id, name, email, slug, platform, follower_count, commission_rate, commission_tier, status, free_licenses_allocated)
VALUES
  (UUID(), 'Sandi', 'sandi@sandiproductivity.com', 'sandi', 'youtube', 20000, 30.00, 'bronze', 'active', 10);

-- Sample Promo Codes
INSERT INTO promo_codes (id, partner_id, code, discount_type, discount_value, max_uses)
SELECT UUID(), id, 'JEFFSU10', 'percentage', 10.00, 100
FROM partners WHERE slug = 'jeff-su';

INSERT INTO promo_codes (id, partner_id, code, discount_type, discount_value, max_uses)
SELECT UUID(), id, 'SANDI15', 'percentage', 15.00, 100
FROM partners WHERE slug = 'sandi';

-- =====================================================
-- HELPER VIEWS (for easy reporting)
-- =====================================================

-- View: Partner Performance Dashboard
CREATE OR REPLACE VIEW partner_performance AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.platform,
  p.commission_rate,
  p.status,
  p.total_signups,
  p.total_conversions,
  ROUND((p.total_conversions / NULLIF(p.total_signups, 0)) * 100, 2) AS conversion_rate,
  p.total_revenue_generated,
  p.total_commission_earned,
  p.total_commission_paid,
  (p.total_commission_earned - p.total_commission_paid) AS commission_pending,
  COUNT(DISTINCT ua.user_id) AS current_month_signups,
  SUM(CASE WHEN ua.converted_to_paid = TRUE THEN 1 ELSE 0 END) AS current_month_conversions
FROM partners p
LEFT JOIN user_attribution ua ON p.id = ua.partner_id
  AND ua.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
GROUP BY p.id, p.name, p.slug, p.platform, p.commission_rate, p.status,
  p.total_signups, p.total_conversions, p.total_revenue_generated,
  p.total_commission_earned, p.total_commission_paid;

-- View: Unpaid Commissions
CREATE OR REPLACE VIEW unpaid_commissions AS
SELECT
  p.id AS partner_id,
  p.name AS partner_name,
  p.email AS partner_email,
  COUNT(ua.id) AS unpaid_referrals,
  SUM(ua.commission_due) AS total_commission_due,
  MIN(ua.converted_at) AS oldest_conversion,
  MAX(ua.converted_at) AS newest_conversion
FROM partners p
INNER JOIN user_attribution ua ON p.id = ua.partner_id
WHERE ua.commission_paid = FALSE
  AND ua.converted_to_paid = TRUE
GROUP BY p.id, p.name, p.email;

-- =====================================================
-- TRIGGERS (auto-update partner stats)
-- =====================================================

-- Trigger: Update partner stats when user attribution is created
DELIMITER //
CREATE TRIGGER after_user_attribution_insert
AFTER INSERT ON user_attribution
FOR EACH ROW
BEGIN
  IF NEW.partner_id IS NOT NULL THEN
    UPDATE partners
    SET total_signups = total_signups + 1
    WHERE id = NEW.partner_id;
  END IF;
END//
DELIMITER ;

-- Trigger: Update partner stats when user converts to paid
DELIMITER //
CREATE TRIGGER after_user_attribution_convert
AFTER UPDATE ON user_attribution
FOR EACH ROW
BEGIN
  IF NEW.converted_to_paid = TRUE AND OLD.converted_to_paid = FALSE THEN
    UPDATE partners
    SET
      total_conversions = total_conversions + 1,
      total_revenue_generated = total_revenue_generated + NEW.first_payment_amount,
      total_commission_earned = total_commission_earned + NEW.commission_due
    WHERE id = NEW.partner_id;
  END IF;
END//
DELIMITER ;

-- Trigger: Update partner stats when commission is paid
DELIMITER //
CREATE TRIGGER after_commission_paid
AFTER UPDATE ON user_attribution
FOR EACH ROW
BEGIN
  IF NEW.commission_paid = TRUE AND OLD.commission_paid = FALSE THEN
    UPDATE partners
    SET total_commission_paid = total_commission_paid + NEW.commission_due
    WHERE id = NEW.partner_id;
  END IF;
END//
DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for common queries
CREATE INDEX idx_user_attribution_created_at ON user_attribution(created_at);
CREATE INDEX idx_user_attribution_partner_converted ON user_attribution(partner_id, converted_to_paid);
CREATE INDEX idx_attribution_events_created_at ON attribution_events(created_at);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration adds:
-- ✅ 5 new tables (partners, promo_codes, user_attribution, partner_payouts, attribution_events)
-- ✅ 2 helper views (partner_performance, unpaid_commissions)
-- ✅ 3 triggers (auto-update partner stats)
-- ✅ Sample data (Jeff Su, Sandi + promo codes)
--
-- Next steps:
-- 1. Run this migration on local MySQL
-- 2. Create backend models (Partner.ts, PromoCode.ts, UserAttribution.ts)
-- 3. Build API endpoints for partner dashboard
-- 4. Add referral link capture to signup flow
-- =====================================================
