"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Partner = exports.PartnerStatus = exports.CommissionTier = exports.PartnerPlatform = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var PartnerPlatform;
(function (PartnerPlatform) {
    PartnerPlatform["YOUTUBE"] = "youtube";
    PartnerPlatform["TWITTER"] = "twitter";
    PartnerPlatform["LINKEDIN"] = "linkedin";
    PartnerPlatform["INSTAGRAM"] = "instagram";
    PartnerPlatform["TIKTOK"] = "tiktok";
    PartnerPlatform["OTHER"] = "other";
})(PartnerPlatform || (exports.PartnerPlatform = PartnerPlatform = {}));
var CommissionTier;
(function (CommissionTier) {
    CommissionTier["BRONZE"] = "bronze";
    CommissionTier["SILVER"] = "silver";
    CommissionTier["GOLD"] = "gold";
    CommissionTier["PLATINUM"] = "platinum"; // 60%
})(CommissionTier || (exports.CommissionTier = CommissionTier = {}));
var PartnerStatus;
(function (PartnerStatus) {
    PartnerStatus["PENDING"] = "pending";
    PartnerStatus["ACTIVE"] = "active";
    PartnerStatus["PAUSED"] = "paused";
    PartnerStatus["INACTIVE"] = "inactive";
})(PartnerStatus || (exports.PartnerStatus = PartnerStatus = {}));
class Partner extends sequelize_1.Model {
    // Helper methods
    getCommissionRateByTier() {
        const tierRates = {
            [CommissionTier.BRONZE]: 30.0,
            [CommissionTier.SILVER]: 40.0,
            [CommissionTier.GOLD]: 50.0,
            [CommissionTier.PLATINUM]: 60.0
        };
        return tierRates[this.commission_tier];
    }
    getReferralLink() {
        return `https://pdflab.pro/partner/${this.slug}`;
    }
    getFreeLicensesRemaining() {
        return this.free_licenses_allocated - this.free_licenses_used;
    }
    getConversionRate() {
        if (this.total_signups === 0)
            return 0;
        return (this.total_conversions / this.total_signups) * 100;
    }
    getPendingCommission() {
        return this.total_commission_earned - this.total_commission_paid;
    }
    canAcceptMoreReferrals() {
        return this.status === PartnerStatus.ACTIVE;
    }
}
exports.Partner = Partner;
Partner.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'full_name', // Maps to DB column 'full_name'
        allowNull: false
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    slug: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly identifier (e.g., "jeff-su")'
    },
    application_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        comment: 'Links to partner_applications table'
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        comment: 'Links to users table for authentication'
    },
    brand_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    referral_code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique referral code like JEFF25'
    },
    platform: {
        type: sequelize_1.DataTypes.STRING(50), // Changed from ENUM to STRING to match DB
        field: 'primary_platform', // Maps to DB column 'primary_platform'
        allowNull: true,
        comment: 'Primary platform: youtube, twitter, linkedin, etc'
    },
    follower_count: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'audience_size', // Maps to DB column 'audience_size' (stored as string like '100k_500k')
        allowNull: true,
        get() {
            // Virtual getter - audience_size is a string in DB, return 0 for now
            return 0;
        }
    },
    website: {
        type: sequelize_1.DataTypes.STRING(500),
        field: 'platform_url', // Maps to DB column 'platform_url'
        allowNull: true
    },
    commission_rate: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 30.0,
        comment: 'Percentage commission (e.g., 30.00 = 30%)'
    },
    commission_tier: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(CommissionTier)),
        field: 'tier', // Maps to DB column 'tier'
        allowNull: false,
        defaultValue: CommissionTier.BRONZE,
        comment: 'bronze=30%, silver=40%, gold=50%'
    },
    free_licenses_allocated: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Total free licenses given to partner (not in DB schema yet)'
    },
    free_licenses_used: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'How many have been redeemed (not in DB schema yet)'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(PartnerStatus)),
        allowNull: false,
        defaultValue: PartnerStatus.PENDING
    },
    contract_signed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Not in DB schema yet - returns null'
    },
    activated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'When partner was activated'
    },
    total_clicks: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total clicks on referral link'
    },
    total_signups: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Total users who signed up via this partner (not in DB schema yet)'
    },
    total_conversions: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Users who became paying customers'
    },
    total_revenue_generated: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        field: 'total_revenue', // Maps to DB column 'total_revenue'
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total revenue from their referrals'
    },
    total_commission_earned: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        field: 'total_earnings', // Maps to DB column 'total_earnings'
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Total commission owed to partner'
    },
    total_commission_paid: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Total commission already paid (not in DB schema yet)'
    },
    current_month_conversions: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Conversions this month for tier upgrades'
    },
    last_conversion_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Last time a conversion occurred'
    },
    payment_method: {
        type: sequelize_1.DataTypes.ENUM('paypal', 'bank_transfer', 'stripe'),
        allowNull: true
    },
    payment_email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'Email for PayPal or Stripe payments'
    },
    payment_details: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'JSON object with payment configuration'
    },
    password_hash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hashed password for partner portal login'
    },
    last_login_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Last time partner logged into dashboard'
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: 'Not in DB schema yet - returns null'
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'partners',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['slug'] },
        { fields: ['status'] }
    ]
});
