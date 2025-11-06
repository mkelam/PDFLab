# PDFLab - Complete Deployment Guide

**Version**: 2.0.0
**Last Updated**: 2025-11-06
**VPS IP**: 141.136.44.168
**Status**: Production Ready ✅

---

## 📋 Table of Contents

1. [Quick Deploy (Hostinger VPS)](#quick-deploy-hostinger-vps)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [Nginx & SSL Setup](#nginx--ssl-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Deploy (Hostinger VPS)

### Method 1: Via Hostinger Control Panel ⭐ RECOMMENDED

1. **Log into Hostinger VPS Dashboard**
   - Go to https://hpanel.hostinger.com/
   - Navigate to VPS → Your Server → Terminal

2. **Run Quick Deploy Command:**
   ```bash
   cd /var/pdflab/app && \
   docker compose -f docker-compose.production.yml down && \
   docker pull mkelam/pdflab-backend:latest && \
   docker pull mkelam/pdflab-frontend:latest && \
   docker compose -f docker-compose.production.yml up -d && \
   sleep 30 && \
   docker ps && \
   curl -s http://localhost:3006/api/payfast/plans | grep price
   ```

3. **Verify Deployment:**
   - Frontend: http://141.136.44.168:3000
   - Backend API: http://141.136.44.168:3006/api/payfast/plans
   - Admin Panel: http://141.136.44.168:3000/admin

### Method 2: Via SSH

```bash
# From your local machine
ssh root@141.136.44.168

# Navigate and deploy
cd /var/pdflab/app
git pull origin master
docker compose -f docker-compose.production.yml up -d
```

---

## 1. Prerequisites

### Infrastructure Requirements

**VPS Specifications** (Hostinger KVM 2):
- **CPU**: 2+ cores
- **RAM**: 4GB minimum
- **Storage**: 100GB NVMe SSD
- **OS**: Ubuntu 22.04 LTS
- **IP**: 141.136.44.168

**Required Software**:
- Node.js v20 LTS
- Docker 24.0+
- Docker Compose v2
- MySQL 8.0+
- Redis 7.0+
- Nginx (reverse proxy)

**External Services**:
- CloudConvert API (production key)
- PayFast merchant account (production credentials)
- Domain & DNS (optional)
- SSL Certificate (Let's Encrypt recommended)

---

## 2. Environment Setup

### 2.1 Initial VPS Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version
```

### 2.2 Create Directory Structure

```bash
# Create application directories
mkdir -p /var/pdflab/{app,storage/uploads,storage/outputs,logs,backups,scripts}

# Set permissions
chmod -R 755 /var/pdflab
```

### 2.3 Clone Repository

```bash
cd /var/pdflab
git clone https://github.com/mkelam/PDFLab.git app
cd app
```

---

## 3. Database Configuration

### 3.1 Start MySQL Container

```bash
cd /var/pdflab/app
docker compose -f docker-compose.production.yml up -d mysql

# Wait for MySQL to initialize
sleep 30

# Verify MySQL is running
docker ps | grep mysql
```

### 3.2 Create Production Database

```bash
docker exec -it pdflab-mysql-prod mysql -uroot -p

# Run these SQL commands:
CREATE DATABASE pdflab_production CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'pdflab'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON pdflab_production.* TO 'pdflab'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 3.3 Run Database Migrations

```bash
# Copy migration scripts from local
scp scripts/migrate-schema-to-vps.sh root@141.136.44.168:/var/pdflab/scripts/

# On VPS, run migration
cd /var/pdflab/scripts
chmod +x migrate-schema-to-vps.sh
bash migrate-schema-to-vps.sh
```

**Expected Tables** (8 total):
- admin_audit_logs
- conversion_jobs
- password_history
- payment_logs
- subscriptions
- system_health_logs
- usage_logs
- users

### 3.4 Verify Database Schema

```bash
docker exec -it pdflab-mysql-prod mysql -uroot -p pdflab_production -e "SHOW TABLES;"
```

---

## 4. Application Deployment

### 4.1 Configure Environment Variables

**Backend (.env.production)**:

```bash
cd /var/pdflab/app/backend
nano .env.production
```

```env
# Server Configuration
NODE_ENV=production
PORT=3006
API_URL=http://141.136.44.168:3006

# Database (MySQL)
DB_HOST=mysql
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=your_secure_password_here
DB_NAME=pdflab_production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# CloudConvert
CLOUDCONVERT_API_KEY=your_cloudconvert_api_key
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your_very_long_random_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# PayFast (Production - Dual Currency System)
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production
# NOTE: Frontend displays USD, PayFast processes ZAR

# CORS
CORS_ORIGIN=http://141.136.44.168:3000

# File Upload
MAX_FILE_SIZE=524288000

# Storage
STORAGE_PATH=/app/storage
```

**Frontend (.env.production.local)**:

```bash
cd /var/pdflab/app
nano .env.production.local
```

```env
NEXT_PUBLIC_API_URL=http://141.136.44.168:3006
```

### 4.2 Pull Docker Images

```bash
cd /var/pdflab/app

# Pull pre-built images
docker pull mkelam/pdflab-backend:latest
docker pull mkelam/pdflab-frontend:latest
```

### 4.3 Start All Services

```bash
docker compose -f docker-compose.production.yml up -d
```

### 4.4 Verify Deployment

```bash
# Check all containers
docker ps

# Expected containers (3):
# - pdflab-backend-prod
# - pdflab-mysql-prod
# - pdflab-redis-prod

# Check backend logs
docker logs pdflab-backend-prod -f

# Test API health
curl http://141.136.44.168:3006/api/health
```

---

## 5. Nginx & SSL Setup

### 5.1 Install Nginx

```bash
apt install nginx certbot python3-certbot-nginx -y
```

### 5.2 Configure Nginx

```bash
nano /etc/nginx/sites-available/pdflab
```

**Basic Configuration**:

```nginx
server {
    listen 80;
    server_name 141.136.44.168;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3006/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;

        # File upload size limit
        client_max_body_size 500M;
    }
}
```

### 5.3 Enable Nginx Configuration

```bash
ln -s /etc/nginx/sites-available/pdflab /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5.4 SSL Certificate (Optional)

If you have a domain:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

---

## 6. Monitoring & Maintenance

### 6.1 Automated Backups

**Setup Daily Backup Cron Job**:

```bash
# Copy backup script
scp scripts/backup-storage.sh root@141.136.44.168:/var/pdflab/scripts/
chmod +x /var/pdflab/scripts/backup-storage.sh

# Add to cron (daily at 3 AM)
crontab -e
```

Add this line:
```cron
0 3 * * * /var/pdflab/scripts/backup-storage.sh >> /var/pdflab/logs/backup.log 2>&1
```

### 6.2 Monitoring Commands

```bash
# View application logs
docker logs pdflab-backend-prod -f
docker logs pdflab-mysql-prod -f
docker logs pdflab-redis-prod -f

# Check disk usage
df -h /var/pdflab

# Monitor containers
docker stats

# Check Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 6.3 Update Application

```bash
cd /var/pdflab/app
git pull origin master
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

---

## 7. Troubleshooting

### Issue: Backend Won't Start

```bash
# Check logs
docker logs pdflab-backend-prod --tail 100

# Check environment variables
docker exec pdflab-backend-prod env | grep DB

# Restart backend
docker restart pdflab-backend-prod
```

### Issue: MySQL Connection Failed

```bash
# Check MySQL status
docker ps | grep mysql
docker logs pdflab-mysql-prod

# Test connection
docker exec -it pdflab-mysql-prod mysql -uroot -p

# Verify database
docker exec pdflab-mysql-prod mysql -uroot -p -e "SHOW DATABASES;"
```

### Issue: Redis Connection Failed

```bash
# Check Redis status
docker ps | grep redis
docker logs pdflab-redis-prod

# Test connection
docker exec -it pdflab-redis-prod redis-cli PING
```

### Issue: Disk Space Full

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a

# Clean old backups (keep last 7 days)
find /var/pdflab/backups -type d -mtime +7 -exec rm -rf {} \;

# Clean old conversion files
find /var/pdflab/storage -type f -mtime +7 -delete
```

### Issue: Port Already in Use

```bash
# Find process using port
netstat -tulpn | grep :3006

# Kill process
kill -9 <PID>

# Or restart the service
docker restart pdflab-backend-prod
```

---

## 8. Verification Checklist

After deployment, verify:

### API Endpoints
```bash
# Health check
curl http://141.136.44.168:3006/api/health

# Pricing API (verify dual-currency)
curl http://141.136.44.168:3006/api/payfast/plans
# Should show: "price":9.99, "price":29.99, "price":99.99
```

### Frontend Pages
- [ ] Homepage: http://141.136.44.168:3000
- [ ] Login: http://141.136.44.168:3000/login
- [ ] Pricing: http://141.136.44.168:3000/pricing
- [ ] Get Started: http://141.136.44.168:3000/get-started
- [ ] Admin Panel: http://141.136.44.168:3000/admin

### Functional Tests
- [ ] User registration works
- [ ] User login works
- [ ] PDF upload works
- [ ] PDF conversion works
- [ ] Payment flow works (PayFast integration)
- [ ] Admin panel accessible

---

## 9. Admin Access

**Admin Login URLs**:
- http://141.136.44.168:3000/login

**Test Admin Credentials**:
- mmkela@fnb.co.za (super_admin, enterprise plan)
- admin@pdflab.test (super_admin, free plan)
- admin@pdflab.com (super_admin, enterprise plan)

**Admin Panel Features**:
1. User management
2. Conversion job monitoring
3. Payment & subscription management
4. System health monitoring
5. Analytics dashboard
6. Audit logs

---

## 10. Firewall Configuration

```bash
# Install UFW
apt install ufw -y

# Configure rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3006/tcp  # Backend API (optional with nginx)
ufw allow 3000/tcp  # Frontend (optional with nginx)

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## 11. Quick Reference Commands

```bash
# Connect to VPS
ssh root@141.136.44.168

# Navigate to app
cd /var/pdflab/app

# View logs
docker logs pdflab-backend-prod -f

# Restart all services
docker compose -f docker-compose.production.yml restart

# Restart specific service
docker restart pdflab-backend-prod

# Update application
git pull && docker compose -f docker-compose.production.yml up -d

# Run backup
bash /var/pdflab/scripts/backup-storage.sh

# Check disk space
df -h /var/pdflab

# Monitor containers
docker stats

# Check container status
docker ps -a
```

---

## 12. Security Best Practices

1. **Never commit .env files** - Use environment variables
2. **Use strong passwords** - Generate with: `openssl rand -base64 48`
3. **Enable firewall** - Only allow necessary ports (22, 80, 443)
4. **Regular updates** - Keep OS and Docker images updated
5. **Automated backups** - Daily backups with retention policy
6. **SSL/TLS** - Always use HTTPS in production
7. **Rate limiting** - Configured in Nginx (protect against DDoS)
8. **Input validation** - All user input sanitized in application
9. **Log rotation** - Prevent disk space issues
10. **Monitor logs** - Review error logs regularly

---

## 13. Important Notes

### Dual-Currency Payment System

**CRITICAL**: PayFast only accepts ZAR (South African Rands), not USD.

- **Frontend Display**: Shows prices in USD ($9.99, $29.99, $99.99)
- **PayFast Processing**: Sends ZAR amounts (R185, R555, R1850)
- **Database Storage**: Stores USD amounts for customer records

This is documented in [docs/payment/PAYFAST_INTEGRATION_AUDIT.md](../payment/PAYFAST_INTEGRATION_AUDIT.md).

### Docker Images

- **Backend**: `mkelam/pdflab-backend:latest`
- **Frontend**: `mkelam/pdflab-frontend:latest`

Images are pre-built and pushed to Docker Hub for faster deployment.

### Storage Architecture

File storage is organized in `/var/pdflab/storage/`:
- `uploads/` - User uploaded PDFs
- `outputs/` - Converted files
- Automatic cleanup after 7 days

See [docs/STORAGE_ARCHITECTURE.md](../STORAGE_ARCHITECTURE.md) for details.

---

## 14. Rollback Procedures

### Application Rollback

```bash
# Stop current version
docker compose -f docker-compose.production.yml down

# Switch to previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Monitor logs
docker logs pdflab-backend-prod -f
```

### Database Rollback

```bash
# Restore from backup
docker exec -i pdflab-mysql-prod mysql -updflab -p pdflab_production < /var/pdflab/backups/YYYYMMDD/mysql_backup.sql
```

---

## 15. Support & Resources

**Documentation**:
- Architecture: [docs/architecture/architecture.md](../architecture/architecture.md)
- API Reference: [docs/api/API_DOCUMENTATION.md](../api/API_DOCUMENTATION.md)
- Payment Integration: [docs/payment/](../payment/)
- Admin Panel: [docs/admin/](../admin/)

**For Issues**:
- Check logs: `/var/pdflab/logs/`
- Review Docker logs: `docker logs <container_name>`
- GitHub Issues: https://github.com/mkelam/PDFLab/issues

---

**Deployment Status**: Production Ready ✅
**Last Successful Deployment**: 2025-11-05
**Current Version**: 1.0.0
**VPS Provider**: Hostinger
**Server IP**: 141.136.44.168
