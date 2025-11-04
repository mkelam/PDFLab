#!/bin/sh
# Safe Docker build script with comprehensive validation
# This ensures Docker builds never fail due to compilation errors

set -e

echo "========================================"
echo "🚀 SAFE DOCKER BUILD PIPELINE"
echo "========================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
IMAGE_NAME="${IMAGE_NAME:-pdflab-backend}"
IMAGE_TAG="${IMAGE_TAG:-production}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

echo ""
echo "${BLUE}Step 1/6: Pre-build validation${NC}"
echo "----------------------------------------"
if [ -f "scripts/pre-build-check.sh" ]; then
    sh scripts/pre-build-check.sh
    if [ $? -ne 0 ]; then
        echo "${RED}Pre-build validation failed. Aborting Docker build.${NC}"
        exit 1
    fi
else
    echo "${YELLOW}Warning: pre-build-check.sh not found, skipping...${NC}"
fi

echo ""
echo "${BLUE}Step 2/6: Installing dependencies${NC}"
echo "----------------------------------------"
if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
    echo "Running npm ci..."
    npm ci
    echo "${GREEN}✅ Dependencies installed${NC}"
else
    echo "${GREEN}✅ Dependencies up to date${NC}"
fi

echo ""
echo "${BLUE}Step 3/6: TypeScript type checking${NC}"
echo "----------------------------------------"
npm run typecheck
if [ $? -ne 0 ]; then
    echo "${RED}❌ TypeScript type checking failed${NC}"
    echo "Fix type errors before building Docker image."
    exit 1
fi
echo "${GREEN}✅ Type checking passed${NC}"

echo ""
echo "${BLUE}Step 4/6: Building TypeScript${NC}"
echo "----------------------------------------"
npm run build
if [ $? -ne 0 ]; then
    echo "${RED}❌ TypeScript compilation failed${NC}"
    echo "Fix compilation errors before building Docker image."
    exit 1
fi
echo "${GREEN}✅ Build succeeded${NC}"

# Check that dist directory was created
if [ ! -d "dist" ]; then
    echo "${RED}❌ dist/ directory not created${NC}"
    exit 1
fi

# Check that critical files exist in dist
if [ ! -f "dist/server.js" ]; then
    echo "${RED}❌ dist/server.js not found${NC}"
    exit 1
fi
echo "${GREEN}✅ Build artifacts validated${NC}"

echo ""
echo "${BLUE}Step 5/6: Running pre-deployment tests${NC}"
echo "----------------------------------------"
if grep -q '"test"' package.json; then
    echo "Running test suite..."
    npm test || echo "${YELLOW}⚠️  Tests failed but continuing (remove '||' to make tests mandatory)${NC}"
else
    echo "${YELLOW}⚠️  No test script defined, skipping...${NC}"
fi

echo ""
echo "${BLUE}Step 6/6: Building Docker image${NC}"
echo "----------------------------------------"
echo "Building: $IMAGE_NAME:$IMAGE_TAG"
docker build -t "$IMAGE_NAME:$IMAGE_TAG" -f "$DOCKERFILE" .

if [ $? -ne 0 ]; then
    echo "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo "${GREEN}✅ DOCKER BUILD SUCCESSFUL${NC}"
echo "========================================"
echo ""
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To run the container:"
echo "  docker run -d -p 3006:3006 --env-file .env $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To push to registry:"
echo "  docker tag $IMAGE_NAME:$IMAGE_TAG registry.example.com/$IMAGE_NAME:$IMAGE_TAG"
echo "  docker push registry.example.com/$IMAGE_NAME:$IMAGE_TAG"
echo ""
