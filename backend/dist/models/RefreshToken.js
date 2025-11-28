"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class RefreshToken extends sequelize_1.Model {
    /**
     * Check if token is valid (not expired and not revoked)
     */
    isValid() {
        return !this.revoked && new Date() < this.expires_at;
    }
    /**
     * Revoke this token
     */
    async revoke(reason = 'manual') {
        this.revoked = true;
        this.revoked_at = new Date();
        this.revoked_reason = reason;
        await this.save();
    }
    /**
     * Revoke all tokens in the same family (for theft detection)
     */
    static async revokeFamily(familyId, reason = 'theft_detected') {
        const [affectedCount] = await RefreshToken.update({
            revoked: true,
            revoked_at: new Date(),
            revoked_reason: reason
        }, {
            where: { family_id: familyId, revoked: false }
        });
        return affectedCount;
    }
    /**
     * Revoke all tokens for a user (logout everywhere)
     */
    static async revokeAllForUser(userId, reason = 'logout_all') {
        const [affectedCount] = await RefreshToken.update({
            revoked: true,
            revoked_at: new Date(),
            revoked_reason: reason
        }, {
            where: { user_id: userId, revoked: false }
        });
        return affectedCount;
    }
    /**
     * Clean up expired tokens (call periodically)
     */
    static async cleanupExpired() {
        const { Op } = require('sequelize');
        const deleted = await RefreshToken.destroy({
            where: {
                expires_at: {
                    [Op.lt]: new Date()
                }
            }
        });
        return deleted;
    }
}
exports.RefreshToken = RefreshToken;
RefreshToken.init({
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
    token_hash: {
        type: sequelize_1.DataTypes.STRING(64), // SHA-256 hash
        allowNull: false
    },
    family_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        comment: 'Groups tokens from the same login session for rotation'
    },
    expires_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    revoked: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    revoked_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    revoked_reason: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    user_agent: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true
    },
    ip_address: {
        type: sequelize_1.DataTypes.STRING(45), // IPv6 compatible
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'refresh_tokens',
    modelName: 'RefreshToken',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['token_hash'], unique: true },
        { fields: ['family_id'] },
        { fields: ['expires_at'] },
        { fields: ['revoked'] }
    ]
});
// Association is set up in models/index.ts to avoid duplicate definition
exports.default = RefreshToken;
//# sourceMappingURL=RefreshToken.js.map