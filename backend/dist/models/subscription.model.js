"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = exports.PaymentProvider = exports.PlanType = exports.SubscriptionStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["TRIALING"] = "trialing";
    SubscriptionStatus["PENDING"] = "pending";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var PlanType;
(function (PlanType) {
    PlanType["FREE"] = "free";
    PlanType["STARTER"] = "starter";
    PlanType["PRO"] = "pro";
    PlanType["ENTERPRISE"] = "enterprise";
})(PlanType || (exports.PlanType = PlanType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["PAYFAST"] = "payfast";
    PaymentProvider["PAYGENIUS"] = "paygenius";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
class Subscription extends sequelize_1.Model {
}
exports.Subscription = Subscription;
Subscription.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    plan: {
        type: sequelize_1.DataTypes.ENUM('free', 'starter', 'pro', 'enterprise'),
        allowNull: false,
        defaultValue: 'free'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'canceled', 'past_due', 'trialing', 'pending'),
        allowNull: false,
        defaultValue: 'pending'
    },
    payment_provider: {
        type: sequelize_1.DataTypes.ENUM('payfast', 'paygenius'),
        allowNull: true,
        defaultValue: 'paygenius',
        comment: 'Payment provider used for this subscription'
    },
    payfast_token: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayFast subscription token for recurring payments (legacy)'
    },
    payfast_subscription_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayFast subscription ID (legacy)'
    },
    paygenius_reference: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayGenius payment reference'
    },
    paygenius_subscription_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayGenius subscription reference for recurring payments'
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Subscription amount in currency'
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'Currency code (USD for United States Dollar)'
    },
    billing_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'First billing date'
    },
    next_billing_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Next billing date for recurring subscription'
    },
    cancel_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Scheduled cancellation date'
    },
    canceled_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Actual cancellation timestamp'
    },
    trial_end: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Trial period end date'
    },
    started_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
        comment: 'Subscription start date'
    },
    ended_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'Subscription end date (if canceled)'
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
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['payfast_token'] },
        { fields: ['paygenius_reference'] },
        { fields: ['paygenius_subscription_id'] },
        { fields: ['next_billing_date'] }
    ]
});
//# sourceMappingURL=subscription.model.js.map