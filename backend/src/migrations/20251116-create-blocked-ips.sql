-- Create blocked_ips table for automated IP blocking
CREATE TABLE IF NOT EXISTS blocked_ips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  reason ENUM('excessive_failed_logins', 'rate_limit_abuse', 'manual_block') NOT NULL,
  violation_count INT DEFAULT 0,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_expiry (ip_address, expires_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
