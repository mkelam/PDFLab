#!/bin/bash

# PDFLab Database Migration Runner
# Usage: ./run-migration.sh [production|development] [migration-file]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get environment (production or development)
ENV="${1:-development}"
MIGRATION_FILE="${2:-001_add_batch_processing.sql}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDFLab Database Migration Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load environment variables based on environment
if [ "$ENV" == "production" ]; then
    echo -e "${YELLOW}⚠️  Running migration in PRODUCTION environment${NC}"
    if [ -f "../../.env.production" ]; then
        source ../../.env.production
    else
        echo -e "${RED}❌ .env.production file not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Running migration in DEVELOPMENT environment${NC}"
    if [ -f "../../.env" ]; then
        source ../../.env
    else
        echo -e "${RED}❌ .env file not found${NC}"
        exit 1
    fi
fi

echo ""
echo -e "Database: ${GREEN}$DB_NAME${NC}"
echo -e "Host: ${GREEN}$DB_HOST:$DB_PORT${NC}"
echo -e "User: ${GREEN}$DB_USER${NC}"
echo -e "Migration: ${GREEN}$MIGRATION_FILE${NC}"
echo ""

# Confirm before running in production
if [ "$ENV" == "production" ]; then
    read -p "Are you sure you want to run this migration in PRODUCTION? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Migration cancelled${NC}"
        exit 0
    fi
fi

# Create backup of database (production only)
if [ "$ENV" == "production" ]; then
    echo -e "${BLUE}Creating database backup...${NC}"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        exit 1
    fi
    echo ""
fi

# Run migration
echo -e "${BLUE}Running migration: $MIGRATION_FILE${NC}"
echo ""

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"

    if [ "$ENV" == "production" ] && [ -f "$BACKUP_FILE" ]; then
        echo ""
        echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"
        echo -e "${YELLOW}Keep this file in case you need to rollback${NC}"
    fi
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${RED}========================================${NC}"

    if [ "$ENV" == "production" ] && [ -f "$BACKUP_FILE" ]; then
        echo ""
        echo -e "${YELLOW}To restore from backup:${NC}"
        echo -e "mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < $BACKUP_FILE"
    fi

    exit 1
fi

echo ""
