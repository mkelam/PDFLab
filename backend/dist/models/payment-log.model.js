"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLog = exports.PaymentProvider = exports.PaymentType = exports.PaymentStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["COMPLETE"] = "complete";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["CANCELLED"] = "cancelled";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentType;
(function (PaymentType) {
    PaymentType["SUBSCRIPTION"] = "subscription";
    PaymentType["SUBSCRIPTION_PAYMENT"] = "subscription_payment";
    PaymentType["ONE_TIME"] = "one_time";
    PaymentType["REFUND"] = "refund";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["PAYFAST"] = "payfast";
    PaymentProvider["PAYGENIUS"] = "paygenius";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
class PaymentLog extends sequelize_1.Model {
}
exports.PaymentLog = PaymentLog;
PaymentLog.init({
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
    subscription_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'subscriptions',
            key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    },
    transaction_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Our internal transaction ID'
    },
    payment_provider: {
        type: sequelize_1.DataTypes.ENUM('payfast', 'paygenius'),
        allowNull: true,
        defaultValue: 'paygenius',
        comment: 'Payment provider used for this transaction'
    },
    payfast_payment_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayFast payment ID (pf_payment_id) - legacy'
    },
    paygenius_payment_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        comment: 'PayGenius payment reference'
    },
    payment_type: {
        type: sequelize_1.DataTypes.ENUM('subscription', 'subscription_payment', 'one_time', 'refund'),
        allowNull: false,
        defaultValue: 'one_time'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('complete', 'failed', 'pending', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    amount_gross: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Gross amount before fees'
    },
    amount_fee: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'PayFast processing fee'
    },
    amount_net: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Net amount after fees'
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
    },
    plan: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        comment: 'Plan name (free, starter, pro, enterprise)'
    },
    payment_method: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true,
        comment: 'Payment method used (eft, credit_card, etc.)'
    },
    name_first: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    name_last: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    email_address: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    item_name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    item_description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    custom_data: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'Custom data sent to PayFast'
    },
    itn_data: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'Full ITN notification data from PayFast (legacy)'
    },
    webhook_data: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
        comment: 'Full webhook notification data from PayGenius'
    },
    error_message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if payment failed'
    },
    processed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        comment: 'When the payment was processed'
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
    tableName: 'payment_logs',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['subscription_id'] },
        { fields: ['payfast_payment_id'] },
        { fields: ['paygenius_payment_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] }
    ]
});
//# sourceMappingURL=payment-log.model.js.map