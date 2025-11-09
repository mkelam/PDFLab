"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuditLog = exports.AuditLogSeverity = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var AuditLogSeverity;
(function (AuditLogSeverity) {
    AuditLogSeverity["INFO"] = "info";
    AuditLogSeverity["WARNING"] = "warning";
    AuditLogSeverity["CRITICAL"] = "critical";
})(AuditLogSeverity || (exports.AuditLogSeverity = AuditLogSeverity = {}));
class AdminAuditLog extends sequelize_1.Model {
}
exports.AdminAuditLog = AdminAuditLog;
AdminAuditLog.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    admin_user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    entity_type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    entity_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true
    },
    changes: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    },
    ip_address: {
        type: sequelize_1.DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    severity: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(AuditLogSeverity)),
        defaultValue: AuditLogSeverity.INFO,
        allowNull: false
    },
    checksum: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'admin_audit_logs',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['admin_user_id']
        },
        {
            fields: ['entity_type', 'entity_id']
        },
        {
            fields: ['created_at']
        },
        {
            fields: ['severity']
        }
    ]
});
//# sourceMappingURL=AdminAuditLog.js.map