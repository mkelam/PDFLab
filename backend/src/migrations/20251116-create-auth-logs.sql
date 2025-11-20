-- Create authentication_logs table for tracking login attempts
CREATE TABLE IF NOT EXISTS authentication_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(255),
  success BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_timestamp (ip_address, timestamp),
  INDEX idx_email_timestamp (email, timestamp),
  INDEX idx_success_timestamp (success, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
