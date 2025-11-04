#!/bin/sh
# Pre-build validation script - ensures build will succeed before Docker build
# Exit codes: 0 = success, 1 = failure

set -e  # Exit on any error

echo "========================================"
echo "🔍 PRE-BUILD VALIDATION STARTING..."
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_PASSED=true

# Function to log success
log_success() {
    echo "${GREEN}✅ $1${NC}"
}

# Function to log error
log_error() {
    echo "${RED}❌ $1${NC}"
    VALIDATION_PASSED=false
}

# Function to log warning
log_warning() {
    echo "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "Step 1: Checking Node.js environment..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    log_success "Node.js installed: $NODE_VERSION"

    # Check if Node version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        log_success "Node.js version is compatible (>= 18)"
    else
        log_error "Node.js version must be >= 18 (current: $NODE_VERSION)"
    fi
else
    log_error "Node.js not found"
fi

echo ""
echo "Step 2: Checking npm environment..."
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    log_success "npm installed: $NPM_VERSION"
else
    log_error "npm not found"
fi

echo ""
echo "Step 3: Checking required files..."
REQUIRED_FILES="package.json package-lock.json tsconfig.json src/server.ts .env"
for file in $REQUIRED_FILES; do
    if [ -f "$file" ]; then
        log_success "Found: $file"
    else
        log_error "Missing required file: $file"
    fi
done

echo ""
echo "Step 4: Checking node_modules..."
if [ -d "node_modules" ]; then
    log_success "node_modules directory exists"

    # Check critical dependencies
    CRITICAL_DEPS="express typescript sequelize bull redis ioredis"
    for dep in $CRITICAL_DEPS; do
        if [ -d "node_modules/$dep" ]; then
            log_success "Critical dependency present: $dep"
        else
            log_warning "Missing critical dependency: $dep (will be installed)"
        fi
    done
else
    log_warning "node_modules not found (will run npm install)"
fi

echo ""
echo "Step 5: Validating package.json..."
if command -v node >/dev/null 2>&1; then
    if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
        log_success "package.json is valid JSON"

        # Check required scripts
        if grep -q '"build"' package.json; then
            log_success "Build script defined"
        else
            log_error "Missing 'build' script in package.json"
        fi

        if grep -q '"typecheck"' package.json; then
            log_success "Typecheck script defined"
        else
            log_error "Missing 'typecheck' script in package.json"
        fi
    else
        log_error "package.json is invalid JSON"
    fi
fi

echo ""
echo "Step 6: Validating TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    # Use TypeScript's own validation (supports comments/trailing commas)
    if npx tsc --showConfig > /dev/null 2>&1; then
        log_success "tsconfig.json is valid (verified by TypeScript compiler)"
    else
        log_error "tsconfig.json is invalid (TypeScript compiler rejected it)"
    fi
fi

echo ""
echo "Step 7: Checking environment variables..."
if [ -f ".env" ]; then
    log_success ".env file exists"

    # Check critical environment variables
    CRITICAL_VARS="DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME REDIS_HOST REDIS_PORT JWT_SECRET CLOUDCONVERT_API_KEY"
    for var in $CRITICAL_VARS; do
        if grep -q "^${var}=" .env 2>/dev/null; then
            log_success "Environment variable defined: $var"
        else
            log_warning "Missing environment variable: $var"
        fi
    done
else
    log_error ".env file not found"
fi

echo ""
echo "Step 8: Validating source code structure..."
REQUIRED_DIRS="src src/config src/controllers src/models src/routes src/middleware src/services"
for dir in $REQUIRED_DIRS; do
    if [ -d "$dir" ]; then
        log_success "Found directory: $dir"
    else
        log_error "Missing required directory: $dir"
    fi
done

echo ""
echo "Step 9: Checking for common syntax errors..."
if command -v node >/dev/null 2>&1; then
    # Check for common TypeScript syntax errors
    if find src -name "*.ts" -type f -exec grep -l "import.*'.*' '.*'" {} \; 2>/dev/null | head -1 | grep -q .; then
        log_error "Found malformed import statements (check for duplicate imports)"
    else
        log_success "No malformed import statements detected"
    fi
fi

echo ""
echo "========================================"
if [ "$VALIDATION_PASSED" = true ]; then
    echo "${GREEN}✅ PRE-BUILD VALIDATION PASSED${NC}"
    echo "========================================"
    exit 0
else
    echo "${RED}❌ PRE-BUILD VALIDATION FAILED${NC}"
    echo "========================================"
    echo ""
    echo "Fix the errors above before building Docker image."
    exit 1
fi
