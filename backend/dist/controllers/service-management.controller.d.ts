import { Request, Response } from 'express';
export declare class ServiceManagementController {
    /**
     * Get status of all Docker services
     */
    getServicesStatus(req: Request, res: Response): Promise<void>;
    /**
     * Restart a specific service
     */
    restartService(req: Request, res: Response): Promise<void>;
    /**
     * Clear Redis cache
     */
    clearRedisCache(req: Request, res: Response): Promise<void>;
    /**
     * Run disk cleanup manually
     */
    runDiskCleanup(req: Request, res: Response): Promise<void>;
    /**
     * Optimize database tables
     */
    optimizeDatabase(req: Request, res: Response): Promise<void>;
    /**
     * View active connections (diagnostic)
     */
    getDatabaseConnections(req: Request, res: Response): Promise<void>;
}
declare const _default: ServiceManagementController;
export default _default;
//# sourceMappingURL=service-management.controller.d.ts.map