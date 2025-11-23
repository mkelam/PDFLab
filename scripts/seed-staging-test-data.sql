-- ============================================
-- STAGING TEST DATA SEED SCRIPT
-- ============================================
-- Purpose: Seed staging database with test users, subscriptions, and data
-- Environment: STAGING ONLY (pdflab_staging)
-- Created: 2025-11-20
-- Guardian: Database Migration Guardian validated
-- ============================================

-- SAFETY: Verify we're in staging database
SELECT DATABASE() AS current_database;

-- ============================================
-- SECTION 1: TEST USERS
-- ============================================

-- Test User 1: Regular User (testuser@pdflab.com)
-- Password: TestPass123! (bcrypt hash with salt rounds=10)
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    is_beta_user, beta_expires_at,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'testuser@pdflab.com',
    '$2b$10$rZ8QKMJz4h0gXz6wZ5QdKe8XKVqZ0aL3mJ9v7R2wX1Y8zQ5vM6N4W', -- TestPass123!
    'Test User',
    'user',
    'free',
    0,
    NULL,
    0,
    3,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
);

-- Test User 2: Admin User (admin@pdflab.com)
-- Password: AdminPass123!
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    is_beta_user, beta_expires_at,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'admin@pdflab.com',
    '$2b$10$aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9iJ', -- AdminPass123!
    'Admin User',
    'admin',
    'enterprise',
    0,
    NULL,
    0,
    999999,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
);

-- Test User 3: Beta User (betatester@pdflab.com)
-- Password: BetaPass123!
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    is_beta_user, beta_expires_at,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'betatester@pdflab.com',
    '$2b$10$cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9iJ0k', -- BetaPass123!
    'Beta Tester',
    'user',
    'pro',
    1,
    DATE_ADD(NOW(), INTERVAL 60 DAY),
    5,
    1000,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
);

-- Test User 4: Pro Plan User (prouser@pdflab.com)
-- Password: ProPass123!
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    is_beta_user, beta_expires_at,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    'prouser@pdflab.com',
    '$2b$10$dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1l', -- ProPass123!
    'Pro User',
    'user',
    'pro',
    0,
    NULL,
    50,
    999999,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
);

-- ============================================
-- SECTION 2: SUBSCRIPTIONS
-- ============================================

-- Subscription for Pro User (active)
INSERT INTO subscriptions (
    id, user_id, plan, status,
    payfast_token, payfast_subscription_id,
    amount, currency,
    billing_date, next_billing_date,
    started_at, created_at, updated_at
) VALUES (
    's1111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'pro',
    'active',
    'pf_token_test_pro',
    'pf_sub_12345',
    29.99,
    'USD',
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    DATE_ADD(NOW(), INTERVAL 15 DAY),
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    NOW()
);

-- Subscription for Beta User (active trial)
INSERT INTO subscriptions (
    id, user_id, plan, status,
    payfast_token, payfast_subscription_id,
    amount, currency,
    billing_date, next_billing_date, trial_end,
    started_at, created_at, updated_at
) VALUES (
    's2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'pro',
    'trialing',
    'pf_token_test_beta',
    'pf_sub_67890',
    29.99,
    'USD',
    NOW(),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    DATE_ADD(NOW(), INTERVAL 60 DAY),
    NOW(),
    NOW(),
    NOW()
);

-- ============================================
-- SECTION 3: CONVERSION JOBS
-- ============================================

-- Completed conversion job for test user
INSERT INTO conversion_jobs (
    id, user_id, type, status, progress,
    input_file, output_file, file_name, file_size,
    cloudconvert_job_id,
    created_at, updated_at, expires_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'pdf_to_docx',
    'completed',
    100,
    '/storage/uploads/11111111-1111-1111-1111-111111111111/input.pdf',
    '/storage/outputs/11111111-1111-1111-1111-111111111111/output.docx',
    'test-document.pdf',
    524288, -- 512 KB
    'cc_job_test_12345',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_ADD(NOW(), INTERVAL 6 DAY)
);

-- Failed conversion job for pro user
INSERT INTO conversion_jobs (
    id, user_id, type, status, progress,
    input_file, file_name, file_size,
    error_message,
    created_at, updated_at, expires_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'pdf_to_xlsx',
    'failed',
    0,
    '/storage/uploads/44444444-4444-4444-4444-444444444444/spreadsheet.pdf',
    'financial-report.pdf',
    1048576, -- 1 MB
    'CloudConvert error: No table data detected in PDF',
    DATE_SUB(NOW(), INTERVAL 2 HOUR),
    DATE_SUB(NOW(), INTERVAL 2 HOUR),
    DATE_ADD(NOW(), INTERVAL 6 DAY)
);

-- ============================================
-- SECTION 4: BATCH JOBS
-- ============================================

-- Completed batch job for beta user
INSERT INTO batch_jobs (
    id, user_id, batch_name, operation_type,
    total_files, completed_files, failed_files,
    status, progress,
    conversion_job_ids,
    total_size,
    created_at, updated_at, expires_at
) VALUES (
    'b1111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Monthly Reports Conversion',
    'convert',
    5,
    5,
    0,
    'completed',
    100,
    '["job-batch-1", "job-batch-2", "job-batch-3", "job-batch-4", "job-batch-5"]',
    5242880, -- 5 MB total
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_ADD(NOW(), INTERVAL 4 DAY)
);

-- ============================================
-- SECTION 5: FEEDBACK
-- ============================================

-- Bug report feedback
INSERT INTO feedback (
    id, user_id, type, message,
    page_url, user_agent,
    status, created_at, updated_at
) VALUES (
    'f1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'bug',
    'PDF conversion to DOCX sometimes loses formatting on tables',
    'http://141.136.44.168:3007/dashboard',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'new',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Feature request feedback
INSERT INTO feedback (
    id, user_id, type, message,
    page_url, user_agent,
    status, created_at, updated_at
) VALUES (
    'f2222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'feature',
    'Would love to have batch processing for multiple PDFs at once',
    'http://141.136.44.168:3007/dashboard',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'resolved',
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- ============================================
-- SECTION 6: BETA APPLICATIONS
-- ============================================

-- Approved beta application
INSERT INTO beta_applications (
    id, email, full_name, use_case,
    company, status, user_id,
    created_at, updated_at, reviewed_at
) VALUES (
    'ba111111-1111-1111-1111-111111111111',
    'betatester@pdflab.com',
    'Beta Tester',
    'Testing PDF conversion for educational materials',
    'Test University',
    'approved',
    '33333333-3333-3333-3333-333333333333',
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_SUB(NOW(), INTERVAL 9 DAY),
    DATE_SUB(NOW(), INTERVAL 9 DAY)
);

-- Pending beta application
INSERT INTO beta_applications (
    id, email, full_name, use_case,
    company, status,
    created_at, updated_at
) VALUES (
    'ba222222-2222-2222-2222-222222222222',
    'pending@example.com',
    'Pending Applicant',
    'Need to convert legal documents for law firm',
    'Legal Associates Inc',
    'pending',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- ============================================
-- SECTION 7: PAYMENT LOGS
-- ============================================

-- Successful payment log for pro user
INSERT INTO payment_logs (
    id, user_id, subscription_id,
    transaction_id, payfast_payment_id,
    payment_type, status,
    amount_gross, amount_fee, amount_net, currency,
    plan, name_first, name_last, email_address,
    item_name, itn_data,
    created_at, updated_at
) VALUES (
    'p1111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    's1111111-1111-1111-1111-111111111111',
    'txn_test_12345',
    'pf_payment_67890',
    'subscription_payment',
    'complete',
    29.99,
    1.50,
    28.49,
    'USD',
    'pro',
    'Pro',
    'User',
    'prouser@pdflab.com',
    'PDFLab Pro Monthly Subscription',
    '{"m_payment_id": "txn_test_12345", "amount_gross": "29.99", "pf_payment_id": "pf_payment_67890"}',
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    DATE_SUB(NOW(), INTERVAL 15 DAY)
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count inserted records
SELECT 'Test Data Seeding Complete' AS status;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_subscriptions FROM subscriptions;
SELECT COUNT(*) AS total_conversion_jobs FROM conversion_jobs;
SELECT COUNT(*) AS total_batch_jobs FROM batch_jobs;
SELECT COUNT(*) AS total_feedback FROM feedback;
SELECT COUNT(*) AS total_beta_applications FROM beta_applications;
SELECT COUNT(*) AS total_payment_logs FROM payment_logs;

-- ============================================
-- END OF SEED SCRIPT
-- ============================================
