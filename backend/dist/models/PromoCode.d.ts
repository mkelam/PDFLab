import { Model, Optional } from 'sequelize';
export declare enum DiscountType {
    PERCENTAGE = "percentage",
    FIXED = "fixed",
    FREE_TRIAL = "free_trial"
}
interface PromoCodeAttributes {
    id: string;
    partner_id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    max_uses?: number;
    current_uses: number;
    expires_at?: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
interface PromoCodeCreationAttributes extends Optional<PromoCodeAttributes, 'id' | 'discount_type' | 'discount_value' | 'max_uses' | 'current_uses' | 'expires_at' | 'is_active' | 'created_at' | 'updated_at'> {
}
export declare class PromoCode extends Model<PromoCodeAttributes, PromoCodeCreationAttributes> implements PromoCodeAttributes {
    id: string;
    partner_id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    max_uses?: number;
    current_uses: number;
    expires_at?: Date;
    is_active: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
    isValid(): boolean;
    getRemainingUses(): number | null;
    incrementUse(): Promise<void>;
    getDiscountAmount(price: number): number;
    getFinalPrice(originalPrice: number): number;
}
export {};
//# sourceMappingURL=PromoCode.d.ts.map