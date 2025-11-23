export interface CircuitBreakerConfig {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
    rollingCountTimeout: number;
    rollingCountBuckets: number;
    volumeThreshold: number;
}
export declare const defaultCircuitBreakerConfig: CircuitBreakerConfig;
export declare const cloudConvertConfig: CircuitBreakerConfig;
//# sourceMappingURL=circuit-breaker.d.ts.map