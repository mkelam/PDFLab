#!/bin/bash
# PDFLab Production Backup Script
# Runs daily via cron, retains 30 days

set -e  # Exit on error

# Configuration
BACKUP_ROOT="/var/pdflab/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="$BACKUP_ROOT/backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "========================================="
echo "PDFLab Production Backup"
echo "Started: $(date)"
echo "Backup Directory: $BACKUP_DIR"
echo "========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# ============================================
# BACKUP 1: MySQL Database (CRITICAL)
# ============================================
echo -e "${YELLOW}[1/5] Backing up MySQL database...${NC}"

docker exec pdflab-mysql-prod mysqldump \
  -u pdflab \
  -p***REMOVED*** \
  pdflab_production \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  > "$BACKUP_DIR/mysql_database.sql"

# Compress
gzip "$BACKUP_DIR/mysql_database.sql"

# Verify size
MYSQL_SIZE=$(stat -c%s "$BACKUP_DIR/mysql_database.sql.gz" 2>/dev/null || stat -f%z "$BACKUP_DIR/mysql_database.sql.gz")
if [ "$MYSQL_SIZE" -lt 1000000 ]; then
  echo -e "${RED}ERROR: MySQL backup too small (<1MB)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ MySQL backup complete: $(du -h $BACKUP_DIR/mysql_database.sql.gz | cut -f1)${NC}"

# ============================================
# BACKUP 2: Redis Data (IMPORTANT)
# ============================================
echo -e "${YELLOW}[2/5] Backing up Redis data...${NC}"

docker exec pdflab-redis-prod redis-cli SAVE
docker cp pdflab-redis-prod:/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"

echo -e "${GREEN}✓ Redis backup complete: $(du -h $BACKUP_DIR/redis_dump.rdb | cut -f1)${NC}"

# ============================================
# BACKUP 3: User Storage Files (LARGE)
# ============================================
echo -e "${YELLOW}[3/5] Backing up user storage...${NC}"

# Only backup files modified in last 30 days (save space)
find /var/pdflab/storage -type f -mtime -30 -print0 | \
  tar -czf "$BACKUP_DIR/storage.tar.gz" --null -T -

echo -e "${GREEN}✓ Storage backup complete: $(du -h $BACKUP_DIR/storage.tar.gz | cut -f1)${NC}"

# ============================================
# BACKUP 4: Configuration Files (CRITICAL)
# ============================================
echo -e "${YELLOW}[4/5] Backing up configuration files...${NC}"

cd /var/pdflab/app

# Docker compose
cp docker-compose.production.yml "$BACKUP_DIR/docker-compose.production.yml"

# Environment files
cp backend/.env.production "$BACKUP_DIR/backend.env.production"
cp frontend/.env.production "$BACKUP_DIR/frontend.env.production" 2>/dev/null || true

# Nginx config
cp nginx.conf "$BACKUP_DIR/nginx.conf" 2>/dev/null || true

# Prometheus config
cp prometheus.yml "$BACKUP_DIR/prometheus.yml" 2>/dev/null || true

# Git state
git log -1 --oneline > "$BACKUP_DIR/git_commit.txt"
git status > "$BACKUP_DIR/git_status.txt"
git diff > "$BACKUP_DIR/git_diff.txt" 2>/dev/null || true

echo -e "${GREEN}✓ Configuration backup complete${NC}"

# ============================================
# BACKUP 5: System State (INFORMATIONAL)
# ============================================
echo -e "${YELLOW}[5/5] Recording system state...${NC}"

docker ps -a > "$BACKUP_DIR/containers.txt"
docker stats --no-stream > "$BACKUP_DIR/docker_stats.txt"
df -h > "$BACKUP_DIR/disk_usage.txt"
free -h > "$BACKUP_DIR/memory_usage.txt"

echo -e "${GREEN}✓ System state recorded${NC}"

# ============================================
# CREATE BACKUP MANIFEST
# ============================================
cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
PDFLab Production Backup
========================

Backup Time: $(date)
Backup Directory: $BACKUP_DIR

Contents:
- mysql_database.sql.gz ($(du -h $BACKUP_DIR/mysql_database.sql.gz | cut -f1))
- redis_dump.rdb ($(du -h $BACKUP_DIR/redis_dump.rdb | cut -f1))
- storage.tar.gz ($(du -h $BACKUP_DIR/storage.tar.gz | cut -f1))
- Configuration files
- System state snapshots

Total Backup Size: $(du -sh $BACKUP_DIR | cut -f1)

Restore Instructions:
See /var/pdflab/scripts/restore-backup.sh
EOF

# ============================================
# CLEANUP OLD BACKUPS
# ============================================
echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"

find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

BACKUPS_COUNT=$(find "$BACKUP_ROOT" -maxdepth 1 -type d | wc -l)
echo -e "${GREEN}✓ Cleanup complete. Current backups: $((BACKUPS_COUNT - 1))${NC}"

# ============================================
# FINAL SUMMARY
# ============================================
echo ""
echo "========================================="
echo -e "${GREEN}BACKUP COMPLETED SUCCESSFULLY${NC}"
echo "========================================="
echo "Total Size: $(du -sh $BACKUP_DIR | cut -f1)"
echo "Location: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo "Completed: $(date)"
echo ""
echo "To restore, run: /var/pdflab/scripts/restore-backup.sh $TIMESTAMP"
echo "========================================="

# Update "latest" symlink
ln -sfn "$BACKUP_DIR" "$BACKUP_ROOT/latest"

# Send success notification (optional - implement later)
# curl -X POST "https://hooks.slack.com/..." -d "Backup complete: $TIMESTAMP"
