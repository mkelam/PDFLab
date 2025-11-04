# PDFLab Storage Architecture - Hostinger VPS

**Last Updated**: 2025-11-04
**Version**: 1.0
**VPS Provider**: Hostinger
**Storage Strategy**: Docker Named Volumes + Local NVMe SSD

---

## Overview

PDFLab uses a **Docker volume-based storage architecture** optimized for Hostinger VPS infrastructure. This provides persistent, reliable file storage for PDF uploads and converted outputs while maintaining simplicity and cost-effectiveness.

---

## Storage Architecture

### **Volume Structure**

```
Hostinger VPS (KVM 2 - 100GB NVMe)
├── /var/pdflab/                          # Main application directory
│   ├── storage/                          # File storage (Docker volume mount)
│   │   ├── uploads/                      # User-uploaded PDFs
│   │   │   ├── {user_id}/               # Per-user isolation
│   │   │   │   └── {job_id}/            # Per-job isolation
│   │   │   │       └── input.pdf
│   │   │   └── guest/                   # Guest user uploads
│   │   │       └── {job_id}/
│   │   │           └── input.pdf
│   │   └── outputs/                      # Converted files
│   │       ├── {user_id}/
│   │       │   └── {job_id}/
│   │       │       └── output.pptx
│   │       └── guest/
│   │           └── {job_id}/
│   │               └── output.docx
│   ├── logs/                             # Application logs (Docker volume)
│   └── backups/                          # Daily backup archives
│       └── YYYYMMDD_HHMMSS/
│           ├── storage.tar.gz
│           ├── database.sql.gz
│           ├── redis.rdb.gz
│           └── manifest.txt
└── /var/lib/docker/volumes/              # Docker volume data
    ├── pdflab-storage/
    ├── pdflab-logs/
    ├── pdflab-mysql-data/
    └── pdflab-redis-data/
```

---

## Docker Configuration

### **docker-compose.production.yml**

```yaml
volumes:
  pdflab-storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/pdflab/storage

  pdflab-logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/pdflab/logs

  mysql-data:
    driver: local

  redis-data:
    driver: local
```

**Why Named Volumes?**
- ✅ Persist across container restarts
- ✅ Easy to backup/restore
- ✅ Docker manages permissions
- ✅ Portable across VPS instances

---

## File Lifecycle

### **1. Upload Phase**
```
User uploads PDF
  ↓
Express middleware (multer)
  ↓
Save to: /app/storage/uploads/{user_id}/{job_id}/
  ↓
Database: Record file_path, file_size, job_id
  ↓
Schedule conversion job (Bull queue)
```

### **2. Processing Phase**
```
Bull worker picks up job
  ↓
Read from: /app/storage/uploads/{user_id}/{job_id}/
  ↓
Upload to CloudConvert API
  ↓
CloudConvert processes file
  ↓
Download converted file via HTTPS
  ↓
Save to: /app/storage/outputs/{user_id}/{job_id}/
  ↓
Update database: output_file, status='completed'
```

### **3. Download Phase**
```
User requests download
  ↓
Backend verifies ownership
  ↓
Stream from: /app/storage/outputs/{user_id}/{job_id}/
  ↓
Return file with correct headers
```

### **4. Cleanup Phase**
```
Job completed
  ↓
Schedule cleanup job (Bull queue)
  - Delay: 1 hour (guests) or 7 days (users)
  ↓
Cleanup worker deletes directories
  - /app/storage/uploads/{user_id}/{job_id}/
  - /app/storage/outputs/{user_id}/{job_id}/
  ↓
Update database: Clear file paths
```

---

## Retention Policies

| User Type | Retention Period | Expiration | Cleanup Method |
|-----------|------------------|------------|----------------|
| Guest | 1 hour | `Date.now() + 3600000` | Automatic (Bull) |
| Registered | 7 days | `Date.now() + 7*24*3600000` | Automatic (Bull) |
| Failed Jobs | 24 hours | Immediate on failure | Manual/Cron |

**Why These Timings?**
- **Guests (1 hour)**: Privacy-focused, encourages registration
- **Registered (7 days)**: Balances user convenience with storage costs
- **Failed Jobs**: Prevent disk bloat from incomplete conversions

---

## Storage Capacity Planning

### **Hostinger KVM 2 (100GB NVMe)**

**Allocation**:
```
Total:            100 GB
OS + System:       10 GB
MySQL Database:     5 GB
Redis Cache:        2 GB
Application:        3 GB
Logs:               5 GB
= Available:       75 GB for files
```

**Capacity Calculations**:
```
Average file sizes:
- PDF upload:       5 MB
- Output (PPTX):    3 MB
- Total per job:    8 MB

With 7-day retention:
75 GB ÷ 8 MB = 9,375 conversions
÷ 7 days = 1,339 conversions/day

With 50% safety buffer:
= 669 conversions/day safe capacity
```

**User Projections**:
| Users | Conv/day | Storage Used | % Capacity |
|-------|----------|--------------|------------|
| 100   | 300      | 20 GB        | 27% ✅     |
| 200   | 400      | 30 GB        | 40% ✅     |
| 500   | 1,000    | 70 GB        | 93% ⚠️     |

**Alert Thresholds**:
- 60% (45GB) → **Warning**: Email notification
- 75% (56GB) → **Alert**: Plan upgrade to KVM 4
- 85% (64GB) → **Critical**: Immediate action required

---

## Backup Strategy

### **Daily Automated Backups**

**Script**: `/var/pdflab/scripts/backup-storage.sh`
**Schedule**: Daily at 3:00 AM (Cron)
**Retention**: 7 days (configurable)

**Backup Contents**:
1. **Storage Files**: `storage.tar.gz` (all uploads + outputs)
2. **MySQL Database**: `database.sql.gz` (full dump)
3. **Redis Data**: `redis.rdb.gz` (persistence file)
4. **Manifest**: `manifest.txt` (backup metadata)

**Backup Location**: `/var/pdflab/backups/YYYYMMDD_HHMMSS/`

### **Backup Size Estimates**

| Users | Active Files | Backup Size | 7-Day Storage |
|-------|--------------|-------------|---------------|
| 100   | 2 GB         | 800 MB      | 5.6 GB        |
| 200   | 4 GB         | 1.6 GB      | 11.2 GB       |
| 500   | 10 GB        | 4 GB        | 28 GB         |

**Note**: Backups use gzip compression (~40-50% reduction)

---

## Disaster Recovery

### **Scenario 1: Container Restart** (No Data Loss)
```bash
# Volumes persist automatically
docker-compose -f docker-compose.production.yml restart

# Verify files exist
docker exec pdflab-backend-prod ls -la /app/storage
```
**Recovery Time**: < 2 minutes
**Data Loss**: None ✅

---

### **Scenario 2: Accidental File Deletion**
```bash
# Find latest backup
ls -lt /var/pdflab/backups/ | head -2

# Restore storage
cd /var/pdflab/backups/[BACKUP_DATE]
tar -xzf storage.tar.gz -C /var/pdflab/storage/

# Restart containers
docker-compose -f docker-compose.production.yml restart
```
**Recovery Time**: 10-15 minutes
**Data Loss**: Up to 24 hours (last backup) ⚠️

---

### **Scenario 3: Full VPS Failure**
```bash
# On new VPS:
# 1. Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# 2. Clone repository
git clone https://github.com/mkelam/PDFLab.git
cd PDFLab

# 3. Copy backup files to new VPS
scp -r old-vps:/var/pdflab/backups/[LATEST] /var/pdflab/backups/

# 4. Restore storage
tar -xzf /var/pdflab/backups/[LATEST]/storage.tar.gz -C /var/pdflab/storage/

# 5. Start services
docker-compose -f docker-compose.production.yml up -d

# 6. Restore database
gunzip < /var/pdflab/backups/[LATEST]/database.sql.gz | \
  docker exec -i pdflab-mysql-prod mysql -updflab -p[PASSWORD] pdflab_production

# 7. Verify
curl http://localhost:3006/health
```
**Recovery Time**: 2-4 hours
**Data Loss**: Up to 24 hours ⚠️

---

### **Scenario 4: Disk Full**
```bash
# Check disk usage
df -h /var/pdflab

# Find large old files
du -sh /var/pdflab/storage/*/* | sort -h | tail -20

# Manual cleanup (if auto cleanup failed)
docker exec pdflab-backend-prod npm run cleanup:expired

# Or force cleanup old backups
find /var/pdflab/backups -type d -mtime +7 -exec rm -rf {} \;

# Monitor
watch -n 5 'df -h /var/pdflab'
```
**Prevention**: Monitoring alerts at 60%/75%/85% ✅

---

## Monitoring & Alerts

### **Disk Usage Monitoring**

**Script**: Add to crontab
```bash
# Check disk usage every hour
0 * * * * /usr/local/bin/check-disk-usage.sh
```

**check-disk-usage.sh**:
```bash
#!/bin/bash
USAGE=$(df /var/pdflab | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt 85 ]; then
  echo "CRITICAL: Disk usage at ${USAGE}%" | \
    mail -s "PDFLab Disk Alert" admin@pdflab.com
elif [ "$USAGE" -gt 75 ]; then
  echo "WARNING: Disk usage at ${USAGE}%"
elif [ "$USAGE" -gt 60 ]; then
  echo "NOTICE: Disk usage at ${USAGE}%"
fi
```

### **Backup Verification**

**Weekly Test**: Last Sunday of month
```bash
# Test backup restoration in staging environment
bash scripts/test-restore.sh
```

---

## Migration to S3 (Future)

**Trigger Points**:
- Storage > 75% on KVM 8 (300GB+)
- 1,500+ active users
- Need multi-region support
- Global CDN required

**Migration Strategy**:
1. Set up DigitalOcean Spaces
2. Implement hybrid storage (local + S3)
3. Migrate old files to S3
4. New uploads → S3 direct
5. Deprecate local storage

**Estimated Effort**: 8-12 hours development + testing

---

## Security Considerations

### **File Access Control**
- ✅ User ID in file path prevents unauthorized access
- ✅ Backend verifies ownership before download
- ✅ No direct file listing in Docker volumes
- ✅ Guest files isolated in separate directory

### **Permissions**
```bash
# Storage directories
chown -R 1000:1000 /var/pdflab/storage
chmod -R 755 /var/pdflab/storage

# Backup directories
chown -R root:root /var/pdflab/backups
chmod -R 700 /var/pdflab/backups  # Root only
```

### **Cleanup Verification**
- ✅ Cleanup job updates database (clears file paths)
- ✅ Files physically deleted from disk
- ✅ User can't access after expiration
- ✅ Failed downloads return 404

---

## Troubleshooting

### **Issue 1: Files Not Persisting**
```bash
# Check volume mounts
docker inspect pdflab-backend-prod | grep -A 10 Mounts

# Expected output:
# "Source": "/var/pdflab/storage",
# "Destination": "/app/storage",
```

### **Issue 2: Permission Denied**
```bash
# Fix permissions
chown -R 1000:1000 /var/pdflab/storage
docker-compose -f docker-compose.production.yml restart
```

### **Issue 3: Cleanup Not Running**
```bash
# Check Bull queue
docker exec pdflab-backend-prod npx bull-board

# Check Redis connection
docker exec pdflab-redis-prod redis-cli PING

# Manual cleanup
docker exec pdflab-backend-prod npm run cleanup:all
```

### **Issue 4: Backup Failed**
```bash
# Check backup logs
cat /var/pdflab/logs/backup.log

# Test backup manually
bash /var/pdflab/scripts/backup-storage.sh

# Verify backup integrity
tar -tzf /var/pdflab/backups/[LATEST]/storage.tar.gz | head
```

---

## Cost Analysis

### **Hostinger VPS vs S3**

**Current (KVM 2 - 100GB)**:
- Cost: $6.99/month
- Storage: 100GB NVMe
- Bandwidth: 8TB/month
- **Total**: $6.99/month ✅

**Alternative (S3)**:
- VPS (KVM 1): $4.99/month
- S3 Storage (50GB): ~$1.15/month
- S3 Transfer (100GB): ~$9/month
- **Total**: $15.14/month ❌

**Savings**: $8.15/month = **54% cheaper with Hostinger VPS**

---

## Appendix: Commands Reference

### **Storage Operations**
```bash
# Check storage usage
du -sh /var/pdflab/storage/*

# Count files
find /var/pdflab/storage -type f | wc -l

# List recent uploads
ls -lth /var/pdflab/storage/uploads/*/* | head -20

# Find large files
find /var/pdflab/storage -type f -size +10M -exec ls -lh {} \;
```

### **Backup Operations**
```bash
# Manual backup
bash /var/pdflab/scripts/backup-storage.sh

# List backups
ls -lth /var/pdflab/backups/

# Restore backup
cd /var/pdflab/backups/[BACKUP_DATE]
tar -xzf storage.tar.gz -C /var/pdflab/storage/
```

### **Docker Volume Operations**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect pdflab-storage

# Backup volume (alternative method)
docker run --rm -v pdflab-storage:/data -v /backup:/backup \
  alpine tar czf /backup/storage-$(date +%Y%m%d).tar.gz /data
```

---

**Document Maintained By**: PDFLab DevOps Team
**Next Review**: 2025-12-04
**Questions**: Contact admin@pdflab.com
