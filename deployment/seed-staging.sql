-- PDFLab Staging Environment Seed Data
-- Creates representative test data for staging environment
-- Execute with: docker exec -i pdflab-mysql-staging mysql -updflab -ppdflab_staging_2024 pdflab_staging < seed-staging.sql

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing test data (if any)
DELETE FROM conversion_jobs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro');
DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro');
DELETE FROM payment_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro');
DELETE FROM users WHERE email LIKE '%@pdflab.pro';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========== TEST USERS (10 total) ==========

-- Free Tier Users (3)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, subscription_status, created_at, updated_at, last_login) VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111', 'test-free@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Free User 1', 'free', 2, 3, 'active', DATE_SUB(NOW(), INTERVAL 30 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('a1b2c3d4-1111-1111-1111-111111111112', 'test-free2@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Free User 2', 'free', 3, 3, 'active', DATE_SUB(NOW(), INTERVAL 45 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('a1b2c3d4-1111-1111-1111-111111111113', 'test-free-new@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Free User 3 (New)', 'free', 0, 3, 'active', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NOW());

-- Starter Tier Users (3)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, subscription_status, subscription_id, created_at, updated_at, last_login) VALUES
  ('a1b2c3d4-2222-2222-2222-222222222221', 'test-starter@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Starter User 1', 'starter', 45, 100, 'active', 'sub-starter-001', DATE_SUB(NOW(), INTERVAL 20 DAY), NOW(), NOW()),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'test-starter2@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Starter User 2', 'starter', 87, 100, 'active', 'sub-starter-002', DATE_SUB(NOW(), INTERVAL 60 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 3 DAY)),
  ('a1b2c3d4-2222-2222-2222-222222222223', 'test-starter-cancelled@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Starter Cancelled', 'starter', 99, 100, 'cancelled', 'sub-starter-003', DATE_SUB(NOW(), INTERVAL 90 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 25 DAY));

-- Pro Tier Users (2)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, subscription_status, subscription_id, created_at, updated_at, last_login) VALUES
  ('a1b2c3d4-3333-3333-3333-333333333331', 'test-pro@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Pro User 1', 'pro', 234, -1, 'active', 'sub-pro-001', DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), NOW()),
  ('a1b2c3d4-3333-3333-3333-333333333332', 'test-pro-power@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Pro Power User', 'pro', 1247, -1, 'active', 'sub-pro-002', DATE_SUB(NOW(), INTERVAL 180 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- Enterprise Tier Users (2)
INSERT INTO users (id, email, password_hash, name, plan, conversions_used, conversions_limit, subscription_status, subscription_id, created_at, updated_at, last_login) VALUES
  ('a1b2c3d4-4444-4444-4444-444444444441', 'test-enterprise@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Enterprise User 1', 'enterprise', 456, -1, 'active', 'sub-enterprise-001', DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), NOW()),
  ('a1b2c3d4-4444-4444-4444-444444444442', 'test-enterprise-api@pdflab.pro', '$2b$10$rZ7QGKvH8xZJ9Y6Ln0Xqp.vQF8Z5K3wN2J1L9p8Qq7Zz5Xx4Y3W2a', 'Enterprise API User', 'enterprise', 3421, -1, 'active', 'sub-enterprise-002', DATE_SUB(NOW(), INTERVAL 365 DAY), NOW(), DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- ========== CONVERSION JOBS (50 total) ==========

-- Completed Jobs (20)
INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, output_file, cloudconvert_job_id, created_at, updated_at, expires_at) VALUES
  (UUID(), 'a1b2c3d4-1111-1111-1111-111111111111', 'pdf_to_pptx', 'completed', 100, 'presentation.pdf', 1048576, 'presentation.pptx', 'cc-job-001', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY)),
  (UUID(), 'a1b2c3d4-1111-1111-1111-111111111111', 'pdf_to_docx', 'completed', 100, 'report.pdf', 2097152, 'report.docx', 'cc-job-002', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_xlsx', 'completed', 100, 'data.pdf', 524288, 'data.xlsx', 'cc-job-003', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_png', 'completed', 100, 'image.pdf', 3145728, 'image.png', 'cc-job-004', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_pptx', 'completed', 100, 'slides.pdf', 10485760, 'slides.pptx', 'cc-job-005', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'compress', 'completed', 100, 'large-file.pdf', 52428800, 'large-file-compressed.pdf', 'cc-job-006', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'merge', 'completed', 100, 'merged-output.pdf', 15728640, 'merged-output.pdf', 'cc-job-007', DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'pdf_to_docx', 'completed', 100, 'contract.pdf', 8388608, 'contract.docx', 'cc-job-008', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'pdf_to_pptx', 'completed', 100, 'training.pdf', 20971520, 'training.pptx', 'cc-job-009', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'pdf_to_xlsx', 'completed', 100, 'financial-data.pdf', 4194304, 'financial-data.xlsx', 'cc-job-010', DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (UUID(), 'a1b2c3d4-1111-1111-1111-111111111112', 'pdf_to_png', 'completed', 100, 'diagram.pdf', 1572864, 'diagram.png', 'cc-job-011', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'compress', 'completed', 100, 'scanned-doc.pdf', 41943040, 'scanned-doc-compressed.pdf', 'cc-job-012', DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_docx', 'completed', 100, 'invoice.pdf', 2621440, 'invoice.docx', 'cc-job-013', DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'merge', 'completed', 100, 'combined-reports.pdf', 31457280, 'combined-reports.pdf', 'cc-job-014', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'pdf_to_pptx', 'completed', 100, 'quarterly-review.pdf', 15728640, 'quarterly-review.pptx', 'cc-job-015', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'pdf_to_xlsx', 'completed', 100, 'budget.pdf', 6291456, 'budget.xlsx', 'cc-job-016', DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'pdf_to_png', 'completed', 100, 'chart.pdf', 3670016, 'chart.png', 'cc-job-017', DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'compress', 'completed', 100, 'archive.pdf', 104857600, 'archive-compressed.pdf', 'cc-job-018', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'pdf_to_docx', 'completed', 100, 'proposal.pdf', 12582912, 'proposal.docx', 'cc-job-019', DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 43 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'merge', 'completed', 100, 'full-documentation.pdf', 52428800, 'full-documentation.pdf', 'cc-job-020', DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY));

-- Failed Jobs (10)
INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, error_message, created_at, updated_at) VALUES
  (UUID(), 'a1b2c3d4-1111-1111-1111-111111111112', 'pdf_to_xlsx', 'failed', 25, 'no-tables.pdf', 1048576, 'No table data found in PDF', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_docx', 'failed', 50, 'corrupted.pdf', 2097152, 'Invalid PDF format', DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222223', 'pdf_to_pptx', 'failed', 10, 'too-large.pdf', 524288000, 'File size exceeds plan limit', DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'compress', 'failed', 75, 'encrypted.pdf', 10485760, 'PDF is password protected', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY)),
  (UUID(), 'a1b2c3d4-1111-1111-1111-111111111111', 'pdf_to_png', 'failed', 30, 'empty.pdf', 512, 'PDF contains no content', DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'merge', 'failed', 45, 'merge-attempt.pdf', 5242880, 'CloudConvert API timeout', DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 22 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'pdf_to_xlsx', 'failed', 60, 'image-only.pdf', 15728640, 'OCR failed - image quality too low', DATE_SUB(NOW(), INTERVAL 27 DAY), DATE_SUB(NOW(), INTERVAL 27 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'pdf_to_docx', 'failed', 80, 'complex-layout.pdf', 20971520, 'Layout too complex for conversion', DATE_SUB(NOW(), INTERVAL 32 DAY), DATE_SUB(NOW(), INTERVAL 32 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'compress', 'failed', 15, 'already-optimized.pdf', 204800, 'File already optimally compressed', DATE_SUB(NOW(), INTERVAL 37 DAY), DATE_SUB(NOW(), INTERVAL 37 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_pptx', 'failed', 90, 'network-error.pdf', 8388608, 'Network error during upload', DATE_SUB(NOW(), INTERVAL 42 DAY), DATE_SUB(NOW(), INTERVAL 42 DAY));

-- Processing Jobs (5)
INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, cloudconvert_job_id, created_at, updated_at, expires_at) VALUES
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_docx', 'processing', 45, 'current-job-1.pdf', 5242880, 'cc-job-processing-001', DATE_SUB(NOW(), INTERVAL 5 MINUTE), NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'compress', 'processing', 60, 'current-job-2.pdf', 31457280, 'cc-job-processing-002', DATE_SUB(NOW(), INTERVAL 3 MINUTE), NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'merge', 'processing', 30, 'current-job-3.pdf', 15728640, 'cc-job-processing-003', DATE_SUB(NOW(), INTERVAL 2 MINUTE), NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'pdf_to_pptx', 'processing', 75, 'current-job-4.pdf', 12582912, 'cc-job-processing-004', DATE_SUB(NOW(), INTERVAL 1 MINUTE), NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_xlsx', 'processing', 20, 'current-job-5.pdf', 4194304, 'cc-job-processing-005', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY));

-- Pending Jobs (5)
INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, created_at, updated_at) VALUES
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_png', 'pending', 0, 'queued-1.pdf', 2097152, NOW(), NOW()),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'compress', 'pending', 0, 'queued-2.pdf', 20971520, NOW(), NOW()),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'pdf_to_docx', 'pending', 0, 'queued-3.pdf', 6291456, NOW(), NOW()),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'merge', 'pending', 0, 'queued-4.pdf', 10485760, NOW(), NOW()),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'pdf_to_pptx', 'pending', 0, 'queued-5.pdf', 8388608, NOW(), NOW());

-- Expired Jobs (10 - old completed jobs past expiration)
INSERT INTO conversion_jobs (id, user_id, type, status, progress, file_name, file_size, output_file, cloudconvert_job_id, created_at, updated_at, expires_at) VALUES
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'pdf_to_pptx', 'completed', 100, 'expired-1.pdf', 5242880, 'expired-1.pptx', 'cc-job-expired-001', DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 53 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_docx', 'completed', 100, 'expired-2.pdf', 10485760, 'expired-2.docx', 'cc-job-expired-002', DATE_SUB(NOW(), INTERVAL 65 DAY), DATE_SUB(NOW(), INTERVAL 65 DAY), DATE_SUB(NOW(), INTERVAL 58 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'pdf_to_xlsx', 'completed', 100, 'expired-3.pdf', 3145728, 'expired-3.xlsx', 'cc-job-expired-003', DATE_SUB(NOW(), INTERVAL 70 DAY), DATE_SUB(NOW(), INTERVAL 70 DAY), DATE_SUB(NOW(), INTERVAL 63 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'compress', 'completed', 100, 'expired-4.pdf', 52428800, 'expired-4-compressed.pdf', 'cc-job-expired-004', DATE_SUB(NOW(), INTERVAL 75 DAY), DATE_SUB(NOW(), INTERVAL 75 DAY), DATE_SUB(NOW(), INTERVAL 68 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'merge', 'completed', 100, 'expired-5.pdf', 20971520, 'expired-5-merged.pdf', 'cc-job-expired-005', DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 73 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'pdf_to_png', 'completed', 100, 'expired-6.pdf', 4194304, 'expired-6.png', 'cc-job-expired-006', DATE_SUB(NOW(), INTERVAL 85 DAY), DATE_SUB(NOW(), INTERVAL 85 DAY), DATE_SUB(NOW(), INTERVAL 78 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'pdf_to_docx', 'completed', 100, 'expired-7.pdf', 8388608, 'expired-7.docx', 'cc-job-expired-007', DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 83 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'pdf_to_pptx', 'completed', 100, 'expired-8.pdf', 15728640, 'expired-8.pptx', 'cc-job-expired-008', DATE_SUB(NOW(), INTERVAL 95 DAY), DATE_SUB(NOW(), INTERVAL 95 DAY), DATE_SUB(NOW(), INTERVAL 88 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'compress', 'completed', 100, 'expired-9.pdf', 41943040, 'expired-9-compressed.pdf', 'cc-job-expired-009', DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 100 DAY), DATE_SUB(NOW(), INTERVAL 93 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'pdf_to_xlsx', 'completed', 100, 'expired-10.pdf', 6291456, 'expired-10.xlsx', 'cc-job-expired-010', DATE_SUB(NOW(), INTERVAL 105 DAY), DATE_SUB(NOW(), INTERVAL 105 DAY), DATE_SUB(NOW(), INTERVAL 98 DAY));

-- ========== SUBSCRIPTIONS (7 total - only paid users) ==========

INSERT INTO subscriptions (id, user_id, plan, status, payfast_token, amount, currency, billing_date, next_billing_date, started_at, created_at, updated_at) VALUES
  ('sub-starter-001', 'a1b2c3d4-2222-2222-2222-222222222221', 'starter', 'active', 'pf-token-starter-001', 9.99, 'USD', 20, DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),
  ('sub-starter-002', 'a1b2c3d4-2222-2222-2222-222222222222', 'starter', 'active', 'pf-token-starter-002', 9.99, 'USD', 15, DATE_ADD(CURDATE(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), NOW()),
  ('sub-starter-003', 'a1b2c3d4-2222-2222-2222-222222222223', 'starter', 'cancelled', 'pf-token-starter-003', 9.99, 'USD', 10, NULL, DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY)),
  ('sub-pro-001', 'a1b2c3d4-3333-3333-3333-333333333331', 'pro', 'active', 'pf-token-pro-001', 29.99, 'USD', 5, DATE_ADD(CURDATE(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
  ('sub-pro-002', 'a1b2c3d4-3333-3333-3333-333333333332', 'pro', 'active', 'pf-token-pro-002', 29.99, 'USD', 25, DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 180 DAY), DATE_SUB(NOW(), INTERVAL 180 DAY), NOW()),
  ('sub-enterprise-001', 'a1b2c3d4-4444-4444-4444-444444444441', 'enterprise', 'active', 'pf-token-ent-001', 99.99, 'USD', 10, DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), NOW()),
  ('sub-enterprise-002', 'a1b2c3d4-4444-4444-4444-444444444442', 'enterprise', 'active', 'pf-token-ent-002', 99.99, 'USD', 1, DATE_ADD(CURDATE(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 365 DAY), DATE_SUB(NOW(), INTERVAL 365 DAY), NOW());

-- ========== PAYMENT LOGS (15 total) ==========

INSERT INTO payment_logs (id, user_id, subscription_id, transaction_id, payfast_payment_id, payment_type, status, amount_gross, amount_fee, amount_net, currency, created_at) VALUES
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', 'sub-starter-001', 'txn-starter-001-001', 'pf-payment-001', 'subscription', 'completed', 9.99, 0.50, 9.49, 'USD', DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'sub-starter-002', 'txn-starter-002-001', 'pf-payment-002', 'subscription', 'completed', 9.99, 0.50, 9.49, 'USD', DATE_SUB(NOW(), INTERVAL 60 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'sub-starter-002', 'txn-starter-002-002', 'pf-payment-003', 'subscription', 'completed', 9.99, 0.50, 9.49, 'USD', DATE_SUB(NOW(), INTERVAL 30 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222223', 'sub-starter-003', 'txn-starter-003-001', 'pf-payment-004', 'subscription', 'completed', 9.99, 0.50, 9.49, 'USD', DATE_SUB(NOW(), INTERVAL 90 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222223', 'sub-starter-003', 'txn-starter-003-002', 'pf-payment-005', 'subscription', 'failed', 9.99, 0.00, 0.00, 'USD', DATE_SUB(NOW(), INTERVAL 16 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', 'sub-pro-001', 'txn-pro-001-001', 'pf-payment-006', 'subscription', 'completed', 29.99, 1.50, 28.49, 'USD', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'sub-pro-002', 'txn-pro-002-001', 'pf-payment-007', 'subscription', 'completed', 29.99, 1.50, 28.49, 'USD', DATE_SUB(NOW(), INTERVAL 180 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'sub-pro-002', 'txn-pro-002-002', 'pf-payment-008', 'subscription', 'completed', 29.99, 1.50, 28.49, 'USD', DATE_SUB(NOW(), INTERVAL 150 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333332', 'sub-pro-002', 'txn-pro-002-003', 'pf-payment-009', 'subscription', 'completed', 29.99, 1.50, 28.49, 'USD', DATE_SUB(NOW(), INTERVAL 120 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444441', 'sub-enterprise-001', 'txn-ent-001-001', 'pf-payment-010', 'subscription', 'completed', 99.99, 5.00, 94.99, 'USD', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'sub-enterprise-002', 'txn-ent-002-001', 'pf-payment-011', 'subscription', 'completed', 99.99, 5.00, 94.99, 'USD', DATE_SUB(NOW(), INTERVAL 365 DAY)),
  (UUID(), 'a1b2c3d4-4444-4444-4444-444444444442', 'sub-enterprise-002', 'txn-ent-002-002', 'pf-payment-012', 'subscription', 'completed', 99.99, 5.00, 94.99, 'USD', DATE_SUB(NOW(), INTERVAL 335 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222221', NULL, 'txn-onetime-001', 'pf-payment-013', 'one_time', 'failed', 9.99, 0.00, 0.00, 'USD', DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (UUID(), 'a1b2c3d4-3333-3333-3333-333333333331', NULL, 'txn-refund-001', 'pf-payment-014', 'refund', 'completed', -29.99, 0.00, -29.99, 'USD', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  (UUID(), 'a1b2c3d4-2222-2222-2222-222222222222', 'sub-starter-002', 'txn-starter-002-003', 'pf-payment-015', 'subscription', 'pending', 9.99, 0.00, 0.00, 'USD', NOW());

-- ========== SUMMARY ==========
SELECT 'Seed data loaded successfully!' AS message;

SELECT
  'Users' AS entity,
  plan,
  COUNT(*) AS count
FROM users
WHERE email LIKE '%@pdflab.pro'
GROUP BY plan
ORDER BY FIELD(plan, 'free', 'starter', 'pro', 'enterprise');

SELECT
  'Conversion Jobs' AS entity,
  status,
  COUNT(*) AS count
FROM conversion_jobs
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro')
GROUP BY status
ORDER BY FIELD(status, 'pending', 'processing', 'completed', 'failed');

SELECT
  'Total Jobs' AS metric,
  COUNT(*) AS count
FROM conversion_jobs
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro');

SELECT
  'Subscriptions' AS entity,
  status,
  COUNT(*) AS count
FROM subscriptions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro')
GROUP BY status;

SELECT
  'Payment Logs' AS entity,
  status,
  COUNT(*) AS count
FROM payment_logs
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@pdflab.pro')
GROUP BY status;
