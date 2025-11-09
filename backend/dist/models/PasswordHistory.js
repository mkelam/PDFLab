"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordHistory = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class PasswordHistory extends sequelize_1.Model {
}
exports.PasswordHistory = PasswordHistory;
PasswordHistory.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    password_hash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'password_history',
    timestamps: false,
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['created_at']
        }
    ]
});
//# sourceMappingURL=PasswordHistory.js.map