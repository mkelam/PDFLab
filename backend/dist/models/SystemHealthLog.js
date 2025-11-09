"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemHealthLog = exports.HealthStatus = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["WARNING"] = "warning";
    HealthStatus["CRITICAL"] = "critical";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
class SystemHealthLog extends sequelize_1.Model {
}
exports.SystemHealthLog = SystemHealthLog;
SystemHealthLog.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    metric_name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    metric_value: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(HealthStatus)),
        defaultValue: HealthStatus.HEALTHY,
        allowNull: false
    },
    details: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'system_health_logs',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['metric_name']
        },
        {
            fields: ['created_at']
        }
    ]
});
//# sourceMappingURL=SystemHealthLog.js.map