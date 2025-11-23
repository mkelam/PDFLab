#!/bin/bash
#
# Manual Upgrade Script for VPS
# Upgrades all pending subscriptions that were blocked by webhook issue
#

set -e

echo "🔧 PDFLab Manual Subscription Upgrade Tool"
echo "=========================================="
echo ""

# Create the upgrade script inside the MySQL container
cat > /tmp/upgrade_subscriptions.sql <<'EOF'
-- Manual upgrade script for pending subscriptions
-- Generated: 2025-11-05
-- Issue: PayFast webhook was blocked, preventing upgrades

USE pdflab;

-- Show current pending subscriptions
SELECT '=== PENDING SUBSCRIPTIONS ===' as '';
SELECT
  u.email,
  u.plan as current_plan,
  s.plan as upgrade_to,
  s.amount,
  s.created_at
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'pending'
ORDER BY s.created_at ASC;

-- Start transaction
START TRANSACTION;

-- Update subscriptions to active
UPDATE subscriptions s
SET
  s.status = 'active',
  s.billing_date = NOW(),
  s.next_billing_date = DATE_ADD(NOW(), INTERVAL 30 DAY),
  s.started_at = NOW()
WHERE s.status = 'pending';

-- Update users to paid plans
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
  u.updated_at = NOW()
WHERE s.status = 'active' AND u.plan = 'free';

-- Update payment logs
UPDATE payment_logs pl
INNER JOIN subscriptions s ON pl.subscription_id = s.id
SET
  pl.status = 'complete',
  pl.processed_at = NOW()
WHERE s.status = 'active' AND pl.status = 'pending';

-- Show upgraded users
SELECT '=== UPGRADED USERS ===' as '';
SELECT
  u.email,
  u.plan,
  u.conversions_limit,
  u.conversions_used,
  u.subscription_status,
  u.updated_at
FROM users u
WHERE u.plan != 'free'
ORDER BY u.updated_at DESC;

-- Commit transaction
COMMIT;

SELECT '=== UPGRADE COMPLETE ===' as '';
EOF

echo "📊 Checking pending subscriptions..."
docker exec pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab -e "
SELECT COUNT(*) as pending_count
FROM subscriptions
WHERE status = 'pending';
"

echo ""
echo "🚀 Executing upgrade script..."
echo ""

# Execute the SQL script
docker exec -i pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab < /tmp/upgrade_subscriptions.sql

echo ""
echo "✅ Upgrade complete!"
echo ""
echo "📋 Verification:"
docker exec pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab -e "
SELECT
  'Subscriptions' as table_name,
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY status
UNION ALL
SELECT
  'Users',
  plan,
  COUNT(*)
FROM users
GROUP BY plan;
"

echo ""
echo "🎉 All pending subscriptions have been upgraded!"
echo ""
echo "Next steps:"
echo "1. Notify affected users their accounts are upgraded"
echo "2. Users should refresh dashboards to see new limits"
echo "3. Monitor for any new payment attempts"
echo ""

# Cleanup
rm /tmp/upgrade_subscriptions.sql

echo "✓ Done!"
