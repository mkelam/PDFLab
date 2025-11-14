"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingTemplate = exports.TemplateFormat = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// Template format enum
var TemplateFormat;
(function (TemplateFormat) {
    TemplateFormat["PPTX"] = "pptx";
    TemplateFormat["DOCX"] = "docx";
    TemplateFormat["XLSX"] = "xlsx";
    TemplateFormat["PNG"] = "png";
})(TemplateFormat || (exports.TemplateFormat = TemplateFormat = {}));
// OnboardingTemplate model class
class OnboardingTemplate extends sequelize_1.Model {
    /**
     * Increment usage count
     */
    async incrementUsage() {
        this.usage_count += 1;
        await this.save();
    }
    /**
     * Get formatted file size (e.g., "250 KB")
     */
    getFormattedFileSize() {
        const kb = Math.round(this.file_size / 1024);
        if (kb < 1024) {
            return `${kb} KB`;
        }
        const mb = (this.file_size / (1024 * 1024)).toFixed(1);
        return `${mb} MB`;
    }
    /**
     * Get category display name
     */
    getCategoryDisplayName() {
        const categoryMap = {
            invoice: 'Invoice',
            report: 'Business Report',
            presentation: 'Presentation',
            form: 'Form',
            contract: 'Contract',
            resume: 'Resume'
        };
        return categoryMap[this.category] || this.category;
    }
}
exports.OnboardingTemplate = OnboardingTemplate;
// Initialize model
OnboardingTemplate.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    file_path: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    file_size: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    recommended_format: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(TemplateFormat)),
        allowNull: false
    },
    category: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    preview_image: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    usage_count: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    sort_order: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    tableName: 'onboarding_templates',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['category'] },
        { fields: ['is_active'] },
        { fields: ['sort_order'] }
    ]
});
exports.default = OnboardingTemplate;
//# sourceMappingURL=OnboardingTemplate.js.map