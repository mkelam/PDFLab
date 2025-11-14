import { Model, Optional } from 'sequelize';
export declare enum TemplateFormat {
    PPTX = "pptx",
    DOCX = "docx",
    XLSX = "xlsx",
    PNG = "png"
}
export interface OnboardingTemplateAttributes {
    id: string;
    name: string;
    description: string;
    file_path: string;
    file_size: number;
    recommended_format: TemplateFormat;
    category: string;
    preview_image: string | null;
    usage_count: number;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}
export interface OnboardingTemplateCreationAttributes extends Optional<OnboardingTemplateAttributes, 'id' | 'preview_image' | 'usage_count' | 'is_active' | 'sort_order' | 'created_at' | 'updated_at'> {
}
export declare class OnboardingTemplate extends Model<OnboardingTemplateAttributes, OnboardingTemplateCreationAttributes> implements OnboardingTemplateAttributes {
    id: string;
    name: string;
    description: string;
    file_path: string;
    file_size: number;
    recommended_format: TemplateFormat;
    category: string;
    preview_image: string | null;
    usage_count: number;
    is_active: boolean;
    sort_order: number;
    readonly created_at: Date;
    readonly updated_at: Date;
    /**
     * Increment usage count
     */
    incrementUsage(): Promise<void>;
    /**
     * Get formatted file size (e.g., "250 KB")
     */
    getFormattedFileSize(): string;
    /**
     * Get category display name
     */
    getCategoryDisplayName(): string;
}
export default OnboardingTemplate;
//# sourceMappingURL=OnboardingTemplate.d.ts.map