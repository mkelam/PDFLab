# PDFLab Docker Deployment Guide

This guide covers deploying PDFLab using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum (4GB recommended)
- 10GB disk space

## Quick Start (Development)

### 1. Start Existing Services (MySQL + Redis)

```bash
docker start pdflab-mysql pdflab-redis
```

### 2. Build and Start Backend Container

```bash
# Build backend image
cd backend
docker build -t pdflab-backend .

# Or use docker-compose from project root
cd ..
docker-compose up -d mysql redis backend
```

### 3. Verify Backend is Running

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend

# Test health endpoint
curl http://localhost:3006/health
```

## Production Deployment

### Step 1: Environment Setup

```bash
# Copy environment template
cp backend/.env.docker backend/.env

# Edit with your production values
nano backend/.env
```

**Critical values to change:**
- `JWT_SECRET` - Generate secure random string (32+ chars)
- `DB_ROOT_PASSWORD` - Strong MySQL root password
- `DB_PASSWORD` - Strong database password
- `CLOUDCONVERT_API_KEY` - Your CloudConvert API key
- `PAYFAST_MERCHANT_ID` - Your PayFast merchant ID
- `PAYFAST_MERCHANT_KEY` - Your PayFast merchant key
- `SMTP_USER` and `SMTP_PASS` - Email credentials

### Step 2: Build All Services

```bash
# Build all images
docker-compose build

# Or build specific service
docker-compose build backend
```

### Step 3: Start Production Stack

```bash
# Start all services in detached mode
docker-compose up -d

# Watch startup logs
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Check backend health
curl http://localhost:3006/health

# Check database connection
docker-compose exec backend node -e "require('./dist/config/database').sequelize.authenticate().then(() => console.log('DB OK'))"
```

## Service Architecture

```
┌─────────────────────────────────────────┐
│  Docker Compose Stack                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Frontend   │  │   Backend    │   │
│  │  (Next.js)   │  │  (Express)   │   │
│  │  Port 3000   │  │  Port 3006   │   │
│  └──────┬───────┘  └───────┬──────┘   │
│         │                  │           │
│         └──────┬───────────┘           │
│                │                       │
│  ┌─────────────┴────────────────────┐ │
│  │                                  │ │
│  │  ┌─────────┐      ┌──────────┐  │ │
│  │  │  MySQL  │      │  Redis   │  │ │
│  │  │  :3306  │      │  :6379   │  │ │
│  │  └─────────┘      └──────────┘  │ │
│  │                                  │ │
│  │  ┌──────────┐                   │ │
│  │  │  Worker  │  (Bull Queue)     │ │
│  │  └──────────┘                   │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## Volume Management

### Persistent Data

Data is stored in named Docker volumes:

- `mysql_data` - MySQL database files
- `redis_data` - Redis persistence files

Additional bind mounts:
- `./backend/storage` - Uploaded and converted files
- `./backend/logs` - Application logs
- `./backend/backups` - Database backups

### Backup Volumes

```bash
# Backup MySQL volume
docker run --rm \
  -v pdflab_mysql_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mysql_$(date +%Y%m%d).tar.gz /data

# Backup Redis volume
docker run --rm \
  -v pdflab_redis_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis_$(date +%Y%m%d).tar.gz /data
```

## Database Management

### Run Migrations

```bash
docker-compose exec backend npm run migrate
```

### Access MySQL Console

```bash
docker-compose exec mysql mysql -u pdflab -p pdflab
```

### Create Database Backup

```bash
docker-compose exec mysql mysqldump \
  -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} \
  > backups/pdflab_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker-compose exec -T mysql mysql \
  -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} \
  < backups/pdflab_20250101.sql
```

## Scaling

### Add More Workers

```bash
docker-compose up -d --scale worker=3
```

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Stats

```bash
docker stats
```

### Health Checks

All services have built-in health checks:

```bash
docker-compose ps
```

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec backend env | grep DB_

# Rebuild container
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Database Connection Failed

```bash
# Verify MySQL is healthy
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Test connection manually
docker-compose exec backend node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'mysql',
  user: 'pdflab',
  password: '***REMOVED***',
  database: 'pdflab'
}).then(() => console.log('OK')).catch(console.error);
"
```

### Reset Everything

```bash
# Stop and remove all containers
docker-compose down

# Remove volumes (WARNING: Deletes all data!)
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Set strong `JWT_SECRET`
- [ ] Configure CloudConvert API key
- [ ] Set up PayFast credentials
- [ ] Configure SMTP for emails
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Set up automated backups
- [ ] Configure monitoring (UptimeRobot, Sentry)
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common issues

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend

# View service status
docker-compose ps

# Execute command in container
docker-compose exec backend npm run migrate

# Access container shell
docker-compose exec backend sh

# View resource usage
docker stats

# Prune unused images/containers
docker system prune -a
```

## Next Steps

1. **Week 1**: Test backend container locally
2. **Week 2**: Add frontend Dockerfile and test full stack
3. **Week 3**: Deploy to Hostinger VPS staging
4. **Week 4**: Production deployment with monitoring

---

**Last Updated**: 2025-11-01
**Docker Compose Version**: 3.8
**Minimum Docker Engine**: 20.10+
