#!/bin/bash

###############################################################################
# Google OAuth Backend Deployment Script (Non-Interactive)
#
# Automatically deploys Google OAuth without prompts
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VPS_HOST="root@141.136.44.168"
VPS_BACKEND_DIR="/var/pdflab/app/backend"
BACKUP_DIR="/var/pdflab/backups/google-oauth-$(date +%Y%m%d-%H%M%S)"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_header "Google OAuth Deployment (Auto)"

# Step 1: Backup current backend
print_header "Step 1: Backup"
ssh ${VPS_HOST} "mkdir -p ${BACKUP_DIR} && docker inspect pdflab-backend-prod --format='{{range .Config.Env}}{{println .}}{{end}}' > ${BACKUP_DIR}/env-backup.txt"
print_success "Backup created: ${BACKUP_DIR}"

# Step 2: Build backend locally
print_header "Step 2: Building Backend"
cd backend
npm run build 2>&1 | tail -10
cd ..
print_success "Backend built"

# Step 3: Create tarball
print_header "Step 3: Packaging"
cd backend
# Package ALL necessary files for Docker build
tar -czf ../backend-oauth.tar.gz dist/ src/ package.json package-lock.json tsconfig.json Dockerfile .dockerignore 2>/dev/null || tar -czf ../backend-oauth.tar.gz dist/ package.json package-lock.json Dockerfile
cd ..
print_success "Package created"

# Step 4: Upload to VPS
print_header "Step 4: Uploading"
scp backend-oauth.tar.gz ${VPS_HOST}:/tmp/
rm backend-oauth.tar.gz
print_success "Uploaded to VPS"

# Step 5: Deploy on VPS
print_header "Step 5: Deploying"
ssh ${VPS_HOST} << 'ENDSSH'
set -e

cd /var/pdflab/app/backend

# Extract files
echo "Extracting files..."
tar -xzf /tmp/backend-oauth.tar.gz
rm /tmp/backend-oauth.tar.gz

# Install passport if needed
if ! npm list passport 2>/dev/null | grep -q "passport@"; then
    echo "Installing passport..."
    npm install --save passport passport-google-oauth20 axios 2>&1 | tail -5
fi

# Build Docker image
echo "Building Docker image..."
docker build -t pdflab-backend:oauth . 2>&1 | grep -E "^#|DONE|ERROR" | tail -20

# Stop old container
echo "Stopping old backend..."
docker stop pdflab-backend-prod 2>/dev/null || true
docker rm pdflab-backend-prod 2>/dev/null || true

# Get existing env vars (excluding Google ones)
existing_env=$(docker inspect pdflab-backend-staging 2>/dev/null --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(DB_|REDIS_|JWT_|SMTP_|CLOUDCONVERT_|STORAGE_|CORS_|MAX_FILE|SENTRY_|STRIPE_|PAYFAST_)' | sed 's/^/-e /' | tr '\n' ' ')

# Start new container with OAuth
echo "Starting new backend..."
docker run -d \
    --name pdflab-backend-prod \
    --restart unless-stopped \
    -p 3006:3006 \
    --network pdflab-network \
    -e NODE_ENV=production \
    -e PORT=3006 \
    -e FRONTEND_URL=https://pdflab.pro \
    -e GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID \
    -e GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET \
    -e GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback \
    $existing_env \
    pdflab-backend:oauth

# Wait for startup
echo "Waiting for backend to start..."
sleep 25

# Test health
max_attempts=12
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3006/health &>/dev/null; then
        echo "✓ Backend is healthy!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo "✗ Backend failed to start"
    docker logs pdflab-backend-prod --tail 30
    exit 1
fi

# Test OAuth endpoint
echo "Testing OAuth endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/auth/google 2>/dev/null || echo "000")

if [ "$response" = "302" ] || [ "$response" = "301" ]; then
    echo "✓ Google OAuth endpoint working (HTTP $response redirect)"
elif [ "$response" = "000" ]; then
    echo "⚠ Could not test OAuth endpoint (connection issue)"
else
    echo "OAuth endpoint returned: HTTP $response"
    curl -I http://localhost:3006/api/auth/google 2>&1 | head -10
fi

echo ""
echo "✓ Deployment complete!"
docker ps | grep pdflab-backend-prod

ENDSSH

print_success "Deployed successfully!"

# Step 6: Test from outside
print_header "Step 6: Testing"
sleep 5
response=$(curl -s -o /dev/null -w "%{http_code}" https://pdflab.pro/api/auth/google 2>/dev/null || echo "000")
echo "Public OAuth endpoint: HTTP $response"

if [ "$response" = "302" ] || [ "$response" = "301" ]; then
    print_success "Google OAuth is live!"
else
    echo "Test by visiting: https://pdflab.pro/login"
fi

print_header "✅ DEPLOYMENT COMPLETE"
echo "Google OAuth Backend: DEPLOYED"
echo "Login page: https://pdflab.pro/login"
echo "OAuth endpoint: https://pdflab.pro/api/auth/google"
echo ""
echo "Backup location: ${BACKUP_DIR}"
echo "Monitor logs: ssh ${VPS_HOST} 'docker logs -f pdflab-backend-prod'"
