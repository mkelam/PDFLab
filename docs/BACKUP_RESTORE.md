# PDFLab Backup & Restore Guide

## Overview

Automated daily backups of all critical PDFLab data with 30-day retention.

## What Gets Backed Up

1. **MySQL Database** (Critical)
   - All user data, conversions, subscriptions, partners
   - Compressed with gzip
   - Must be >1MB (validation check)

2. **Redis Data** (Important)
   - Session data, queue state, cache
   - dump.rdb snapshot

3. **User Storage** (Large)
   - Uploaded PDFs, converted files
   - Only files modified in last 30 days (space optimization)

4. **Configuration Files** (Critical)
   - docker-compose.production.yml
   - .env files
   - nginx.conf, prometheus.yml
   - Git state

5. **System State** (Informational)
   - Container status, resource usage, disk space

## Backup Schedule

- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Location**: `/var/pdflab/backups/`
- **Latest**: `/var/pdflab/backups/latest` (symlink)

## Manual Backup

```bash
/var/pdflab/scripts/backup-production.sh
```

## Restore from Backup

1. List available backups:
```bash
ls -lh /var/pdflab/backups/
```

2. Restore specific backup:
```bash
/var/pdflab/scripts/restore-backup.sh 20250123_140000
```

3. Verify restoration:
```bash
docker ps
curl http://localhost:3006/health
```

## Monitoring Backups

- **Logs**: `/var/pdflab/backups/backup.log`
- **Disk Usage**: `du -sh /var/pdflab/backups/*`
- **Latest Backup**: `ls -lh /var/pdflab/backups/latest`

## Troubleshooting

**Backup too small error**:
- Check MySQL container is running: `docker ps | grep mysql`
- Verify database has data: `docker exec pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** -e "SELECT COUNT(*) FROM pdflab_production.users"`

**Storage backup too large**:
- Backups only include files modified in last 30 days
- To reduce further, adjust `find -mtime` value in script

**Restore failed**:
- Ensure containers are stopped: `docker-compose down`
- Check backup integrity: `gunzip -t /var/pdflab/backups/latest/mysql_database.sql.gz`
- Review logs: `tail -f /var/pdflab/backups/backup.log`

## Testing Restores

**CRITICAL**: Test restore procedure monthly in staging environment.

1. Spin up staging VPS
2. Copy backup: `scp -r /var/pdflab/backups/latest staging:/var/pdflab/backups/`
3. Run restore script
4. Verify all data present
5. Document any issues

## Backup Contents Details

### MySQL Backup
- Format: SQL dump (gzip compressed)
- Options:
  - `--single-transaction`: Consistent snapshot without locking
  - `--routines`: Include stored procedures
  - `--triggers`: Include database triggers
  - `--events`: Include scheduled events
  - `--hex-blob`: Binary data in hex format

### Redis Backup
- Format: RDB snapshot
- Triggers: Manual SAVE command
- Size: Typically 1-50 MB depending on cache

### Storage Backup
- Format: Compressed tarball (tar.gz)
- Filter: Only files modified in last 30 days
- Average size: Varies by usage (10-100 GB)

### Configuration Backup
- All critical config files
- Git state (commit, status, diff)
- Docker compose configuration
- Environment variables

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption
```bash
# Stop backend to prevent writes
docker-compose stop backend

# Restore database only
cd /var/pdflab/backups/latest
gunzip < mysql_database.sql.gz | \
  docker exec -i pdflab-mysql-prod mysql -u pdflab -p***REMOVED*** pdflab_production

# Restart backend
docker-compose up -d backend
```

### Scenario 2: Lost User Files
```bash
# Restore storage only (doesn't affect database)
tar -xzf /var/pdflab/backups/latest/storage.tar.gz -C /
```

### Scenario 3: Complete Server Failure
```bash
# Full restore on new server
/var/pdflab/scripts/restore-backup.sh <timestamp>
```

## Backup Verification Checklist

Run monthly to ensure backups are working:

- [ ] Backup script runs successfully (check cron logs)
- [ ] MySQL backup size is reasonable (>1MB, <10GB)
- [ ] Redis backup exists and is recent
- [ ] Storage backup completed without errors
- [ ] Configuration files backed up
- [ ] Backup manifest created
- [ ] Old backups cleaned up (retention working)
- [ ] Latest symlink points to newest backup
- [ ] Test restore in staging environment
- [ ] Verify restored data integrity

## Security Considerations

**Backup Security**:
- Backups contain sensitive data (user info, passwords)
- Stored on server at `/var/pdflab/backups/`
- Access restricted to root user only
- Consider encrypting backups for off-site storage

**Off-Site Backups** (Recommended for Production):
```bash
# Example: Copy to remote storage
rsync -avz /var/pdflab/backups/latest/ \
  user@backup-server:/backups/pdflab/$(date +%Y%m%d)/
```

**Encryption** (Optional but Recommended):
```bash
# Encrypt backup before off-site transfer
tar -czf - /var/pdflab/backups/latest | \
  openssl enc -aes-256-cbc -salt -out backup-encrypted.tar.gz.enc
```

## Retention Policy

- **Daily Backups**: 30 days
- **Weekly Backups**: Consider keeping 1 weekly backup for 12 weeks
- **Monthly Backups**: Consider keeping 1 monthly backup for 12 months
- **Compliance**: Adjust retention based on regulatory requirements

## Performance Impact

- **Backup Duration**: 5-15 minutes depending on data size
- **Storage Impact**: Minimal (daily rotation)
- **I/O Impact**: Low (scheduled at 2 AM during low traffic)
- **CPU Impact**: Minimal (gzip compression is efficient)

## Automation

The backup system is fully automated:

1. Cron job runs daily at 2:00 AM
2. Script executes all backup steps
3. Validates backup integrity
4. Cleans up old backups
5. Logs all operations
6. Updates "latest" symlink

No manual intervention required unless restore is needed.

## Support

For backup issues:
1. Check logs: `/var/pdflab/backups/backup.log`
2. Verify cron: `crontab -l`
3. Test manual backup: `/var/pdflab/scripts/backup-production.sh`
4. Check disk space: `df -h /var/pdflab/backups/`

For critical issues, contact DevOps team immediately.
