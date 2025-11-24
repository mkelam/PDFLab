#!/bin/bash
# PDFLab Smoke Test - Quick validation of all phases

echo "=== PDFLab Smoke Test ==="
echo ""

PASS=0
FAIL=0

# Test 1: Backend Health
echo -n "1. Backend Health... "
if curl -sf https://pdflab.pro/health > /dev/null; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 2: Frontend Accessible
echo -n "2. Frontend Accessible... "
if curl -sf -I https://pdflab.pro | grep -q "200"; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 3: Metrics Endpoint (Phase 4)
echo -n "3. Metrics Endpoint... "
if curl -sf https://pdflab.pro/metrics | head -10 | grep -q "TYPE"; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 4: Circuit Breaker Metrics (Phase 1)
echo -n "4. Circuit Breaker Metrics... "
if curl -sf https://pdflab.pro/metrics | grep -q "circuit_breaker"; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 5: Bundle Optimization (Phase 3)
echo -n "5. Bundle Optimization... "
if curl -sf https://pdflab.pro | grep -q "framework-"; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 6: Database Connection
echo -n "6. Database Connection... "
DB_STATUS=$(curl -sf https://pdflab.pro/health | grep -o '"database":"OK"')
if [ -n "$DB_STATUS" ]; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 7: Redis Connection
echo -n "7. Redis Connection... "
REDIS_STATUS=$(curl -sf https://pdflab.pro/health | grep -o '"redis":"OK"')
if [ -n "$REDIS_STATUS" ]; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

# Test 8: Queue Metrics (Phase 4)
echo -n "8. Queue Metrics... "
if curl -sf https://pdflab.pro/metrics | grep -q "pdflab_queue_depth"; then
    echo "✓ PASS"
    ((PASS++))
else
    echo "✗ FAIL"
    ((FAIL++))
fi

echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✓ All smoke tests passed!"
    exit 0
else
    echo "✗ Some tests failed!"
    exit 1
fi
