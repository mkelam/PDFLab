#!/bin/bash
# Phase 1 Continuation Script - Complete Backend Deployment
# Run when VPS connectivity is restored

set -e

VPS="root@141.136.44.168"
BACKEND_PATH="/var/pdflab/app/backend"

echo "=========================================="
echo "Phase 1 Deployment Continuation"
echo "=========================================="

# Step 1: Add routes to monitoring.admin.routes.js
echo "Step 1: Adding new routes to compiled backend..."
ssh $VPS "sed -i '/exports.default = router/i\\
// Get current resource utilization (disk, memory, redis stats)\\
router.get(\"/resources\", (0, admin_middleware_1.requirePermission)(\"users.view\"), monitoring_admin_controller_1.getResourceMetrics);\\
// Get auto-remediation activity log\\
router.get(\"/remediation-log\", (0, admin_middleware_1.requirePermission)(\"users.view\"), monitoring_admin_controller_1.getRemediationLog);
' $BACKEND_PATH/dist/routes/monitoring.admin.routes.js"

echo "✓ Routes added"

# Step 2: Restart backend container
echo "Step 2: Restarting backend container..."
ssh $VPS "docker restart pdflab-backend-prod"
sleep 5

# Step 3: Verify backend is running
echo "Step 3: Verifying backend health..."
ssh $VPS "curl -s http://localhost:3006/health | jq"

# Step 4: Test new endpoints
echo "Step 4: Testing new API endpoints..."

echo -n "Testing /api/monitoring/resources... "
RESOURCE_RESPONSE=$(ssh $VPS "curl -s http://localhost:3006/api/monitoring/resources")
if echo "$RESOURCE_RESPONSE" | grep -q "success"; then
    echo "✓ Working"
    echo "$RESOURCE_RESPONSE" | jq '.data.current.disk'
else
    echo "✗ Failed"
    echo "$RESOURCE_RESPONSE"
fi

echo -n "Testing /api/monitoring/remediation-log... "
LOG_RESPONSE=$(ssh $VPS "curl -s http://localhost:3006/api/monitoring/remediation-log")
if echo "$LOG_RESPONSE" | grep -q "success"; then
    echo "✓ Working"
    echo "$LOG_RESPONSE" | jq '.pagination'
else
    echo "✗ Failed"
    echo "$LOG_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Backend Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Implement frontend UI components"
echo "2. Deploy frontend changes"
echo "3. Test end-to-end at https://pdflab.pro/admin/monitoring"
echo ""
echo "See MONITORING_DASHBOARD_EXECUTION_PLAN.md Task 1.4 for frontend implementation"
