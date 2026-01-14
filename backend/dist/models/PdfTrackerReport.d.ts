import { Model, Optional } from 'sequelize';
export interface TrackerStats {
    total_posts_scanned: number;
    pdf_posts_found: number;
    complaints_found: number;
    comments_with_pdf: number;
    comments_with_complaints: number;
}
export interface TrackerComment {
    body: string;
    score: number;
    is_complaint: boolean;
    complaint_keywords: string[];
}
export interface TrackerPost {
    title: string;
    url: string;
    score: number;
    num_comments: number;
    content_preview: string;
    pdf_keywords: string[];
    is_complaint: boolean;
    complaint_keywords: string[];
    comments: TrackerComment[];
}
export interface SubredditResult {
    name: string;
    posts: TrackerPost[];
    error: string | null;
}
export interface ConfigSnapshot {
    subreddits: string[];
    pdf_keywords: string[];
    complaint_keywords: string[];
    viral_threshold: number;
}
export interface PdfTrackerReportAttributes {
    id: string;
    report_date: string;
    generated_at: Date;
    stats: TrackerStats;
    subreddit_results: SubredditResult[];
    config_snapshot: ConfigSnapshot;
    created_at?: Date;
    updated_at?: Date;
}
export interface PdfTrackerReportCreationAttributes extends Optional<PdfTrackerReportAttributes, 'id' | 'created_at' | 'updated_at'> {
}
declare class PdfTrackerReport extends Model<PdfTrackerReportAttributes, PdfTrackerReportCreationAttributes> implements PdfTrackerReportAttributes {
    id: string;
    report_date: string;
    generated_at: Date;
    stats: TrackerStats;
    subreddit_results: SubredditResult[];
    config_snapshot: ConfigSnapshot;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default PdfTrackerReport;
//# sourceMappingURL=PdfTrackerReport.d.ts.map