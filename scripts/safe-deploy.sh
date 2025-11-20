#!/bin/bash
################################################################################
# PDFLab Safe Deployment Script
################################################################################
# Wrapper that runs all validation checks before deploying
# This is the ONLY approved way to deploy to production/staging
#
# Usage: ./safe-deploy.sh [production|staging] [--skip-tests]
################################################################################

set -e

ENV="${1:-production}"
SKIP_TESTS="${2}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Validate environment
if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ] && [ "$ENV" != "prod" ]; then
    error "Invalid environment: $ENV"
    echo ""
    echo "Usage: $0 [production|staging] [--skip-tests]"
    exit 1
fi

# Normalize environment name
if [ "$ENV" == "prod" ]; then
    ENV="production"
fi

echo ""
echo "=========================================="
echo "PDFLab Safe Deployment"
echo "=========================================="
echo "Environment: $ENV"
echo "Timestamp: $(date)"
echo "=========================================="
echo ""

# Confirmation prompt for production
if [ "$ENV" == "production" ]; then
    warn "You are about to deploy to PRODUCTION"
    echo ""
    read -p "Are you sure? (type 'yes' to confirm): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
    echo ""
fi

################################################################################
# Step 1: Pre-Deployment Validation (12-point checklist)
################################################################################

log "Step 1/4: Running pre-deployment validation..."
echo ""

if /usr/local/bin/pdflab-scripts/pre-deployment-validation.sh "$ENV"; then
    info "✓ Pre-deployment validation passed"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
        error "❌ Critical failures detected - deployment blocked"
        exit 2
    else
        warn "⚠️  Warnings detected - review before continuing"
        echo ""
        read -p "Continue deployment? (yes/no): " CONTINUE
        if [ "$CONTINUE" != "yes" ]; then
            echo "Deployment cancelled"
            exit 0
        fi
    fi
fi

echo ""

################################################################################
# Step 2: Run Tests (optional)
################################################################################

if [ "$SKIP_TESTS" != "--skip-tests" ]; then
    log "Step 2/4: Running pre-deployment tests..."
    echo ""

    if /usr/local/bin/pdflab-scripts/run-pre-deployment-tests.sh "$ENV"; then
        info "✓ All tests passed"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 2 ]; then
            error "❌ Critical tests failed - deployment blocked"
            exit 2
        else
            warn "⚠️  Some tests failed - review before continuing"
            echo ""
            read -p "Continue deployment? (yes/no): " CONTINUE
            if [ "$CONTINUE" != "yes" ]; then
                echo "Deployment cancelled"
                exit 0
            fi
        fi
    fi
else
    warn "Skipping tests (--skip-tests flag provided)"
fi

echo ""

################################################################################
# Step 3: Backup Current State
################################################################################

log "Step 3/4: Creating backup..."
echo ""

BACKUP_DIR="/var/pdflab-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ "$ENV" == "production" ]; then
    DEPLOY_DIR="/var/pdflab/app"
else
    DEPLOY_DIR="/var/pdflab-staging/app"
fi

# Backup docker-compose configuration
cp "$DEPLOY_DIR/docker-compose.yml" "$BACKUP_DIR/" 2>/dev/null || true
cp "$DEPLOY_DIR/docker-compose.base.yml" "$BACKUP_DIR/" 2>/dev/null || true
cp "$DEPLOY_DIR/docker-compose.${ENV}.yml" "$BACKUP_DIR/" 2>/dev/null || true

# Backup environment file
cp "$DEPLOY_DIR/backend/.env" "$BACKUP_DIR/backend.env" 2>/dev/null || true

info "✓ Backup created at $BACKUP_DIR"
echo ""

################################################################################
# Step 4: Deploy
################################################################################

log "Step 4/4: Deploying to $ENV..."
echo ""

cd "$DEPLOY_DIR"

# Pull latest images
info "Pulling latest Docker images..."
docker-compose.original pull 2>&1 | grep -v "Warning" || true

# Recreate containers
info "Recreating containers..."
docker-compose.original up -d --force-recreate --remove-orphans

# Wait for containers to be healthy
info "Waiting for containers to be healthy..."
sleep 10

# Verify deployment
info "Verifying deployment..."
UNHEALTHY=$(docker ps --filter "name=pdflab-*-${ENV}" --format '{{.Names}} {{.Status}}' | grep -c "unhealthy" || echo "0")

if [ "$UNHEALTHY" -gt 0 ]; then
    warn "$UNHEALTHY containers are unhealthy"
    echo ""
    docker ps --filter "name=pdflab-*-${ENV}" --format 'table {{.Names}}\t{{.Status}}'
    echo ""
    warn "Check container logs for issues"
    echo ""
    read -p "Rollback deployment? (yes/no): " ROLLBACK
    if [ "$ROLLBACK" == "yes" ]; then
        error "Rolling back deployment..."
        cp "$BACKUP_DIR/docker-compose.yml" "$DEPLOY_DIR/" 2>/dev/null || true
        docker-compose.original up -d
        exit 1
    fi
else
    info "✓ All containers healthy"
fi

echo ""

################################################################################
# Step 5: Post-Deployment Health Check
################################################################################

log "Running post-deployment health check..."
echo ""

if /usr/local/bin/pdflab-scripts/health-check-enhanced.sh "$ENV"; then
    info "✓ Health check passed"
else
    warn "⚠️  Health check detected issues"
    echo ""
    read -p "Rollback deployment? (yes/no): " ROLLBACK
    if [ "$ROLLBACK" == "yes" ]; then
        error "Rolling back deployment..."
        cp "$BACKUP_DIR/docker-compose.yml" "$DEPLOY_DIR/" 2>/dev/null || true
        docker-compose.original up -d
        exit 1
    fi
fi

echo ""

################################################################################
# Success Summary
################################################################################

echo "=========================================="
echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL${NC}"
echo "=========================================="
echo ""
echo "Environment: $ENV"
echo "Backup: $BACKUP_DIR"
echo "Deployed: $(date)"
echo ""

# Show running containers
log "Running containers:"
docker ps --filter "name=pdflab-*-${ENV}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""

info "Deployment complete!"
echo ""
