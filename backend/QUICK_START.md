# PDFLab Backend - Quick Start Guide

## 🚀 Deploy to Production (5 Minutes)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 20+ installed (for local build)
- `.env` file configured

### Option 1: Standard Deployment

```bash
# 1. Validate environment
cd backend
sh scripts/pre-build-check.sh

# 2. Build Docker image
sh scripts/docker-build-safe.sh

# 3. Start all services
cd ..
docker-compose -f docker-compose.production.yml up -d

# 4. Check health (wait 40s for startup)
sleep 40
curl http://localhost:3006/health

# Done! 🎉
```

### Option 2: One-Command Deployment

```bash
# Run everything in one go
cd backend && \
sh scripts/pre-build-check.sh && \
sh scripts/docker-build-safe.sh && \
cd .. && \
docker-compose -f docker-compose.production.yml up -d && \
echo "Waiting for startup..." && \
sleep 40 && \
curl http://localhost:3006/health && \
echo "\n✅ Deployment complete!"
```

---

## 🔧 Common Operations

### Check Status
```bash
# All containers
docker ps

# Backend health
docker inspect --format='{{.State.Health.Status}}' pdflab-backend-prod

# Logs
docker logs pdflab-backend-prod --tail 50 --follow
```

### Restart Services
```bash
# Restart backend only
docker restart pdflab-backend-prod

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Force rebuild and restart
docker-compose -f docker-compose.production.yml up -d --force-recreate backend
```

### Update to New Version
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
cd backend && \
sh scripts/docker-build-safe.sh && \
cd .. && \
docker-compose -f docker-compose.production.yml up -d --no-deps backend
```

---

## 🐛 Troubleshooting

### Build Fails?
```bash
# Run diagnostics
cd backend
sh scripts/pre-build-check.sh

# Fix TypeScript errors locally
npm run typecheck
npm run build
```

### Container Won't Start?
```bash
# Check logs
docker logs pdflab-backend-prod --tail 100

# Verify database is running
docker ps | grep mysql

# Start database if needed
docker start pdflab-mysql-prod pdflab-redis-prod

# Restart backend
docker restart pdflab-backend-prod
```

### Container Unhealthy?
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' pdflab-backend-prod

# Test health endpoint
curl http://localhost:3006/health

# Check resource usage
docker stats pdflab-backend-prod

# Restart
docker restart pdflab-backend-prod
```

---

## 📊 Monitoring (Optional but Recommended)

```bash
# Start continuous monitoring
cd backend
sh scripts/monitor-and-recover.sh

# Monitor in background
nohup sh scripts/monitor-and-recover.sh > /tmp/monitor.log 2>&1 &
```

---

## 🆘 Emergency Procedures

### Complete System Restart
```bash
# Stop all containers
docker-compose -f docker-compose.production.yml down

# Start all containers fresh
docker-compose -f docker-compose.production.yml up -d

# Wait and verify
sleep 40
docker ps
curl http://localhost:3006/health
```

### Rollback to Previous Version
```bash
# Revert code
git log --oneline  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild and deploy
cd backend && sh scripts/docker-build-safe.sh
cd .. && docker-compose -f docker-compose.production.yml up -d backend
```

### Nuclear Option (Last Resort)
```bash
# Stop everything
docker-compose -f docker-compose.production.yml down -v

# Remove old images
docker rmi pdflab-backend:production

# Clean rebuild
cd backend && \
rm -rf node_modules dist package-lock.json && \
npm install && \
npm run build && \
sh scripts/docker-build-safe.sh

# Deploy fresh
cd .. && docker-compose -f docker-compose.production.yml up -d
```

---

## 📚 Full Documentation

For detailed information, see [DOCKER_RELIABILITY_GUIDE.md](../DOCKER_RELIABILITY_GUIDE.md)

---

**Generated**: 2025-11-01
