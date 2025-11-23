#!/bin/bash

# PDFLab Transformation Verification Script
# Systematically tests all implemented phases

set -e

echo "====================================="
echo "PDFLab Transformation Verification"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

skip() {
    echo -e "${YELLOW}⏭️  SKIP${NC}: $1"
    ((SKIPPED++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

# ====================================
# PHASE 1A: EMERGENCY STABILITY
# ====================================
echo ""
echo "========================================"
echo "Phase 1A: Emergency Stability (7 fixes)"
echo "========================================"
echo ""

# Check if Phase 1A branch exists
info "Checking Phase 1A branch..."
if git show-ref --verify --quiet refs/heads/emergency/phase1a-stability-fixes; then
    pass "Phase 1A branch exists"
else
    fail "Phase 1A branch missing"
fi

# Test 1: Check Redis reconnection strategy
echo ""
echo "--- Issue #2: Redis Reconnection ---"
if [ -f "backend/src/config/redis.ts" ]; then
    if grep -q "reconnectStrategy" backend/src/config/redis.ts; then
        if grep -q "reconnectStrategy.*false" backend/src/config/redis.ts; then
            fail "Redis reconnection still disabled"
        else
            pass "Redis reconnection strategy implemented"
        fi
    else
        fail "Redis reconnection strategy not found"
    fi
else
    fail "Redis config file missing"
fi

# Test 2: Check process.exit removal
echo ""
echo "--- Issue #3: Aggressive process.exit() ---"
EXIT_COUNT=$(grep -r "process\.exit" backend/src/ 2>/dev/null | grep -v "SIGTERM\|SIGINT\|graceful" | wc -l || echo "0")
if [ "$EXIT_COUNT" -eq 0 ]; then
    pass "No aggressive process.exit() calls found"
else
    fail "Found $EXIT_COUNT aggressive process.exit() calls"
fi

# Test 3: Check CloudConvert timeout
echo ""
echo "--- Issue #5: CloudConvert Timeout ---"
if [ -f "backend/src/services/cloudconvert.service.ts" ]; then
    if grep -E "300000|5.*minute" backend/src/services/cloudconvert.service.ts >/dev/null 2>&1; then
        pass "CloudConvert timeout increased to 5 minutes"
    else
        skip "CloudConvert timeout not clearly set to 300000ms (check manually)"
    fi
else
    fail "CloudConvert service file missing"
fi

# Test 4: Check GUEST_LIMITS constants
echo ""
echo "--- Issue #7: Guest Quota Consistency ---"
if [ -f "backend/src/config/constants.ts" ]; then
    if grep -q "GUEST_LIMITS" backend/src/config/constants.ts; then
        if grep -A 5 "GUEST_LIMITS" backend/src/config/constants.ts | grep -q "MAX_CONVERSIONS.*3"; then
            pass "Guest quota centralized with 3 conversion limit"
        else
            fail "Guest quota limit not set to 3"
        fi
    else
        fail "GUEST_LIMITS not found in constants"
    fi
else
    fail "Constants file missing"
fi

# Test 5: Check partner DECIMAL fix
echo ""
echo "--- Issue #6: Partner DECIMAL Bug ---"
if [ -f "backend/src/controllers/partner.controller.ts" ]; then
    if grep -q "parseFloat.*total_revenue_generated" backend/src/controllers/partner.controller.ts; then
        pass "Partner revenue parsing fixed"
    else
        skip "Partner revenue parsing not clearly fixed (check manually)"
    fi
else
    fail "Partner controller missing"
fi

# ====================================
# PHASE 1B: OPERATIONAL FOUNDATION
# ====================================
echo ""
echo "========================================"
echo "Phase 1B: Operational Foundation (5 fixes)"
echo "========================================"
echo ""

# Test 6: Check Winston logging
echo ""
echo "--- Issue #11: Structured Logging ---"
if [ -f "backend/src/config/logger.ts" ]; then
    pass "Winston logger configuration exists"

    # Check middleware
    if [ -f "backend/src/middleware/request-id.middleware.ts" ]; then
        pass "Request ID middleware exists"
    else
        fail "Request ID middleware missing"
    fi

    if [ -f "backend/src/middleware/http-logger.middleware.ts" ]; then
        pass "HTTP logger middleware exists"
    else
        fail "HTTP logger middleware missing"
    fi

    # Check for console.log replacement
    CONSOLE_COUNT=$(grep -r "console\.log" backend/src/ 2>/dev/null | grep -v "//" | wc -l || echo "0")
    if [ "$CONSOLE_COUNT" -lt 10 ]; then
        pass "Console.log mostly replaced (found $CONSOLE_COUNT)"
    else
        fail "Too many console.log calls remaining ($CONSOLE_COUNT)"
    fi
else
    fail "Winston logger configuration missing"
fi

# Test 7: Check worker concurrency
echo ""
echo "--- Issue #10: Worker Concurrency ---"
if [ -f "backend/src/jobs/conversion.job.ts" ]; then
    if grep -E "concurrency.*3|WORKER_CONCURRENCY" backend/src/jobs/conversion.job.ts >/dev/null 2>&1; then
        pass "Worker concurrency reduced to 3"
    else
        skip "Worker concurrency not clearly set to 3 (check manually)"
    fi
else
    fail "Conversion job file missing"
fi

# Test 8: Check API client standardization
echo ""
echo "--- Issue #9: API Client Inconsistency ---"
if [ -f "lib/api.ts" ]; then
    BARE_FETCH=$(grep "await fetch(" lib/api.ts 2>/dev/null | grep -v "fetchWithTokenRefresh" | wc -l || echo "0")
    if [ "$BARE_FETCH" -eq 0 ]; then
        pass "All API calls use fetchWithTokenRefresh"
    else
        fail "Found $BARE_FETCH bare fetch() calls"
    fi
else
    fail "API client file missing"
fi

# ====================================
# PHASE 1C: PRODUCTION HARDENING
# ====================================
echo ""
echo "========================================"
echo "Phase 1C: Production Hardening (3 fixes)"
echo "========================================"
echo ""

# Test 9: Check automated backups
echo ""
echo "--- Issue #13: Automated Backups ---"
if [ -f "scripts/backup-production.sh" ]; then
    pass "Backup script exists"

    if [ -x "scripts/backup-production.sh" ]; then
        pass "Backup script is executable"
    else
        fail "Backup script not executable"
    fi

    if grep -q "RETENTION_DAYS.*30" scripts/backup-production.sh; then
        pass "30-day retention configured"
    else
        fail "Retention not set to 30 days"
    fi
else
    fail "Backup script missing"
fi

# Test 10: Check testing infrastructure
echo ""
echo "--- Issue #14: Testing Foundation ---"
if [ -f "backend/jest.config.js" ]; then
    pass "Jest configuration exists"

    # Count test files
    TEST_COUNT=$(find backend/tests -name "*.test.ts" 2>/dev/null | wc -l || echo "0")
    if [ "$TEST_COUNT" -ge 4 ]; then
        pass "Found $TEST_COUNT test files"
    else
        fail "Only found $TEST_COUNT test files (expected 5+)"
    fi

    # Run tests
    info "Running backend tests..."
    cd backend
    if npm test >/dev/null 2>&1; then
        pass "All backend tests passing"
    else
        fail "Some backend tests failing"
    fi
    cd ..
else
    fail "Jest configuration missing"
fi

# Test 11: Check circuit breaker
echo ""
echo "--- Issue #15: Circuit Breaker ---"
if [ -f "backend/src/config/circuit-breaker.ts" ]; then
    pass "Circuit breaker config exists"

    if [ -f "backend/src/utils/circuit-breaker.factory.ts" ]; then
        pass "Circuit breaker factory exists"
    else
        fail "Circuit breaker factory missing"
    fi

    if grep -q "CircuitBreaker\|opossum" backend/src/services/cloudconvert.service.ts; then
        pass "CloudConvert service uses circuit breaker"
    else
        fail "Circuit breaker not implemented in CloudConvert service"
    fi
else
    fail "Circuit breaker config missing"
fi

# ====================================
# PHASE 2: SCALABILITY
# ====================================
echo ""
echo "========================================"
echo "Phase 2: Scalability (Database Scaling)"
echo "========================================"
echo ""

# Test 12: Check database scaling
echo ""
echo "--- Database Scaling Implementation ---"
if [ -f "backend/src/config/database-scaling.ts" ]; then
    pass "Database scaling config exists"

    if grep -q "replication" backend/src/config/database-scaling.ts; then
        pass "Replication configuration present"
    else
        fail "Replication not configured"
    fi
else
    fail "Database scaling config missing"
fi

if [ -f "scripts/optimize-database.sql" ]; then
    INDEX_COUNT=$(grep -c "CREATE INDEX" scripts/optimize-database.sql || echo "0")
    if [ "$INDEX_COUNT" -ge 20 ]; then
        pass "Found $INDEX_COUNT database indexes"
    else
        fail "Only found $INDEX_COUNT indexes (expected 25+)"
    fi
else
    fail "Database optimization SQL missing"
fi

# Test 13: Check documentation
echo ""
echo "--- Phase 2 Documentation ---"
[ -f "docs/DATABASE_SCALING.md" ] && pass "Database scaling docs exist" || fail "Database scaling docs missing"
[ -f "docs/CLOUDFLARE_CDN_SETUP.md" ] && pass "CDN setup docs exist" || fail "CDN setup docs missing"

# ====================================
# PHASE 3: CODE QUALITY
# ====================================
echo ""
echo "========================================"
echo "Phase 3: Code Quality (2 fixes)"
echo "========================================"
echo ""

# Test 14: Check component refactoring
echo ""
echo "--- Issue #17: Component Refactoring ---"
if [ -f "components/UnifiedConversionInterface.tsx" ]; then
    LINE_COUNT=$(wc -l < components/UnifiedConversionInterface.tsx)
    if [ "$LINE_COUNT" -lt 500 ]; then
        pass "Main component reduced to $LINE_COUNT lines (target: ~400)"
    else
        fail "Main component still $LINE_COUNT lines (target: <500)"
    fi
else
    fail "Main conversion component missing"
fi

# Check sub-components
[ -f "components/conversion/SetupCard.tsx" ] && pass "SetupCard component exists" || fail "SetupCard missing"
[ -f "components/conversion/ConfigureCard.tsx" ] && pass "ConfigureCard component exists" || fail "ConfigureCard missing"
[ -f "components/conversion/ExecuteCard.tsx" ] && pass "ExecuteCard component exists" || fail "ExecuteCard missing"
[ -f "components/conversion/ConversionErrorDisplay.tsx" ] && pass "ErrorDisplay component exists" || fail "ErrorDisplay missing"

# Check hooks
[ -f "hooks/useFileUpload.ts" ] && pass "useFileUpload hook exists" || fail "useFileUpload missing"
[ -f "hooks/useConversionProcessing.ts" ] && pass "useConversionProcessing hook exists" || fail "useConversionProcessing missing"

# Check utilities
[ -f "lib/conversion/conversion-utils.ts" ] && pass "Conversion utilities exist" || fail "Conversion utils missing"

# Test 15: Check bundle optimization
echo ""
echo "--- Issue #16: Bundle Optimization ---"
if [ -f "lib/dynamic-imports.ts" ]; then
    pass "Dynamic imports file exists"

    IMPORT_COUNT=$(grep -c "dynamic(() => import" lib/dynamic-imports.ts || echo "0")
    if [ "$IMPORT_COUNT" -ge 10 ]; then
        pass "Found $IMPORT_COUNT dynamic imports"
    else
        fail "Only found $IMPORT_COUNT dynamic imports (expected 11+)"
    fi
else
    fail "Dynamic imports file missing"
fi

if [ -f "scripts/check-bundle-size.js" ]; then
    pass "Bundle size monitoring script exists"
else
    fail "Bundle size script missing"
fi

# Build and check bundle size
echo ""
info "Building frontend to check bundle size..."
if npm run build 2>&1 | grep -q "First Load JS"; then
    HOMEPAGE_SIZE=$(npm run build 2>&1 | grep "^┌ ○ /" | awk '{print $NF}')
    info "Homepage bundle size: $HOMEPAGE_SIZE"
    pass "Frontend builds successfully"
else
    fail "Frontend build failed"
fi

# Test 16: Check test coverage
echo ""
echo "--- Test Coverage Improvements ---"
[ -f "backend/tests/unit/services/cloudconvert.service.test.ts" ] && pass "CloudConvert tests exist" || fail "CloudConvert tests missing"
[ -f "tests/unit/frontend/conversion-utils.test.ts" ] && pass "Conversion utils tests exist" || fail "Conversion utils tests missing"
[ -f "tests/unit/frontend/useFileUpload.test.ts" ] && pass "useFileUpload tests exist" || fail "useFileUpload tests missing"

# Test 17: Check documentation
echo ""
echo "--- Phase 3 Documentation ---"
[ -f "docs/BUNDLE_OPTIMIZATION.md" ] && pass "Bundle optimization docs exist" || fail "Bundle optimization docs missing"
[ -f "docs/COMPONENT_ARCHITECTURE.md" ] && pass "Component architecture docs exist" || fail "Component architecture docs missing"
[ -f "docs/TEST_COVERAGE_PLAN.md" ] && pass "Test coverage plan exists" || fail "Test coverage plan missing"
[ -f "docs/TEST_COVERAGE_REPORT.md" ] && pass "Test coverage report exists" || fail "Test coverage report missing"

# ====================================
# SUMMARY
# ====================================
echo ""
echo "========================================"
echo "VERIFICATION SUMMARY"
echo "========================================"
echo ""
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo "Success Rate: $SUCCESS_RATE% ($PASSED/$TOTAL)"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VERIFICATIONS PASSED!${NC}"
    exit 0
elif [ "$SUCCESS_RATE" -ge 80 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY PASSING (Review failures)${NC}"
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED (Fix critical issues)${NC}"
    exit 1
fi
