#!/bin/bash
################################################################################
# PDFLab Pre-Deployment Test Execution
################################################################################
# Runs critical integration tests before deployment
#
# Usage: ./run-pre-deployment-tests.sh [production|staging|local]
################################################################################

set -e

ENV="${1:-local}"
TEST_API_URL=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Determine test config based on environment
case "$ENV" in
    staging)
        TEST_CONFIG="tests/e2e/playwright.config.staging.ts"
        TEST_API_URL="http://141.136.44.168:3007"
        ;;
    production|prod)
        TEST_CONFIG="tests/e2e/playwright.config.ts"
        TEST_API_URL="https://pdflab.pro"
        ;;
    local|localhost)
        TEST_CONFIG="tests/e2e/playwright.config.ts"
        TEST_API_URL="http://localhost:3006"
        ;;
    *)
        error "Invalid environment: $ENV"
        echo ""
        echo "Usage: $0 [production|staging|local]"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "PDFLab Pre-Deployment Tests"
echo "=========================================="
echo "Environment: $ENV"
echo "API URL: $TEST_API_URL"
echo "Test Config: $TEST_CONFIG"
echo "=========================================="
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    error "package.json not found - are you in the project root?"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    warn "node_modules not found - running npm install..."
    npm install
fi

################################################################################
# Test Execution
################################################################################

FAILED_TESTS=0

# P0 Critical Tests
echo ""
log "Running P0 (critical) tests..."
echo ""

if npm run test:p0 2>&1 | tee /tmp/pdflab-test-output.log; then
    echo ""
    info "✓ P0 tests passed"
else
    echo ""
    error "❌ P0 tests FAILED"
    FAILED_TESTS=$((FAILED_TESTS + 1))

    # Show failed test summary
    grep -A 5 "FAILED" /tmp/pdflab-test-output.log || true
    echo ""
    warn "Deployment BLOCKED - fix P0 failures before deploying"
    exit 2
fi

# Integration API Tests (P1)
echo ""
log "Running integration API tests..."
echo ""

if npm run test:integration:api 2>&1 | tee -a /tmp/pdflab-test-output.log; then
    echo ""
    info "✓ Integration tests passed"
else
    echo ""
    warn "⚠️  Integration tests FAILED"
    FAILED_TESTS=$((FAILED_TESTS + 1))

    # Show failed test summary
    grep -A 5 "FAILED" /tmp/pdflab-test-output.log || true
    echo ""
    warn "Consider reviewing failures before deploying"
fi

################################################################################
# Test Summary
################################################################################

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "Deployment is approved"
    echo ""
    exit 0
elif [ $FAILED_TESTS -eq 1 ] && grep -q "Integration tests FAILED" /tmp/pdflab-test-output.log; then
    echo -e "${YELLOW}⚠ DEPLOYMENT ALLOWED WITH WARNINGS${NC}"
    echo ""
    echo "P0 tests passed, but integration tests failed"
    echo "Review failures and proceed with caution"
    echo ""
    exit 1
else
    echo -e "${RED}❌ DEPLOYMENT BLOCKED${NC}"
    echo ""
    echo "P0 critical tests failed"
    echo "Fix all failures before deploying"
    echo ""
    exit 2
fi
