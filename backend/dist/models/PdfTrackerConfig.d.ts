import type { Optional } from 'sequelize';
import { Model } from 'sequelize';
export interface PdfTrackerConfigAttributes {
    id: string;
    subreddits: string[];
    pdf_keywords: string[];
    complaint_keywords: string[];
    viral_threshold: number;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}
export interface PdfTrackerConfigCreationAttributes extends Optional<PdfTrackerConfigAttributes, 'id' | 'is_active' | 'created_at' | 'updated_at'> {
}
declare class PdfTrackerConfig extends Model<PdfTrackerConfigAttributes, PdfTrackerConfigCreationAttributes> implements PdfTrackerConfigAttributes {
    id: string;
    subreddits: string[];
    pdf_keywords: string[];
    complaint_keywords: string[];
    viral_threshold: number;
    is_active: boolean;
    readonly created_at: Date;
    readonly updated_at: Date;
    /**
     * Get the active configuration (there should only be one)
     */
    static getActiveConfig(): Promise<PdfTrackerConfig | null>;
    /**
     * Update or create the active configuration
     */
    static upsertConfig(config: Partial<PdfTrackerConfigCreationAttributes>): Promise<PdfTrackerConfig>;
}
export default PdfTrackerConfig;
//# sourceMappingURL=PdfTrackerConfig.d.ts.map