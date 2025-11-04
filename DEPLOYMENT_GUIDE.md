# PDFLab - Production Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-31
**Status**: Ready for Production

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Database Migration](#database-migration)
6. [Monitoring Setup](#monitoring-setup)
7. [Rollback Procedures](#rollback-procedures)

---

## 1. Prerequisites

### Required Infrastructure
- **Server**: Ubuntu 22.04 LTS or similar (2+ CPU cores, 4GB+ RAM)
- **Node.js**: v20 LTS
- **MySQL**: 8.0+
- **Redis**: 7.0+
- **Docker**: 24.0+ (optional but recommended)
- **Domain**: Registered domain with DNS access
- **SSL Certificate**: Let's Encrypt or commercial SSL

### Required Accounts
- CloudConvert API account (production API key)
- PayFast merchant account (production credentials)
- Email service (SendGrid, AWS SES, etc.) - optional
- Monitoring service (Sentry, Datadog, etc.) - optional

---

## 2. Environment Setup

### 2.1 Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install nginx (reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2.2 Create Application User

```bash
sudo adduser pdflab
sudo usermod -aG docker pdflab
sudo su - pdflab
```

### 2.3 Clone Repository

```bash
cd /home/pdflab
git clone <your-repo-url> PDFLab
cd PDFLab
```

---

## 3. Staging Deployment

### 3.1 Environment Configuration

Create staging environment file:

```bash
cd /home/pdflab/PDFLab
cp backend/.env.example backend/.env.staging
nano backend/.env.staging
```

**Staging Environment Variables**:

```env
# Server Configuration
NODE_ENV=staging
PORT=3006
API_URL=https://staging-api.pdflab.com

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab_staging
DB_PASSWORD=<generate-strong-password>
DB_NAME=pdflab_staging

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<generate-strong-password>

# CloudConvert (Sandbox)
CLOUDCONVERT_API_KEY=<sandbox-api-key>
CLOUDCONVERT_SANDBOX=true

# JWT
JWT_SECRET=<generate-random-64-char-string>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# PayFast (Sandbox)
PAYFAST_MERCHANT_ID=<sandbox-merchant-id>
PAYFAST_MERCHANT_KEY=<sandbox-merchant-key>
PAYFAST_PASSPHRASE=<sandbox-passphrase>
PAYFAST_MODE=sandbox

# CORS
CORS_ORIGIN=https://staging.pdflab.com,http://localhost:3000

# File Storage
STORAGE_PATH=/home/pdflab/PDFLab/backend/storage
MAX_FILE_SIZE=524288000

# Email (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@pdflab.com

# Monitoring (Optional)
SENTRY_DSN=<sentry-dsn>
```

### 3.2 Database Setup (Staging)

```bash
# Start MySQL Docker container for staging
docker run -d \
  --name pdflab-mysql-staging \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD=<root-password> \
  -e MYSQL_DATABASE=pdflab_staging \
  -e MYSQL_USER=pdflab_staging \
  -e MYSQL_PASSWORD=<db-password> \
  -p 3306:3306 \
  -v pdflab_staging_data:/var/lib/mysql \
  mysql:8.0

# Wait for MySQL to start
sleep 10

# Verify connection
docker exec -it pdflab-mysql-staging mysql -updflab_staging -p<db-password> -e "SHOW DATABASES;"
```

### 3.3 Redis Setup (Staging)

```bash
# Start Redis Docker container for staging
docker run -d \
  --name pdflab-redis-staging \
  --restart unless-stopped \
  -p 6379:6379 \
  -v pdflab_staging_redis:/data \
  redis:7-alpine \
  redis-server --requirepass <redis-password>

# Test Redis connection
docker exec -it pdflab-redis-staging redis-cli -a <redis-password> PING
# Expected output: PONG
```

### 3.4 Build and Install Dependencies

```bash
cd /home/pdflab/PDFLab/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Create storage directories
mkdir -p storage/uploads storage/outputs

# Set permissions
chmod 755 storage
chmod 755 storage/uploads
chmod 755 storage/outputs
```

### 3.5 Start Backend with PM2 (Staging)

```bash
# Start backend process
pm2 start dist/server.js \
  --name pdflab-staging \
  --env staging \
  --instances 2 \
  --exec-mode cluster \
  --max-memory-restart 500M \
  --log /home/pdflab/logs/pdflab-staging.log \
  --error /home/pdflab/logs/pdflab-staging-error.log

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Check status
pm2 status
pm2 logs pdflab-staging
```

### 3.6 Nginx Configuration (Staging)

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/pdflab-staging
```

**Nginx Configuration**:

```nginx
# Staging API
server {
    listen 80;
    server_name staging-api.pdflab.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging-api.pdflab.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/staging-api.pdflab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging-api.pdflab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/pdflab-staging-access.log;
    error_log /var/log/nginx/pdflab-staging-error.log;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s; # 5 minutes for PDF conversion
    }

    # File upload size limit
    client_max_body_size 500M;
    client_body_timeout 300s;
}
```

**Enable site and reload nginx**:

```bash
sudo ln -s /etc/nginx/sites-available/pdflab-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.7 SSL Certificate (Staging)

```bash
# Obtain SSL certificate from Let's Encrypt
sudo certbot --nginx -d staging-api.pdflab.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3.8 Verify Staging Deployment

```bash
# Check health endpoint
curl https://staging-api.pdflab.com/health

# Expected output:
# {"uptime":...,"timestamp":...,"status":"OK","checks":{"database":"OK","redis":"OK"}}

# Test authentication
curl -X POST https://staging-api.pdflab.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@staging.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'
```

---

## 4. Production Deployment

### 4.1 Production Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3006
API_URL=https://api.pdflab.com

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab_prod
DB_PASSWORD=<generate-strong-password>
DB_NAME=pdflab_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=<generate-strong-password>

# CloudConvert (Production)
CLOUDCONVERT_API_KEY=<production-api-key>
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=<generate-random-64-char-string>
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# PayFast (Production)
PAYFAST_MERCHANT_ID=<production-merchant-id>
PAYFAST_MERCHANT_KEY=<production-merchant-key>
PAYFAST_PASSPHRASE=<production-passphrase>
PAYFAST_MODE=production

# CORS
CORS_ORIGIN=https://pdflab.com,https://www.pdflab.com

# File Storage
STORAGE_PATH=/home/pdflab/PDFLab/backend/storage
MAX_FILE_SIZE=524288000

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@pdflab.com

# Monitoring
SENTRY_DSN=<sentry-dsn>
DATADOG_API_KEY=<datadog-api-key>
```

### 4.2 Production Database Setup

```bash
# Production MySQL (use managed service in production: AWS RDS, DigitalOcean, etc.)
docker run -d \
  --name pdflab-mysql-prod \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD=<root-password> \
  -e MYSQL_DATABASE=pdflab_prod \
  -e MYSQL_USER=pdflab_prod \
  -e MYSQL_PASSWORD=<db-password> \
  -p 3307:3306 \
  -v pdflab_prod_data:/var/lib/mysql \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

### 4.3 Production Redis Setup

```bash
docker run -d \
  --name pdflab-redis-prod \
  --restart unless-stopped \
  -p 6380:6379 \
  -v pdflab_prod_redis:/data \
  redis:7-alpine \
  redis-server --requirepass <redis-password> --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### 4.4 Start Production Backend

```bash
pm2 start dist/server.js \
  --name pdflab-prod \
  --env production \
  --instances max \
  --exec-mode cluster \
  --max-memory-restart 1G \
  --log /home/pdflab/logs/pdflab-prod.log \
  --error /home/pdflab/logs/pdflab-prod-error.log

pm2 save
pm2 startup
```

### 4.5 Production Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.pdflab.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.pdflab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pdflab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Production rate limiting (more strict)
    limit_req_zone $binary_remote_addr zone=prod_api:10m rate=5r/s;
    limit_req zone=prod_api burst=10 nodelay;

    location / {
        proxy_pass http://localhost:3006;
        # ... (same proxy config as staging)
    }
}
```

---

## 5. Database Migration

### 5.1 Backup Current Database

```bash
# Export from development
docker exec pdflab-mysql mysqldump -updflab -p***REMOVED*** pdflab > pdflab_backup_$(date +%Y%m%d).sql

# Compress backup
gzip pdflab_backup_$(date +%Y%m%d).sql
```

### 5.2 Import to Staging/Production

```bash
# Copy to server
scp pdflab_backup_20251031.sql.gz pdflab@staging-server:/home/pdflab/

# On server, decompress
gunzip pdflab_backup_20251031.sql.gz

# Import to staging database
docker exec -i pdflab-mysql-staging mysql -updflab_staging -p<password> pdflab_staging < pdflab_backup_20251031.sql

# Verify
docker exec pdflab-mysql-staging mysql -updflab_staging -p<password> -e "SELECT COUNT(*) FROM pdflab_staging.users;"
```

---

## 6. Monitoring Setup

### 6.1 Health Check Monitoring

**UptimeRobot Configuration**:
- URL: https://api.pdflab.com/health
- Interval: 5 minutes
- Expected Status: 200
- Expected Keyword: "OK"
- Alert Contacts: email, SMS

### 6.2 Application Monitoring (Sentry)

Install Sentry SDK:

```bash
cd backend
npm install @sentry/node @sentry/tracing
```

Add to server.ts:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 6.3 PM2 Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# View monitoring dashboard
pm2 monit
```

---

## 7. Rollback Procedures

### 7.1 Application Rollback

```bash
# Stop current version
pm2 stop pdflab-prod

# Switch to previous version (if using git tags)
git checkout v1.0.0

# Rebuild
npm run build

# Restart
pm2 restart pdflab-prod

# Monitor logs
pm2 logs pdflab-prod --lines 100
```

### 7.2 Database Rollback

```bash
# Restore from backup
docker exec -i pdflab-mysql-prod mysql -updflab_prod -p<password> pdflab_prod < pdflab_backup_YYYYMMDD.sql
```

---

## 8. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (backend + integration)
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] SSL certificates installed
- [ ] DNS records updated
- [ ] CloudConvert API key validated
- [ ] PayFast credentials validated
- [ ] Monitoring configured

### Deployment
- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Build application
- [ ] Run database migrations
- [ ] Start services with PM2
- [ ] Verify health endpoint
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error logs for 1 hour
- [ ] Test PDF conversion
- [ ] Test payment flow
- [ ] Verify monitoring alerts
- [ ] Update documentation
- [ ] Notify team

---

## 9. Troubleshooting

### Issue: Server Won't Start

```bash
# Check PM2 logs
pm2 logs pdflab-prod --err

# Check environment variables
pm2 env 0

# Restart with fresh config
pm2 delete pdflab-prod
pm2 start dist/server.js --name pdflab-prod --env production
```

### Issue: Database Connection Failed

```bash
# Check MySQL status
docker ps | grep mysql
docker logs pdflab-mysql-prod

# Test connection
docker exec -it pdflab-mysql-prod mysql -updflab_prod -p

# Verify credentials in .env
```

### Issue: Redis Connection Failed

```bash
# Check Redis status
docker ps | grep redis
docker logs pdflab-redis-prod

# Test connection
docker exec -it pdflab-redis-prod redis-cli -a <password> PING

# Check password in .env
```

---

## 10. Security Best Practices

1. **Never commit .env files** - Use environment variables
2. **Use strong passwords** - Generate with: `openssl rand -base64 48`
3. **Enable firewall** - Only allow ports 80, 443, 22
4. **Regular updates** - Keep OS and dependencies updated
5. **Database backups** - Automated daily backups
6. **SSL/TLS** - Always use HTTPS in production
7. **Rate limiting** - Protect against DDoS
8. **Input validation** - Sanitize all user input
9. **Log rotation** - Prevent disk space issues
10. **Monitor logs** - Review error logs daily

---

**Deployment Status**: Ready for Staging ✅
**Production Status**: Ready after staging validation ✅
**Support**: <your-support-email>
