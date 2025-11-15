import { Model, Optional } from 'sequelize';
interface PartnerApplicationAttributes {
    id: string;
    email: string;
    full_name: string;
    brand_name?: string;
    country?: string;
    primary_platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'blog' | 'newsletter' | 'other';
    audience_size: 'under_1k' | '1k_10k' | '10k_50k' | '50k_100k' | '100k_500k' | '500k_plus';
    audience_niche: string;
    platform_url: string;
    why_pdflab?: string;
    promotion_methods: string[];
    content_idea?: string;
    estimated_conversions?: '1_10' | '10_50' | '50_100' | '100_plus';
    previous_affiliates?: string;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    score: number;
    reviewed_by?: string;
    reviewed_at?: Date;
    rejection_reason?: string;
    admin_notes?: string;
    created_at?: Date;
    updated_at?: Date;
}
interface PartnerApplicationCreationAttributes extends Optional<PartnerApplicationAttributes, 'id' | 'status' | 'score'> {
}
declare class PartnerApplication extends Model<PartnerApplicationAttributes, PartnerApplicationCreationAttributes> implements PartnerApplicationAttributes {
    id: string;
    email: string;
    full_name: string;
    brand_name?: string;
    country?: string;
    primary_platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'linkedin' | 'blog' | 'newsletter' | 'other';
    audience_size: 'under_1k' | '1k_10k' | '10k_50k' | '50k_100k' | '100k_500k' | '500k_plus';
    audience_niche: string;
    platform_url: string;
    why_pdflab: string;
    promotion_methods: string[];
    content_idea: string;
    estimated_conversions?: '1_10' | '10_50' | '50_100' | '100_plus';
    previous_affiliates?: string;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    score: number;
    reviewed_by?: string;
    reviewed_at?: Date;
    rejection_reason?: string;
    admin_notes?: string;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default PartnerApplication;
//# sourceMappingURL=PartnerApplication.d.ts.map