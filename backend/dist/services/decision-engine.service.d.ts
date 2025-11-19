export interface RemediationDecision {
    shouldRemediate: boolean;
    action: 'auto' | 'alert' | 'escalate' | 'ignore';
    severity: 'info' | 'warning' | 'critical' | 'urgent';
    reason: string;
    confidence: number;
}
/**
 * Decision Engine Service
 * Determines when to auto-remediate vs escalate to humans
 */
export declare class DecisionEngine {
    /**
     * Decide if auto-remediation should be executed
     *
     * Rules:
     * 1. If metric within baseline ± 2σ → IGNORE
     * 2. If metric between 2σ-3σ → ALERT (warning)
     * 3. If metric > 3σ AND safe action → AUTO REMEDIATE
     * 4. If metric > 3σ AND risky action → ESCALATE (human approval)
     * 5. If risky action attempted 3+ times in last hour → ESCALATE
     */
    static shouldRemediate(metricName: string, currentValue: number, actionType: 'restart' | 'cache_clear' | 'disk_cleanup' | 'db_optimize' | 'ssl_renew'): Promise<RemediationDecision>;
    /**
     * Count recent remediation actions from database
     */
    private static countRecentActions;
    /**
     * Evaluate if manual action should be allowed (for UI controls)
     * Returns approval status and warning message
     */
    static evaluateManualAction(actionType: 'restart' | 'cache_clear' | 'disk_cleanup' | 'db_optimize', target: string): Promise<{
        approved: boolean;
        warning?: string;
        recentAttempts: number;
    }>;
}
//# sourceMappingURL=decision-engine.service.d.ts.map