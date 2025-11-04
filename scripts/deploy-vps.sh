#!/bin/bash

################################################################################
# PDFLab VPS Deployment Script
################################################################################
# This script automates the deployment of PDFLab to a production VPS
# Usage: bash deploy-vps.sh
#
# Prerequisites:
# 1. Docker and Docker Compose installed on VPS
# 2. .env file configured in /opt/pdflab/.env
# 3. SSH access to VPS
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/pdflab"
BACKUP_DIR="/opt/pdflab/backups"
LOG_FILE="/var/log/pdflab-deploy.log"

# Docker Hub images
FRONTEND_IMAGE="mkelam/pdflab-frontend:production"
BACKEND_IMAGE="mkelam/pdflab-backend:production"
WORKER_IMAGE="mkelam/pdflab-worker:production"

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
    fi
}

################################################################################
# Pre-deployment Checks
################################################################################

pre_deployment_checks() {
    log "Starting pre-deployment checks..."

    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        warning "This script should be run with sudo for proper permissions"
    fi

    # Check required commands
    check_command docker
    check_command docker-compose

    # Check if .env file exists
    if [ ! -f "$APP_DIR/.env" ]; then
        error ".env file not found at $APP_DIR/.env. Please create it first."
    fi

    # Check if docker daemon is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker first."
    fi

    log "Pre-deployment checks passed "
}

################################################################################
# Backup Current Deployment
################################################################################

backup_current_deployment() {
    log "Creating backup of current deployment..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    BACKUP_TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"

    mkdir -p "$BACKUP_PATH"

    # Backup database if MySQL container is running
    if docker ps | grep -q pdflab-mysql; then
        info "Backing up MySQL database..."
        docker exec pdflab-mysql mysqldump -u${DB_USER:-pdflab} -p${DB_PASSWORD:-***REMOVED***} ${DB_NAME:-pdflab} > "$BACKUP_PATH/database.sql" 2>/dev/null || warning "Database backup failed"
        if [ -f "$BACKUP_PATH/database.sql" ]; then
            gzip "$BACKUP_PATH/database.sql"
            log "Database backup created: $BACKUP_PATH/database.sql.gz"
        fi
    fi

    # Backup storage directory
    if [ -d "$APP_DIR/backend/storage" ]; then
        info "Backing up storage directory..."
        tar -czf "$BACKUP_PATH/storage.tar.gz" -C "$APP_DIR/backend" storage
        log "Storage backup created: $BACKUP_PATH/storage.tar.gz"
    fi

    # Backup .env file
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$BACKUP_PATH/.env.backup"
        log ".env backup created"
    fi

    log "Backup completed: $BACKUP_PATH"
}

################################################################################
# Pull Latest Docker Images
################################################################################

pull_docker_images() {
    log "Pulling latest Docker images from Docker Hub..."

    info "Pulling frontend image..."
    docker pull $FRONTEND_IMAGE || error "Failed to pull frontend image"

    info "Pulling backend image..."
    docker pull $BACKEND_IMAGE || error "Failed to pull backend image"

    info "Pulling worker image..."
    docker pull $WORKER_IMAGE || error "Failed to pull worker image"

    info "Pulling MySQL image..."
    docker pull mysql:8.0 || error "Failed to pull MySQL image"

    info "Pulling Redis image..."
    docker pull redis:7-alpine || error "Failed to pull Redis image"

    log "All images pulled successfully "
}

################################################################################
# Stop Current Containers
################################################################################

stop_containers() {
    log "Stopping current containers..."

    cd "$APP_DIR"

    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml down || warning "Failed to stop some containers"
    else
        # Stop containers individually if compose file doesn't exist
        docker stop pdflab-frontend pdflab-backend pdflab-worker 2>/dev/null || true
    fi

    log "Containers stopped "
}

################################################################################
# Start New Deployment
################################################################################

start_deployment() {
    log "Starting new deployment..."

    cd "$APP_DIR"

    # Check if docker-compose.production.yml exists
    if [ ! -f "docker-compose.production.yml" ]; then
        error "docker-compose.production.yml not found in $APP_DIR"
    fi

    # Start containers in detached mode
    docker-compose -f docker-compose.production.yml up -d

    log "Containers started "
}

################################################################################
# Health Checks
################################################################################

wait_for_healthy() {
    local service=$1
    local max_wait=${2:-120}  # Default 2 minutes
    local waited=0

    info "Waiting for $service to be healthy..."

    while [ $waited -lt $max_wait ]; do
        if docker ps | grep -q "$service.*healthy"; then
            log "$service is healthy "
            return 0
        fi
        sleep 5
        waited=$((waited + 5))
        echo -n "."
    done

    error "$service failed to become healthy within $max_wait seconds"
}

health_checks() {
    log "Running health checks..."

    # Wait for MySQL
    wait_for_healthy "pdflab-mysql" 120

    # Wait for Redis
    wait_for_healthy "pdflab-redis" 60

    # Wait for Backend
    wait_for_healthy "pdflab-backend" 120

    # Wait for Worker
    info "Checking worker container..."
    sleep 10
    if docker ps | grep -q "pdflab-worker"; then
        log "Worker is running "
    else
        error "Worker container is not running"
    fi

    # Wait for Frontend
    wait_for_healthy "pdflab-frontend" 120

    # Test backend health endpoint
    info "Testing backend health endpoint..."
    sleep 5

    HEALTH_CHECK=$(docker exec pdflab-backend wget -qO- http://localhost:3006/health 2>/dev/null || echo "failed")

    if echo "$HEALTH_CHECK" | grep -q "OK"; then
        log "Backend health check passed "
    else
        error "Backend health check failed"
    fi

    log "All health checks passed "
}

################################################################################
# Post-deployment Tasks
################################################################################

post_deployment() {
    log "Running post-deployment tasks..."

    # Show container status
    info "Container status:"
    docker-compose -f docker-compose.production.yml ps

    # Clean up old images
    info "Cleaning up old Docker images..."
    docker image prune -f

    # Show disk usage
    info "Docker disk usage:"
    docker system df

    log "Post-deployment tasks completed "
}

################################################################################
# Rollback Function
################################################################################

rollback() {
    error "Deployment failed. Starting rollback..."

    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi

    info "Rolling back to: $LATEST_BACKUP"

    # Stop current containers
    docker-compose -f docker-compose.production.yml down || true

    # Restore database if backup exists
    if [ -f "$BACKUP_DIR/$LATEST_BACKUP/database.sql.gz" ]; then
        info "Restoring database..."
        gunzip < "$BACKUP_DIR/$LATEST_BACKUP/database.sql.gz" | docker exec -i pdflab-mysql mysql -u${DB_USER:-pdflab} -p${DB_PASSWORD:-***REMOVED***} ${DB_NAME:-pdflab}
    fi

    # Restart with previous images
    docker-compose -f docker-compose.production.yml up -d

    error "Rollback completed. Please investigate the deployment failure."
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    log "=========================================="
    log "PDFLab Production Deployment Starting"
    log "=========================================="

    # Set trap for errors to trigger rollback
    trap rollback ERR

    # Run deployment steps
    pre_deployment_checks
    backup_current_deployment
    pull_docker_images
    stop_containers
    start_deployment
    health_checks
    post_deployment

    log "=========================================="
    log "Deployment Completed Successfully! =€"
    log "=========================================="

    info "Access your application at:"
    info "  Frontend: http://localhost:3000"
    info "  Backend:  http://localhost:3006"
    info ""
    info "To view logs, run:"
    info "  docker-compose -f docker-compose.production.yml logs -f"
    info ""
    info "To check status:"
    info "  docker-compose -f docker-compose.production.yml ps"
}

# Run main function
main "$@"
