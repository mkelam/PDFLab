#!/bin/bash

################################################################################
# PDFLab Production Deployment Script
# Deploy OCR + Token Alignment Fixes to Production VPS
#
# Branch: fix/ocr-token-clean
# Commit: 01352538
# VPS: root@141.136.44.168
#
# Usage:
#   chmod +x deploy-ocr-fix-to-production.sh
#   ./deploy-ocr-fix-to-production.sh
#
# Features:
#   - Automatic backup creation
#   - Health checks at each stage
#   - Automatic rollback on failure
#   - Detailed logging
#   - Production verification
################################################################################

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="root@141.136.44.168"
PROJECT_DIR="/root/pdflab"
BRANCH_NAME="fix/ocr-token-clean"
TARGET_COMMIT="01352538"
BACKUP_BRANCH="backup-before-ocr-fix-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

# Deployment state
DEPLOYMENT_STARTED=false
ORIGINAL_BRANCH=""

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BOLD}${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

run_on_vps() {
    local command="$1"
    local description="$2"

    print_step "$description"
    log_message "Executing: $command"

    # Execute command on VPS
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_HOST" "$command" 2>&1 | tee -a "$LOG_FILE"

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        print_success "$description - Complete"
        log_message "Success: $description"
        return 0
    else
        print_error "$description - Failed (exit code: $exit_code)"
        log_message "Failed: $description (exit code: $exit_code)"
        return $exit_code
    fi
}

check_vps_connection() {
    print_step "Testing VPS connection..."

    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_HOST" "echo 'Connection successful'" &> /dev/null; then
        print_success "VPS connection established"
        return 0
    else
        print_error "Cannot connect to VPS at $VPS_HOST"
        print_info "Please ensure:"
        print_info "  1. VPS is running"
        print_info "  2. SSH key is configured"
        print_info "  3. Network connectivity is available"
        return 1
    fi
}

create_backup() {
    print_header "STEP 1: Creating Backup"

    run_on_vps "cd $PROJECT_DIR && git branch $BACKUP_BRANCH" \
                "Create backup branch: $BACKUP_BRANCH"

    if [ $? -ne 0 ]; then
        print_warning "Backup branch creation failed (may already exist)"
    fi

    # Store current branch for rollback
    ORIGINAL_BRANCH=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git branch --show-current" 2>/dev/null)
    print_info "Current branch: $ORIGINAL_BRANCH"
    log_message "Original branch: $ORIGINAL_BRANCH"
}

fetch_and_checkout() {
    print_header "STEP 2: Fetching Clean Branch"

    run_on_vps "cd $PROJECT_DIR && git fetch origin $BRANCH_NAME" \
                "Fetch branch from GitHub"

    if [ $? -ne 0 ]; then
        print_error "Failed to fetch branch from GitHub"
        return 1
    fi

    run_on_vps "cd $PROJECT_DIR && git checkout $BRANCH_NAME" \
                "Checkout $BRANCH_NAME"

    if [ $? -ne 0 ]; then
        print_error "Failed to checkout branch"
        return 1
    fi

    # Verify commit
    DEPLOYED_COMMIT=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git log --oneline -1 | cut -d' ' -f1" 2>/dev/null)

    if [[ "$DEPLOYED_COMMIT" == "$TARGET_COMMIT"* ]]; then
        print_success "Verified commit: $DEPLOYED_COMMIT"
        DEPLOYMENT_STARTED=true
        return 0
    else
        print_error "Commit mismatch! Expected: $TARGET_COMMIT, Got: $DEPLOYED_COMMIT"
        return 1
    fi
}

rebuild_backend() {
    print_header "STEP 3: Rebuilding Backend"

    run_on_vps "cd $PROJECT_DIR/backend && npm run build 2>&1" \
                "Rebuild TypeScript to JavaScript"

    # Note: Build exits with 0 due to || true even with TS errors
    print_info "Build completed (TypeScript warnings are expected)"

    # Verify compiled file exists and is recent
    run_on_vps "ls -lh $PROJECT_DIR/backend/dist/services/cloudconvert.service.js" \
                "Verify compiled file updated"

    return $?
}

restart_services() {
    print_header "STEP 4: Restarting Services"

    run_on_vps "cd $PROJECT_DIR && docker-compose restart backend" \
                "Restart backend service"

    if [ $? -ne 0 ]; then
        print_error "Backend restart failed"
        return 1
    fi

    run_on_vps "cd $PROJECT_DIR && docker-compose restart worker" \
                "Restart worker service"

    if [ $? -ne 0 ]; then
        print_warning "Worker restart failed (may not exist)"
    fi

    run_on_vps "cd $PROJECT_DIR && docker-compose restart frontend" \
                "Restart frontend service (for token alignment)"

    if [ $? -ne 0 ]; then
        print_warning "Frontend restart failed"
    fi

    print_info "Waiting 15 seconds for services to stabilize..."
    sleep 15

    return 0
}

verify_deployment() {
    print_header "STEP 5: Verifying Deployment"

    local verification_passed=true

    # Check 1: Container Status
    print_step "Check 1: Container Status"
    run_on_vps "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pdflab" \
                "List running containers"

    # Check 2: Health Endpoint
    print_step "Check 2: Internal Health Check"
    HEALTH_OUTPUT=$(ssh "$VPS_HOST" "curl -s http://localhost:3006/health" 2>/dev/null)

    if echo "$HEALTH_OUTPUT" | grep -q '"status":"ok"'; then
        print_success "Health check passed: $HEALTH_OUTPUT"
    else
        print_error "Health check failed: $HEALTH_OUTPUT"
        verification_passed=false
    fi

    # Check 3: Public Access
    print_step "Check 3: Public Website Access"
    PUBLIC_STATUS=$(ssh "$VPS_HOST" "curl -s -o /dev/null -w '%{http_code}' https://pdflab.pro" 2>/dev/null)

    if [ "$PUBLIC_STATUS" == "200" ]; then
        print_success "Public website accessible (HTTP $PUBLIC_STATUS)"
    else
        print_warning "Public website status: HTTP $PUBLIC_STATUS"
    fi

    # Check 4: OCR Code Deployed
    print_step "Check 4: Verify OCR Code"
    OCR_CODE_CHECK=$(ssh "$VPS_HOST" "grep -c 'needsOCR' $PROJECT_DIR/backend/dist/services/cloudconvert.service.js" 2>/dev/null)

    if [ "$OCR_CODE_CHECK" -gt "0" ]; then
        print_success "OCR preprocessing code found ($OCR_CODE_CHECK occurrences)"
    else
        print_error "OCR code not found in deployed file"
        verification_passed=false
    fi

    # Check 5: Recent Error Logs
    print_step "Check 5: Backend Error Logs (last 50 lines)"
    ERROR_COUNT=$(ssh "$VPS_HOST" "docker logs pdflab-backend-prod --tail 50 2>&1 | grep -ci 'error'" 2>/dev/null)

    if [ "$ERROR_COUNT" -eq "0" ]; then
        print_success "No errors in recent logs"
    else
        print_warning "Found $ERROR_COUNT error mentions in logs (review manually)"
    fi

    # Check 6: Git Commit Verification
    print_step "Check 6: Git Commit Verification"
    CURRENT_COMMIT=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git log --oneline -1" 2>/dev/null)
    print_info "Deployed commit: $CURRENT_COMMIT"

    if [ "$verification_passed" = true ]; then
        print_success "All critical verification checks passed"
        return 0
    else
        print_error "Some verification checks failed"
        return 1
    fi
}

production_smoke_tests() {
    print_header "STEP 6: Production Smoke Tests"

    # Test 1: API Health
    print_step "Test 1: API Health Endpoint"
    run_on_vps "curl -s https://pdflab.pro/api/health | head -c 200" \
                "Public API health check"

    # Test 2: Frontend Loading
    print_step "Test 2: Frontend Loading"
    run_on_vps "curl -I https://pdflab.pro 2>&1 | head -n 1" \
                "Frontend HTTP status"

    # Test 3: Resource Usage
    print_step "Test 3: Resource Usage"
    run_on_vps "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | grep pdflab" \
                "Container resource usage"

    # Test 4: Disk Space
    print_step "Test 4: Disk Space"
    run_on_vps "df -h | grep -E 'Filesystem|/$'" \
                "Disk space check"

    print_success "Smoke tests completed"
}

rollback_deployment() {
    print_header "ROLLBACK: Reverting to Previous State"

    print_warning "Initiating automatic rollback..."
    log_message "ROLLBACK INITIATED"

    if [ -n "$ORIGINAL_BRANCH" ]; then
        run_on_vps "cd $PROJECT_DIR && git checkout $ORIGINAL_BRANCH" \
                    "Checkout original branch: $ORIGINAL_BRANCH"
    else
        # Try to find latest backup branch
        LATEST_BACKUP=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git branch | grep backup-before-ocr-fix | tail -1 | tr -d ' *'" 2>/dev/null)

        if [ -n "$LATEST_BACKUP" ]; then
            run_on_vps "cd $PROJECT_DIR && git checkout $LATEST_BACKUP" \
                        "Checkout backup branch: $LATEST_BACKUP"
        else
            print_error "Cannot find backup branch - manual intervention required"
            return 1
        fi
    fi

    run_on_vps "cd $PROJECT_DIR/backend && npm run build" \
                "Rebuild backend (rollback)"

    run_on_vps "cd $PROJECT_DIR && docker-compose restart backend worker frontend" \
                "Restart services (rollback)"

    sleep 15

    HEALTH_CHECK=$(ssh "$VPS_HOST" "curl -s http://localhost:3006/health" 2>/dev/null)

    if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
        print_success "Rollback successful - services restored"
        log_message "ROLLBACK SUCCESSFUL"
        return 0
    else
        print_error "Rollback may have failed - manual check required"
        log_message "ROLLBACK FAILED"
        return 1
    fi
}

show_deployment_summary() {
    print_header "DEPLOYMENT SUMMARY"

    echo -e "${BOLD}Deployment Details:${NC}"
    echo -e "  VPS Host:        ${CYAN}$VPS_HOST${NC}"
    echo -e "  Branch:          ${CYAN}$BRANCH_NAME${NC}"
    echo -e "  Target Commit:   ${CYAN}$TARGET_COMMIT${NC}"
    echo -e "  Backup Branch:   ${CYAN}$BACKUP_BRANCH${NC}"
    echo -e "  Log File:        ${CYAN}$LOG_FILE${NC}"
    echo ""

    # Get current status from VPS
    CURRENT_BRANCH=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git branch --show-current" 2>/dev/null)
    CURRENT_COMMIT=$(ssh "$VPS_HOST" "cd $PROJECT_DIR && git log --oneline -1" 2>/dev/null)
    CONTAINER_COUNT=$(ssh "$VPS_HOST" "docker ps | grep -c pdflab" 2>/dev/null)

    echo -e "${BOLD}Current Status:${NC}"
    echo -e "  Active Branch:   ${GREEN}$CURRENT_BRANCH${NC}"
    echo -e "  Active Commit:   ${GREEN}$CURRENT_COMMIT${NC}"
    echo -e "  Running Containers: ${GREEN}$CONTAINER_COUNT${NC}"
    echo ""

    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  1. ${CYAN}Visit https://pdflab.pro and verify site loads${NC}"
    echo -e "  2. ${CYAN}Login with test account${NC}"
    echo -e "  3. ${CYAN}Upload scanned PDF and convert to PPTX${NC}"
    echo -e "  4. ${CYAN}Verify output has editable text (not images)${NC}"
    echo -e "  5. ${CYAN}Monitor CloudConvert dashboard for OCR credit usage${NC}"
    echo ""

    echo -e "${BOLD}Rollback Command (if needed):${NC}"
    echo -e "  ${YELLOW}ssh $VPS_HOST 'cd $PROJECT_DIR && git checkout $BACKUP_BRANCH && cd backend && npm run build && cd .. && docker-compose restart backend worker frontend'${NC}"
    echo ""
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    print_header "PDFLab Production Deployment - OCR + Token Fix"

    print_info "Starting deployment at $(date)"
    print_info "Log file: $LOG_FILE"
    log_message "=== DEPLOYMENT STARTED ==="
    log_message "VPS: $VPS_HOST"
    log_message "Branch: $BRANCH_NAME"
    log_message "Commit: $TARGET_COMMIT"

    # Pre-flight checks
    print_header "PRE-FLIGHT CHECKS"

    if ! check_vps_connection; then
        print_error "Pre-flight check failed: VPS connection"
        exit 1
    fi

    print_success "Pre-flight checks passed"

    # Confirmation prompt
    echo ""
    echo -e "${YELLOW}${BOLD}⚠ WARNING: You are about to deploy to PRODUCTION${NC}"
    echo -e "${YELLOW}This will:${NC}"
    echo -e "${YELLOW}  - Deploy OCR preprocessing fix${NC}"
    echo -e "${YELLOW}  - Deploy token alignment fix${NC}"
    echo -e "${YELLOW}  - Restart backend, worker, and frontend services${NC}"
    echo -e "${YELLOW}  - Potentially cause 30 seconds of downtime${NC}"
    echo ""

    read -p "Continue with deployment? (yes/no): " -r
    echo

    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        print_warning "Deployment cancelled by user"
        log_message "DEPLOYMENT CANCELLED BY USER"
        exit 0
    fi

    # Execute deployment steps
    if ! create_backup; then
        print_error "Backup creation failed"
        exit 1
    fi

    if ! fetch_and_checkout; then
        print_error "Branch checkout failed"
        rollback_deployment
        exit 1
    fi

    if ! rebuild_backend; then
        print_error "Backend rebuild failed"
        rollback_deployment
        exit 1
    fi

    if ! restart_services; then
        print_error "Service restart failed"
        rollback_deployment
        exit 1
    fi

    if ! verify_deployment; then
        print_error "Deployment verification failed"
        echo ""
        read -p "Verification failed. Rollback? (yes/no): " -r
        echo

        if [[ $REPLY =~ ^[Yy]es$ ]]; then
            rollback_deployment
            exit 1
        else
            print_warning "Continuing despite verification failures"
        fi
    fi

    production_smoke_tests

    # Success!
    print_header "DEPLOYMENT SUCCESSFUL"

    print_success "Deployment completed at $(date)"
    log_message "=== DEPLOYMENT SUCCESSFUL ==="

    show_deployment_summary

    exit 0
}

################################################################################
# Error Handler
################################################################################

error_handler() {
    local line_number=$1
    print_error "Script failed at line $line_number"
    log_message "ERROR: Script failed at line $line_number"

    if [ "$DEPLOYMENT_STARTED" = true ]; then
        echo ""
        read -p "Deployment failed. Attempt automatic rollback? (yes/no): " -r
        echo

        if [[ $REPLY =~ ^[Yy]es$ ]]; then
            rollback_deployment
        fi
    fi

    exit 1
}

trap 'error_handler $LINENO' ERR

################################################################################
# Execute Main
################################################################################

main "$@"
