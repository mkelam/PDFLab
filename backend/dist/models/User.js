"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.SubscriptionStatus = exports.UserPlan = exports.UserRole = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["SUPPORT"] = "support";
    UserRole["FINANCE"] = "finance";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPER_ADMIN"] = "super_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserPlan;
(function (UserPlan) {
    UserPlan["FREE"] = "free";
    UserPlan["STARTER"] = "starter";
    UserPlan["PRO"] = "pro";
    UserPlan["ENTERPRISE"] = "enterprise";
})(UserPlan || (exports.UserPlan = UserPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["CANCELED"] = "canceled";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["TRIALING"] = "trialing";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
class User extends sequelize_1.Model {
    // Helper methods
    canConvert() {
        if (this.plan === UserPlan.PRO || this.plan === UserPlan.ENTERPRISE) {
            return true; // Unlimited
        }
        return this.conversions_used < this.conversions_limit;
    }
    getMaxFileSize() {
        switch (this.plan) {
            case UserPlan.FREE:
                return parseInt(process.env.MAX_FILE_SIZE_FREE || '10485760'); // 10MB
            case UserPlan.STARTER:
                return parseInt(process.env.MAX_FILE_SIZE_STARTER || '26214400'); // 25MB
            case UserPlan.PRO:
                return parseInt(process.env.MAX_FILE_SIZE_PRO || '104857600'); // 100MB
            case UserPlan.ENTERPRISE:
                return 524288000; // 500MB
            default:
                return 10485760;
        }
    }
    resetMonthlyUsage() {
        this.conversions_used = 0;
    }
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    role: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(UserRole)),
        defaultValue: UserRole.USER,
        allowNull: false
    },
    plan: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(UserPlan)),
        defaultValue: UserPlan.FREE,
        allowNull: false
    },
    conversions_used: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    conversions_limit: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: parseInt(process.env['CONVERSIONS_LIMIT_FREE'] || '3'),
        allowNull: false
    },
    stripe_customer_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    subscription_id: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    subscription_status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(SubscriptionStatus)),
        allowNull: true
    },
    subscription_end_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    email_verified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    email_verified_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    failed_reset_attempts: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    reset_locked_until: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
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
    },
    last_login: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            fields: ['stripe_customer_id']
        }
    ]
});
//# sourceMappingURL=User.js.map