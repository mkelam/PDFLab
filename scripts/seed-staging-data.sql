-- ============================================================================
-- PDFLab Staging Database Seeding Script
-- Purpose: Create test data for integration testing on staging environment
-- ============================================================================
-- Date: 2025-11-20
-- Environment: Staging (141.136.44.168)
-- Database: pdflab_staging
-- ============================================================================

USE pdflab_staging;

-- Disable foreign key checks for easier insertion
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. TEST USERS
-- ============================================================================
-- Password for all test users: TestPass123!
-- Bcrypt hash: $2b$10$5WID6EJ4TIqgxVJOrvfC5udqDlu2ynkw3wc18wBLIsjZ0Ifx/oiF.

-- Delete existing test users first (idempotent)
DELETE FROM users WHERE email IN (
  'testuser@pdflab.com',
  'admin@pdflab.test',
  'pro-user@test.com',
  'enterprise-user@test.com',
  'beta-user@test.com',
  'quota-exceeded@test.com'
);

-- Test User 1: Regular Free Plan User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at,
  last_login
) VALUES (
  '93820ef2-c56a-11f0-9cc6-4204411f080d',  -- Fixed UUID for tests
  'testuser@pdflab.com',
  '$2b$10$5WID6EJ4TIqgxVJOrvfC5udqDlu2ynkw3wc18wBLIsjZ0Ifx/oiF.',  -- TestPass123!
  'Test User',
  'user',
  'free',
  0,  -- No conversions used yet
  3,  -- Free plan limit
  FALSE,
  TRUE,  -- Email verified
  0,
  FALSE,
  FALSE,
  NOW(),
  NOW(),
  NOW()
);

-- Test User 2: Admin User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at
) VALUES (
  '4a0a68d0-c1ef-11f0-8290-0ebc70418b98',  -- Fixed UUID for tests
  'admin@pdflab.test',
  '$2b$10$5WID6EJ4TIqgxVJOrvfC5udqDlu2ynkw3wc18wBLIsjZ0Ifx/oiF.',  -- TestPass123!
  'Admin User',
  'admin',
  'enterprise',  -- Admins get enterprise features
  0,
  999999,  -- Unlimited
  FALSE,
  TRUE,
  0,
  TRUE,
  FALSE,
  NOW(),
  NOW()
);

-- Test User 3: Pro Plan User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at
) VALUES (
  'aabbccdd-1111-2222-3333-444444444444',
  'pro-user@test.com',
  '$2b$10$rZJ5qKvZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuO',
  'Pro User',
  'user',
  'pro',
  5,
  999999,  -- Unlimited conversions
  FALSE,
  TRUE,
  0,
  TRUE,
  FALSE,
  NOW(),
  NOW()
);

-- Test User 4: Enterprise Plan User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at
) VALUES (
  'bbccddee-2222-3333-4444-555555555555',
  'enterprise-user@test.com',
  '$2b$10$rZJ5qKvZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuO',
  'Enterprise User',
  'user',
  'enterprise',
  10,
  999999,
  FALSE,
  TRUE,
  0,
  TRUE,
  FALSE,
  NOW(),
  NOW()
);

-- Test User 5: Beta User (expires in 60 days)
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  beta_expires_at,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at
) VALUES (
  'ccddee11-3333-4444-5555-666666666666',
  'beta-user@test.com',
  '$2b$10$rZJ5qKvZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuO',
  'Beta User',
  'user',
  'pro',  -- Beta users get Pro features
  2,
  999999,
  TRUE,  -- Is beta user
  DATE_ADD(NOW(), INTERVAL 60 DAY),  -- Expires in 60 days
  TRUE,
  0,
  FALSE,
  FALSE,
  NOW(),
  NOW()
);

-- Test User 6: Quota Exceeded User (for testing quota limits)
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  plan,
  conversions_used,
  conversions_limit,
  is_beta_user,
  email_verified,
  failed_reset_attempts,
  onboarding_completed,
  onboarding_skipped,
  created_at,
  updated_at
) VALUES (
  'ddee1122-4444-5555-6666-777777777777',
  'quota-exceeded@test.com',
  '$2b$10$rZJ5qKvZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuZ8pYJ9w3qYJ5qKuO',
  'Quota Exceeded User',
  'user',
  'free',
  3,  -- Used all 3 conversions
  3,  -- Free plan limit
  FALSE,
  TRUE,
  0,
  TRUE,
  FALSE,
  NOW(),
  NOW()
);

-- ============================================================================
-- 2. CONVERSION JOBS (Sample job data for testing)
-- ============================================================================

-- Delete existing test jobs
DELETE FROM conversion_jobs WHERE user_id IN (
  '93820ef2-c56a-11f0-9cc6-4204411f080d',
  'aabbccdd-1111-2222-3333-444444444444',
  'bbccddee-2222-3333-4444-555555555555'
);

-- Job 1: Completed conversion (for testing download)
INSERT INTO conversion_jobs (
  id,
  user_id,
  type,
  status,
  progress,
  input_file,
  output_file,
  file_name,
  file_size,
  cloudconvert_job_id,
  estimated_time,
  created_at,
  expires_at
) VALUES (
  'job-11111111-1111-1111-1111-111111111111',
  '93820ef2-c56a-11f0-9cc6-4204411f080d',  -- testuser
  'pdf_to_docx',
  'completed',
  100,
  '/uploads/test/input.pdf',
  '/uploads/test/output.docx',
  'test-document.pdf',
  52428,  -- 50KB
  'cc-job-12345',
  5,
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  DATE_ADD(NOW(), INTERVAL 23 HOUR)  -- Expires in 24 hours
);

-- Job 2: Processing job
INSERT INTO conversion_jobs (
  id,
  user_id,
  type,
  status,
  progress,
  input_file,
  file_name,
  file_size,
  cloudconvert_job_id,
  estimated_time,
  created_at,
  expires_at
) VALUES (
  'job-22222222-2222-2222-2222-222222222222',
  '93820ef2-c56a-11f0-9cc6-4204411f080d',
  'pdf_to_pptx',
  'processing',
  45,
  '/uploads/test/input2.pdf',
  'presentation.pdf',
  104857,  -- 100KB
  'cc-job-23456',
  10,
  DATE_SUB(NOW(), INTERVAL 5 MINUTE),
  DATE_ADD(NOW(), INTERVAL 24 HOUR)
);

-- Job 3: Failed job
INSERT INTO conversion_jobs (
  id,
  user_id,
  type,
  status,
  progress,
  input_file,
  file_name,
  file_size,
  error_message,
  created_at,
  expires_at
) VALUES (
  'job-33333333-3333-3333-3333-333333333333',
  'aabbccdd-1111-2222-3333-444444444444',  -- pro-user
  'pdf_to_xlsx',
  'failed',
  0,
  '/uploads/test/input3.pdf',
  'spreadsheet.pdf',
  78643,
  'CloudConvert API error: Invalid file format',
  DATE_SUB(NOW(), INTERVAL 2 HOUR),
  DATE_ADD(NOW(), INTERVAL 22 HOUR)
);

-- ============================================================================
-- 3. BATCH JOBS (For batch processing tests)
-- ============================================================================

-- Delete existing test batches
DELETE FROM batch_jobs WHERE user_id IN (
  'aabbccdd-1111-2222-3333-444444444444',
  'bbccddee-2222-3333-4444-555555555555'
);

-- Batch 1: Completed batch
INSERT INTO batch_jobs (
  id,
  user_id,
  status,
  total_files,
  completed_files,
  failed_files,
  output_zip,
  created_at,
  expires_at
) VALUES (
  'batch-11111111-1111-1111-1111-111111111111',
  'aabbccdd-1111-2222-3333-444444444444',  -- pro-user
  'completed',
  5,
  5,
  0,
  '/uploads/batches/batch-11111111.zip',
  DATE_SUB(NOW(), INTERVAL 30 MINUTE),
  DATE_ADD(NOW(), INTERVAL 24 HOUR)
);

-- Batch 2: Processing batch
INSERT INTO batch_jobs (
  id,
  user_id,
  status,
  total_files,
  completed_files,
  failed_files,
  created_at,
  expires_at
) VALUES (
  'batch-22222222-2222-2222-2222-222222222222',
  'bbccddee-2222-3333-4444-555555555555',  -- enterprise-user
  'processing',
  10,
  6,
  0,
  DATE_SUB(NOW(), INTERVAL 10 MINUTE),
  DATE_ADD(NOW(), INTERVAL 24 HOUR)
);

-- ============================================================================
-- 4. BETA APPLICATIONS (For beta user system tests)
-- ============================================================================

-- Delete existing test applications
DELETE FROM beta_applications WHERE email LIKE '%@test.com';

-- Application 1: Pending application
INSERT INTO beta_applications (
  id,
  email,
  name,
  use_case,
  expected_usage,
  status,
  created_at
) VALUES (
  'app-11111111-1111-1111-1111-111111111111',
  'pending-beta@test.com',
  'Pending Beta User',
  'Testing PDF conversion features for my startup',
  'high',
  'pending',
  DATE_SUB(NOW(), INTERVAL 2 DAY)
);

-- Application 2: Approved application
INSERT INTO beta_applications (
  id,
  email,
  name,
  use_case,
  expected_usage,
  status,
  approved_by,
  approved_at,
  created_at
) VALUES (
  'app-22222222-2222-2222-2222-222222222222',
  'approved-beta@test.com',
  'Approved Beta User',
  'Educational institution using PDFs',
  'medium',
  'approved',
  '4a0a68d0-c1ef-11f0-8290-0ebc70418b98',  -- admin user
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_SUB(NOW(), INTERVAL 3 DAY)
);

-- Application 3: Rejected application
INSERT INTO beta_applications (
  id,
  email,
  name,
  use_case,
  expected_usage,
  status,
  rejection_reason,
  created_at
) VALUES (
  'app-33333333-3333-3333-3333-333333333333',
  'rejected-beta@test.com',
  'Rejected Beta User',
  'Spam application',
  'low',
  'rejected',
  'Application does not meet beta criteria',
  DATE_SUB(NOW(), INTERVAL 5 DAY)
);

-- ============================================================================
-- 5. FEEDBACK ENTRIES (For feedback system tests)
-- ============================================================================

-- Delete existing test feedback
DELETE FROM feedback WHERE email LIKE '%@test.com' OR user_id IN (
  '93820ef2-c56a-11f0-9cc6-4204411f080d',
  'aabbccdd-1111-2222-3333-444444444444'
);

-- Feedback 1: New bug report (guest)
INSERT INTO feedback (
  id,
  type,
  message,
  email,
  status,
  page_url,
  user_agent,
  created_at
) VALUES (
  'feedback-11111111-1111-1111-1111-111111111111',
  'bug',
  'PDF conversion fails for files larger than 5MB',
  'guest-bug@test.com',
  'new',
  'https://pdflab.pro/convert',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  DATE_SUB(NOW(), INTERVAL 2 HOUR)
);

-- Feedback 2: Feature request (authenticated)
INSERT INTO feedback (
  id,
  user_id,
  type,
  message,
  status,
  page_url,
  created_at
) VALUES (
  'feedback-22222222-2222-2222-2222-222222222222',
  '93820ef2-c56a-11f0-9cc6-4204411f080d',  -- testuser
  'feature',
  'Please add support for converting to PDF/A format',
  'in_progress',
  'https://pdflab.pro/dashboard',
  DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Feedback 3: General feedback (authenticated)
INSERT INTO feedback (
  id,
  user_id,
  type,
  message,
  status,
  admin_notes,
  created_at
) VALUES (
  'feedback-33333333-3333-3333-3333-333333333333',
  'aabbccdd-1111-2222-3333-444444444444',  -- pro-user
  'general',
  'Love the new batch processing feature!',
  'resolved',
  'Thanked user via email',
  DATE_SUB(NOW(), INTERVAL 5 DAY)
);

-- ============================================================================
-- 6. REFRESH TOKENS (For token refresh tests)
-- ============================================================================

-- Delete existing test refresh tokens
DELETE FROM refresh_tokens WHERE user_id IN (
  '93820ef2-c56a-11f0-9cc6-4204411f080d',
  'aabbccdd-1111-2222-3333-444444444444'
);

-- Valid refresh token for testuser
INSERT INTO refresh_tokens (
  id,
  user_id,
  token_hash,
  expires_at,
  created_at
) VALUES (
  'token-11111111-1111-1111-1111-111111111111',
  '93820ef2-c56a-11f0-9cc6-4204411f080d',
  '$2b$10$validtokenhashexample1234567890',  -- Placeholder
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  NOW()
);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count test users
SELECT '=== TEST USERS ===' AS '';
SELECT
  CONCAT(name, ' (', email, ')') AS user,
  role,
  plan,
  CONCAT(conversions_used, '/', conversions_limit) AS conversions,
  IF(is_beta_user, 'BETA', 'REGULAR') AS type
FROM users
WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.com' OR email LIKE '%@pdflab.test'
ORDER BY created_at;

-- Count test jobs
SELECT '=== CONVERSION JOBS ===' AS '';
SELECT
  SUBSTRING(id, 1, 20) AS job_id,
  type,
  status,
  CONCAT(progress, '%') AS progress,
  file_name
FROM conversion_jobs
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.com'
)
ORDER BY created_at DESC;

-- Count test batches
SELECT '=== BATCH JOBS ===' AS '';
SELECT
  SUBSTRING(id, 1, 20) AS batch_id,
  status,
  CONCAT(completed_files, '/', total_files) AS progress,
  failed_files
FROM batch_jobs
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com'
)
ORDER BY created_at DESC;

-- Count test applications
SELECT '=== BETA APPLICATIONS ===' AS '';
SELECT
  SUBSTRING(id, 1, 20) AS app_id,
  email,
  status,
  expected_usage
FROM beta_applications
WHERE email LIKE '%@test.com'
ORDER BY created_at DESC;

-- Count test feedback
SELECT '=== FEEDBACK ENTRIES ===' AS '';
SELECT
  SUBSTRING(id, 1, 20) AS feedback_id,
  type,
  status,
  SUBSTRING(message, 1, 50) AS message_preview
FROM feedback
WHERE email LIKE '%@test.com' OR user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.com'
)
ORDER BY created_at DESC;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '=== SEEDING SUMMARY ===' AS '';
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.%') AS test_users,
  (SELECT COUNT(*) FROM conversion_jobs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.%')) AS conversion_jobs,
  (SELECT COUNT(*) FROM batch_jobs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')) AS batch_jobs,
  (SELECT COUNT(*) FROM beta_applications WHERE email LIKE '%@test.com') AS beta_applications,
  (SELECT COUNT(*) FROM feedback WHERE email LIKE '%@test.com' OR user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.%')) AS feedback_entries;

-- ============================================================================
-- END OF SEEDING SCRIPT
-- ============================================================================
