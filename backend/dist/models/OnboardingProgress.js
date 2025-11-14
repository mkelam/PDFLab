"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingProgress = exports.OnboardingStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// Onboarding status enum
var OnboardingStatus;
(function (OnboardingStatus) {
    OnboardingStatus["NOT_STARTED"] = "not_started";
    OnboardingStatus["IN_PROGRESS"] = "in_progress";
    OnboardingStatus["COMPLETED"] = "completed";
    OnboardingStatus["SKIPPED"] = "skipped";
})(OnboardingStatus || (exports.OnboardingStatus = OnboardingStatus = {}));
// OnboardingProgress model class
class OnboardingProgress extends sequelize_1.Model {
    /**
     * Calculate completion percentage (0-100)
     */
    getCompletionPercentage() {
        let completed = 0;
        const total = 4; // tour, first_conversion, wizard, template_used
        if (this.tour_completed)
            completed++;
        if (this.first_conversion_completed)
            completed++;
        if (this.wizard_completed)
            completed++;
        if (this.sample_template_used)
            completed++;
        return Math.round((completed / total) * 100);
    }
    /**
     * Check if user should receive specific drip email
     */
    shouldReceiveEmail(day) {
        const daysSinceSignup = Math.floor((Date.now() - this.created_at.getTime()) / (1000 * 60 * 60 * 24));
        const emailSentField = `email_day${day}_sent`;
        const emailSent = this[emailSentField];
        return daysSinceSignup >= day && !emailSent;
    }
}
exports.OnboardingProgress = OnboardingProgress;
// Initialize model
OnboardingProgress.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(OnboardingStatus)),
        allowNull: false,
        defaultValue: OnboardingStatus.NOT_STARTED
    },
    // Tour progress
    tour_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    tour_step_completed: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    tour_last_seen_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    // Conversion progress
    first_conversion_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    first_conversion_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    // Wizard progress
    wizard_started: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wizard_completed: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    wizard_last_step: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Template usage
    sample_template_used: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    // Email drip campaign tracking
    email_day0_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day2_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day5_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day9_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day14_sent: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day2_opened: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day5_opened: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day9_opened: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    email_day14_opened: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // Timestamps
    started_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    skipped_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'onboarding_progress',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'], unique: true },
        { fields: ['status'] },
        { fields: ['created_at'] },
        {
            fields: ['email_day2_sent', 'email_day5_sent', 'email_day9_sent', 'email_day14_sent']
        }
    ]
});
exports.default = OnboardingProgress;
//# sourceMappingURL=OnboardingProgress.js.map