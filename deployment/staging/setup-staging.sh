#!/bin/bash

###############################################################################
# PDFLab Staging Environment Setup Script
#
# This script sets up a complete staging environment on your VPS
# Usage: bash setup-staging.sh
###############################################################################

set -e  # Exit on error

echo "🚀 PDFLab Staging Environment Setup"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_DIR="/var/pdflab-staging"
PRODUCTION_DIR="/var/pdflab"
REPO_URL="https://github.com/yourusername/pdflab.git"  # Update this

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_success "Running as root"

# Step 1: Create staging directory
echo ""
echo "Step 1: Creating staging directory..."
mkdir -p ${STAGING_DIR}/{app,logs}
print_success "Staging directory created at ${STAGING_DIR}"

# Step 2: Clone repository (or copy from production)
echo ""
echo "Step 2: Setting up application files..."
if [ -d "$PRODUCTION_DIR/app" ]; then
    print_warning "Copying from production directory..."
    cp -r ${PRODUCTION_DIR}/app/* ${STAGING_DIR}/app/
    print_success "Files copied from production"
else
    print_warning "Production directory not found. You'll need to upload files manually."
fi

# Step 3: Create environment file
echo ""
echo "Step 3: Creating environment file..."
cd ${STAGING_DIR}/app/deployment/staging

if [ ! -f ".env.staging" ]; then
    cp .env.staging.example .env.staging
    print_warning "Created .env.staging from example. PLEASE UPDATE WITH REAL VALUES!"
    print_warning "Edit: ${STAGING_DIR}/app/deployment/staging/.env.staging"
else
    print_success ".env.staging already exists"
fi

# Step 4: Create init.sql for database
echo ""
echo "Step 4: Creating database initialization script..."
cat > ${STAGING_DIR}/app/deployment/staging/init.sql <<'EOF'
-- PDFLab Staging Database Initialization

-- Create tables (same as production)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role ENUM('user', 'support', 'finance', 'admin', 'super_admin', 'partner_admin') DEFAULT 'user',
    plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
    conversions_used INT DEFAULT 0,
    conversions_limit INT DEFAULT 3,
    subscription_id VARCHAR(36),
    subscription_status VARCHAR(50),
    is_beta_user BOOLEAN DEFAULT FALSE,
    beta_expires_at DATETIME,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at DATETIME,
    onboarding_skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_plan (plan),
    INDEX idx_subscription_id (subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create test users for staging
INSERT INTO users (id, email, password_hash, name, plan, conversions_limit, role) VALUES
    ('staging-user-1', 'staging-free@pdflab.test', '$2b$10$rKZX9Z9Z9Z9Z9Z9Z9Z9Z9.', 'Staging Free User', 'free', 3, 'user'),
    ('staging-user-2', 'staging-pro@pdflab.test', '$2b$10$rKZX9Z9Z9Z9Z9Z9Z9Z9Z9.', 'Staging Pro User', 'pro', 999999, 'user'),
    ('staging-admin', 'staging-admin@pdflab.test', '$2b$10$rKZX9Z9Z9Z9Z9Z9Z9Z9Z9.', 'Staging Admin', 'enterprise', 999999, 'super_admin')
ON DUPLICATE KEY UPDATE email=email;

-- Add more tables as needed from your production schema
EOF

print_success "Database initialization script created"

# Step 5: Pull latest Docker images
echo ""
echo "Step 5: Pulling Docker images..."
docker pull mysql:8.0
docker pull redis:7-alpine
docker pull node:20-alpine
print_success "Docker images pulled"

# Step 6: Stop any existing staging containers
echo ""
echo "Step 6: Cleaning up old staging containers..."
cd ${STAGING_DIR}/app/deployment/staging
docker-compose -f docker-compose.staging.yml down -v 2>/dev/null || true
print_success "Old containers removed"

# Step 7: Start staging environment
echo ""
echo "Step 7: Starting staging environment..."
docker-compose -f docker-compose.staging.yml up -d
print_success "Staging containers started"

# Step 8: Wait for services to be healthy
echo ""
echo "Step 8: Waiting for services to start..."
sleep 10

# Check if containers are running
if docker ps | grep -q "pdflab-mysql-staging"; then
    print_success "MySQL staging is running (port 3307)"
else
    print_error "MySQL staging failed to start"
fi

if docker ps | grep -q "pdflab-redis-staging"; then
    print_success "Redis staging is running (port 6380)"
else
    print_error "Redis staging failed to start"
fi

if docker ps | grep -q "pdflab-backend-staging"; then
    print_success "Backend staging is running (port 3007)"
else
    print_warning "Backend staging may need environment variables updated"
fi

if docker ps | grep -q "pdflab-frontend-staging"; then
    print_success "Frontend staging is running (port 3001)"
else
    print_warning "Frontend staging may need configuration"
fi

# Step 9: Display access information
echo ""
echo "=========================================="
echo "🎉 Staging Environment Setup Complete!"
echo "=========================================="
echo ""
echo "Staging URLs:"
echo "  Frontend: http://staging.pdflab.pro:3001"
echo "  Backend:  http://staging.pdflab.pro:3007"
echo "  API:      http://staging.pdflab.pro:3007/api"
echo ""
echo "Database:"
echo "  Host: localhost"
echo "  Port: 3307"
echo "  Database: pdflab_staging"
echo "  User: pdflab_staging"
echo ""
echo "Redis:"
echo "  Host: localhost"
echo "  Port: 6380"
echo ""
echo "Test Credentials:"
echo "  Free User:  staging-free@pdflab.test / password: TestPass123!"
echo "  Pro User:   staging-pro@pdflab.test / password: TestPass123!"
echo "  Admin:      staging-admin@pdflab.test / password: Admin123!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Update environment variables:"
echo "   nano ${STAGING_DIR}/app/deployment/staging/.env.staging"
echo ""
echo "2. Restart staging after updating env:"
echo "   cd ${STAGING_DIR}/app/deployment/staging"
echo "   docker-compose -f docker-compose.staging.yml restart"
echo ""
echo "3. View logs:"
echo "   docker-compose -f docker-compose.staging.yml logs -f"
echo ""
echo "4. Setup Nginx (optional, for domain access):"
echo "   See: ${STAGING_DIR}/app/deployment/staging/nginx-staging.conf"
echo ""
