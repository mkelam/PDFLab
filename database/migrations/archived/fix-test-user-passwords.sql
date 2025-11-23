-- Fix test user password hashes
-- Authentication Guardian Pattern: Bcrypt with 12 salt rounds
--
-- Test Users:
-- testuser@pdflab.com → Password: TestPass123!
-- admin@pdflab.com → Password: Admin123!

-- Update testuser password hash
UPDATE users
SET password_hash = '$2b$12$3SXsTBm1sTa.equNr6BuXOqhK/S9FojrpZK5NQA7a54RpdG4hnaRq'
WHERE email = 'testuser@pdflab.com';

-- Update admin user password hash (if exists, otherwise create)
UPDATE users
SET password_hash = '$2b$12$lSN..pUEuDscJnqFRfm7yuemoE3CwM3rVWo5K2MVyud.0JbqjJ6oK'
WHERE email = 'admin@pdflab.com';

-- Create admin user if doesn't exist (email: admin@pdflab.test from test)
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'admin@pdflab.test',
    '$2b$12$lSN..pUEuDscJnqFRfm7yuemoE3CwM3rVWo5K2MVyud.0JbqjJ6oK',
    'Admin User',
    'admin',
    'enterprise',
    0,
    999999,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    password_hash = '$2b$12$lSN..pUEuDscJnqFRfm7yuemoE3CwM3rVWo5K2MVyud.0JbqjJ6oK',
    role = 'admin';

-- Also create mmkela@gmail.com user for test (user 2 in cross-user access test)
INSERT INTO users (
    id, email, password_hash, name, role, plan,
    conversions_used, conversions_limit,
    email_verified, email_verified_at,
    created_at, updated_at, last_login
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'mmkela@gmail.com',
    '$2b$12$3SXsTBm1sTa.equNr6BuXOqhK/S9FojrpZK5NQA7a54RpdG4hnaRq',
    'User Two',
    'user',
    'pro',
    0,
    999999,
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    password_hash = '$2b$12$3SXsTBm1sTa.equNr6BuXOqhK/S9FojrpZK5NQA7a54RpdG4hnaRq';

-- Create subscription for mmkela@gmail.com (needed for cross-user access test)
INSERT INTO subscriptions (
    id, user_id, plan, status,
    payfast_token, amount, currency,
    billing_date, next_billing_date,
    started_at, created_at, updated_at
) VALUES (
    'a9283e79-c5ef-11f0-8a51-e62909c9494f',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'pro',
    'active',
    'pf_token_test_user2',
    29.99,
    'USD',
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_ADD(NOW(), INTERVAL 20 DAY),
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    NOW()
) ON DUPLICATE KEY UPDATE
    user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    status = 'active';

-- Verify password hashes are correct
SELECT email, role, SUBSTRING(password_hash, 1, 20) AS hash_preview
FROM users
WHERE email IN ('testuser@pdflab.com', 'admin@pdflab.com', 'admin@pdflab.test', 'mmkela@gmail.com');
