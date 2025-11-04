# PDFLab Deployment Scripts

This directory contains automated deployment scripts for deploying PDFLab to production VPS environments (like Hostinger).

## Quick Start

### 1. Upload Files to VPS

First, upload these files to your VPS:

```bash
# From your local machine, upload to VPS
scp -r scripts/* your-username@your-vps-ip:/opt/pdflab/
scp docker-compose.production.yml your-username@your-vps-ip:/opt/pdflab/
scp .env.production.example your-username@your-vps-ip:/opt/pdflab/
```

### 2. SSH into Your VPS

```bash
ssh your-username@your-vps-ip
```

### 3. Install Docker & Docker Compose (if not installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
exit
```

### 4. Run Environment Setup Script

This interactive script will create your production `.env` file:

```bash
cd /opt/pdflab
sudo bash setup-env.sh
```

**You will be prompted for:**
- API URL (e.g., `https://api.yourdomain.com`)
- CloudConvert API key
- PayFast Merchant ID and Key
- CORS origins (your frontend domains)

The script will automatically generate:
- Strong database password
- Strong Redis password
- JWT secret
- PayFast passphrase

**IMPORTANT**: Save the generated credentials displayed at the end!

### 5. Run Deployment Script

Once `.env` is configured, run the deployment:

```bash
cd /opt/pdflab
sudo bash deploy-vps.sh
```

This script will:
1. Check prerequisites (Docker, Docker Compose, .env file)
2. Backup current deployment (if exists)
3. Pull latest Docker images from Docker Hub
4. Stop old containers
5. Start new containers
6. Run health checks
7. Clean up old images

### 6. Verify Deployment

Run the health check script:

```bash
cd /opt/pdflab
bash health-check.sh
```

This will verify:
- All containers are running
- MySQL database is accessible
- Redis is responding
- Backend API is healthy
- Worker is processing jobs
- Frontend is serving pages
- Disk space is adequate
- Ports are listening

---

## Scripts Overview

### `setup-env.sh` - Environment Configuration

**Purpose**: Interactive script to create production `.env` file with strong security defaults.

**Usage**:
```bash
sudo bash setup-env.sh
```

**Features**:
- Automatically generates secure passwords (32+ characters)
- Generates JWT secret (64 characters)
- Generates PayFast passphrase
- Creates credentials summary file
- Sets proper file permissions (600)
- Backs up existing .env if present

**What You Need**:
- CloudConvert API key (from https://cloudconvert.com/dashboard)
- PayFast Merchant ID and Key (from https://www.payfast.io/)
- Your production domain(s)

**Output**:
- `/opt/pdflab/.env` - Production environment file
- `/opt/pdflab/credentials.txt` - Temporary credentials file (delete after saving!)

---

### `deploy-vps.sh` - Automated Deployment

**Purpose**: Automated deployment script with backup and rollback capabilities.

**Usage**:
```bash
sudo bash deploy-vps.sh
```

**Deployment Flow**:
1. **Pre-deployment Checks**
   - Verify Docker is installed and running
   - Check Docker Compose is available
   - Verify `.env` file exists
   - Check if running with proper permissions

2. **Backup Current Deployment**
   - Export MySQL database to `/opt/pdflab/backups/backup_YYYYMMDD_HHMMSS/`
   - Archive storage directory
   - Backup `.env` file
   - Compress all backups

3. **Pull Latest Images**
   - `mkelam/pdflab-frontend:production`
   - `mkelam/pdflab-backend:production`
   - `mkelam/pdflab-worker:production`
   - `mysql:8.0`
   - `redis:7-alpine`

4. **Stop Old Containers**
   - Gracefully stop all PDFLab containers
   - Preserve data volumes

5. **Start New Deployment**
   - Start containers using `docker-compose.production.yml`
   - Wait for health checks
   - Verify service dependencies

6. **Health Checks**
   - Wait for MySQL to be healthy (max 120s)
   - Wait for Redis to be healthy (max 60s)
   - Wait for Backend to be healthy (max 120s)
   - Check Worker is running
   - Wait for Frontend to be healthy (max 120s)
   - Test backend `/health` endpoint

7. **Post-deployment**
   - Show container status
   - Clean up old Docker images
   - Display disk usage
   - Show access URLs

**Error Handling**:
- Automatic rollback on failure
- Restores database from latest backup
- Restarts previous containers
- Logs all errors to `/var/log/pdflab-deploy.log`

**Configuration Variables** (at top of script):
```bash
APP_DIR="/opt/pdflab"              # Application directory
BACKUP_DIR="/opt/pdflab/backups"   # Backup storage
LOG_FILE="/var/log/pdflab-deploy.log"  # Deployment log
```

---

### `health-check.sh` - System Verification

**Purpose**: Comprehensive health check for all PDFLab services.

**Usage**:
```bash
bash health-check.sh
```

**10-Point Health Check**:

1. **Docker Installation**
   - Verify Docker is installed
   - Check Docker daemon is running

2. **Docker Compose**
   - Verify Docker Compose is installed
   - Display version

3. **Container Status**
   - Check all 5 containers are running:
     - pdflab-mysql
     - pdflab-redis
     - pdflab-backend
     - pdflab-worker
     - pdflab-frontend
   - Verify health status for each

4. **MySQL Database**
   - Test MySQL ping
   - Verify database exists
   - Count tables

5. **Redis Cache**
   - Test Redis PING
   - Display key count

6. **Backend API**
   - Test `/health` endpoint
   - Verify database connection
   - Verify Redis connection
   - Check logs for errors

7. **Worker**
   - Verify worker is running
   - Check startup messages
   - Scan logs for errors

8. **Frontend**
   - Test HTTP 200 response
   - Verify port 3000 is serving

9. **Disk Space**
   - Display Docker disk usage
   - Check system disk usage
   - Warn if >80% full

10. **Network**
    - Verify port 3000 is listening
    - Verify port 3006 is listening

**Exit Codes**:
- `0` - All checks passed
- `1` - One or more checks failed

**Output**:
- Colorized pass/fail/warning messages
- Summary with pass/fail counts
- Troubleshooting suggestions on failure

---

## Production `docker-compose.yml`

The `docker-compose.production.yml` file is configured to:

1. **Pull images from Docker Hub** (not build locally)
   - `mkelam/pdflab-frontend:production`
   - `mkelam/pdflab-backend:production`
   - `mkelam/pdflab-worker:production`

2. **Use environment variables** from `.env` file
   - All secrets loaded from .env
   - Fallback defaults for non-sensitive values

3. **Configure health checks** for all services
   - MySQL: mysqladmin ping
   - Redis: redis-cli ping
   - Backend: custom healthcheck.js
   - Frontend: wget spider check

4. **Set resource limits**
   - Prevents runaway processes
   - Ensures fair resource allocation
   - Backend: 2GB max memory
   - Worker: 1GB max memory
   - Frontend: 512MB max memory

5. **Enable auto-restart** policies
   - `restart: unless-stopped` for all services
   - Automatic recovery from failures

6. **Persist data** with Docker volumes
   - `mysql_data` - Database storage
   - `redis_data` - Redis persistence
   - `backend_storage` - Uploaded files

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Production API URL | `https://api.pdflab.com` |
| `CLOUDCONVERT_API_KEY` | CloudConvert production API key | `eyJ0eXAiOi...` |
| `JWT_SECRET` | JWT signing secret (64+ chars) | Auto-generated |
| `DB_PASSWORD` | MySQL password (32+ chars) | Auto-generated |
| `REDIS_PASSWORD` | Redis password (32+ chars) | Auto-generated |
| `PAYFAST_MERCHANT_ID` | PayFast merchant ID | `10012345` |
| `PAYFAST_MERCHANT_KEY` | PayFast merchant key | `abcdef123456` |
| `PAYFAST_PASSPHRASE` | PayFast passphrase (16+ chars) | Auto-generated |
| `CORS_ORIGIN` | Allowed frontend domains | `https://pdflab.com,https://www.pdflab.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | MySQL username | `pdflab` |
| `DB_NAME` | Database name | `pdflab` |
| `DB_ROOT_PASSWORD` | MySQL root password | `rootpassword` |
| `CLOUDCONVERT_SANDBOX` | Use CloudConvert sandbox | `false` |
| `PAYFAST_MODE` | PayFast mode | `production` |
| `JWT_EXPIRATION` | JWT token expiration | `7d` |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration | `30d` |

---

## Troubleshooting

### Script Permission Denied

```bash
chmod +x setup-env.sh deploy-vps.sh health-check.sh
```

### Docker Permission Denied

```bash
sudo usermod -aG docker $USER
# Logout and login again
```

### Deployment Failed - Rollback

The deployment script automatically rolls back on failure. To manually rollback:

```bash
cd /opt/pdflab/backups
ls -lt  # Find latest backup
cd backup_YYYYMMDD_HHMMSS
gunzip database.sql.gz
docker exec -i pdflab-mysql mysql -updflab -p < database.sql
```

### Container Won't Start

```bash
# Check logs
docker logs pdflab-backend
docker logs pdflab-worker
docker logs pdflab-frontend

# Restart specific container
docker restart pdflab-backend

# Restart all
docker-compose -f docker-compose.production.yml restart
```

### Database Connection Failed

```bash
# Check MySQL container
docker ps | grep mysql
docker logs pdflab-mysql

# Test connection
docker exec -it pdflab-mysql mysql -updflab -p

# Verify .env credentials match
cat /opt/pdflab/.env | grep DB_
```

### Port Already in Use

```bash
# Find process using port 3000
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Remove old backups
cd /opt/pdflab/backups
ls -lt | tail -n +6 | awk '{print $9}' | xargs rm -rf
```

---

## Updating the Application

### Update to Latest Version

```bash
cd /opt/pdflab
sudo bash deploy-vps.sh
```

The deployment script will:
1. Backup current data
2. Pull latest images from Docker Hub
3. Deploy new version
4. Rollback if anything fails

### Update Specific Service

```bash
# Pull latest image
docker pull mkelam/pdflab-backend:production

# Restart service
docker-compose -f docker-compose.production.yml up -d backend
```

---

## Security Best Practices

1. **Never commit `.env`** to version control
2. **Use strong passwords** (32+ characters, auto-generated)
3. **Enable firewall** on VPS
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```
4. **Delete credentials file** after saving
   ```bash
   sudo rm /opt/pdflab/credentials.txt
   ```
5. **Regular backups** - Deployment script creates automatic backups
6. **Monitor logs** regularly
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```
7. **Keep Docker updated**
   ```bash
   sudo apt update && sudo apt upgrade docker-ce
   ```

---

## Additional Resources

- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md` in project root
- **Environment Setup**: See `.env.production.example` for all variables
- **Architecture Docs**: See `BACKGROUND_JOBS_ARCHITECTURE.md`
- **API Documentation**: See `API_DOCUMENTATION.md`

---

## Support

If you encounter issues:

1. Run `bash health-check.sh` to diagnose problems
2. Check logs: `docker-compose -f docker-compose.production.yml logs`
3. Review backup: `/opt/pdflab/backups/`
4. Check deployment log: `/var/log/pdflab-deploy.log`

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0
