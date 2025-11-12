-- Beta Applications Table
-- Tracks users who apply for beta access with free Pro/Starter plans

CREATE TABLE IF NOT EXISTS beta_applications (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,

  -- Applicant Information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  company VARCHAR(255),
  role VARCHAR(255),

  -- Application Details
  use_case TEXT NOT NULL,
  monthly_volume VARCHAR(50),
  plan_requested ENUM('starter', 'pro') DEFAULT 'starter',

  -- Social/Professional Links
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  website_url VARCHAR(500),

  -- Application Status
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  reviewed_at DATETIME,
  rejection_reason TEXT,

  -- User Creation
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),

  -- Foreign Key
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add beta_user flag to users table
ALTER TABLE users
ADD COLUMN is_beta_user BOOLEAN DEFAULT FALSE AFTER plan,
ADD COLUMN beta_expires_at DATETIME AFTER is_beta_user;
