import { Model, Optional } from 'sequelize';
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELED = "canceled",
    PAST_DUE = "past_due",
    TRIALING = "trialing",
    PENDING = "pending"
}
export declare enum PlanType {
    FREE = "free",
    STARTER = "starter",
    PRO = "pro",
    ENTERPRISE = "enterprise"
}
export declare enum PaymentProvider {
    PAYFAST = "payfast",
    PAYGENIUS = "paygenius",
    PAYPAL = "paypal"
}
interface SubscriptionAttributes {
    id: string;
    user_id: string;
    plan: PlanType;
    status: SubscriptionStatus;
    payment_provider?: PaymentProvider;
    payfast_token?: string;
    payfast_subscription_id?: string;
    paygenius_reference?: string;
    paygenius_subscription_id?: string;
    paypal_subscription_id?: string;
    paypal_order_id?: string;
    amount: number;
    currency: string;
    billing_date?: Date;
    next_billing_date?: Date;
    cancel_at?: Date;
    canceled_at?: Date;
    trial_end?: Date;
    started_at: Date;
    ended_at?: Date;
    created_at: Date;
    updated_at: Date;
}
interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id' | 'created_at' | 'updated_at'> {
}
declare class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
    id: string;
    user_id: string;
    plan: PlanType;
    status: SubscriptionStatus;
    payment_provider?: PaymentProvider;
    payfast_token?: string;
    payfast_subscription_id?: string;
    paygenius_reference?: string;
    paygenius_subscription_id?: string;
    paypal_subscription_id?: string;
    paypal_order_id?: string;
    amount: number;
    currency: string;
    billing_date?: Date;
    next_billing_date?: Date;
    cancel_at?: Date;
    canceled_at?: Date;
    trial_end?: Date;
    started_at: Date;
    ended_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export { Subscription };
//# sourceMappingURL=subscription.model.d.ts.map