#!/bin/bash

# Deploy E2E Test Configuration to Production
# This script deploys environment-aware E2E test updates to production

set -e  # Exit on error

PROD_IP="141.136.44.168"
PROD_USER="root"
PROD_APP_DIR="/var/pdflab/app"

echo "🧪 Deploying E2E Test Configuration to Production"
echo "=================================================="
echo ""
echo "📍 Target: $PROD_USER@$PROD_IP:$PROD_APP_DIR"
echo "📦 Changes:"
echo "  - Staging config for environment-aware tests"
echo "  - Updated partner E2E flow with TEST_ENV support"
echo ""

# Step 1: Create test config directory if it doesn't exist
echo "📁 Step 1: Ensuring test directories exist..."
ssh $PROD_USER@$PROD_IP "mkdir -p $PROD_APP_DIR/tests/config"
ssh $PROD_USER@$PROD_IP "mkdir -p $PROD_APP_DIR/e2e"
echo "✅ Directories created"
echo ""

# Step 2: Upload staging config
echo "📤 Step 2: Uploading staging config..."
scp tests/config/staging.config.ts $PROD_USER@$PROD_IP:$PROD_APP_DIR/tests/config/staging.config.ts
echo "✅ staging.config.ts uploaded"
echo ""

# Step 3: Upload updated E2E test
echo "📤 Step 3: Uploading partner E2E flow test..."
scp e2e/partner-e2e-flow.spec.ts $PROD_USER@$PROD_IP:$PROD_APP_DIR/e2e/partner-e2e-flow.spec.ts
echo "✅ partner-e2e-flow.spec.ts uploaded"
echo ""

# Step 4: Create production test config
echo "📝 Step 4: Creating production test config..."
ssh $PROD_USER@$PROD_IP "cat > $PROD_APP_DIR/tests/config/production.config.ts << 'EOF'
export const productionConfig = {
  // Main App
  mainAppUrl: 'https://pdflab.pro',

  // Partner Portal
  partnerPortalUrl: 'https://partners.pdflab.pro',

  // Backend API
  apiUrl: 'https://api.pdflab.pro',

  // Test User Credentials
  testUsers: {
    regular: {
      email: 'test.production@pdflab.pro',
      password: 'ProductionTest123!',
    },
    admin: {
      email: 'admin@pdflab.pro',
      password: 'Admin123!',
    },
    partner: {
      email: 'partner.production@pdflab.pro',
      password: 'PartnerProduction123!',
      partnerCode: 'PRODUCTION-PARTNER-001',
    },
  },

  // PayFast (Live Mode)
  payfast: {
    mode: 'live',
    merchantId: '25263515',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
  },

  // Feature Flags
  features: {
    batchProcessing: true,
    partnerPortal: true,
    betaUsers: true,
    feedback: true,
  },

  // Timeouts (standard for production)
  timeouts: {
    pageLoad: 15000,
    apiRequest: 10000,
    fileUpload: 45000,
    fileDownload: 45000,
  },
}
EOF"
echo "✅ production.config.ts created"
echo ""

# Step 5: Update staging config with helper function
echo "📝 Step 5: Updating staging config helper..."
ssh $PROD_USER@$PROD_IP "cat >> $PROD_APP_DIR/tests/config/staging.config.ts << 'EOF'

// Helper to get the right config based on environment
export function getTestConfig() {
  const env = process.env.TEST_ENV || 'local'

  if (env === 'staging') {
    return stagingConfig
  }

  if (env === 'production') {
    const { productionConfig } = require('./production.config')
    return productionConfig
  }

  // Local config (default)
  return {
    mainAppUrl: 'http://localhost:3000',
    partnerPortalUrl: 'http://localhost:3001',
    apiUrl: 'http://localhost:3006',
    testUsers: {
      regular: {
        email: 'test@pdflab.pro',
        password: 'TestPass123!',
      },
      admin: {
        email: 'admin@pdflab.pro',
        password: 'AdminPass123!',
      },
      partner: {
        email: 'partner@pdflab.pro',
        password: 'PartnerPass123!',
        partnerCode: 'LOCAL-PARTNER-001',
      },
    },
    payfast: {
      mode: 'sandbox',
      merchantId: '10000100',
      merchantKey: '46f0cd694581a',
    },
    features: {
      batchProcessing: true,
      partnerPortal: true,
      betaUsers: true,
      feedback: true,
    },
    timeouts: {
      pageLoad: 10000,
      apiRequest: 5000,
      fileUpload: 30000,
      fileDownload: 30000,
    },
  }
}
EOF"
echo "✅ Config helper updated"
echo ""

# Step 6: Set proper permissions
echo "🔒 Step 6: Setting permissions..."
ssh $PROD_USER@$PROD_IP "chmod 644 $PROD_APP_DIR/tests/config/*.ts"
ssh $PROD_USER@$PROD_IP "chmod 644 $PROD_APP_DIR/e2e/*.spec.ts"
echo "✅ Permissions set"
echo ""

echo "========================================="
echo "✅ E2E Test Configuration Deployed!"
echo "========================================="
echo ""
echo "📋 Files deployed:"
echo "  - tests/config/staging.config.ts"
echo "  - tests/config/production.config.ts"
echo "  - e2e/partner-e2e-flow.spec.ts"
echo ""
echo "🧪 Usage:"
echo "  # Test against staging"
echo "  TEST_ENV=staging npx playwright test e2e/partner-e2e-flow.spec.ts"
echo ""
echo "  # Test against production"
echo "  TEST_ENV=production npx playwright test e2e/partner-e2e-flow.spec.ts"
echo ""
echo "  # Test locally (default)"
echo "  npx playwright test e2e/partner-e2e-flow.spec.ts"
echo ""
echo "Next: Run 'bash verify-prod-deployment.sh' to verify deployment"
