# VPS Verification Commands

Quick commands to verify your Hostinger VPS setup is complete and working.

## Quick Health Check (Run all at once)

```bash
echo "=== SYSTEM COMPONENTS ===" && \
docker --version && \
docker compose version && \
mysql --version && \
git --version && \
echo "" && \
echo "=== DIRECTORY STRUCTURE ===" && \
ls -la /var/pdflab/ && \
echo "" && \
echo "=== DOCKER CONTAINERS ===" && \
docker ps && \
echo "" && \
echo "=== DISK SPACE ===" && \
df -h /var/pdflab && \
echo "" && \
echo "=== NETWORK PORTS ===" && \
netstat -tuln | grep -E ':(3306|6379|3006|3000|80|443) '
```

---

## Individual Verification Commands

### 1. Check Docker Installation

```bash
# Check Docker version
docker --version

# Expected: Docker version 24.x or higher
```

```bash
# Check Docker Compose version
docker compose version

# Expected: Docker Compose version v2.x or higher
```

```bash
# Check Docker service status
systemctl status docker

# Expected: Active (running)
```

---

### 2. Check MySQL Client

```bash
# Check MySQL client installed
mysql --version

# Expected: mysql Ver 8.0.x for Linux
```

---

### 3. Check Directory Structure

```bash
# List main directory
ls -la /var/pdflab/

# Expected directories:
# - app/
# - storage/
# - logs/
# - backups/
# - scripts/
```

```bash
# Check storage subdirectories
ls -la /var/pdflab/storage/

# Expected:
# - uploads/
# - outputs/
```

```bash
# Check app directory
ls -la /var/pdflab/app/

# Expected: Git repository with backend/, app/, components/, etc.
```

---

### 4. Check Docker Containers

```bash
# List running containers
docker ps

# Expected 3 containers:
# - pdflab-mysql-prod (Up)
# - pdflab-redis-prod (Up)
# - pdflab-backend-prod (Up)
```

```bash
# Check all containers (including stopped)
docker ps -a
```

```bash
# Check container resource usage
docker stats --no-stream
```

---

### 5. Check MySQL Database

```bash
# Check MySQL container is running
docker exec pdflab-mysql-prod mysqladmin ping -h localhost -uroot -p

# Enter password when prompted
# Expected: mysqld is alive
```

```bash
# Check database exists
docker exec -it pdflab-mysql-prod mysql -uroot -p -e "SHOW DATABASES;"

# Expected to see: pdflab_production
```

```bash
# Check tables exist
docker exec -it pdflab-mysql-prod mysql -uroot -p pdflab_production -e "SHOW TABLES;"

# Expected 8 tables:
# - admin_audit_logs
# - conversion_jobs
# - password_history
# - payment_logs
# - subscriptions
# - system_health_logs
# - usage_logs
# - users
```

```bash
# Count tables
docker exec pdflab-mysql-prod mysql -uroot -p pdflab_production -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'pdflab_production';"

# Expected: 8
```

---

### 6. Check Redis

```bash
# Check Redis is responding
docker exec pdflab-redis-prod redis-cli ping

# Expected: PONG
```

```bash
# Check Redis info
docker exec pdflab-redis-prod redis-cli info server
```

---

### 7. Check Backend Application

```bash
# Check backend logs
docker logs pdflab-backend-prod --tail 50

# Look for:
# - "Server running on port 3006"
# - "Database connected successfully"
# - No errors
```

```bash
# Check backend is responding (from VPS)
curl http://localhost:3006/api/health

# Expected: {"status":"ok"} or similar
```

```bash
# Check backend environment variables
docker exec pdflab-backend-prod env | grep -E '(DB_|REDIS_|NODE_ENV)'

# Verify correct values
```

---

### 8. Check Network & Ports

```bash
# Check which ports are listening
netstat -tuln | grep LISTEN

# Expected:
# - 0.0.0.0:3306 (MySQL)
# - 0.0.0.0:6379 (Redis)
# - 0.0.0.0:3006 (Backend)
```

```bash
# Check if ports are accessible externally
ss -tulpn | grep -E ':(3306|6379|3006)'
```

---

### 9. Check File Permissions

```bash
# Check storage permissions
ls -ld /var/pdflab/storage

# Expected: drwxr-xr-x (755) or drwxrwxrwx (777)
```

```bash
# Check ownership
ls -la /var/pdflab/

# Ensure proper ownership for Docker
```

---

### 10. Check Disk Space

```bash
# Check overall disk usage
df -h

# Check /var/pdflab specifically
du -sh /var/pdflab/*

# Expected output showing storage used by each directory
```

```bash
# Check available disk space
df -h /var/pdflab | tail -1 | awk '{print "Used: "$3" / "$2" ("$5")"}'

# Should be < 60% for healthy operation
```

---

### 11. Check Environment Files

```bash
# Check backend .env exists
ls -la /var/pdflab/app/backend/.env.production

# Expected: file exists
```

```bash
# Verify critical env vars (WITHOUT showing values)
docker exec pdflab-backend-prod bash -c 'echo "NODE_ENV: ${NODE_ENV}"'
docker exec pdflab-backend-prod bash -c 'echo "DB_HOST: ${DB_HOST}"'
docker exec pdflab-backend-prod bash -c 'echo "REDIS_HOST: ${REDIS_HOST}"'

# Expected:
# NODE_ENV: production
# DB_HOST: mysql
# REDIS_HOST: redis
```

---

### 12. Check Docker Compose Configuration

```bash
# Verify docker-compose file exists
ls -la /var/pdflab/app/docker-compose.production.yml

# View current services
cd /var/pdflab/app
docker compose -f docker-compose.production.yml config --services

# Expected:
# mysql
# redis
# backend
```

---

### 13. Check Firewall (UFW)

```bash
# Check UFW status
ufw status

# Expected to see allowed ports:
# - 22/tcp (SSH)
# - 80/tcp (HTTP)
# - 443/tcp (HTTPS)
# - 3006/tcp (Backend API - if not using reverse proxy)
```

---

### 14. Check Container Networks

```bash
# List Docker networks
docker network ls

# Check containers on network
docker network inspect pdflab_default | grep -A 5 "Containers"
```

---

### 15. Test Database Connection from Backend

```bash
# Test backend can connect to database
docker exec pdflab-backend-prod node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
conn.connect(err => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connection successful');
  conn.end();
});
"
```

---

## Automated Verification Script

For a comprehensive check, run the verification script:

```bash
# Make script executable
chmod +x /var/pdflab/scripts/verify-vps-setup.sh

# Run verification
bash /var/pdflab/scripts/verify-vps-setup.sh
```

---

## Common Issues & Fixes

### Container Not Running

```bash
# Check why container stopped
docker logs pdflab-backend-prod --tail 100

# Restart container
docker restart pdflab-backend-prod
```

### Database Connection Failed

```bash
# Check MySQL is accessible
docker exec -it pdflab-mysql-prod mysql -uroot -p

# Check database user exists
docker exec pdflab-mysql-prod mysql -uroot -p -e "SELECT User, Host FROM mysql.user;"
```

### Port Already in Use

```bash
# Find what's using the port
netstat -tulpn | grep :3006

# Kill the process (if needed)
kill -9 <PID>
```

### Out of Disk Space

```bash
# Clean Docker images
docker system prune -a

# Clean old logs
find /var/pdflab/logs -type f -mtime +7 -delete

# Clean old backups
find /var/pdflab/backups -type d -mtime +7 -exec rm -rf {} \;
```

---

## Final Production Readiness Check

Run all these commands in sequence:

```bash
# 1. All containers running
docker ps | grep -E '(mysql|redis|backend)' | wc -l
# Expected: 3

# 2. Database has tables
docker exec pdflab-mysql-prod mysql -uroot -p pdflab_production -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'pdflab_production';" | tail -1
# Expected: 8

# 3. Backend is healthy
curl -s http://localhost:3006/api/health | grep -q "ok" && echo "✅ Backend OK" || echo "❌ Backend Failed"

# 4. Disk space OK
DISK_USAGE=$(df /var/pdflab | tail -1 | awk '{print $5}' | sed 's/%//')
[ "$DISK_USAGE" -lt 60 ] && echo "✅ Disk OK ($DISK_USAGE%)" || echo "⚠️ Disk Warning ($DISK_USAGE%)"

# 5. All ports listening
netstat -tuln | grep -E ':(3306|6379|3006) ' | wc -l
# Expected: 3
```

---

## Next Steps After Verification

Once all checks pass:

1. **Test file upload**: Upload a PDF via frontend
2. **Test conversion**: Convert PDF to different formats
3. **Test payment**: Process a test payment (use sandbox mode)
4. **Setup backups**: Configure cron job for daily backups
5. **Setup monitoring**: Configure alerts for disk space/errors
6. **Setup SSL**: Install SSL certificate (if domain configured)

---

**VPS IP**: 141.136.44.168
**Last Updated**: 2025-11-04
