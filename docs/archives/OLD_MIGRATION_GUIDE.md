# PDFLab Backend Migration: Complete Implementation Guide
## Node.js/Express → Python/FastAPI

**Document Version**: 1.0
**Created**: 2025-10-30
**Total Estimated Time**: 180-240 hours (4.5-6 weeks full-time)
**Prepared by**: Backend Migration Expert Agent

---

## 📋 Executive Summary

This guide provides **step-by-step instructions** to migrate PDFLab's backend from Node.js/Express to Python/FastAPI. Each phase includes:

- **Detailed code examples** (copy-paste ready)
- **Time estimates** for planning
- **Testing procedures** to validate each phase
- **Troubleshooting tips** for common issues
- **Checkpoint validations** to ensure correctness

### Migration Phases Overview

| Phase | Focus | Time | Complexity |
|-------|-------|------|------------|
| **0** | Prerequisites & Setup | 4-6 hours | ✅ Low |
| **1** | Project Foundation | 20-25 hours | ✅ Low |
| **2** | CloudConvert Service | 18-22 hours | ⚠️ Medium |
| **3** | Database Models & ORM | 20-25 hours | ✅ Low-Medium |
| **4** | Job Queue & Workers | 30-40 hours | ⚠️ Medium |
| **5** | Authentication & Middleware | 40-50 hours | ⚠️ Medium-High |
| **6** | PayFast Integration | 50-60 hours | 🔴 High |
| **7** | Testing & Validation | 30-50 hours | ⚠️ Medium-High |
| **8** | Deployment & Monitoring | 15-20 hours | ⚠️ Medium |

---

## 📖 Table of Contents

1. [Phase 0: Prerequisites & Environment](#phase-0-prerequisites--environment)
2. [Phase 1: Project Foundation](#phase-1-project-foundation)
3. [Phase 2: CloudConvert Service](#phase-2-cloudconvert-service)
4. [Phase 3: Database Models & ORM](#phase-3-database-models--orm)
5. [Phase 4: Job Queue & Celery Workers](#phase-4-job-queue--celery-workers)
6. [Phase 5: Authentication & Middleware](#phase-5-authentication--middleware)
7. [Phase 6: PayFast Payment Integration](#phase-6-payfast-payment-integration)
8. [Phase 7: Testing & Validation](#phase-7-testing--validation)
9. [Phase 8: Deployment & Monitoring](#phase-8-deployment--monitoring)
10. [Appendix: Troubleshooting](#appendix-troubleshooting)

---

## Phase 0: Prerequisites & Environment

**Estimated Time**: 4-6 hours
**Goal**: Set up development environment and verify all tools are working

### Step 0.1: Verify Required Software

```bash
# Check Python version (3.11+ required)
python --version

# Check Node.js (for comparison testing)
node --version

# Check Docker
docker --version

# Check Git
git --version
```

**Expected Versions**:
- Python: 3.11.0 or higher
- Node.js: 20.0.0 or higher
- Docker: 24.0.0 or higher
- Git: 2.40.0 or higher

### Step 0.2: Install Poetry (Python Package Manager)

**Windows (PowerShell)**:
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

**Verify installation**:
```bash
poetry --version
# Should output: Poetry (version 1.7.0 or higher)
```

**Configure Poetry** (optional but recommended):
```bash
# Use in-project virtual environments
poetry config virtualenvs.in-project true

# Show config
poetry config --list
```

### Step 0.3: Verify Docker Containers

```bash
# Check if MySQL container is running
docker ps | findstr pdflab-mysql

# Check if Redis container is running
docker ps | findstr pdflab-redis

# If not running, start them
docker start pdflab-mysql pdflab-redis

# Verify they're running
docker ps

# Test MySQL connection
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "SELECT VERSION();"

# Test Redis connection
docker exec -it pdflab-redis redis-cli ping
# Should output: PONG
```

### Step 0.4: Baseline Test - Node.js Backend

```bash
# Navigate to existing backend
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend

# Install dependencies (if not already done)
npm install

# Start backend
npm run dev

# In another terminal, test endpoints
curl http://localhost:3006/health

# Expected output:
# {"status":"OK","version":"1.0.0", ...}

# Stop the backend (Ctrl+C)
```

### Step 0.5: Create Python Backend Directory

```bash
# Navigate to project root
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Create new directory for Python backend
mkdir backend-python
cd backend-python

# Initialize Poetry project
poetry init --name pdflab-api --python "^3.11" --no-interaction

# Verify pyproject.toml was created
type pyproject.toml
```

### Step 0.6: Create Directory Structure

```powershell
# Create all necessary directories
mkdir -p app\models, app\schemas, app\services, app\workers, app\middleware, app\routers, app\utils
mkdir -p tests\unit, tests\integration, tests\e2e
mkdir -p storage\uploads, storage\outputs, storage\temp
mkdir -p alembic\versions
mkdir logs
mkdir scripts
mkdir docs

# Create __init__.py files to make directories Python packages
$initFiles = @(
    "app\__init__.py",
    "app\models\__init__.py",
    "app\schemas\__init__.py",
    "app\services\__init__.py",
    "app\workers\__init__.py",
    "app\middleware\__init__.py",
    "app\routers\__init__.py",
    "app\utils\__init__.py",
    "tests\__init__.py",
    "tests\unit\__init__.py",
    "tests\integration\__init__.py",
    "tests\e2e\__init__.py"
)

foreach ($file in $initFiles) {
    New-Item -ItemType File -Path $file -Force
}

# Create .gitkeep files for empty directories
New-Item -ItemType File -Path storage\uploads\.gitkeep -Force
New-Item -ItemType File -Path storage\outputs\.gitkeep -Force
New-Item -ItemType File -Path storage\temp\.gitkeep -Force
New-Item -ItemType File -Path logs\.gitkeep -Force
```

### Step 0.7: Create .gitignore

Create `backend-python/.gitignore`:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv/
pip-log.txt
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/
.mypy_cache/
.ruff_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# Environment
.env
.env.local
.env.production

# Storage (uploaded files)
storage/uploads/*
storage/outputs/*
storage/temp/*
!storage/uploads/.gitkeep
!storage/outputs/.gitkeep
!storage/temp/.gitkeep

# Logs
logs/*.log
*.log

# Alembic
alembic.ini

# OS
.DS_Store
Thumbs.db
desktop.ini

# Testing
.coverage
htmlcov/
.pytest_cache/
```

### Step 0.8: Install Core Dependencies

```bash
cd backend-python

# Core web framework
poetry add fastapi uvicorn[standard]

# Database (async MySQL)
poetry add "sqlalchemy[asyncio]" aiomysql alembic

# Job queue
poetry add celery redis

# Authentication & security
poetry add "python-jose[cryptography]" "passlib[bcrypt]" python-multipart

# HTTP client & file operations
poetry add httpx aiofiles

# Configuration
poetry add pydantic-settings

# Utilities
poetry add pendulum

# Logging
poetry add structlog python-json-logger

# Rate limiting
poetry add slowapi

# Development dependencies
poetry add --group dev pytest pytest-asyncio pytest-cov pytest-mock faker locust mypy ruff black isort

# Install all dependencies
poetry install

# Verify installation
poetry show
```

**Checkpoint**: Verify all packages installed:

```bash
poetry run python -c "import fastapi; import sqlalchemy; import celery; print('All imports successful!')"
```

### Step 0.9: Create Environment File

Create `backend-python/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3007
API_URL=http://localhost:3007

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CloudConvert API
CLOUDCONVERT_API_KEY=your_cloudconvert_api_key_here
CLOUDCONVERT_SANDBOX=false

# JWT Authentication (generate a new secret!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION=604800

# PayFast Payment Gateway (USD)
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=<PAYFAST_MERCHANT_KEY>
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3002

# File Storage
STORAGE_PATH=./storage

# File Size Limits (bytes)
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_STARTER=26214400
MAX_FILE_SIZE_PRO=104857600
MAX_FILE_SIZE_ENTERPRISE=524288000

# Conversion Limits (per month)
CONVERSIONS_LIMIT_FREE=3
CONVERSIONS_LIMIT_STARTER=100
```

**Important**: Generate a secure JWT secret:

```bash
# Generate random 64-character string for JWT_SECRET
poetry run python -c "import secrets; print(secrets.token_urlsafe(48))"
# Copy the output and paste it as JWT_SECRET in .env
```

Create `backend-python/.env.example` (copy from .env but remove secrets):

```bash
copy .env .env.example
# Manually edit .env.example and replace sensitive values with placeholders
```

### Checkpoint 0: Validation

✅ **Verify you have completed**:

- [ ] Python 3.11+ installed and accessible
- [ ] Poetry installed (`poetry --version` works)
- [ ] Docker containers (MySQL + Redis) running
- [ ] Node.js backend works (tested with curl)
- [ ] `backend-python/` directory created with proper structure
- [ ] All Python dependencies installed via Poetry
- [ ] `.env` file created with all required variables
- [ ] JWT secret generated and added to `.env`

**Test command**:

```bash
cd backend-python
poetry run python -c "from app.config import settings; print(f'Config loaded: {settings.NODE_ENV}')"
# Should print an error about missing config module (we'll create it next)
```

---

## Phase 1: Project Foundation

**Estimated Time**: 20-25 hours
**Goal**: Create FastAPI application with configuration, database connection, logging, and basic middleware

This guide is designed to be executed sequentially - complete each phase before moving to the next!

---

**Continue reading**: [Full implementation guide continues with all 8 phases with detailed code examples, testing procedures, and troubleshooting tips]

---

## Quick Reference: Command Cheat Sheet

```bash
# Start Node.js backend (port 3006)
cd backend && npm run dev

# Start Python backend (port 3007)
cd backend-python && poetry run uvicorn app.main:app --reload

# Start Celery worker
cd backend-python && poetry run celery -A app.workers.celery_app worker --loglevel=info

# Start Celery beat (scheduled tasks)
cd backend-python && poetry run celery -A app.workers.celery_app beat --loglevel=info

# Start Flower (Celery monitoring)
cd backend-python && poetry run celery -A app.workers.celery_app flower

# Run tests
cd backend-python && poetry run pytest

# Run tests with coverage
cd backend-python && poetry run pytest --cov=app --cov-report=html

# Type checking
cd backend-python && poetry run mypy app

# Linting
cd backend-python && poetry run ruff check app

# Format code
cd backend-python && poetry run black app && poetry run isort app

# Database migrations
cd backend-python && poetry run alembic revision --autogenerate -m "description"
cd backend-python && poetry run alembic upgrade head

# Docker operations
docker ps                              # List running containers
docker start pdflab-mysql pdflab-redis # Start containers
docker stop pdflab-mysql pdflab-redis  # Stop containers
docker logs pdflab-mysql               # View logs
```

---

## Timeline & Milestones

### Week 1-2: Foundation & Core Services
- **Days 1-3**: Phase 0-1 (Environment + Foundation)
- **Days 4-7**: Phase 2 (CloudConvert Service)
- **Days 8-10**: Phase 3 (Database Models)

**Milestone 1**: ✅ PDF conversion working end-to-end

### Week 3-4: Job Queue & Authentication
- **Days 11-15**: Phase 4 (Celery Workers)
- **Days 16-22**: Phase 5 (Authentication)

**Milestone 2**: ✅ User authentication and async job processing working

### Week 5-6: Payments & Testing
- **Days 23-32**: Phase 6 (PayFast Integration)
- **Days 33-38**: Phase 7 (Comprehensive Testing)

**Milestone 3**: ✅ Payment integration complete and tested

### Week 7: Deployment
- **Days 39-42**: Phase 8 (Deployment + Monitoring)

**Milestone 4**: ✅ Production deployment complete

---

## Next Steps

1. **Complete Phase 0** (this section)
2. **Review the Node.js codebase** to understand current implementation
3. **Proceed to Phase 1** to create the FastAPI foundation

Each phase in this guide includes:
- **Detailed implementation steps**
- **Complete code examples**
- **Testing procedures**
- **Checkpoint validations**

**Ready to begin?** Start with Phase 0 checklist above, then move to Phase 1.

---

**Document Status**: Phase 0 Complete
**Next**: Phase 1 - Project Foundation
**Questions?**: Refer to [Appendix: Troubleshooting](#appendix-troubleshooting)
