import { Model, Optional } from 'sequelize';
export declare enum OnboardingStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    SKIPPED = "skipped"
}
export interface OnboardingProgressAttributes {
    id: string;
    user_id: string;
    status: OnboardingStatus;
    tour_completed: boolean;
    tour_step_completed: number;
    tour_last_seen_at: Date | null;
    first_conversion_completed: boolean;
    first_conversion_at: Date | null;
    wizard_started: boolean;
    wizard_completed: boolean;
    wizard_last_step: number;
    sample_template_used: string | null;
    email_day0_sent: boolean;
    email_day2_sent: boolean;
    email_day5_sent: boolean;
    email_day9_sent: boolean;
    email_day14_sent: boolean;
    email_day2_opened: boolean;
    email_day5_opened: boolean;
    email_day9_opened: boolean;
    email_day14_opened: boolean;
    started_at: Date | null;
    completed_at: Date | null;
    skipped_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface OnboardingProgressCreationAttributes extends Optional<OnboardingProgressAttributes, 'id' | 'status' | 'tour_completed' | 'tour_step_completed' | 'tour_last_seen_at' | 'first_conversion_completed' | 'first_conversion_at' | 'wizard_started' | 'wizard_completed' | 'wizard_last_step' | 'sample_template_used' | 'email_day0_sent' | 'email_day2_sent' | 'email_day5_sent' | 'email_day9_sent' | 'email_day14_sent' | 'email_day2_opened' | 'email_day5_opened' | 'email_day9_opened' | 'email_day14_opened' | 'started_at' | 'completed_at' | 'skipped_at' | 'created_at' | 'updated_at'> {
}
export declare class OnboardingProgress extends Model<OnboardingProgressAttributes, OnboardingProgressCreationAttributes> implements OnboardingProgressAttributes {
    id: string;
    user_id: string;
    status: OnboardingStatus;
    tour_completed: boolean;
    tour_step_completed: number;
    tour_last_seen_at: Date | null;
    first_conversion_completed: boolean;
    first_conversion_at: Date | null;
    wizard_started: boolean;
    wizard_completed: boolean;
    wizard_last_step: number;
    sample_template_used: string | null;
    email_day0_sent: boolean;
    email_day2_sent: boolean;
    email_day5_sent: boolean;
    email_day9_sent: boolean;
    email_day14_sent: boolean;
    email_day2_opened: boolean;
    email_day5_opened: boolean;
    email_day9_opened: boolean;
    email_day14_opened: boolean;
    started_at: Date | null;
    completed_at: Date | null;
    skipped_at: Date | null;
    readonly created_at: Date;
    readonly updated_at: Date;
    /**
     * Calculate completion percentage (0-100)
     */
    getCompletionPercentage(): number;
    /**
     * Check if user should receive specific drip email
     */
    shouldReceiveEmail(day: 2 | 5 | 9 | 14): boolean;
}
export default OnboardingProgress;
//# sourceMappingURL=OnboardingProgress.d.ts.map