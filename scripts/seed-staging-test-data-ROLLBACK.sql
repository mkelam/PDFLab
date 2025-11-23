-- ============================================
-- STAGING TEST DATA ROLLBACK SCRIPT
-- ============================================
-- Purpose: ROLLBACK seed-staging-test-data.sql
-- Environment: STAGING ONLY (pdflab_staging)
-- Created: 2025-11-20
-- Guardian: Database Migration Guardian - MANDATORY ROLLBACK
-- ============================================

-- SAFETY: Verify we're in staging database
SELECT DATABASE() AS current_database;

-- ============================================
-- ROLLBACK ORDER (Reverse of seed order)
-- ============================================
-- NOTE: Delete in reverse order to respect foreign key constraints
-- Order: payment_logs → beta_applications → feedback → batch_jobs →
--        conversion_jobs → subscriptions → users

-- ============================================
-- SECTION 7: DELETE PAYMENT LOGS
-- ============================================

DELETE FROM payment_logs WHERE id IN (
    'p1111111-1111-1111-1111-111111111111'
);

SELECT 'Deleted payment logs' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 6: DELETE BETA APPLICATIONS
-- ============================================

DELETE FROM beta_applications WHERE id IN (
    'ba111111-1111-1111-1111-111111111111',
    'ba222222-2222-2222-2222-222222222222'
);

SELECT 'Deleted beta applications' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 5: DELETE FEEDBACK
-- ============================================

DELETE FROM feedback WHERE id IN (
    'f1111111-1111-1111-1111-111111111111',
    'f2222222-2222-2222-2222-222222222222'
);

SELECT 'Deleted feedback' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 4: DELETE BATCH JOBS
-- ============================================

DELETE FROM batch_jobs WHERE id IN (
    'b1111111-1111-1111-1111-111111111111'
);

SELECT 'Deleted batch jobs' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 3: DELETE CONVERSION JOBS
-- ============================================

DELETE FROM conversion_jobs WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);

SELECT 'Deleted conversion jobs' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 2: DELETE SUBSCRIPTIONS
-- ============================================

DELETE FROM subscriptions WHERE id IN (
    's1111111-1111-1111-1111-111111111111',
    's2222222-2222-2222-2222-222222222222'
);

SELECT 'Deleted subscriptions' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- SECTION 1: DELETE TEST USERS
-- ============================================

DELETE FROM users WHERE id IN (
    '11111111-1111-1111-1111-111111111111', -- testuser@pdflab.com
    '22222222-2222-2222-2222-222222222222', -- admin@pdflab.com
    '33333333-3333-3333-3333-333333333333', -- betatester@pdflab.com
    '44444444-4444-4444-4444-444444444444'  -- prouser@pdflab.com
);

SELECT 'Deleted test users' AS status, ROW_COUNT() AS rows_deleted;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all test data removed
SELECT 'Rollback Complete' AS status;
SELECT COUNT(*) AS remaining_test_users FROM users WHERE email LIKE '%@pdflab.com' OR email LIKE '%@example.com';
SELECT COUNT(*) AS remaining_subscriptions FROM subscriptions WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

-- ============================================
-- ROLLBACK SUMMARY
-- ============================================

SELECT
    'Database restored to pre-seed state' AS result,
    NOW() AS rollback_timestamp;

-- ============================================
-- END OF ROLLBACK SCRIPT
-- ============================================
