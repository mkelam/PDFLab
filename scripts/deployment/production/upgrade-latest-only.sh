#!/bin/bash
#
# Upgrade Latest Subscription Per User - Remove Duplicates
# This script upgrades only the most recent pending subscription for each user
# and cancels all older duplicate attempts
#

set -e

echo "🔧 PDFLab - Upgrade Latest Subscriptions (Remove Duplicates)"
echo "============================================================"
echo ""

DB_USER="pdflab"
DB_PASS="***REMOVED***"
DB_NAME="pdflab_production"
CONTAINER="pdflab-mysql-prod"

echo "📊 Current Status:"
echo ""

# Show pending subscriptions grouped by user
docker exec $CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "
SELECT
  u.email,
  COUNT(*) as pending_count,
  MIN(s.created_at) as first_attempt,
  MAX(s.created_at) as latest_attempt
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending'
GROUP BY u.email
ORDER BY latest_attempt DESC;
" 2>/dev/null

echo ""
echo "📋 Strategy:"
echo "   1. Keep LATEST pending subscription per user"
echo "   2. Cancel all older duplicate subscriptions"
echo "   3. Upgrade the kept subscriptions to active"
echo "   4. Update users to their new plans"
echo ""
echo "⏳ Executing upgrade script..."
echo ""

# Create SQL script
cat > /tmp/upgrade_latest.sql <<'EOF'
USE pdflab_production;

-- Show what we're about to do
SELECT '=== SUBSCRIPTIONS TO KEEP (Latest per user) ===' as '';
SELECT
  s.id,
  u.email,
  s.plan,
  s.amount,
  s.created_at
FROM subscriptions s
INNER JOIN (
  SELECT user_id, MAX(created_at) as latest_created
  FROM subscriptions
  WHERE status = 'pending'
  GROUP BY user_id
) latest ON s.user_id = latest.user_id AND s.created_at = latest.latest_created
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending'
ORDER BY s.created_at DESC;

SELECT '=== SUBSCRIPTIONS TO CANCEL (Older duplicates) ===' as '';
SELECT
  s.id,
  u.email,
  s.plan,
  s.amount,
  s.created_at
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending'
AND s.id NOT IN (
  SELECT s2.id
  FROM subscriptions s2
  INNER JOIN (
    SELECT user_id, MAX(created_at) as latest_created
    FROM subscriptions
    WHERE status = 'pending'
    GROUP BY user_id
  ) latest ON s2.user_id = latest.user_id AND s2.created_at = latest.latest_created
  WHERE s2.status = 'pending'
)
ORDER BY u.email, s.created_at;

-- Start transaction
START TRANSACTION;

-- Step 1: Cancel older duplicate subscriptions
UPDATE subscriptions s
SET
  s.status = 'cancelled',
  s.ended_at = NOW(),
  s.updated_at = NOW()
WHERE s.status = 'pending'
AND s.id NOT IN (
  SELECT * FROM (
    SELECT s2.id
    FROM subscriptions s2
    INNER JOIN (
      SELECT user_id, MAX(created_at) as latest_created
      FROM subscriptions
      WHERE status = 'pending'
      GROUP BY user_id
    ) latest ON s2.user_id = latest.user_id AND s2.created_at = latest.latest_created
    WHERE s2.status = 'pending'
  ) as keep_ids
);

-- Step 2: Activate the latest subscription per user
UPDATE subscriptions s
INNER JOIN (
  SELECT user_id, MAX(created_at) as latest_created
  FROM subscriptions
  WHERE status = 'pending'
  GROUP BY user_id
) latest ON s.user_id = latest.user_id AND s.created_at = latest.latest_created
SET
  s.status = 'active',
  s.billing_date = NOW(),
  s.next_billing_date = DATE_ADD(NOW(), INTERVAL 30 DAY),
  s.started_at = NOW(),
  s.updated_at = NOW()
WHERE s.status = 'pending';

-- Step 3: Update users to their new plans
UPDATE users u
INNER JOIN subscriptions s ON u.id = s.user_id
SET
  u.plan = s.plan,
  u.conversions_limit = CASE
    WHEN s.plan = 'starter' THEN 100
    WHEN s.plan = 'pro' THEN 999999
    WHEN s.plan = 'enterprise' THEN 999999
    ELSE 3
  END,
  u.conversions_used = 0,
  u.subscription_status = 'active',
  u.subscription_id = s.id,
  u.updated_at = NOW()
WHERE s.status = 'active' AND s.started_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE);

-- Step 4: Update payment logs for activated subscriptions
UPDATE payment_logs pl
INNER JOIN subscriptions s ON pl.subscription_id = s.id
SET
  pl.status = 'complete',
  pl.processed_at = NOW()
WHERE s.status = 'active'
AND s.started_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
AND pl.status = 'pending';

-- Show results
SELECT '=== UPGRADED USERS ===' as '';
SELECT
  u.email,
  u.plan,
  u.conversions_limit,
  u.conversions_used,
  u.subscription_status,
  s.billing_date,
  s.next_billing_date
FROM users u
INNER JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active'
AND s.started_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
ORDER BY u.email;

SELECT '=== CANCELLED DUPLICATES ===' as '';
SELECT
  u.email,
  COUNT(*) as cancelled_count
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'cancelled'
AND s.ended_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
GROUP BY u.email;

-- Commit transaction
COMMIT;

SELECT '=== FINAL STATUS ===' as '';
SELECT
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY status
ORDER BY status;

EOF

# Execute the SQL script
docker exec -i $CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME < /tmp/upgrade_latest.sql 2>/dev/null

echo ""
echo "✅ Upgrade Complete!"
echo ""
echo "📊 Final Verification:"
docker exec $CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "
SELECT
  'Active Subscriptions' as category,
  u.email,
  u.plan,
  u.conversions_limit,
  s.next_billing_date
FROM users u
INNER JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY u.email;
" 2>/dev/null

echo ""
echo "🎉 All done! Summary:"
echo "   - Latest subscription per user: ACTIVATED"
echo "   - Older duplicates: CANCELLED"
echo "   - Users upgraded to their paid plans"
echo "   - Conversion limits set correctly"
echo ""
echo "Next steps:"
echo "1. Users should refresh their dashboards"
echo "2. Verify they see their new plan and conversion limits"
echo "3. Monitor for any new payment attempts"
echo ""

# Cleanup
rm -f /tmp/upgrade_latest.sql

echo "✓ Script complete!"
