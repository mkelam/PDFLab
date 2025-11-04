# PDFLab VPS Deployment Guide - Hostinger

Complete step-by-step guide for deploying PDFLab to Hostinger VPS (141.136.44.168).

## Prerequisites

- **VPS Details**:
  - IP: 141.136.44.168
  - User: root
  - Password: Jesus24&7-er
  - Plan: Hostinger KVM 2 (100GB NVMe SSD, 4GB RAM)

- **Local Requirements**:
  - Git Bash or PowerShell with SSH
  - Database migration scripts in `scripts/` directory

---

## Phase 1: Initial VPS Setup

### Step 1: Connect to VPS

```bash
ssh root@141.136.44.168
```

### Step 2: Update System

```bash
apt update && apt upgrade -y
```

### Step 3: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify installation
docker --version

# Install Docker Compose
apt install docker-compose-plugin -y

# Verify Docker Compose
docker compose version
```

### Step 4: Install MySQL Client (for migrations)

```bash
apt install mysql-client -y

# Verify installation
mysql --version
```

---

## Phase 2: Setup Application Directories

### Step 1: Create Directory Structure

```bash
# Create main application directory
mkdir -p /var/pdflab

# Create subdirectories
mkdir -p /var/pdflab/storage/uploads
mkdir -p /var/pdflab/storage/outputs
mkdir -p /var/pdflab/logs
mkdir -p /var/pdflab/backups
mkdir -p /var/pdflab/scripts

# Set permissions
chmod -R 755 /var/pdflab
```

### Step 2: Clone Repository

```bash
cd /var/pdflab
git clone https://github.com/mkelam/PDFLab.git app
cd app
```

---

## Phase 3: Database Setup

### Step 1: Start MySQL Container

```bash
cd /var/pdflab/app

# Start MySQL using docker-compose
docker compose -f docker-compose.production.yml up -d mysql
```

### Step 2: Wait for MySQL to Initialize

```bash
# Wait 30 seconds for MySQL to start
sleep 30

# Check MySQL is running
docker ps | grep mysql
```

### Step 3: Create Production Database

```bash
docker exec -it pdflab-mysql-prod mysql -uroot -p

# Enter root password when prompted, then run:
CREATE DATABASE pdflab_production CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'pdflab'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON pdflab_production.* TO 'pdflab'@'%';
FLUSH PRIVILEGES;
EXIT;
```

---

## Phase 4: Database Migration

### Step 1: Copy Migration Scripts to VPS

**From your local machine (Windows):**

```bash
# Navigate to project directory
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Copy migration scripts to VPS
scp scripts/migrate-schema-to-vps.sh root@141.136.44.168:/var/pdflab/scripts/
scp scripts/migrate-data-to-vps.sh root@141.136.44.168:/var/pdflab/scripts/
```

### Step 2: Run Schema Migration

**On VPS:**

```bash
cd /var/pdflab/scripts
chmod +x migrate-schema-to-vps.sh
bash migrate-schema-to-vps.sh
```

**When prompted, enter:**
- VPS Host: `localhost` (we're connecting from within VPS)
- VPS Port: `3306`
- VPS Database: `pdflab_production`
- VPS User: `root` (or `pdflab`)
- VPS Password: (your MySQL password)

### Step 3: Verify Schema Creation

```bash
docker exec -it pdflab-mysql-prod mysql -uroot -p pdflab_production -e "SHOW TABLES;"
```

You should see 8 tables:
- admin_audit_logs
- conversion_jobs
- password_history
- payment_logs
- subscriptions
- system_health_logs
- usage_logs
- users

### Step 4: Run Data Migration (Optional)

If you want to migrate data from local development:

**From your local machine:**

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Export data from local
bash scripts/migrate-data-to-vps.sh --full
```

**Note**: This step assumes you have test data locally you want to migrate. For fresh production start, skip this.

---

## Phase 5: Application Configuration

### Step 1: Create Production Environment File

**On VPS:**

```bash
cd /var/pdflab/app/backend
nano .env.production
```

**Add the following:**

```env
# Server
NODE_ENV=production
PORT=3006
API_URL=http://141.136.44.168:3006

# Database
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

# PayFast (Production)
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production

# CORS
CORS_ORIGIN=http://141.136.44.168:3000

# File Upload
MAX_FILE_SIZE=524288000

# Storage
STORAGE_PATH=/app/storage
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X)

### Step 2: Create Frontend Environment File

```bash
cd /var/pdflab/app
nano .env.production.local
```

**Add:**

```env
NEXT_PUBLIC_API_URL=http://141.136.44.168:3006
```

**Save and exit**

---

## Phase 6: Deploy Application

### Step 1: Pull Docker Images

```bash
cd /var/pdflab/app

# Pull pre-built images from Docker Hub
docker pull mkelam/pdflab-backend:latest
```

### Step 2: Start All Services

```bash
docker compose -f docker-compose.production.yml up -d
```

### Step 3: Verify Services Running

```bash
docker ps
```

You should see 3 containers:
- pdflab-backend-prod
- pdflab-mysql-prod
- pdflab-redis-prod

### Step 4: Check Backend Logs

```bash
docker logs pdflab-backend-prod -f
```

Press Ctrl+C to exit logs.

---

## Phase 7: Setup Automated Backups

### Step 1: Copy Backup Script

**From local machine:**

```bash
scp scripts/backup-storage.sh root@141.136.44.168:/var/pdflab/scripts/
```

**On VPS:**

```bash
chmod +x /var/pdflab/scripts/backup-storage.sh
```

### Step 2: Configure Backup Script

```bash
nano /var/pdflab/scripts/backup-storage.sh
```

Update these variables if needed:
- `MYSQL_CONTAINER="pdflab-mysql-prod"`
- `REDIS_CONTAINER="pdflab-redis-prod"`

### Step 3: Add to Cron

```bash
crontab -e
```

Add this line for daily backups at 3 AM:

```cron
0 3 * * * /var/pdflab/scripts/backup-storage.sh >> /var/pdflab/logs/backup.log 2>&1
```

**Save and exit**

### Step 4: Test Backup

```bash
bash /var/pdflab/scripts/backup-storage.sh
```

Check backup created:

```bash
ls -lh /var/pdflab/backups/
```

---

## Phase 8: Firewall Configuration

### Step 1: Install UFW (if not installed)

```bash
apt install ufw -y
```

### Step 2: Configure Firewall Rules

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Allow Backend API (temporary - should use nginx reverse proxy)
ufw allow 3006/tcp

# Allow Frontend (temporary - should use nginx reverse proxy)
ufw allow 3000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Phase 9: Setup Nginx Reverse Proxy (Recommended)

### Step 1: Install Nginx

```bash
apt install nginx -y
```

### Step 2: Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/pdflab
```

**Add:**

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

        # Increase body size for file uploads
        client_max_body_size 500M;
    }
}
```

### Step 3: Enable Site

```bash
ln -s /etc/nginx/sites-available/pdflab /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Phase 10: Monitoring & Maintenance

### View Application Logs

```bash
# Backend logs
docker logs pdflab-backend-prod -f

# MySQL logs
docker logs pdflab-mysql-prod -f

# Redis logs
docker logs pdflab-redis-prod -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Check Disk Usage

```bash
df -h /var/pdflab
```

### Check Container Status

```bash
docker ps -a
docker stats
```

### Restart Services

```bash
# Restart all services
docker compose -f /var/pdflab/app/docker-compose.production.yml restart

# Restart specific service
docker restart pdflab-backend-prod
```

### Update Application

```bash
cd /var/pdflab/app
git pull origin master
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

---

## Phase 11: SSL Setup (Optional but Recommended)

### Step 1: Install Certbot

```bash
apt install certbot python3-certbot-nginx -y
```

### Step 2: Setup Domain (if you have one)

If you have a domain pointing to your VPS:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete SSL setup.

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker logs pdflab-backend-prod

# Check environment variables
docker exec pdflab-backend-prod env | grep DB

# Restart backend
docker restart pdflab-backend-prod
```

### MySQL Connection Issues

```bash
# Check MySQL is running
docker ps | grep mysql

# Test connection
docker exec -it pdflab-mysql-prod mysql -uroot -p

# Check database exists
docker exec pdflab-mysql-prod mysql -uroot -p -e "SHOW DATABASES;"
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean old Docker images
docker system prune -a

# Clean old backups (keep last 7 days)
find /var/pdflab/backups -type d -mtime +7 -exec rm -rf {} \;

# Clean old conversion files
find /var/pdflab/storage -type f -mtime +7 -delete
```

### Port Already in Use

```bash
# Find process using port
netstat -tulpn | grep :3006

# Kill process
kill -9 <PID>
```

---

## Post-Deployment Checklist

- [ ] VPS system updated
- [ ] Docker and Docker Compose installed
- [ ] MySQL database created and migrated
- [ ] Application environment variables configured
- [ ] All Docker containers running
- [ ] Backend API accessible (http://141.136.44.168:3006/api/health)
- [ ] Frontend accessible (http://141.136.44.168:3000)
- [ ] Firewall configured
- [ ] Nginx reverse proxy setup (optional)
- [ ] SSL certificate installed (optional)
- [ ] Automated backups configured
- [ ] Monitoring setup
- [ ] Test file upload/conversion
- [ ] Test payment flow

---

## Quick Reference Commands

```bash
# Connect to VPS
ssh root@141.136.44.168

# Navigate to app
cd /var/pdflab/app

# View logs
docker logs pdflab-backend-prod -f

# Restart services
docker compose -f docker-compose.production.yml restart

# Update app
git pull && docker compose -f docker-compose.production.yml up -d

# Run backup
bash /var/pdflab/scripts/backup-storage.sh

# Check disk space
df -h /var/pdflab

# Monitor containers
docker stats
```

---

## Support

For issues or questions:
- Check logs: `/var/pdflab/logs/`
- Review Docker logs: `docker logs <container_name>`
- Check GitHub issues: https://github.com/mkelam/PDFLab/issues
- Review STORAGE_ARCHITECTURE.md for storage-related issues

---

**Last Updated**: 2025-11-04
**VPS IP**: 141.136.44.168
**Deployment Status**: Ready for production
