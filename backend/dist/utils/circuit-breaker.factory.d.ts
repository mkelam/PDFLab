import CircuitBreaker from 'opossum';
import { CircuitBreakerConfig } from '../config/circuit-breaker';
export declare function createCircuitBreaker<T extends any[], R>(fn: (...args: T) => Promise<R>, name: string, config: CircuitBreakerConfig): CircuitBreaker<T, R>;
export declare function getCircuitBreakerStats(breaker: CircuitBreaker<any, any>): {
    fires: number;
    successes: number;
    failures: number;
    rejects: number;
    timeouts: number;
    fallbacks: number;
    state: "open" | "half-open" | "closed";
    isOpen: boolean;
    percentiles: {
        p50: number;
        p95: number;
        p99: number;
    };
};
//# sourceMappingURL=circuit-breaker.factory.d.ts.map