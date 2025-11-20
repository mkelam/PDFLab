-- Create monitoring baseline table for predictive analysis
CREATE TABLE IF NOT EXISTS monitoring_baseline (
  id INT PRIMARY KEY DEFAULT 1,
  cpu_mean DECIMAL(5,2) DEFAULT 0,
  cpu_stddev DECIMAL(5,2) DEFAULT 1,
  memory_mean DECIMAL(5,2) DEFAULT 0,
  memory_stddev DECIMAL(5,2) DEFAULT 1,
  disk_mean DECIMAL(5,2) DEFAULT 0,
  disk_stddev DECIMAL(5,2) DEFAULT 1,
  response_time_mean DECIMAL(8,2) DEFAULT 0,
  response_time_stddev DECIMAL(8,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_baseline (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize with safe defaults (will be updated by cron job)
INSERT IGNORE INTO monitoring_baseline (id, cpu_mean, cpu_stddev, memory_mean, memory_stddev, disk_mean, disk_stddev)
VALUES (1, 30, 10, 50, 15, 40, 10);
