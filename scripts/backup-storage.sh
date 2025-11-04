#!/bin/bash

###############################################################################
# PDFLab Storage Backup Script - Hostinger VPS
#
# This script backs up PDFLab storage volumes to /var/pdflab/backups
# and keeps the last 7 days of backups (configurable).
#
# Usage: bash scripts/backup-storage.sh
# Cron: 0 3 * * * /var/pdflab/scripts/backup-storage.sh >> /var/pdflab/logs/backup.log 2>&1
###############################################################################

set -e

# Configuration
BACKUP_ROOT="/var/pdflab/backups"
STORAGE_PATH="/var/pdflab/storage"
MYSQL_CONTAINER="pdflab-mysql-prod"
REDIS_CONTAINER="pdflab-redis-prod"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$DATE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "PDFLab Storage Backup"
echo "Started: $(date)"
echo "========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Backup Storage Files
echo -e "${YELLOW}[1/4] Backing up storage files...${NC}"
if [ -d "$STORAGE_PATH" ]; then
    tar -czf "$BACKUP_DIR/storage.tar.gz" -C "$STORAGE_PATH" . 2>/dev/null
    STORAGE_SIZE=$(du -sh "$BACKUP_DIR/storage.tar.gz" | cut -f1)
    echo -e "${GREEN}✓ Storage backup complete: $STORAGE_SIZE${NC}"
else
    echo -e "${RED}⚠️  Storage directory not found: $STORAGE_PATH${NC}"
fi

# 2. Backup MySQL Database
echo -e "${YELLOW}[2/4] Backing up MySQL database...${NC}"
if docker ps | grep -q $MYSQL_CONTAINER; then
    docker exec $MYSQL_CONTAINER mysqldump \
        -u${DB_USER:-pdflab} \
        -p${DB_PASSWORD:-***REMOVED***} \
        ${DB_NAME:-pdflab_production} \
        --single-transaction \
        --quick \
        --lock-tables=false \
        > "$BACKUP_DIR/database.sql" 2>/dev/null

    gzip "$BACKUP_DIR/database.sql"
    DB_SIZE=$(du -sh "$BACKUP_DIR/database.sql.gz" | cut -f1)
    echo -e "${GREEN}✓ Database backup complete: $DB_SIZE${NC}"
else
    echo -e "${RED}⚠️  MySQL container not running${NC}"
fi

# 3. Backup Redis Data
echo -e "${YELLOW}[3/4] Backing up Redis data...${NC}"
if docker ps | grep -q $REDIS_CONTAINER; then
    docker exec $REDIS_CONTAINER redis-cli BGSAVE > /dev/null 2>&1
    sleep 2  # Wait for BGSAVE to complete
    docker cp $REDIS_CONTAINER:/data/dump.rdb "$BACKUP_DIR/redis.rdb" 2>/dev/null
    if [ -f "$BACKUP_DIR/redis.rdb" ]; then
        gzip "$BACKUP_DIR/redis.rdb"
        REDIS_SIZE=$(du -sh "$BACKUP_DIR/redis.rdb.gz" | cut -f1)
        echo -e "${GREEN}✓ Redis backup complete: $REDIS_SIZE${NC}"
    fi
else
    echo -e "${RED}⚠️  Redis container not running${NC}"
fi

# 4. Create Backup Manifest
echo -e "${YELLOW}[4/4] Creating backup manifest...${NC}"
cat > "$BACKUP_DIR/manifest.txt" <<EOF
PDFLab Backup Manifest
======================
Date: $(date)
Backup ID: $DATE

Contents:
$(ls -lh $BACKUP_DIR)

System Info:
- Hostname: $(hostname)
- Disk Usage: $(df -h / | tail -1 | awk '{print $5}')
- Docker Version: $(docker --version)

Restore Instructions:
1. Extract storage: tar -xzf storage.tar.gz -C /var/pdflab/storage/
2. Restore DB: gunzip < database.sql.gz | docker exec -i $MYSQL_CONTAINER mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME
3. Restore Redis: docker cp redis.rdb.gz $REDIS_CONTAINER:/data/dump.rdb
EOF

echo -e "${GREEN}✓ Manifest created${NC}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "========================================="
echo -e "${GREEN}✅ Backup Complete${NC}"
echo "Location: $BACKUP_DIR"
echo "Total Size: $TOTAL_SIZE"
echo "========================================="

# Cleanup old backups (keep last N days)
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

REMAINING_BACKUPS=$(ls -1 "$BACKUP_ROOT" | wc -l)
echo -e "${GREEN}✓ Cleanup complete. Remaining backups: $REMAINING_BACKUPS${NC}"

# Disk space check
echo ""
echo "Disk Space:"
df -h /var/pdflab | tail -1 | awk '{print "  Used: " $3 " / " $2 " (" $5 ")"}'

DISK_USAGE=$(df /var/pdflab | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 75 ]; then
    echo -e "${RED}⚠️  WARNING: Disk usage at ${DISK_USAGE}%! Consider cleanup or upgrade.${NC}"
elif [ "$DISK_USAGE" -gt 60 ]; then
    echo -e "${YELLOW}⚠️  Notice: Disk usage at ${DISK_USAGE}%. Monitor closely.${NC}"
fi

echo ""
echo "Finished: $(date)"
