#!/bin/bash

# PDFLab Batch Processing Test Script
# Tests the batch processing endpoints with multiple file uploads

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDFLab Batch Processing Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
API_URL="http://localhost:3006"
TEST_USER_EMAIL="testuser@pdflab.com"
TEST_USER_PASSWORD="TestPass123!"

# Check if test files exist
if [ ! -f "test-sample.pdf" ]; then
    echo -e "${RED}❌ test-sample.pdf not found${NC}"
    echo "Creating test files..."

    # Create duplicate test files for batch testing
    if [ -f "test-sample.pdf" ]; then
        cp test-sample.pdf test-batch-1.pdf
        cp test-sample.pdf test-batch-2.pdf
        cp test-sample.pdf test-batch-3.pdf
        echo -e "${GREEN}✅ Test files created${NC}"
    else
        echo -e "${RED}❌ No test files available. Please add test-sample.pdf${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}[1/5] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_USER_EMAIL}\",\"password\":\"${TEST_USER_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "Please ensure:"
    echo "1. Backend is running (npm run dev in backend/)"
    echo "2. Test user exists: $TEST_USER_EMAIL"
    echo "3. Or create user: POST /api/auth/register"
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo ""

echo -e "${BLUE}[2/5] Uploading batch for conversion (3 files)...${NC}"
BATCH_RESPONSE=$(curl -s -X POST "${API_URL}/api/batch/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "files=@test-sample.pdf" \
  -F "files=@test-sample.pdf" \
  -F "files=@test-sample.pdf" \
  -F "operation_type=convert" \
  -F "batch_name=Test Batch" \
  -F "output_format=pptx")

echo "$BATCH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BATCH_RESPONSE"

BATCH_ID=$(echo $BATCH_RESPONSE | grep -o '"batch_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BATCH_ID" ]; then
    echo -e "${RED}❌ Batch upload failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Batch uploaded: $BATCH_ID${NC}"
echo ""

echo -e "${BLUE}[3/5] Checking batch status...${NC}"
sleep 2

for i in {1..10}; do
    STATUS_RESPONSE=$(curl -s "${API_URL}/api/batch/status/${BATCH_ID}" \
      -H "Authorization: Bearer ${TOKEN}")

    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo $STATUS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    COMPLETED=$(echo $STATUS_RESPONSE | grep -o '"completed_files":[0-9]*' | cut -d':' -f2)
    FAILED=$(echo $STATUS_RESPONSE | grep -o '"failed_files":[0-9]*' | cut -d':' -f2)

    echo -e "${YELLOW}Status: $STATUS | Progress: ${PROGRESS}% | Completed: $COMPLETED | Failed: $FAILED${NC}"

    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "partial" ]; then
        echo -e "${GREEN}✅ Batch processing complete!${NC}"
        echo ""
        echo "Full status:"
        echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
        break
    fi

    if [ "$STATUS" = "failed" ]; then
        echo -e "${RED}❌ Batch processing failed${NC}"
        echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
        exit 1
    fi

    sleep 3
done

echo ""

echo -e "${BLUE}[4/5] Getting batch history...${NC}"
HISTORY_RESPONSE=$(curl -s "${API_URL}/api/batch/history" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$HISTORY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HISTORY_RESPONSE"
echo ""

echo -e "${BLUE}[5/5] Testing batch download...${NC}"
curl -s "${API_URL}/api/batch/download/${BATCH_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o "test-batch-result.zip"

if [ -f "test-batch-result.zip" ]; then
    FILE_SIZE=$(stat -f%z "test-batch-result.zip" 2>/dev/null || stat -c%s "test-batch-result.zip" 2>/dev/null)
    if [ "$FILE_SIZE" -gt 0 ]; then
        echo -e "${GREEN}✅ Batch ZIP downloaded: test-batch-result.zip (${FILE_SIZE} bytes)${NC}"
        echo ""
        echo "Listing ZIP contents:"
        unzip -l test-batch-result.zip 2>/dev/null || echo "  (unzip not available)"
    else
        echo -e "${RED}❌ Downloaded file is empty${NC}"
    fi
else
    echo -e "${RED}❌ Download failed${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Batch Processing Test Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Test Summary:"
echo "- Batch ID: $BATCH_ID"
echo "- Status: $STATUS"
echo "- Files Processed: $COMPLETED"
echo "- Files Failed: $FAILED"
echo "- ZIP Downloaded: test-batch-result.zip"
echo ""
