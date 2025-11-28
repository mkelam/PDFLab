import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { User } from './User'

/**
 * RefreshToken model for server-side token storage and revocation
 *
 * This enables:
 * - Token revocation on logout
 * - Token revocation on password change
 * - Revocation of all tokens for a user (logout everywhere)
 * - Detection of stolen tokens (family tracking)
 */

export interface RefreshTokenAttributes {
  id: string
  user_id: string
  token_hash: string  // Store hash of token, not the token itself
  family_id: string   // For token rotation and theft detection
  expires_at: Date
  revoked: boolean
  revoked_at?: Date
  revoked_reason?: string
  user_agent?: string
  ip_address?: string
  created_at: Date
  updated_at: Date
}

export interface RefreshTokenCreationAttributes
  extends Optional<RefreshTokenAttributes, 'id' | 'revoked' | 'revoked_at' | 'revoked_reason' | 'user_agent' | 'ip_address' | 'created_at' | 'updated_at'> {}

export class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes {
  public id!: string
  public user_id!: string
  public token_hash!: string
  public family_id!: string
  public expires_at!: Date
  public revoked!: boolean
  public revoked_at?: Date
  public revoked_reason?: string
  public user_agent?: string
  public ip_address?: string
  public created_at!: Date
  public updated_at!: Date

  // Association
  public user?: User

  /**
   * Check if token is valid (not expired and not revoked)
   */
  public isValid(): boolean {
    return !this.revoked && new Date() < this.expires_at
  }

  /**
   * Revoke this token
   */
  public async revoke(reason: string = 'manual'): Promise<void> {
    this.revoked = true
    this.revoked_at = new Date()
    this.revoked_reason = reason
    await this.save()
  }

  /**
   * Revoke all tokens in the same family (for theft detection)
   */
  public static async revokeFamily(familyId: string, reason: string = 'theft_detected'): Promise<number> {
    const [affectedCount] = await RefreshToken.update(
      {
        revoked: true,
        revoked_at: new Date(),
        revoked_reason: reason
      },
      {
        where: { family_id: familyId, revoked: false }
      }
    )
    return affectedCount
  }

  /**
   * Revoke all tokens for a user (logout everywhere)
   */
  public static async revokeAllForUser(userId: string, reason: string = 'logout_all'): Promise<number> {
    const [affectedCount] = await RefreshToken.update(
      {
        revoked: true,
        revoked_at: new Date(),
        revoked_reason: reason
      },
      {
        where: { user_id: userId, revoked: false }
      }
    )
    return affectedCount
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  public static async cleanupExpired(): Promise<number> {
    const { Op } = require('sequelize')
    const deleted = await RefreshToken.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    })
    return deleted
  }
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    token_hash: {
      type: DataTypes.STRING(64), // SHA-256 hash
      allowNull: false
    },
    family_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Groups tokens from the same login session for rotation'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revoked_reason: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45), // IPv6 compatible
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
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
  }
)

// Association is set up in models/index.ts to avoid duplicate definition
export default RefreshToken
