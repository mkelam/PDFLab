"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordHistory = exports.PaymentType = exports.PaymentStatus = exports.PaymentLog = exports.PlanType = exports.Subscription = exports.HealthStatus = exports.SystemHealthLog = exports.AuditLogSeverity = exports.AdminAuditLog = exports.UsageLog = exports.JobStatus = exports.ConversionType = exports.ConversionJob = exports.SubscriptionStatus = exports.UserRole = exports.UserPlan = exports.User = void 0;
// Central export for all models
var User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
Object.defineProperty(exports, "UserPlan", { enumerable: true, get: function () { return User_1.UserPlan; } });
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return User_1.UserRole; } });
Object.defineProperty(exports, "SubscriptionStatus", { enumerable: true, get: function () { return User_1.SubscriptionStatus; } });
var ConversionJob_1 = require("./ConversionJob");
Object.defineProperty(exports, "ConversionJob", { enumerable: true, get: function () { return ConversionJob_1.ConversionJob; } });
Object.defineProperty(exports, "ConversionType", { enumerable: true, get: function () { return ConversionJob_1.ConversionType; } });
Object.defineProperty(exports, "JobStatus", { enumerable: true, get: function () { return ConversionJob_1.JobStatus; } });
var UsageLog_1 = require("./UsageLog");
Object.defineProperty(exports, "UsageLog", { enumerable: true, get: function () { return UsageLog_1.UsageLog; } });
var AdminAuditLog_1 = require("./AdminAuditLog");
Object.defineProperty(exports, "AdminAuditLog", { enumerable: true, get: function () { return AdminAuditLog_1.AdminAuditLog; } });
Object.defineProperty(exports, "AuditLogSeverity", { enumerable: true, get: function () { return AdminAuditLog_1.AuditLogSeverity; } });
var SystemHealthLog_1 = require("./SystemHealthLog");
Object.defineProperty(exports, "SystemHealthLog", { enumerable: true, get: function () { return SystemHealthLog_1.SystemHealthLog; } });
Object.defineProperty(exports, "HealthStatus", { enumerable: true, get: function () { return SystemHealthLog_1.HealthStatus; } });
var subscription_model_1 = require("./subscription.model");
Object.defineProperty(exports, "Subscription", { enumerable: true, get: function () { return subscription_model_1.Subscription; } });
Object.defineProperty(exports, "PlanType", { enumerable: true, get: function () { return subscription_model_1.PlanType; } });
var payment_log_model_1 = require("./payment-log.model");
Object.defineProperty(exports, "PaymentLog", { enumerable: true, get: function () { return payment_log_model_1.PaymentLog; } });
Object.defineProperty(exports, "PaymentStatus", { enumerable: true, get: function () { return payment_log_model_1.PaymentStatus; } });
Object.defineProperty(exports, "PaymentType", { enumerable: true, get: function () { return payment_log_model_1.PaymentType; } });
var PasswordHistory_1 = require("./PasswordHistory");
Object.defineProperty(exports, "PasswordHistory", { enumerable: true, get: function () { return PasswordHistory_1.PasswordHistory; } });
// Set up model associations
const User_2 = require("./User");
const subscription_model_2 = require("./subscription.model");
const payment_log_model_2 = require("./payment-log.model");
const AdminAuditLog_2 = require("./AdminAuditLog");
const PasswordHistory_2 = require("./PasswordHistory");
// User <-> Subscription (one-to-many)
User_2.User.hasMany(subscription_model_2.Subscription, {
    foreignKey: 'user_id',
    as: 'subscriptions'
});
subscription_model_2.Subscription.belongsTo(User_2.User, {
    foreignKey: 'user_id',
    as: 'user'
});
// User <-> PaymentLog (one-to-many)
User_2.User.hasMany(payment_log_model_2.PaymentLog, {
    foreignKey: 'user_id',
    as: 'paymentLogs'
});
payment_log_model_2.PaymentLog.belongsTo(User_2.User, {
    foreignKey: 'user_id',
    as: 'user'
});
// Subscription <-> PaymentLog (one-to-many)
subscription_model_2.Subscription.hasMany(payment_log_model_2.PaymentLog, {
    foreignKey: 'subscription_id',
    as: 'paymentLogs'
});
payment_log_model_2.PaymentLog.belongsTo(subscription_model_2.Subscription, {
    foreignKey: 'subscription_id',
    as: 'subscription'
});
// User <-> AdminAuditLog (one-to-many)
User_2.User.hasMany(AdminAuditLog_2.AdminAuditLog, {
    foreignKey: 'admin_user_id',
    as: 'auditLogs'
});
AdminAuditLog_2.AdminAuditLog.belongsTo(User_2.User, {
    foreignKey: 'admin_user_id',
    as: 'adminUser'
});
// User <-> PasswordHistory (one-to-many)
User_2.User.hasMany(PasswordHistory_2.PasswordHistory, {
    foreignKey: 'user_id',
    as: 'passwordHistory'
});
PasswordHistory_2.PasswordHistory.belongsTo(User_2.User, {
    foreignKey: 'user_id',
    as: 'user'
});
//# sourceMappingURL=index.js.map