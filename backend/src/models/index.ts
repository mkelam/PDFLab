// Central export for all models
export { User, UserPlan, UserRole, SubscriptionStatus } from './User'
export { ConversionJob, ConversionType, JobStatus } from './ConversionJob'
export { BatchJob, BatchOperationType, BatchStatus } from './BatchJob'
export { UsageLog } from './UsageLog'
export { AdminAuditLog, AuditLogSeverity } from './AdminAuditLog'
export { SystemHealthLog, HealthStatus } from './SystemHealthLog'
export { Subscription, PlanType } from './subscription.model'
export { PaymentLog, PaymentStatus, PaymentType } from './payment-log.model'
export { PasswordHistory } from './PasswordHistory'

// Set up model associations
import { User } from './User'
import { Subscription } from './subscription.model'
import { PaymentLog } from './payment-log.model'
import { ConversionJob } from './ConversionJob'
import { AdminAuditLog } from './AdminAuditLog'
import { PasswordHistory } from './PasswordHistory'

// User <-> Subscription (one-to-many)
User.hasMany(Subscription, {
  foreignKey: 'user_id',
  as: 'subscriptions'
})
Subscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})

// User <-> PaymentLog (one-to-many)
User.hasMany(PaymentLog, {
  foreignKey: 'user_id',
  as: 'paymentLogs'
})
PaymentLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})

// Subscription <-> PaymentLog (one-to-many)
Subscription.hasMany(PaymentLog, {
  foreignKey: 'subscription_id',
  as: 'paymentLogs'
})
PaymentLog.belongsTo(Subscription, {
  foreignKey: 'subscription_id',
  as: 'subscription'
})

// User <-> AdminAuditLog (one-to-many)
User.hasMany(AdminAuditLog, {
  foreignKey: 'admin_user_id',
  as: 'auditLogs'
})
AdminAuditLog.belongsTo(User, {
  foreignKey: 'admin_user_id',
  as: 'adminUser'
})

// User <-> PasswordHistory (one-to-many)
User.hasMany(PasswordHistory, {
  foreignKey: 'user_id',
  as: 'passwordHistory'
})
PasswordHistory.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
})
