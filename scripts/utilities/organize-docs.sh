#!/bin/bash

# PDFLab Documentation Organization Script
# Purpose: Move documentation files from root to organized docs/ structure
# Date: 2025-11-06

# Ensure we're in project root
cd "C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab" || exit 1

# Create folder structure
mkdir -p docs/{architecture,api,deployment,testing,payment,admin,guides,archives}

echo "=== Moving Architecture Documentation ==="
[ -f "BACKGROUND_JOBS_ARCHITECTURE.md" ] && mv "BACKGROUND_JOBS_ARCHITECTURE.md" docs/architecture/
[ -f "STORAGE_ARCHITECTURE.md" ] && mv "STORAGE_ARCHITECTURE.md" docs/architecture/

echo "=== Moving API Documentation ==="
[ -f "API_DOCUMENTATION.md" ] && mv "API_DOCUMENTATION.md" docs/api/

echo "=== Moving Deployment Documentation ==="
[ -f "DEPLOYMENT_GUIDE.md" ] && mv "DEPLOYMENT_GUIDE.md" docs/deployment/
[ -f "VPS_DEPLOYMENT_GUIDE.md" ] && mv "VPS_DEPLOYMENT_GUIDE.md" docs/deployment/
[ -f "DOCKER_GUIDE.md" ] && mv "DOCKER_GUIDE.md" docs/deployment/
[ -f "DOCKER_RELIABILITY_GUIDE.md" ] && mv "DOCKER_RELIABILITY_GUIDE.md" docs/deployment/
[ -f "ENVIRONMENT_CONFIGURATION_GUIDE.md" ] && mv "ENVIRONMENT_CONFIGURATION_GUIDE.md" docs/deployment/
[ -f "ENVIRONMENT_VARIABLES_GUIDE.md" ] && mv "ENVIRONMENT_VARIABLES_GUIDE.md" docs/deployment/
[ -f "DEPLOY_TO_VPS.md" ] && mv "DEPLOY_TO_VPS.md" docs/deployment/
[ -f "DNS_CONFIGURATION_GUIDE.md" ] && mv "DNS_CONFIGURATION_GUIDE.md" docs/deployment/
[ -f "QUICK_DOMAIN_SETUP.md" ] && mv "QUICK_DOMAIN_SETUP.md" docs/deployment/
[ -f "VPS_UPDATE_GUIDE.md" ] && mv "VPS_UPDATE_GUIDE.md" docs/deployment/
[ -f "DEPLOYMENT_CHECKLIST.md" ] && mv "DEPLOYMENT_CHECKLIST.md" docs/deployment/

echo "=== Moving Testing Documentation ==="
[ -f "MANUAL_TEST_GUIDE.md" ] && mv "MANUAL_TEST_GUIDE.md" docs/testing/

echo "=== Moving Payment Documentation ==="
[ -f "PAYFAST_INTEGRATION_AUDIT.md" ] && mv "PAYFAST_INTEGRATION_AUDIT.md" docs/payment/
[ -f "PAYFAST_TESTING_GUIDE.md" ] && mv "PAYFAST_TESTING_GUIDE.md" docs/payment/
[ -f "PAYFAST_ITN_TESTING_GUIDE.md" ] && mv "PAYFAST_ITN_TESTING_GUIDE.md" docs/payment/
[ -f "PAYFAST_SIGNATURE_FIX.md" ] && mv "PAYFAST_SIGNATURE_FIX.md" docs/payment/
[ -f "PAYFAST_MULTICURRENCY_ANALYSIS.md" ] && mv "PAYFAST_MULTICURRENCY_ANALYSIS.md" docs/payment/
[ -f "PAYFAST_MULTICURRENCY_SETUP_PLAN.md" ] && mv "PAYFAST_MULTICURRENCY_SETUP_PLAN.md" docs/payment/
[ -f "CHECK_PAYFAST_DASHBOARD.md" ] && mv "CHECK_PAYFAST_DASHBOARD.md" docs/payment/

echo "=== Moving General Guides ==="
[ -f "MIGRATION_IMPLEMENTATION_GUIDE.md" ] && mv "MIGRATION_IMPLEMENTATION_GUIDE.md" docs/guides/
[ -f "MIGRATION_GUIDE.md" ] && mv "MIGRATION_GUIDE.md" docs/guides/
[ -f "QUOTA_CONFIGURATION_GUIDE.md" ] && mv "QUOTA_CONFIGURATION_GUIDE.md" docs/guides/
[ -f "USER_MANAGEMENT_CLARIFICATION.md" ] && mv "USER_MANAGEMENT_CLARIFICATION.md" docs/guides/

echo "=== Moving Historical/Archive Documentation ==="
# All "COMPLETE", "SUCCESS", "FIXED", "REPORT" files
mv *_COMPLETE.md docs/archives/ 2>/dev/null
mv *_SUCCESS*.md docs/archives/ 2>/dev/null
mv *_FIXED*.md docs/archives/ 2>/dev/null
mv *_REPORT.md docs/archives/ 2>/dev/null
mv *_SUMMARY.md docs/archives/ 2>/dev/null
mv *_STATUS.md docs/archives/ 2>/dev/null
mv *_IMPLEMENTATION.md docs/archives/ 2>/dev/null
mv *_IMPROVEMENTS.md docs/archives/ 2>/dev/null
mv *_VERIFICATION.md docs/archives/ 2>/dev/null
mv *_PROGRESS.md docs/archives/ 2>/dev/null
mv *_ISSUE*.md docs/archives/ 2>/dev/null
mv *_FIX*.md docs/archives/ 2>/dev/null
mv HIGH_LEVEL_TODO.md docs/archives/ 2>/dev/null
mv PROJECT_STATUS_AND_ROADMAP.md docs/ 2>/dev/null

echo "=== Moving to Current Docs ==="
# Admin panel docs that exist in docs/ already
[ -f "docs/ADMIN_PANEL_OVERVIEW.md" ] && mv "docs/ADMIN_PANEL_OVERVIEW.md" docs/admin/
[ -f "docs/ADMIN_PANEL_IMPLEMENTATION_AUDIT.md" ] && mv "docs/ADMIN_PANEL_IMPLEMENTATION_AUDIT.md" docs/admin/
[ -f "docs/ADMIN_PANEL_INTEGRATION_SUCCESS.md" ] && mv "docs/ADMIN_PANEL_INTEGRATION_SUCCESS.md" docs/admin/
[ -f "docs/ADMIN_PANEL_AUDIT_CORRECTION.md" ] && mv "docs/ADMIN_PANEL_AUDIT_CORRECTION.md" docs/admin/

# UX/Error docs
[ -f "docs/UX_ERROR_MESSAGE_AUDIT.md" ] && mv "docs/UX_ERROR_MESSAGE_AUDIT.md" docs/guides/
[ -f "docs/ERROR_MESSAGE_IMPLEMENTATION_REPORT.md" ] && mv "docs/ERROR_MESSAGE_IMPLEMENTATION_REPORT.md" docs/archives/

# Migration docs
[ -f "docs/COMPLETE_MIGRATION_GUIDE.md" ] && mv "docs/COMPLETE_MIGRATION_GUIDE.md" docs/guides/
[ -f "docs/MIGRATION_GUIDE.md" ] && mv "docs/MIGRATION_GUIDE.md" docs/guides/

# Deployment docs in docs/
[ -f "docs/VPS_DEPLOYMENT_GUIDE.md" ] && mv "docs/VPS_DEPLOYMENT_GUIDE.md" docs/deployment/
[ -f "docs/VPS_DEPLOYMENT_COMPLETE.md" ] && mv "docs/VPS_DEPLOYMENT_COMPLETE.md" docs/archives/
[ -f "docs/VPS_VERIFICATION_COMMANDS.md" ] && mv "docs/VPS_VERIFICATION_COMMANDS.md" docs/deployment/

# Stabilization docs
[ -f "docs/STABILIZATION_SPRINT_PROGRESS.md" ] && mv "docs/STABILIZATION_SPRINT_PROGRESS.md" docs/archives/

echo "=== Documentation Organization Complete ==="
echo "Remaining root files:"
ls -1 *.md 2>/dev/null | wc -l

echo ""
echo "Files in docs structure:"
find docs/ -name "*.md" -type f | wc -l
