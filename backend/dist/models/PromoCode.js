"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoCode = exports.DiscountType = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Partner_1 = require("./Partner");
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED"] = "fixed";
    DiscountType["FREE_TRIAL"] = "free_trial";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
class PromoCode extends sequelize_1.Model {
    // Helper methods
    isValid() {
        if (!this.is_active)
            return false;
        if (this.expires_at && new Date() > this.expires_at)
            return false;
        if (this.max_uses && this.current_uses >= this.max_uses)
            return false;
        return true;
    }
    getRemainingUses() {
        if (!this.max_uses)
            return null; // Unlimited
        return this.max_uses - this.current_uses;
    }
    async incrementUse() {
        this.current_uses += 1;
        await this.save();
    }
    getDiscountAmount(price) {
        if (this.discount_type === DiscountType.PERCENTAGE) {
            return (price * this.discount_value) / 100;
        }
        else if (this.discount_type === DiscountType.FIXED) {
            return Math.min(this.discount_value, price);
        }
        return 0;
    }
    getFinalPrice(originalPrice) {
        const discount = this.getDiscountAmount(originalPrice);
        return Math.max(0, originalPrice - discount);
    }
}
exports.PromoCode = PromoCode;
PromoCode.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    partner_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'partners',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    code: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Promo code (e.g., "JEFFSU10")',
        set(value) {
            // Always store codes in uppercase
            this.setDataValue('code', value.toUpperCase());
        }
    },
    discount_type: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(DiscountType)),
        allowNull: false,
        defaultValue: DiscountType.PERCENTAGE
    },
    discount_value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Percentage (e.g., 10.00 = 10% off) or fixed amount'
    },
    max_uses: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        comment: 'NULL = unlimited uses'
    },
    current_uses: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    tableName: 'promo_codes',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['partner_id'] },
        { fields: ['is_active'] }
    ]
});
// Define associations
Partner_1.Partner.hasMany(PromoCode, {
    foreignKey: 'partner_id',
    as: 'promo_codes'
});
PromoCode.belongsTo(Partner_1.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
});
//# sourceMappingURL=PromoCode.js.map