import { Sequelize } from 'sequelize';
export declare const sequelize: Sequelize;
export declare const testConnection: () => Promise<boolean>;
export declare const syncDatabase: (force?: boolean) => Promise<void>;
//# sourceMappingURL=database.d.ts.map