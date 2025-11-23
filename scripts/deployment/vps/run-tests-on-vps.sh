#!/bin/bash

##
# Run Tests ON VPS Staging Environment
# This script runs tests on the same server where staging is deployed
#
# Usage: Run this script after SSH'ing into the VPS
# ssh root@141.136.44.168
# cd /var/pdflab-staging/app
# bash run-tests-on-vps.sh
##

echo "🧪 PDFLab Staging Tests - Running ON VPS"
echo "=========================================="
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from /var/pdflab-staging/app/"
    exit 1
fi

# Check Docker containers are running
echo "📦 Checking staging containers..."
CONTAINERS=$(docker ps --filter 'name=staging' --format '{{.Names}}' | wc -l)
if [ "$CONTAINERS" -lt 4 ]; then
    echo "⚠️  Warning: Expected 5 staging containers, found $CONTAINERS"
    echo "   Starting staging services..."
    cd deployment/staging
    docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
    cd ../..
    sleep 10
fi

echo "✅ Staging containers running"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

# Install Playwright browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    echo "🌐 Installing Playwright browsers..."
    npx playwright install chromium
    echo "✅ Playwright browsers installed"
    echo ""
else
    echo "✅ Playwright browsers already installed"
    echo ""
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
HEALTH=$(curl -s http://localhost:3007/health)
if echo "$HEALTH" | grep -q "OK"; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "   Response: $HEALTH"
    exit 1
fi

# Test frontend
echo "🔍 Testing frontend..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$FRONTEND" = "200" ]; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend check failed (HTTP $FRONTEND)"
    exit 1
fi

echo ""
echo "=========================================="
echo "🚀 Running Tests"
echo "=========================================="
echo ""

# Run integration tests first (faster, no browser)
echo "📝 Running VPS integration tests..."
npm run test:vps:integration 2>&1 | tee test-integration-output.log

INTEGRATION_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "=========================================="

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Integration tests PASSED"
    echo ""

    # Ask if user wants to run E2E tests
    echo "📝 Run E2E tests? (y/n)"
    read -r RUN_E2E

    if [ "$RUN_E2E" = "y" ] || [ "$RUN_E2E" = "Y" ]; then
        echo ""
        echo "🌐 Running VPS E2E tests..."
        npm run test:vps:e2e 2>&1 | tee test-e2e-output.log

        E2E_EXIT_CODE=${PIPESTATUS[0]}

        echo ""
        echo "=========================================="

        if [ $E2E_EXIT_CODE -eq 0 ]; then
            echo "✅ E2E tests PASSED"
        else
            echo "❌ E2E tests FAILED"
            echo "   Check test-e2e-output.log for details"
        fi
    fi
else
    echo "❌ Integration tests FAILED"
    echo "   Check test-integration-output.log for details"
    echo "   Skipping E2E tests"
fi

echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "Integration tests: $([ $INTEGRATION_EXIT_CODE -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo ""
echo "Logs saved to:"
echo "  - test-integration-output.log"
if [ -f "test-e2e-output.log" ]; then
    echo "  - test-e2e-output.log"
fi
echo ""
echo "To view HTML report:"
echo "  npx playwright show-report"
echo ""
