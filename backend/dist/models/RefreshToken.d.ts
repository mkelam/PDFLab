import { Model, Optional } from 'sequelize';
import { User } from './User';
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
    id: string;
    user_id: string;
    token_hash: string;
    family_id: string;
    expires_at: Date;
    revoked: boolean;
    revoked_at?: Date;
    revoked_reason?: string;
    user_agent?: string;
    ip_address?: string;
    created_at: Date;
    updated_at: Date;
}
export interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id' | 'revoked' | 'revoked_at' | 'revoked_reason' | 'user_agent' | 'ip_address' | 'created_at' | 'updated_at'> {
}
export declare class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
    id: string;
    user_id: string;
    token_hash: string;
    family_id: string;
    expires_at: Date;
    revoked: boolean;
    revoked_at?: Date;
    revoked_reason?: string;
    user_agent?: string;
    ip_address?: string;
    created_at: Date;
    updated_at: Date;
    user?: User;
    /**
     * Check if token is valid (not expired and not revoked)
     */
    isValid(): boolean;
    /**
     * Revoke this token
     */
    revoke(reason?: string): Promise<void>;
    /**
     * Revoke all tokens in the same family (for theft detection)
     */
    static revokeFamily(familyId: string, reason?: string): Promise<number>;
    /**
     * Revoke all tokens for a user (logout everywhere)
     */
    static revokeAllForUser(userId: string, reason?: string): Promise<number>;
    /**
     * Clean up expired tokens (call periodically)
     */
    static cleanupExpired(): Promise<number>;
}
export default RefreshToken;
//# sourceMappingURL=RefreshToken.d.ts.map