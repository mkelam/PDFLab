import { BaselineService } from './baseline.service';
import { sequelize } from '../config/database';
import logger from '../config/logger';

export interface RemediationDecision {
  shouldRemediate: boolean;
  action: 'auto' | 'alert' | 'escalate' | 'ignore';
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  reason: string;
  confidence: number; // 0-100
}

/**
 * Decision Engine Service
 * Determines when to auto-remediate vs escalate to humans
 */
export class DecisionEngine {
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
  static async shouldRemediate(
    metricName: string,
    currentValue: number,
    actionType: 'restart' | 'cache_clear' | 'disk_cleanup' | 'db_optimize' | 'ssl_renew'
  ): Promise<RemediationDecision> {

    try {
      // Check anomaly detection
      const anomaly = await BaselineService.detectAnomaly(metricName, currentValue);

      // Rule 1: Normal range
      if (!anomaly.isAnomaly) {
        return {
          shouldRemediate: false,
          action: 'ignore',
          severity: 'info',
          reason: `${metricName} within normal range (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)})`,
          confidence: 100
        };
      }

      // Rule 2: Warning range (2σ - 3σ)
      if (anomaly.severity === 'warning') {
        return {
          shouldRemediate: false,
          action: 'alert',
          severity: 'warning',
          reason: `${metricName} elevated (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)}) - monitoring`,
          confidence: 80
        };
      }

      // Rule 3-4: Critical range (>3σ) - decide based on action risk
      const safeActions: string[] = ['cache_clear', 'disk_cleanup', 'ssl_renew'];
      const riskyActions: string[] = ['restart', 'db_optimize'];

      if (safeActions.includes(actionType)) {
        return {
          shouldRemediate: true,
          action: 'auto',
          severity: 'critical',
          reason: `${metricName} critical (${currentValue.toFixed(1)}, z-score: ${anomaly.zScore.toFixed(2)}) - auto-remediating with safe action`,
          confidence: 95
        };
      }

      if (riskyActions.includes(actionType)) {
        // Rule 5: Check recent restart attempts to prevent infinite loops
        const recentRestarts = await this.countRecentActions(actionType, 60); // last 60 min

        if (recentRestarts >= 3) {
          return {
            shouldRemediate: false,
            action: 'escalate',
            severity: 'urgent',
            reason: `${metricName} critical but ${actionType} already attempted ${recentRestarts} times in last hour - HUMAN INTERVENTION REQUIRED`,
            confidence: 100
          };
        }

        return {
          shouldRemediate: true,
          action: 'auto',
          severity: 'critical',
          reason: `${metricName} critical (${currentValue.toFixed(1)}) - auto-remediating with monitored risky action`,
          confidence: 75
        };
      }

      // Unknown action type - escalate
      return {
        shouldRemediate: false,
        action: 'escalate',
        severity: 'urgent',
        reason: `${metricName} critical but action type unknown - escalating`,
        confidence: 0
      };

    } catch (error) {
      logger.error('Decision engine error:', error);

      // On error, escalate to be safe
      return {
        shouldRemediate: false,
        action: 'escalate',
        severity: 'urgent',
        reason: `Decision engine error - escalating for safety`,
        confidence: 0
      };
    }
  }

  /**
   * Count recent remediation actions from database
   */
  private static async countRecentActions(actionType: string, minutesAgo: number): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);

      const [results] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM remediation_log
        WHERE action_type = ? AND timestamp >= ?
      `, {
        replacements: [actionType, cutoff],
        type: 'SELECT'
      });

      return (results[0] as any)?.count || 0;
    } catch (error) {
      logger.error('Error counting recent actions:', error);
      return 0;
    }
  }

  /**
   * Evaluate if manual action should be allowed (for UI controls)
   * Returns approval status and warning message
   */
  static async evaluateManualAction(
    actionType: 'restart' | 'cache_clear' | 'disk_cleanup' | 'db_optimize',
    target: string
  ): Promise<{
    approved: boolean;
    warning?: string;
    recentAttempts: number;
  }> {
    try {
      const recentAttempts = await this.countRecentActions(actionType, 60);

      // Warn if action attempted recently
      if (recentAttempts >= 2) {
        return {
          approved: true,
          warning: `This action has been attempted ${recentAttempts} times in the last hour. Multiple restarts may indicate a deeper issue.`,
          recentAttempts
        };
      }

      // Block if attempted 5+ times (likely ineffective)
      if (recentAttempts >= 5) {
        return {
          approved: false,
          warning: `This action has been attempted ${recentAttempts} times in the last hour and appears ineffective. Manual investigation required.`,
          recentAttempts
        };
      }

      return {
        approved: true,
        recentAttempts
      };
    } catch (error) {
      logger.error('Error evaluating manual action:', error);
      return {
        approved: true, // Fail open for manual actions
        warning: 'Unable to verify recent action history',
        recentAttempts: 0
      };
    }
  }
}
