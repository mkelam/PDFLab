import { Request, Response } from 'express';
/**
 * Get complete monitoring dashboard data
 * Returns: current status, recent alerts, trend data
 */
export declare const getMonitoringDashboard: (req: Request, res: Response) => Promise<void>;
/**
 * Get health check history with pagination
 */
export declare const getHealthChecks: (req: Request, res: Response) => Promise<void>;
/**
 * Get drift check history with pagination
 */
export declare const getDriftChecks: (req: Request, res: Response) => Promise<void>;
/**
 * Get deployment validation history
 */
export declare const getDeploymentValidations: (req: Request, res: Response) => Promise<void>;
/**
 * Get monitoring alerts with filtering
 */
export declare const getMonitoringAlerts: (req: Request, res: Response) => Promise<void>;
/**
 * Acknowledge an alert
 */
export declare const acknowledgeAlert: (req: Request, res: Response) => Promise<void>;
/**
 * Resolve an alert
 */
export declare const resolveAlert: (req: Request, res: Response) => Promise<void>;
/**
 * Get metrics trend over time
 */
export declare const getMetricsTrend: (req: Request, res: Response) => Promise<void>;
/**
 * Get service uptime statistics
 */
export declare const getServiceUptime: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=monitoring.admin.controller.d.ts.map