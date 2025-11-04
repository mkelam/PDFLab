#!/bin/bash

###############################################################################
# PDFLab Data Migration Script - Local to Hostinger VPS
#
# This script exports data from local development database and imports it
# into the Hostinger VPS production database.
#
# Usage: bash scripts/migrate-data-to-vps.sh [--full|--users-only|--selective]
#
# Options:
#   --full         : Migrate all data (default)
#   --users-only   : Migrate only users table
#   --selective    : Choose which tables to migrate interactively
#
# Prerequisites:
# 1. Schema already migrated (run migrate-schema-to-vps.sh first)
# 2. Local Docker MySQL container running
# 3. SSH access to Hostinger VPS
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse command line options
MIGRATION_MODE="${1:---full}"

echo "========================================="
echo "PDFLab Data Migration to VPS"
echo "Mode: $MIGRATION_MODE"
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

# Temporary directory for data dumps
DUMP_DIR="/tmp/pdflab_migration_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DUMP_DIR"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 1: Pre-Migration Checks${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check local container
if ! docker ps | grep -q $LOCAL_CONTAINER; then
    echo -e "${RED}❌ Local MySQL container not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Local MySQL container running${NC}"

# Check VPS connection
mysql -h "$VPS_HOST" -P "$VPS_PORT" -u "$VPS_USER" -p"$VPS_PASS" -e "SELECT 1;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ VPS MySQL connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to VPS MySQL${NC}"
    rm -rf "$DUMP_DIR"
    exit 1
fi

# Check if VPS database exists
VPS_DB_EXISTS=$(mysql -h "$VPS_HOST" \
                       -P "$VPS_PORT" \
                       -u "$VPS_USER" \
                       -p"$VPS_PASS" \
                       -s -N \
                       -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$VPS_DB';" 2>/dev/null)

if [ -z "$VPS_DB_EXISTS" ]; then
    echo -e "${RED}❌ Database '$VPS_DB' does not exist on VPS${NC}"
    echo "Please run: bash scripts/migrate-schema-to-vps.sh first"
    rm -rf "$DUMP_DIR"
    exit 1
fi
echo -e "${GREEN}✓ VPS database '$VPS_DB' exists${NC}"

# Check if tables exist
TABLE_COUNT=$(mysql -h "$VPS_HOST" \
                    -P "$VPS_PORT" \
                    -u "$VPS_USER" \
                    -p"$VPS_PASS" \
                    -D "$VPS_DB" \
                    -s -N \
                    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$VPS_DB';" 2>/dev/null)

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No tables found in VPS database${NC}"
    echo "Please run: bash scripts/migrate-schema-to-vps.sh first"
    rm -rf "$DUMP_DIR"
    exit 1
fi
echo -e "${GREEN}✓ VPS database has $TABLE_COUNT tables${NC}"
echo ""

# Determine which tables to migrate
ALL_TABLES=(
    "users"
    "conversion_jobs"
    "subscriptions"
    "payment_logs"
    "admin_audit_logs"
    "password_history"
    "usage_logs"
    "system_health_logs"
)

TABLES_TO_MIGRATE=()

case $MIGRATION_MODE in
    --full)
        TABLES_TO_MIGRATE=("${ALL_TABLES[@]}")
        echo -e "${YELLOW}Migrating ALL tables${NC}"
        ;;
    --users-only)
        TABLES_TO_MIGRATE=("users")
        echo -e "${YELLOW}Migrating USERS table only${NC}"
        ;;
    --selective)
        echo -e "${YELLOW}Select tables to migrate:${NC}"
        for table in "${ALL_TABLES[@]}"; do
            read -p "Migrate '$table'? (y/n): " choice
            if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
                TABLES_TO_MIGRATE+=("$table")
            fi
        done
        ;;
    *)
        echo -e "${RED}Invalid mode: $MIGRATION_MODE${NC}"
        echo "Usage: $0 [--full|--users-only|--selective]"
        rm -rf "$DUMP_DIR"
        exit 1
        ;;
esac

if [ ${#TABLES_TO_MIGRATE[@]} -eq 0 ]; then
    echo -e "${RED}❌ No tables selected for migration${NC}"
    rm -rf "$DUMP_DIR"
    exit 1
fi

echo ""
echo -e "${YELLOW}Tables to migrate: ${TABLES_TO_MIGRATE[*]}${NC}"
echo ""
read -p "Continue with migration? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Migration cancelled"
    rm -rf "$DUMP_DIR"
    exit 0
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 2: Export Data from Local DB${NC}"
echo -e "${BLUE}=========================================${NC}"

TOTAL_ROWS=0

for table in "${TABLES_TO_MIGRATE[@]}"; do
    echo -e "${YELLOW}Exporting table: $table${NC}"

    # Get row count
    ROW_COUNT=$(docker exec $LOCAL_CONTAINER mysql \
        -u$LOCAL_USER \
        -p$LOCAL_PASS \
        -D $LOCAL_DB \
        -s -N \
        -e "SELECT COUNT(*) FROM \`$table\`;" 2>/dev/null)

    if [ "$ROW_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}  └─ Table is empty, skipping${NC}"
        continue
    fi

    # Export table data
    docker exec $LOCAL_CONTAINER mysqldump \
        -u$LOCAL_USER \
        -p$LOCAL_PASS \
        --no-create-info \
        --skip-triggers \
        --skip-add-locks \
        --compact \
        --complete-insert \
        --single-transaction \
        $LOCAL_DB \
        $table 2>/dev/null > "$DUMP_DIR/$table.sql"

    if [ $? -eq 0 ]; then
        DUMP_SIZE=$(du -h "$DUMP_DIR/$table.sql" | cut -f1)
        echo -e "${GREEN}  ✓ Exported: $ROW_COUNT rows ($DUMP_SIZE)${NC}"
        TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))
    else
        echo -e "${RED}  ✗ Failed to export $table${NC}"
    fi
done

echo ""
echo -e "${GREEN}✓ Total rows exported: $TOTAL_ROWS${NC}"
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 3: Disable Foreign Key Checks${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Temporarily disabling foreign key checks...${NC}"

mysql -h "$VPS_HOST" \
      -P "$VPS_PORT" \
      -u "$VPS_USER" \
      -p"$VPS_PASS" \
      -D "$VPS_DB" \
      -e "SET FOREIGN_KEY_CHECKS=0;" 2>/dev/null

echo -e "${GREEN}✓ Foreign key checks disabled${NC}"
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 4: Clear Existing Data (Optional)${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Warning: This will delete existing data in VPS tables${NC}"
read -p "Clear existing data before import? (y/n): " CLEAR_DATA

if [ "$CLEAR_DATA" = "y" ] || [ "$CLEAR_DATA" = "Y" ]; then
    for table in "${TABLES_TO_MIGRATE[@]}"; do
        echo -e "${YELLOW}Clearing table: $table${NC}"
        mysql -h "$VPS_HOST" \
              -P "$VPS_PORT" \
              -u "$VPS_USER" \
              -p"$VPS_PASS" \
              -D "$VPS_DB" \
              -e "TRUNCATE TABLE \`$table\`;" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ Cleared${NC}"
        else
            echo -e "${YELLOW}  ⚠ Could not truncate (might have foreign keys)${NC}"
            mysql -h "$VPS_HOST" \
                  -P "$VPS_PORT" \
                  -u "$VPS_USER" \
                  -p"$VPS_PASS" \
                  -D "$VPS_DB" \
                  -e "DELETE FROM \`$table\`;" 2>/dev/null
        fi
    done
    echo -e "${GREEN}✓ Existing data cleared${NC}"
else
    echo -e "${YELLOW}Skipping data clear - will append data${NC}"
fi
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 5: Import Data to VPS${NC}"
echo -e "${BLUE}=========================================${NC}"

IMPORTED_TABLES=0
FAILED_TABLES=0

for table in "${TABLES_TO_MIGRATE[@]}"; do
    if [ ! -f "$DUMP_DIR/$table.sql" ]; then
        echo -e "${YELLOW}Skipping $table (no data file)${NC}"
        continue
    fi

    FILE_SIZE=$(stat -f%z "$DUMP_DIR/$table.sql" 2>/dev/null || stat -c%s "$DUMP_DIR/$table.sql" 2>/dev/null)

    if [ "$FILE_SIZE" -eq 0 ]; then
        echo -e "${YELLOW}Skipping $table (empty dump)${NC}"
        continue
    fi

    echo -e "${YELLOW}Importing table: $table${NC}"

    mysql -h "$VPS_HOST" \
          -P "$VPS_PORT" \
          -u "$VPS_USER" \
          -p"$VPS_PASS" \
          -D "$VPS_DB" \
          < "$DUMP_DIR/$table.sql" 2>/dev/null

    if [ $? -eq 0 ]; then
        # Verify import
        IMPORTED_ROWS=$(mysql -h "$VPS_HOST" \
                              -P "$VPS_PORT" \
                              -u "$VPS_USER" \
                              -p"$VPS_PASS" \
                              -D "$VPS_DB" \
                              -s -N \
                              -e "SELECT COUNT(*) FROM \`$table\`;" 2>/dev/null)
        echo -e "${GREEN}  ✓ Imported: $IMPORTED_ROWS rows${NC}"
        IMPORTED_TABLES=$((IMPORTED_TABLES + 1))
    else
        echo -e "${RED}  ✗ Failed to import $table${NC}"
        FAILED_TABLES=$((FAILED_TABLES + 1))
    fi
done

echo ""
echo -e "${GREEN}✓ Tables imported: $IMPORTED_TABLES${NC}"
if [ $FAILED_TABLES -gt 0 ]; then
    echo -e "${RED}⚠ Tables failed: $FAILED_TABLES${NC}"
fi
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 6: Re-enable Foreign Key Checks${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Re-enabling foreign key checks...${NC}"

mysql -h "$VPS_HOST" \
      -P "$VPS_PORT" \
      -u "$VPS_USER" \
      -p"$VPS_PASS" \
      -D "$VPS_DB" \
      -e "SET FOREIGN_KEY_CHECKS=1;" 2>/dev/null

echo -e "${GREEN}✓ Foreign key checks re-enabled${NC}"
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 7: Verify Data Integrity${NC}"
echo -e "${BLUE}=========================================${NC}"

echo -e "${YELLOW}Verifying row counts...${NC}"
echo ""
printf "%-25s %-15s %-15s %-10s\n" "Table" "Local Rows" "VPS Rows" "Status"
printf "%-25s %-15s %-15s %-10s\n" "-----" "----------" "---------" "------"

for table in "${TABLES_TO_MIGRATE[@]}"; do
    LOCAL_COUNT=$(docker exec $LOCAL_CONTAINER mysql \
        -u$LOCAL_USER \
        -p$LOCAL_PASS \
        -D $LOCAL_DB \
        -s -N \
        -e "SELECT COUNT(*) FROM \`$table\`;" 2>/dev/null)

    VPS_COUNT=$(mysql -h "$VPS_HOST" \
                      -P "$VPS_PORT" \
                      -u "$VPS_USER" \
                      -p"$VPS_PASS" \
                      -D "$VPS_DB" \
                      -s -N \
                      -e "SELECT COUNT(*) FROM \`$table\`;" 2>/dev/null)

    if [ "$LOCAL_COUNT" -eq "$VPS_COUNT" ]; then
        STATUS="${GREEN}✓ Match${NC}"
    else
        STATUS="${RED}✗ Mismatch${NC}"
    fi

    printf "%-25s %-15s %-15s " "$table" "$LOCAL_COUNT" "$VPS_COUNT"
    echo -e "$STATUS"
done

echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$DUMP_DIR"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}✅ Data Migration Complete!${NC}"
echo "========================================="
echo ""
echo "Migration Summary:"
echo "  Mode: $MIGRATION_MODE"
echo "  Tables Migrated: $IMPORTED_TABLES"
echo "  Tables Failed: $FAILED_TABLES"
echo "  Total Rows: $TOTAL_ROWS"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Verify data in VPS database"
echo "  2. Test application with VPS database"
echo "  3. Update backend/.env.production with VPS credentials"
echo "  4. Deploy application to VPS"
echo ""
echo "VPS Database Connection:"
echo "  mysql -h $VPS_HOST -P $VPS_PORT -u $VPS_USER -p -D $VPS_DB"
echo ""
