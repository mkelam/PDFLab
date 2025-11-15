"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAttribution = exports.AttributionMethod = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = require("./User");
const Partner_1 = require("./Partner");
const PromoCode_1 = require("./PromoCode");
var AttributionMethod;
(function (AttributionMethod) {
    AttributionMethod["REFERRAL_LINK"] = "referral_link";
    AttributionMethod["PROMO_CODE"] = "promo_code";
    AttributionMethod["MANUAL"] = "manual";
})(AttributionMethod || (exports.AttributionMethod = AttributionMethod = {}));
class UserAttribution extends sequelize_1.Model {
    // Helper methods
    async markAsConverted(paymentAmount, commissionRate) {
        this.converted_to_paid = true;
        this.converted_at = new Date();
        this.first_payment_amount = paymentAmount;
        this.commission_due = (paymentAmount * commissionRate) / 100;
        await this.save();
    }
    async markCommissionPaid() {
        this.commission_paid = true;
        this.commission_paid_at = new Date();
        await this.save();
    }
    isOrganic() {
        return !this.partner_id;
    }
    getDaysSinceSignup() {
        const now = new Date();
        const signup = new Date(this.created_at);
        const diff = now.getTime() - signup.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    getDaysSinceConversion() {
        if (!this.converted_at)
            return null;
        const now = new Date();
        const conversion = new Date(this.converted_at);
        const diff = now.getTime() - conversion.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
}
exports.UserAttribution = UserAttribution;
UserAttribution.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    partner_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        comment: 'NULL if organic signup',
        references: {
            model: 'partners',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    promo_code_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'promo_codes',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    attribution_method: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(AttributionMethod)),
        allowNull: false,
        comment: 'How they were attributed'
    },
    referral_url: {
        type: sequelize_1.DataTypes.STRING(1000),
        allowNull: true,
        comment: 'Full URL they came from'
    },
    utm_source: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    utm_medium: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    utm_campaign: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    converted_to_paid: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Did they become a paying customer?'
    },
    converted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    first_payment_amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
    },
    commission_due: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Commission owed for this referral'
    },
    commission_paid: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    commission_paid_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        comment: 'When user signed up'
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'user_attribution',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_id'] },
        { fields: ['partner_id'] },
        { fields: ['converted_to_paid'] },
        { fields: ['commission_paid'] },
        { fields: ['created_at'] },
        { fields: ['partner_id', 'converted_to_paid'] }
    ]
});
// Define associations
User_1.User.hasOne(UserAttribution, {
    foreignKey: 'user_id',
    as: 'attribution'
});
UserAttribution.belongsTo(User_1.User, {
    foreignKey: 'user_id',
    as: 'user'
});
Partner_1.Partner.hasMany(UserAttribution, {
    foreignKey: 'partner_id',
    as: 'attributions'
});
UserAttribution.belongsTo(Partner_1.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
});
PromoCode_1.PromoCode.hasMany(UserAttribution, {
    foreignKey: 'promo_code_id',
    as: 'attributions'
});
UserAttribution.belongsTo(PromoCode_1.PromoCode, {
    foreignKey: 'promo_code_id',
    as: 'promo_code'
});
//# sourceMappingURL=UserAttribution.js.map