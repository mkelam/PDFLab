interface BaselineMetrics {
    cpu_mean: number;
    cpu_stddev: number;
    memory_mean: number;
    memory_stddev: number;
    disk_mean: number;
    disk_stddev: number;
    response_time_mean: number;
    response_time_stddev: number;
    last_updated: Date;
}
export declare class BaselineService {
    /**
     * Calculate 7-day baseline from resource_metrics table
     * Updates every 24 hours
     */
    static calculateBaseline(): Promise<BaselineMetrics>;
    /**
     * Get current baseline
     */
    static getBaseline(): Promise<BaselineMetrics | null>;
    /**
     * Detect if current metric is anomalous (>2 standard deviations)
     */
    static detectAnomaly(metricName: string, currentValue: number): Promise<{
        isAnomaly: boolean;
        zScore: number;
        severity: 'normal' | 'warning' | 'critical';
    }>;
}
export {};
//# sourceMappingURL=baseline.service.d.ts.map