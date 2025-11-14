import { Model, Optional } from 'sequelize';
export interface BetaApplicationAttributes {
    id: string;
    full_name: string;
    email: string;
    company?: string;
    role?: string;
    use_case: string;
    monthly_volume?: string;
    plan_requested: 'starter' | 'pro';
    linkedin_url?: string;
    twitter_url?: string;
    website_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: Date;
    rejection_reason?: string;
    user_id?: string;
    created_at?: Date;
    updated_at?: Date;
}
interface BetaApplicationCreationAttributes extends Optional<BetaApplicationAttributes, 'id' | 'created_at' | 'updated_at'> {
}
export declare class BetaApplication extends Model<BetaApplicationAttributes, BetaApplicationCreationAttributes> implements BetaApplicationAttributes {
    id: string;
    full_name: string;
    email: string;
    company?: string;
    role?: string;
    use_case: string;
    monthly_volume?: string;
    plan_requested: 'starter' | 'pro';
    linkedin_url?: string;
    twitter_url?: string;
    website_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: Date;
    rejection_reason?: string;
    user_id?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export {};
//# sourceMappingURL=BetaApplication.d.ts.map