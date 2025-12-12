import { Model, Optional } from 'sequelize';
export type FeedbackType = 'bug' | 'feature' | 'general' | 'other';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed';
export type FeedbackPriority = 'normal' | 'high';
export interface FeedbackAttributes {
    id: string;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    type: FeedbackType;
    message: string;
    page_url: string | null;
    user_agent: string | null;
    screenshot_url: string | null;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    is_founder: boolean;
    admin_reply: string | null;
    admin_id: string | null;
    created_at?: Date;
    updated_at?: Date;
    resolved_at?: Date | null;
}
export interface FeedbackCreationAttributes extends Optional<FeedbackAttributes, 'id' | 'user_id' | 'user_email' | 'user_name' | 'page_url' | 'user_agent' | 'screenshot_url' | 'status' | 'priority' | 'is_founder' | 'admin_reply' | 'admin_id' | 'resolved_at'> {
}
declare class Feedback extends Model<FeedbackAttributes, FeedbackCreationAttributes> implements FeedbackAttributes {
    id: string;
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    type: FeedbackType;
    message: string;
    page_url: string | null;
    user_agent: string | null;
    screenshot_url: string | null;
    status: FeedbackStatus;
    priority: FeedbackPriority;
    is_founder: boolean;
    admin_reply: string | null;
    admin_id: string | null;
    readonly created_at: Date;
    readonly updated_at: Date;
    resolved_at: Date | null;
}
export default Feedback;
//# sourceMappingURL=Feedback.d.ts.map