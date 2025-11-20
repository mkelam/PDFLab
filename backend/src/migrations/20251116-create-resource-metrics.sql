-- Migration: Create resource_metrics table
-- Date: 2025-11-16
-- Purpose: Store historical resource utilization metrics collected by Elite Health Guardian

CREATE TABLE IF NOT EXISTS resource_metrics (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Disk metrics
  disk_used_percent DECIMAL(5,2) COMMENT 'Disk usage percentage (0-100)',
  disk_used_gb DECIMAL(10,2) COMMENT 'Disk space used in GB',
  disk_total_gb DECIMAL(10,2) COMMENT 'Total disk space in GB',

  -- Memory metrics per container
  backend_memory_percent DECIMAL(5,2) COMMENT 'Backend container memory usage %',
  worker_memory_percent DECIMAL(5,2) COMMENT 'Worker container memory usage %',
  redis_memory_percent DECIMAL(5,2) COMMENT 'Redis container memory usage %',
  mysql_memory_percent DECIMAL(5,2) COMMENT 'MySQL container memory usage %',
  frontend_memory_percent DECIMAL(5,2) COMMENT 'Frontend container memory usage %',
  partners_memory_percent DECIMAL(5,2) COMMENT 'Partners portal container memory usage %',

  -- Redis-specific metrics
  redis_keys INT COMMENT 'Total number of keys in Redis',
  redis_hit_rate DECIMAL(5,4) COMMENT 'Cache hit rate (0-1)',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Historical resource utilization metrics';

-- Create view for latest metrics (optional - useful for queries)
CREATE OR REPLACE VIEW latest_resource_metrics AS
SELECT * FROM resource_metrics
ORDER BY timestamp DESC
LIMIT 1;

-- Create view for 24-hour resource trends
CREATE OR REPLACE VIEW resource_metrics_24h AS
SELECT
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
  AVG(disk_used_percent) as avg_disk,
  AVG(backend_memory_percent) as avg_backend_mem,
  AVG(worker_memory_percent) as avg_worker_mem,
  AVG(redis_memory_percent) as avg_redis_mem,
  AVG(mysql_memory_percent) as avg_mysql_mem,
  AVG(frontend_memory_percent) as avg_frontend_mem,
  AVG(partners_memory_percent) as avg_partners_mem,
  AVG(redis_keys) as avg_redis_keys,
  AVG(redis_hit_rate) as avg_redis_hit_rate
FROM resource_metrics
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour
ORDER BY hour ASC;
