import { Model, Optional } from 'sequelize';
export declare enum PaymentStatus {
    COMPLETE = "complete",
    FAILED = "failed",
    PENDING = "pending",
    CANCELLED = "cancelled"
}
export declare enum PaymentType {
    SUBSCRIPTION = "subscription",
    SUBSCRIPTION_PAYMENT = "subscription_payment",
    ONE_TIME = "one_time",
    REFUND = "refund"
}
export declare enum PaymentProvider {
    PAYFAST = "payfast",
    PAYGENIUS = "paygenius"
}
interface PaymentLogAttributes {
    id: string;
    user_id: string;
    subscription_id?: string;
    transaction_id: string;
    payment_provider?: PaymentProvider;
    payfast_payment_id?: string;
    itn_data?: any;
    paygenius_payment_id?: string;
    webhook_data?: any;
    payment_type: PaymentType;
    status: PaymentStatus;
    amount_gross: number;
    amount_fee: number;
    amount_net: number;
    currency: string;
    plan: string;
    payment_method?: string;
    name_first: string;
    name_last?: string;
    email_address: string;
    item_name: string;
    item_description?: string;
    custom_data?: any;
    error_message?: string;
    processed_at?: Date;
    created_at: Date;
    updated_at: Date;
}
interface PaymentLogCreationAttributes extends Optional<PaymentLogAttributes, 'id' | 'created_at' | 'updated_at'> {
}
declare class PaymentLog extends Model<PaymentLogAttributes, PaymentLogCreationAttributes> implements PaymentLogAttributes {
    id: string;
    user_id: string;
    subscription_id?: string;
    transaction_id: string;
    payment_provider?: PaymentProvider;
    payfast_payment_id?: string;
    itn_data?: any;
    paygenius_payment_id?: string;
    webhook_data?: any;
    payment_type: PaymentType;
    status: PaymentStatus;
    amount_gross: number;
    amount_fee: number;
    amount_net: number;
    currency: string;
    plan: string;
    payment_method?: string;
    name_first: string;
    name_last?: string;
    email_address: string;
    item_name: string;
    item_description?: string;
    custom_data?: any;
    error_message?: string;
    processed_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export { PaymentLog };
//# sourceMappingURL=payment-log.model.d.ts.map