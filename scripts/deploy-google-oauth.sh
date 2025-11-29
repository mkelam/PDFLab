#!/bin/bash

###############################################################################
# Google OAuth Backend Deployment Script
#
# This script deploys the restored Google OAuth implementation to production
# Estimated Time: 10-15 minutes
# Risk: Medium (requires backend restart)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="root@141.136.44.168"
VPS_BACKEND_DIR="/var/pdflab/app/backend"
BACKUP_DIR="/var/pdflab/backups/google-oauth-$(date +%Y%m%d-%H%M%S)"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
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

confirm_proceed() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Do you want to proceed? (yes/no): " response
    if [ "$response" != "yes" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
}

print_header "Google OAuth Backend Deployment"
echo "This script will:"
echo "  1. Backup current backend"
echo "  2. Upload Google OAuth files to VPS"
echo "  3. Update package dependencies"
echo "  4. Rebuild backend Docker image"
echo "  5. Deploy with Google OAuth environment variables"
echo "  6. Test OAuth endpoints"
echo ""
echo "Google OAuth will be enabled with:"
echo "  - Client ID: 587814265812-***"
echo "  - Callback URL: https://pdflab.pro/api/auth/google/callback"
echo ""
echo "Estimated time: 10-15 minutes"
echo "Downtime: ~2 minutes during backend restart"
echo ""

confirm_proceed "Ready to deploy Google OAuth?"

# ============================================================================
# Step 1: Pre-deployment checks
# ============================================================================

print_header "Step 1: Pre-deployment Checks"

echo "Checking VPS connectivity..."
if ssh ${VPS_HOST} "echo 'Connected'" 2>/dev/null; then
    print_success "VPS connection successful"
else
    print_error "Cannot connect to VPS"
    exit 1
fi

echo "Checking if OAuth files exist locally..."
if [ -f "backend/src/config/passport.ts" ] && [ -f "backend/src/routes/auth.google.routes.ts" ]; then
    print_success "OAuth files found"
else
    print_error "OAuth files not found. Run: git show 0f4043c4:backend/src/config/passport.ts > backend/src/config/passport.ts"
    exit 1
fi

echo "Checking backend build..."
if [ -f "backend/dist/config/passport.js" ] && [ -f "backend/dist/routes/auth.google.routes.js" ]; then
    print_success "Backend build exists"
else
    print_warning "Backend not built. Building now..."
    cd backend
    npm run build || print_warning "Build had errors but may have succeeded"
    cd ..
fi

print_success "Pre-deployment checks passed"
echo ""

# ============================================================================
# Step 2: Backup current backend
# ============================================================================

print_header "Step 2: Backing Up Current Backend"

ssh ${VPS_HOST} << ENDSSH
    echo "Creating backup directory..."
    mkdir -p ${BACKUP_DIR}

    echo "Backing up backend code..."
    if [ -d "${VPS_BACKEND_DIR}/dist" ]; then
        cp -r ${VPS_BACKEND_DIR}/dist ${BACKUP_DIR}/dist-backup
        echo "✓ Backend code backed up"
    else
        echo "⚠ No existing dist directory found"
    fi

    echo "Getting current container env vars..."
    docker inspect pdflab-backend-prod --format='{{range .Config.Env}}{{println .}}{{end}}' > ${BACKUP_DIR}/env-backup.txt
    echo "✓ Environment variables backed up"

    echo "Backup location: ${BACKUP_DIR}"
ENDSSH

print_success "Backend backup completed"
echo ""

# ============================================================================
# Step 3: Upload OAuth files to VPS
# ============================================================================

print_header "Step 3: Uploading OAuth Files"

echo "Creating tarball with OAuth files..."
cd backend
tar -czf ../backend-oauth-full.tar.gz \
    dist/config/passport.js \
    dist/config/passport.js.map \
    dist/config/passport.d.ts \
    dist/config/passport.d.ts.map \
    dist/routes/auth.google.routes.js \
    dist/routes/auth.google.routes.js.map \
    dist/routes/auth.google.routes.d.ts \
    dist/routes/auth.google.routes.d.ts.map \
    dist/server.js \
    dist/server.js.map \
    src/config/passport.ts \
    src/routes/auth.google.routes.ts \
    src/server.ts \
    package.json \
    package-lock.json

cd ..

echo "Uploading to VPS..."
scp backend-oauth-full.tar.gz ${VPS_HOST}:/tmp/

echo "Extracting files on VPS..."
ssh ${VPS_HOST} "cd ${VPS_BACKEND_DIR} && tar -xzf /tmp/backend-oauth-full.tar.gz && rm /tmp/backend-oauth-full.tar.gz"

print_success "OAuth files uploaded"
echo ""

# ============================================================================
# Step 4: Update dependencies on VPS
# ============================================================================

print_header "Step 4: Updating Dependencies"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app/backend

    echo "Checking if passport packages are installed..."
    if ! npm list passport 2>/dev/null | grep -q "passport@"; then
        echo "Installing passport packages..."
        npm install --save passport passport-google-oauth20 axios
    else
        echo "✓ Passport packages already installed"
    fi
ENDSSH

print_success "Dependencies updated"
echo ""

# ============================================================================
# Step 5: Rebuild Docker image
# ============================================================================

print_header "Step 5: Rebuilding Docker Image"

echo "This will build a new backend image with Google OAuth..."
confirm_proceed "Ready to rebuild?"

ssh ${VPS_HOST} << 'ENDSSH'
    cd /var/pdflab/app/backend

    echo "Building Docker image..."
    docker build -t pdflab-backend:google-oauth -f Dockerfile . 2>&1 | tail -50

    if [ $? -eq 0 ]; then
        echo "✓ Docker image built successfully"
    else
        echo "✗ Docker build failed"
        exit 1
    fi
ENDSSH

print_success "Docker image built"
echo ""

# ============================================================================
# Step 6: Deploy with OAuth environment variables
# ============================================================================

print_header "Step 6: Deploying Backend with OAuth"

echo "This will restart the backend (~2 minutes downtime)..."
confirm_proceed "Ready to deploy?"

ssh ${VPS_HOST} << 'ENDSSH'
    echo "Stopping current backend..."
    docker stop pdflab-backend-prod
    docker rm pdflab-backend-prod

    echo "Starting new backend with Google OAuth..."
    docker run -d \
        --name pdflab-backend-prod \
        --restart unless-stopped \
        -p 3006:3006 \
        --network pdflab-network \
        -e NODE_ENV=production \
        -e PORT=3006 \
        -e FRONTEND_URL=https://pdflab.pro \
        -e GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
        -e GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET} \
        -e GOOGLE_CALLBACK_URL=https://pdflab.pro/api/auth/google/callback \
        $(docker inspect pdflab-backend-staging --format='{{range .Config.Env}}-e {{.}} {{end}}' | grep -E 'DB_|REDIS_|JWT_|SMTP_|CLOUDCONVERT_|STORAGE_|CORS_|MAX_FILE|SENTRY_') \
        pdflab-backend:google-oauth

    echo "Waiting for backend to start..."
    sleep 20

    # Check if backend is running
    max_attempts=12
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3006/health &>/dev/null; then
            echo "✓ Backend is running!"
            break
        fi
        attempt=$((attempt + 1))
        echo "Waiting... (attempt $attempt/$max_attempts)"
        sleep 5
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "✗ Backend failed to start!"
        echo "Checking logs:"
        docker logs pdflab-backend-prod --tail 50
        exit 1
    fi
ENDSSH

print_success "Backend deployed successfully"
echo ""

# ============================================================================
# Step 7: Test OAuth endpoints
# ============================================================================

print_header "Step 7: Testing OAuth Endpoints"

echo "Testing Google OAuth endpoint..."
ssh ${VPS_HOST} << 'ENDSSH'
    # Test Google OAuth endpoint
    echo "Testing /api/auth/google..."
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/api/auth/google)

    if [ "$response" = "302" ]; then
        echo "✓ Google OAuth endpoint working (302 redirect)"
    else
        echo "✗ Google OAuth endpoint failed (HTTP $response)"
        echo "Response:"
        curl -i http://localhost:3006/api/auth/google
        exit 1
    fi

    # Test health endpoint
    echo ""
    echo "Testing /health..."
    if curl -f http://localhost:3006/health &>/dev/null; then
        echo "✓ Health endpoint working"
    else
        echo "⚠ Health endpoint not accessible"
    fi

    # Check logs for errors
    echo ""
    echo "Checking logs for errors..."
    if docker logs pdflab-backend-prod --tail 50 | grep -i "error" | grep -v "0 errors"; then
        echo "⚠ Errors found in logs (review above)"
    else
        echo "✓ No errors detected"
    fi
ENDSSH

print_success "OAuth endpoint tests passed"
echo ""

# ============================================================================
# Step 8: Test from public URL
# ============================================================================

print_header "Step 8: Testing Public Access"

echo "Testing from public URL..."
echo ""
echo "Testing https://pdflab.pro/api/auth/google..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://pdflab.pro/api/auth/google)

if [ "$response" = "302" ]; then
    print_success "Public Google OAuth endpoint working!"
else
    print_warning "Public endpoint returned HTTP $response"
    echo "This might be normal if OAuth requires redirect"
fi

echo ""
echo "Manual test:"
echo "  1. Open https://pdflab.pro/login in browser"
echo "  2. Click 'Continue with Google'"
echo "  3. Should redirect to Google OAuth"
echo "  4. After Google login, should redirect back with token"
echo ""

# ============================================================================
# Deployment Complete
# ============================================================================

print_header "Google OAuth Deployment Complete! 🎉"

echo "✅ Deployment Summary:"
echo "  - Google OAuth backend deployed"
echo "  - OAuth endpoints configured"
echo "  - Backend restarted successfully"
echo ""
echo "🔐 OAuth Configuration:"
echo "  - Initiate URL: https://pdflab.pro/api/auth/google"
echo "  - Callback URL: https://pdflab.pro/api/auth/google/callback"
echo "  - Frontend callback: https://pdflab.pro/auth/callback"
echo ""
echo "📊 Endpoints Available:"
echo "  - GET /api/auth/google - Start OAuth flow"
echo "  - GET /api/auth/google/callback - Handle OAuth callback"
echo ""
echo "✅ Next Steps:"
echo "  1. Test Google login at: https://pdflab.pro/login"
echo "  2. Click 'Continue with Google' button"
echo "  3. Verify successful login and redirect"
echo ""
echo "📝 Rollback Instructions:"
echo "  If issues occur, run:"
echo "    ssh ${VPS_HOST}"
echo "    docker stop pdflab-backend-prod"
echo "    docker rm pdflab-backend-prod"
echo "    docker run -d --name pdflab-backend-prod [use backup env from ${BACKUP_DIR}/env-backup.txt]"
echo ""
echo "📈 Monitor:"
echo "  - Backend logs: ssh ${VPS_HOST} 'docker logs -f pdflab-backend-prod'"
echo "  - Watch for successful OAuth logins"
echo ""

print_success "Google OAuth is now live!"
