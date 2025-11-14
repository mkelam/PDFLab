-- Partner Applications System
-- Migration: 007_partner_applications.sql
-- Purpose: Create partner application and partner management tables

-- Partner Applications Table
CREATE TABLE IF NOT EXISTS partner_applications (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    country VARCHAR(100),

    -- Audience data
    primary_platform ENUM('youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'blog', 'newsletter', 'other') NOT NULL,
    audience_size ENUM('under_1k', '1k_10k', '10k_50k', '50k_100k', '100k_500k', '500k_plus') NOT NULL,
    audience_niche VARCHAR(100) NOT NULL,
    platform_url VARCHAR(500) NOT NULL,

    -- Application content
    why_pdflab TEXT NOT NULL,
    promotion_methods JSON NOT NULL,
    content_idea TEXT NOT NULL,
    estimated_conversions ENUM('1_10', '10_50', '50_100', '100_plus'),
    previous_affiliates TEXT,

    -- Review data
    status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
    score INT DEFAULT 0,
    reviewed_by VARCHAR(36) REFERENCES users(id),
    reviewed_at TIMESTAMP NULL,
    rejection_reason TEXT,
    admin_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partners Table (approved partners with active referral codes)
CREATE TABLE IF NOT EXISTS partners (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) REFERENCES partner_applications(id),
    user_id VARCHAR(36) REFERENCES users(id),

    -- Partner details
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier ENUM('bronze', 'silver', 'gold', 'platinum') DEFAULT 'bronze',
    commission_rate DECIMAL(5,2) DEFAULT 30.00,

    -- Contact info
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),

    -- Platform info (copied from application)
    primary_platform VARCHAR(50),
    platform_url VARCHAR(500),
    audience_size VARCHAR(50),

    -- Stats (denormalized for performance)
    total_clicks INT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    current_month_conversions INT DEFAULT 0,
    last_conversion_at TIMESTAMP NULL,

    -- Payment info
    payment_method ENUM('paypal', 'bank_transfer', 'stripe') DEFAULT 'paypal',
    payment_email VARCHAR(255),
    payment_details JSON,

    -- Status
    status ENUM('active', 'paused', 'suspended') DEFAULT 'active',
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_referral_code (referral_code),
    INDEX idx_slug (slug),
    INDEX idx_user_id (user_id),
    INDEX idx_tier (tier),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner Conversions Tracking (for tier upgrades and earnings)
CREATE TABLE IF NOT EXISTS partner_conversions (
    id VARCHAR(36) PRIMARY KEY,
    partner_id VARCHAR(36) NOT NULL REFERENCES partners(id),
    subscription_id VARCHAR(36) REFERENCES subscriptions(id),
    user_id VARCHAR(36) REFERENCES users(id),

    -- Conversion details
    plan ENUM('free', 'starter', 'pro', 'enterprise') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,

    -- Status
    status ENUM('pending', 'confirmed', 'paid', 'cancelled') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_partner_id (partner_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partner Payouts Tracking
CREATE TABLE IF NOT EXISTS partner_payouts (
    id VARCHAR(36) PRIMARY KEY,
    partner_id VARCHAR(36) NOT NULL REFERENCES partners(id),

    -- Payout details
    amount DECIMAL(10,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    conversions_count INT NOT NULL,

    -- Payment details
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',

    -- Timestamps
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_partner_id (partner_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
