#!/bin/bash

###############################################################################
# Master Deployment Script - All Phases
#
# Interactive deployment orchestrator for PDFLab transformation phases
# Supports both staging and production deployments
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# ============================================================================
# Main Menu
# ============================================================================

show_main_menu() {
    clear
    print_header "PDFLab Transformation - Master Deployment"

    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}                   DEPLOYMENT OPTIONS                           ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Phase Deployments:"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  1) Phase 2: Database Scaling (4-6 hours)"
    echo "  2) Phase 3: Frontend Optimization (2-3 hours)"
    echo "  3) Phase 4: Advanced Monitoring - Staging (1-2 hours)"
    echo "  4) Phase 4: Advanced Monitoring - Production (30-45 min)"
    echo ""
    echo "  Complete Workflows:"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  5) Deploy Phases 2 + 3 (Full optimization)"
    echo "  6) Deploy All Phases to Staging (Test everything)"
    echo "  7) Deploy All Phases to Production (Complete deployment)"
    echo ""
    echo "  Information:"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  8) View deployment status"
    echo "  9) View rollback instructions"
    echo "  0) Exit"
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    read -p "Select option (0-9): " choice

    case $choice in
        1) deploy_phase2 ;;
        2) deploy_phase3 ;;
        3) deploy_phase4_staging ;;
        4) deploy_phase4_production ;;
        5) deploy_phases_2_3 ;;
        6) deploy_all_staging ;;
        7) deploy_all_production ;;
        8) view_deployment_status ;;
        9) view_rollback_instructions ;;
        0) exit 0 ;;
        *)
            print_error "Invalid option"
            sleep 2
            show_main_menu
            ;;
    esac
}

# ============================================================================
# Individual Phase Deployments
# ============================================================================

deploy_phase2() {
    print_header "Phase 2: Database Scaling Deployment"

    echo "This will deploy:"
    echo "  - Optimized database queries"
    echo "  - Read replica configuration"
    echo "  - Redis caching layer"
    echo ""
    echo "Estimated time: 4-6 hours"
    echo "Downtime: ~5 minutes (backend restart)"
    echo ""

    read -p "Continue with Phase 2 deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    if [ -f "${SCRIPT_DIR}/deploy-phase2-database-scaling.sh" ]; then
        bash "${SCRIPT_DIR}/deploy-phase2-database-scaling.sh"
    else
        print_error "Phase 2 deployment script not found!"
        print_info "Expected: ${SCRIPT_DIR}/deploy-phase2-database-scaling.sh"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

deploy_phase3() {
    print_header "Phase 3: Frontend Optimization Deployment"

    echo "This will deploy:"
    echo "  - Refactored components"
    echo "  - Bundle size optimization"
    echo "  - Code splitting"
    echo ""
    echo "Estimated time: 2-3 hours"
    echo "Downtime: ~1 minute (frontend restart)"
    echo ""

    read -p "Continue with Phase 3 deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    if [ -f "${SCRIPT_DIR}/deploy-phase3-frontend-optimization.sh" ]; then
        bash "${SCRIPT_DIR}/deploy-phase3-frontend-optimization.sh"
    else
        print_error "Phase 3 deployment script not found!"
        print_info "Expected: ${SCRIPT_DIR}/deploy-phase3-frontend-optimization.sh"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

deploy_phase4_staging() {
    print_header "Phase 4: Advanced Monitoring - Staging"

    echo "This will deploy to STAGING:"
    echo "  - Backend metrics modules"
    echo "  - Prometheus (port 9091)"
    echo "  - Custom dashboard"
    echo "  - Alert rules"
    echo ""
    echo "Staging URLs:"
    echo "  - Frontend: http://141.136.44.168:3001"
    echo "  - Prometheus: http://141.136.44.168:9091"
    echo ""
    echo "Estimated time: 1-2 hours"
    echo ""

    read -p "Continue with Phase 4 staging deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    if [ -f "${SCRIPT_DIR}/deploy-phase4-to-staging.sh" ]; then
        bash "${SCRIPT_DIR}/deploy-phase4-to-staging.sh"
    else
        print_error "Phase 4 staging deployment script not found!"
        print_info "Expected: ${SCRIPT_DIR}/deploy-phase4-to-staging.sh"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

deploy_phase4_production() {
    print_header "Phase 4: Advanced Monitoring - Production"

    echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION${NC}"
    echo ""
    echo "Prerequisites:"
    echo "  ✓ Phase 4 tested in staging for 24-48 hours"
    echo "  ✓ All metrics collecting properly"
    echo "  ✓ Dashboard components working"
    echo "  ✓ No errors in staging logs"
    echo ""
    echo "Estimated time: 30-45 minutes"
    echo "Downtime: ~30 seconds (backend restart)"
    echo ""

    read -p "Have you tested in staging for 24-48 hours? (yes/no): " staging_confirm
    if [ "$staging_confirm" != "yes" ]; then
        print_error "Please test in staging first!"
        sleep 3
        show_main_menu
        return
    fi

    read -p "Continue with Phase 4 PRODUCTION deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    if [ -f "${SCRIPT_DIR}/deploy-phase4-to-production.sh" ]; then
        bash "${SCRIPT_DIR}/deploy-phase4-to-production.sh"
    else
        print_error "Phase 4 production deployment script not found!"
        print_info "Expected: ${SCRIPT_DIR}/deploy-phase4-to-production.sh"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

# ============================================================================
# Combined Deployments
# ============================================================================

deploy_phases_2_3() {
    print_header "Deploy Phases 2 + 3 (Full Optimization)"

    echo "This will deploy:"
    echo "  1. Phase 2: Database Scaling (4-6 hours)"
    echo "  2. Phase 3: Frontend Optimization (2-3 hours)"
    echo ""
    echo "Total estimated time: 6-9 hours"
    echo "Recommended: Deploy Phase 2, monitor for 24h, then deploy Phase 3"
    echo ""

    read -p "Deploy both phases now? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    # Deploy Phase 2
    print_info "Starting Phase 2 deployment..."
    deploy_phase2

    # Wait and confirm before Phase 3
    echo ""
    print_warning "Phase 2 deployment complete!"
    echo ""
    echo "Recommended: Monitor Phase 2 for 24 hours before deploying Phase 3"
    read -p "Deploy Phase 3 now? (yes/no): " confirm_phase3

    if [ "$confirm_phase3" == "yes" ]; then
        print_info "Starting Phase 3 deployment..."
        deploy_phase3
    else
        print_info "Phase 3 deployment skipped"
        print_info "Run this script again and select option 2 to deploy Phase 3 later"
    fi

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

deploy_all_staging() {
    print_header "Deploy All Phases to Staging"

    echo "This will deploy to STAGING:"
    echo "  1. Phase 2: Database Scaling"
    echo "  2. Phase 3: Frontend Optimization"
    echo "  3. Phase 4: Advanced Monitoring"
    echo ""
    echo "Staging environment: http://141.136.44.168:3001"
    echo ""
    echo "This is recommended for testing before production deployment"
    echo ""

    read -p "Deploy all phases to staging? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    print_error "Note: Phases 2 & 3 don't have separate staging scripts"
    print_info "You can test Phase 4 in staging, then deploy all to production"
    echo ""

    deploy_phase4_staging

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

deploy_all_production() {
    print_header "Deploy All Phases to Production"

    echo -e "${RED}⚠️  WARNING: This will deploy ALL phases to PRODUCTION${NC}"
    echo ""
    echo "This will deploy:"
    echo "  1. Phase 2: Database Scaling (4-6 hours)"
    echo "  2. Phase 3: Frontend Optimization (2-3 hours)"
    echo "  3. Phase 4: Advanced Monitoring (30-45 min)"
    echo ""
    echo "Total estimated time: 7-10 hours"
    echo ""
    echo "Prerequisites:"
    echo "  ✓ All phases tested individually"
    echo "  ✓ Phase 4 tested in staging for 24-48 hours"
    echo "  ✓ Rollback plan reviewed"
    echo "  ✓ Downtime window scheduled"
    echo ""

    read -p "Have all phases been tested? (yes/no): " test_confirm
    if [ "$test_confirm" != "yes" ]; then
        print_error "Please test all phases before production deployment!"
        sleep 3
        show_main_menu
        return
    fi

    read -p "Continue with FULL PRODUCTION deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Deployment cancelled"
        sleep 2
        show_main_menu
        return
    fi

    # Deploy Phase 2
    print_info "Starting Phase 2 deployment..."
    deploy_phase2

    # Wait between phases
    echo ""
    print_warning "Phase 2 complete! Recommended: Monitor for 24 hours"
    read -p "Continue to Phase 3? (yes/no): " continue_phase3

    if [ "$continue_phase3" == "yes" ]; then
        deploy_phase3
    else
        print_info "Stopping after Phase 2. Run script again to deploy remaining phases."
        echo ""
        read -p "Press Enter to return to menu..."
        show_main_menu
        return
    fi

    # Wait before Phase 4
    echo ""
    print_warning "Phase 3 complete! Recommended: Monitor for 24 hours"
    read -p "Continue to Phase 4? (yes/no): " continue_phase4

    if [ "$continue_phase4" == "yes" ]; then
        deploy_phase4_production
    else
        print_info "Stopping after Phase 3. Run script again to deploy Phase 4."
    fi

    echo ""
    print_success "All requested phases deployed!"
    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

# ============================================================================
# Information Views
# ============================================================================

view_deployment_status() {
    print_header "Deployment Status"

    echo "Checking production deployment status..."
    echo ""

    # Check via SSH
    ssh root@141.136.44.168 << 'ENDSSH'
        echo "Backend Containers:"
        docker ps | grep pdflab-backend || echo "  Backend not running"

        echo ""
        echo "Frontend Containers:"
        docker ps | grep pdflab-frontend || echo "  Frontend not running"

        echo ""
        echo "Monitoring:"
        docker ps | grep prometheus || echo "  Prometheus not running"

        echo ""
        echo "Database:"
        docker ps | grep mysql || echo "  MySQL not running"

        echo ""
        echo "Redis:"
        docker ps | grep redis || echo "  Redis not running"

        echo ""
        echo "Phase 4 Metrics:"
        if curl -s http://localhost:3006/metrics | grep -q "pdflab_"; then
            echo "  ✓ Phase 4 metrics active"
        else
            echo "  ✗ Phase 4 metrics not found"
        fi

        echo ""
        echo "Recent Backend Logs (last 10 lines):"
        docker logs pdflab-backend-prod --tail 10 2>/dev/null || echo "  Cannot access logs"
ENDSSH

    echo ""
    echo "Online Status:"
    echo "  Production: https://pdflab.pro"
    echo "  Staging: http://141.136.44.168:3001"
    echo ""

    read -p "Press Enter to return to menu..."
    show_main_menu
}

view_rollback_instructions() {
    print_header "Rollback Instructions"

    cat << 'EOF'
═══════════════════════════════════════════════════════════════
                     ROLLBACK PROCEDURES
═══════════════════════════════════════════════════════════════

Phase 2 Rollback (Database Scaling):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ssh root@141.136.44.168
  cd /var/pdflab/app

  # Remove read replica config
  nano .env.production
  # Remove: DB_READ_HOST_1, DB_READ_HOST_2

  # Restart backend
  docker-compose -f docker-compose.production.yml restart backend

  # Monitor for 1 hour


Phase 3 Rollback (Frontend Optimization):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ssh root@141.136.44.168
  cd /var/pdflab/app

  # Restore from backup (find latest backup)
  ls -lt /var/pdflab/backups/ | head -5
  BACKUP_DIR="/var/pdflab/backups/phase3-YYYYMMDD-HHMMSS"

  # Restore files
  rm -rf .next components lib
  cp -r $BACKUP_DIR/.next-backup .next
  cp -r $BACKUP_DIR/components-backup components

  # Restart frontend
  docker-compose -f docker-compose.production.yml restart frontend

  # Clear CDN cache (if using CDN)


Phase 4 Rollback (Advanced Monitoring):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ssh root@141.136.44.168
  cd /var/pdflab/app

  # Remove metrics modules
  rm -rf backend/src/metrics

  # Remove initializeMetrics from server.ts
  nano backend/src/server.ts
  # Comment out or remove initializeMetrics() calls

  # Restart backend
  docker-compose -f docker-compose.production.yml restart backend

  # Remove Prometheus scrape config (optional)
  nano /etc/prometheus/prometheus.yml
  # Remove pdflab-backend job

  # Reload Prometheus
  docker exec prometheus kill -HUP 1


Complete Rollback (All Phases):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ssh root@141.136.44.168
  cd /var/pdflab/app

  # Checkout previous version
  git log --oneline -10
  git checkout <commit-hash-before-phases>

  # Restart all services
  docker-compose -f docker-compose.production.yml down
  docker-compose -f docker-compose.production.yml up -d

  # Monitor for 30 minutes


Emergency Contacts:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VPS Host: root@141.136.44.168
  Database: pdflab-mysql-prod
  Backend: pdflab-backend-prod
  Frontend: pdflab-frontend-prod

  Health Check: https://pdflab.pro/api/health
  Prometheus: http://141.136.44.168:9090
  Logs: docker logs pdflab-backend-prod

═══════════════════════════════════════════════════════════════
EOF

    echo ""
    read -p "Press Enter to return to menu..."
    show_main_menu
}

# ============================================================================
# Start the script
# ============================================================================

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "components" ]; then
    print_error "Please run this script from the PDFLab root directory"
    exit 1
fi

# Show main menu
show_main_menu
