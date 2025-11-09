import { Model, Optional } from 'sequelize';
interface PasswordHistoryAttributes {
    id: string;
    user_id: string;
    password_hash: string;
    created_at: Date;
}
interface PasswordHistoryCreationAttributes extends Optional<PasswordHistoryAttributes, 'id' | 'created_at'> {
}
export declare class PasswordHistory extends Model<PasswordHistoryAttributes, PasswordHistoryCreationAttributes> implements PasswordHistoryAttributes {
    id: string;
    user_id: string;
    password_hash: string;
    readonly created_at: Date;
}
export {};
//# sourceMappingURL=PasswordHistory.d.ts.map