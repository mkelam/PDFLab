#!/bin/bash

###############################################################################
# PDFLab Schema Migration Script - Local to Hostinger VPS
#
# This script exports the database schema from local development environment
# and creates all tables/indexes on the Hostinger VPS production database.
#
# Usage: bash scripts/migrate-schema-to-vps.sh
#
# Prerequisites:
# 1. Local Docker MySQL container running (pdflab-mysql)
# 2. SSH access to Hostinger VPS
# 3. MySQL credentials for VPS
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "PDFLab Schema Migration to VPS"
echo "========================================="
echo ""

# Configuration
LOCAL_CONTAINER="pdflab-mysql"
LOCAL_DB="pdflab"
LOCAL_USER="pdflab"
LOCAL_PASS="***REMOVED***"

# VPS Configuration (will be prompted)
echo -e "${YELLOW}VPS Configuration${NC}"
read -p "VPS Host (e.g., 123.45.67.89): " VPS_HOST
read -p "VPS MySQL Port [3306]: " VPS_PORT
VPS_PORT=${VPS_PORT:-3306}
read -p "VPS Database Name [pdflab_production]: " VPS_DB
VPS_DB=${VPS_DB:-pdflab_production}
read -p "VPS MySQL User [pdflab]: " VPS_USER
VPS_USER=${VPS_USER:-pdflab}
read -sp "VPS MySQL Password: " VPS_PASS
echo ""
echo ""

# Temporary file for schema
SCHEMA_FILE="/tmp/pdflab_schema_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 1: Export Schema from Local DB${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if local container is running
if ! docker ps | grep -q $LOCAL_CONTAINER; then
    echo -e "${RED}❌ Local MySQL container '$LOCAL_CONTAINER' is not running${NC}"
    echo "Please start it with: docker start $LOCAL_CONTAINER"
    exit 1
fi

echo -e "${YELLOW}Exporting schema (structure only, no data)...${NC}"

# Export schema without data, skip PROCESS-related options
docker exec $LOCAL_CONTAINER mysqldump \
    -u$LOCAL_USER \
    -p$LOCAL_PASS \
    --no-data \
    --skip-add-drop-table \
    --skip-comments \
    --compact \
    $LOCAL_DB 2>/dev/null > "$SCHEMA_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to export schema from local database${NC}"
    exit 1
fi

# Clean up the schema file
echo -e "${YELLOW}Cleaning up schema file...${NC}"

# Remove duplicate unique constraints (the "too many keys" issue)
# Keep only the first unique constraint on email
sed -i '/UNIQUE KEY `email_[0-9]\+`/d' "$SCHEMA_FILE"
sed -i '/UNIQUE KEY `transaction_id_[0-9]\+`/d' "$SCHEMA_FILE"

# Add CREATE DATABASE IF NOT EXISTS
sed -i "1i-- PDFLab Production Database Schema" "$SCHEMA_FILE"
sed -i "2i-- Generated: $(date)" "$SCHEMA_FILE"
sed -i "3i-- Migrated from: Local Development" "$SCHEMA_FILE"
sed -i "4i\n" "$SCHEMA_FILE"
sed -i "5iCREATE DATABASE IF NOT EXISTS \`$VPS_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" "$SCHEMA_FILE"
sed -i "6iUSE \`$VPS_DB\`;" "$SCHEMA_FILE"
sed -i "7i\n" "$SCHEMA_FILE"

# Add DROP TABLE IF EXISTS before each CREATE TABLE
sed -i 's/^CREATE TABLE/DROP TABLE IF EXISTS/' "$SCHEMA_FILE"
sed -i 's/^DROP TABLE IF EXISTS \(`[^`]*`\)/DROP TABLE IF EXISTS \1;\nCREATE TABLE/' "$SCHEMA_FILE"

SCHEMA_SIZE=$(wc -l < "$SCHEMA_FILE")
echo -e "${GREEN}✓ Schema exported: $SCHEMA_SIZE lines${NC}"
echo -e "${GREEN}✓ Schema file: $SCHEMA_FILE${NC}"
echo ""

# Show table list
echo -e "${YELLOW}Tables to be created:${NC}"
grep "^CREATE TABLE" "$SCHEMA_FILE" | sed 's/CREATE TABLE `/  - /' | sed 's/` (//'
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 2: Test VPS Connection${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Testing connection to VPS MySQL...${NC}"

# Test connection
mysql -h "$VPS_HOST" \
      -P "$VPS_PORT" \
      -u "$VPS_USER" \
      -p"$VPS_PASS" \
      -e "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}❌ Failed to connect to VPS MySQL${NC}"
    echo "Please check:"
    echo "  1. VPS MySQL is running"
    echo "  2. Firewall allows port $VPS_PORT"
    echo "  3. MySQL user has remote access permissions"
    echo "  4. Credentials are correct"
    rm "$SCHEMA_FILE"
    exit 1
fi
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 3: Create Database and Tables${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Creating database '$VPS_DB'...${NC}"

# Create database if not exists
mysql -h "$VPS_HOST" \
      -P "$VPS_PORT" \
      -u "$VPS_USER" \
      -p"$VPS_PASS" \
      -e "CREATE DATABASE IF NOT EXISTS \`$VPS_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database created/verified${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    rm "$SCHEMA_FILE"
    exit 1
fi

echo -e "${YELLOW}Importing schema to VPS...${NC}"
echo -e "${YELLOW}(This may take 30-60 seconds)${NC}"

# Import schema
mysql -h "$VPS_HOST" \
      -P "$VPS_PORT" \
      -u "$VPS_USER" \
      -p"$VPS_PASS" \
      < "$SCHEMA_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema imported successfully${NC}"
else
    echo -e "${RED}❌ Failed to import schema${NC}"
    echo "Check $SCHEMA_FILE for errors"
    exit 1
fi
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 4: Verify Tables Created${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Verifying tables...${NC}"

# Get table count
TABLE_COUNT=$(mysql -h "$VPS_HOST" \
                    -P "$VPS_PORT" \
                    -u "$VPS_USER" \
                    -p"$VPS_PASS" \
                    -D "$VPS_DB" \
                    -s -N \
                    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$VPS_DB';" 2>/dev/null)

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Tables created: $TABLE_COUNT${NC}"
    echo ""
    echo -e "${YELLOW}Table List:${NC}"
    mysql -h "$VPS_HOST" \
          -P "$VPS_PORT" \
          -u "$VPS_USER" \
          -p"$VPS_PASS" \
          -D "$VPS_DB" \
          -e "SHOW TABLES;" 2>/dev/null
else
    echo -e "${RED}❌ No tables found${NC}"
    rm "$SCHEMA_FILE"
    exit 1
fi
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm "$SCHEMA_FILE"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}✅ Schema Migration Complete!${NC}"
echo "========================================="
echo ""
echo "Database: $VPS_DB"
echo "Tables Created: $TABLE_COUNT"
echo "Host: $VPS_HOST:$VPS_PORT"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run data migration: bash scripts/migrate-data-to-vps.sh"
echo "  2. Verify data integrity"
echo "  3. Update application .env with VPS credentials"
echo ""
echo "VPS Connection String:"
echo "  mysql -h $VPS_HOST -P $VPS_PORT -u $VPS_USER -p$VPS_PASS -D $VPS_DB"
echo ""
