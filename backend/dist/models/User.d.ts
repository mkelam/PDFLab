import { Model, Optional } from 'sequelize';
export declare enum UserRole {
    USER = "user",
    SUPPORT = "support",
    FINANCE = "finance",
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin"
}
export declare enum UserPlan {
    FREE = "free",
    STARTER = "starter",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELED = "canceled",
    PAST_DUE = "past_due",
    TRIALING = "trialing"
}
interface UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    name?: string;
    role: UserRole;
    plan: UserPlan;
    conversions_used: number;
    conversions_limit: number;
    stripe_customer_id?: string;
    subscription_id?: string;
    subscription_status?: SubscriptionStatus;
    subscription_end_date?: Date;
    is_beta_user: boolean;
    beta_expires_at?: Date;
    email_verified: boolean;
    email_verified_at?: Date;
    failed_reset_attempts: number;
    reset_locked_until?: Date;
    onboarding_completed: boolean;
    onboarding_completed_at?: Date;
    onboarding_skipped: boolean;
    google_id?: string;
    linkedin_id?: string;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'email_verified' | 'email_verified_at' | 'failed_reset_attempts' | 'reset_locked_until' | 'onboarding_completed' | 'onboarding_completed_at' | 'onboarding_skipped' | 'created_at' | 'updated_at' | 'last_login' | 'name' | 'stripe_customer_id' | 'subscription_id' | 'subscription_status' | 'subscription_end_date' | 'is_beta_user' | 'beta_expires_at' | 'google_id' | 'linkedin_id'> {
}
export declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    name?: string;
    role: UserRole;
    plan: UserPlan;
    conversions_used: number;
    conversions_limit: number;
    stripe_customer_id?: string;
    subscription_id?: string;
    subscription_status?: SubscriptionStatus;
    subscription_end_date?: Date;
    is_beta_user: boolean;
    beta_expires_at?: Date;
    email_verified: boolean;
    email_verified_at?: Date;
    failed_reset_attempts: number;
    reset_locked_until?: Date;
    onboarding_completed: boolean;
    onboarding_completed_at?: Date;
    onboarding_skipped: boolean;
    google_id?: string;
    linkedin_id?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
    last_login?: Date;
    canConvert(): boolean;
    getMaxFileSize(): number;
    getMaxBatchSize(): number;
    resetMonthlyUsage(): void;
}
export {};
//# sourceMappingURL=User.d.ts.map