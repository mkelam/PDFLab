-- Extend monitoring_alerts table with severity levels and human action flag
-- Add columns if they don't already exist

ALTER TABLE monitoring_alerts
  ADD COLUMN IF NOT EXISTS requires_human_action BOOLEAN DEFAULT FALSE AFTER severity,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP NULL AFTER acknowledged_by,
  ADD COLUMN IF NOT EXISTS metric_name VARCHAR(50) NULL AFTER severity,
  ADD COLUMN IF NOT EXISTS metric_value DECIMAL(10,2) NULL AFTER metric_name,
  ADD COLUMN IF NOT EXISTS action_taken VARCHAR(255) NULL AFTER metric_value;

-- Add index for querying by severity and action requirement
CREATE INDEX IF NOT EXISTS idx_severity_human_action ON monitoring_alerts(severity, requires_human_action);
CREATE INDEX IF NOT EXISTS idx_acknowledged ON monitoring_alerts(acknowledged, acknowledged_at);
