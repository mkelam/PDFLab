-- PDFLab v1.1.0 Migration: Add Batch Processing
-- Successfully deployed to production VPS on 2025-11-09
-- VPS: 141.136.44.168 (pdflab.pro)

-- IMPORTANT: Tables use utf8mb4_bin collation to match existing tables

-- Disable foreign key checks temporarily
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- Drop tables if they exist
DROP TABLE IF EXISTS batch_files;
DROP TABLE IF EXISTS batch_jobs;

-- Create batch_jobs table (matching users table charset/collation - utf8mb4_bin)
CREATE TABLE batch_jobs (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('convert', 'merge', 'compress') NOT NULL DEFAULT 'convert',
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    total_files INT NOT NULL DEFAULT 0,
    processed_files INT NOT NULL DEFAULT 0,
    failed_files INT NOT NULL DEFAULT 0,
    output_format VARCHAR(10) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_user_status (user_id, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Create batch_files table
CREATE TABLE batch_files (
    id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    batch_job_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    conversion_job_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_batch_status (batch_job_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

-- Now add foreign keys
ALTER TABLE batch_jobs
    ADD CONSTRAINT fk_batch_jobs_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE batch_files
    ADD CONSTRAINT fk_batch_files_batch_job_id
    FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id) ON DELETE CASCADE;

ALTER TABLE batch_files
    ADD CONSTRAINT fk_batch_files_conversion_job_id
    FOREIGN KEY (conversion_job_id) REFERENCES conversion_jobs(id) ON DELETE CASCADE;

-- Re-add foreign key to conversion_jobs (note: batch_job_id column already exists)
ALTER TABLE conversion_jobs
    ADD CONSTRAINT fk_conversion_jobs_batch_job_id
    FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id) ON DELETE SET NULL;

SELECT 'Migration completed successfully!' AS status;
