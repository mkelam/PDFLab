#!/bin/bash
# PDFLab Production Restore Script

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_timestamp>"
  echo "Example: $0 20250123_140000"
  echo ""
  echo "Available backups:"
  ls -lh /var/pdflab/backups/ | grep "^d" | awk '{print $9}'
  exit 1
fi

BACKUP_DIR="/var/pdflab/backups/$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup not found: $BACKUP_DIR"
  exit 1
fi

echo "========================================="
echo "PDFLab Production Restore"
echo "Backup: $1"
echo "========================================="
echo ""
echo "WARNING: This will OVERWRITE current data!"
echo "Press Ctrl+C to cancel, Enter to continue..."
read

# Stop services
echo "Stopping containers..."
docker-compose down

# Restore MySQL
echo "Restoring MySQL database..."
gunzip < "$BACKUP_DIR/mysql_database.sql.gz" | \
  docker exec -i pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab_production

# Restore Redis
echo "Restoring Redis data..."
docker cp "$BACKUP_DIR/redis_dump.rdb" pdflab-redis-prod:/data/dump.rdb
docker restart pdflab-redis-prod

# Restore storage
echo "Restoring storage files..."
tar -xzf "$BACKUP_DIR/storage.tar.gz" -C /

# Restore configs
echo "Restoring configuration files..."
cp "$BACKUP_DIR/docker-compose.production.yml" docker-compose.production.yml
cp "$BACKUP_DIR/backend.env.production" backend/.env.production

# Restart services
echo "Restarting services..."
docker-compose up -d

echo ""
echo "========================================="
echo "RESTORE COMPLETE"
echo "========================================="
echo "Verify system health:"
echo "  docker ps"
echo "  curl http://localhost:3006/health"
