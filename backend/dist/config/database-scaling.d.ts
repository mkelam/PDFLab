import { Sequelize } from 'sequelize';
/**
 * Database Scaling Configuration - Phase 2
 *
 * Implements read/write splitting with MySQL primary-replica setup
 * for improved performance and scalability.
 */
export declare const sequelizePrimary: Sequelize;
export declare const sequelizeReplica: Sequelize;
export declare const sequelizeScaled: Sequelize;
/**
 * Test database connections
 */
export declare function testDatabaseConnections(): Promise<{
    primary: boolean;
    replica: boolean;
    scaled: boolean;
}>;
/**
 * Get connection pool statistics
 * Note: pool is an internal property of ConnectionManager, we use type assertion
 */
export declare function getPoolStats(): {
    primary: {
        size: any;
        available: any;
        using: any;
        waiting: any;
    };
    replica: {
        size: any;
        available: any;
        using: any;
        waiting: any;
    };
    scaled: {
        size: any;
        available: any;
        using: any;
        waiting: any;
    };
};
export default sequelizeScaled;
//# sourceMappingURL=database-scaling.d.ts.map