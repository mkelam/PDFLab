import { Model, Optional } from 'sequelize';
import { User } from './User';
import { Partner } from './Partner';
import { PromoCode } from './PromoCode';
export declare enum AttributionMethod {
    REFERRAL_LINK = "referral_link",
    PROMO_CODE = "promo_code",
    MANUAL = "manual"
}
interface UserAttributionAttributes {
    id: string;
    user_id: string;
    partner_id?: string | null;
    promo_code_id?: string | null;
    attribution_method: AttributionMethod;
    referral_url?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    converted_to_paid: boolean;
    converted_at?: Date;
    first_payment_amount: number;
    commission_due: number;
    commission_paid: boolean;
    commission_paid_at?: Date;
    created_at: Date;
    updated_at: Date;
}
interface UserAttributionCreationAttributes extends Optional<UserAttributionAttributes, 'id' | 'partner_id' | 'promo_code_id' | 'referral_url' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'converted_to_paid' | 'converted_at' | 'first_payment_amount' | 'commission_due' | 'commission_paid' | 'commission_paid_at' | 'created_at' | 'updated_at'> {
}
export declare class UserAttribution extends Model<UserAttributionAttributes, UserAttributionCreationAttributes> implements UserAttributionAttributes {
    id: string;
    user_id: string;
    partner_id?: string | null;
    promo_code_id?: string | null;
    attribution_method: AttributionMethod;
    referral_url?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    converted_to_paid: boolean;
    converted_at?: Date;
    first_payment_amount: number;
    commission_due: number;
    commission_paid: boolean;
    commission_paid_at?: Date;
    readonly created_at: Date;
    readonly updated_at: Date;
    user?: User;
    partner?: Partner;
    promo_code?: PromoCode;
    markAsConverted(paymentAmount: number, commissionRate: number): Promise<void>;
    markCommissionPaid(): Promise<void>;
    isOrganic(): boolean;
    getDaysSinceSignup(): number;
    getDaysSinceConversion(): number | null;
}
export {};
//# sourceMappingURL=UserAttribution.d.ts.map