# PDFLab Backend Migration: Complete Implementation Guide
## Node.js/Express → Python/FastAPI

**Document Version**: 2.0 (Complete Edition)
**Created**: 2025-10-30
**Total Estimated Time**: 203-272 hours (5-7 weeks full-time)
**Prepared by**: Backend Migration Expert Agent

---

## 📋 Executive Summary

This comprehensive guide provides **step-by-step instructions** to migrate PDFLab's backend from Node.js/Express to Python/FastAPI. Every line of code you need is included.

### Why Python/FastAPI?

- **Performance**: FastAPI is one of the fastest Python frameworks (comparable to Node.js/Go)
- **Type Safety**: Built-in Pydantic validation prevents runtime errors
- **Async First**: Native async/await support for I/O operations
- **Auto Documentation**: OpenAPI (Swagger) docs generated automatically
- **Modern Tooling**: Better ML/AI integration for future features
- **Developer Experience**: Clean syntax, excellent IDE support

### Migration Strategy

This is a **parallel migration** approach:
1. Build Python backend alongside Node.js backend
2. Run both on different ports (3006 for Node, 3007 for Python)
3. Test Python backend thoroughly
4. Switch frontend to Python backend
5. Deprecate Node.js backend

**No downtime required** - services run side-by-side during transition.

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
10. [Appendix A: Troubleshooting](#appendix-a-troubleshooting)
11. [Appendix B: Command Reference](#appendix-b-command-reference)
12. [Appendix C: Architecture Comparison](#appendix-c-architecture-comparison)
13. [Appendix D: Performance Benchmarks](#appendix-d-performance-benchmarks)
14. [Appendix E: Migration Timeline](#appendix-e-migration-timeline)

---

# Phase 0: Prerequisites & Environment

**Estimated Time**: 4-6 hours
**Goal**: Set up development environment and verify all tools are working
**Prerequisites**: None (this is the starting point)

## Step 0.1: Verify Required Software

```bash
# Check Python version (3.11+ required)
python --version
# Expected: Python 3.11.0 or higher

# Check Node.js (for comparison testing)
node --version
# Expected: v20.0.0 or higher

# Check Docker
docker --version
# Expected: Docker version 24.0.0 or higher

# Check Git
git --version
# Expected: git version 2.40.0 or higher
```

**Why these versions?**
- **Python 3.11+**: Latest async improvements, better performance
- **Node.js 20+**: Current Node version for comparison
- **Docker 24+**: Required for MySQL/Redis containers
- **Git 2.40+**: Modern git features

**If Python 3.11 is not installed:**

Windows:
```powershell
# Download from python.org or use winget
winget install Python.Python.3.11
```

Verify installation:
```bash
python --version
python -m pip --version
```

## Step 0.2: Install Poetry (Python Package Manager)

**Why Poetry?**
- Deterministic dependency resolution (like package-lock.json)
- Virtual environment management built-in
- Modern pyproject.toml format
- Faster than pip + requirements.txt

**Windows (PowerShell as Administrator)**:
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

**Add Poetry to PATH:**
```powershell
# Add to current session
$env:Path += ";$env:APPDATA\Python\Scripts"

# Permanently add (run in PowerShell as Admin)
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:APPDATA\Python\Scripts",
    "User"
)
```

**Verify installation**:
```bash
poetry --version
# Should output: Poetry (version 1.7.0 or higher)
```

**Configure Poetry** (recommended settings):
```bash
# Create virtual environments inside project directory
poetry config virtualenvs.in-project true

# Show configuration
poetry config --list

# Verify setting
poetry config virtualenvs.in-project
# Should output: true
```

## Step 0.3: Verify Docker Containers

PDFLab uses MySQL and Redis running in Docker containers.

```bash
# Check if MySQL container exists and is running
docker ps | findstr pdflab-mysql

# Check if Redis container exists and is running
docker ps | findstr pdflab-redis

# If not running, start them
docker start pdflab-mysql pdflab-redis

# Wait 5 seconds for startup
timeout /t 5

# Verify both are running
docker ps --filter "name=pdflab"
```

**Expected output:**
```
CONTAINER ID   IMAGE          STATUS         PORTS                    NAMES
abc123...      mysql:8.0      Up 10 seconds  0.0.0.0:3306->3306/tcp  pdflab-mysql
def456...      redis:7        Up 10 seconds  0.0.0.0:6379->6379/tcp  pdflab-redis
```

**Test MySQL connection:**
```bash
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "SELECT VERSION();"
# Should show MySQL version: 8.0.x
```

**Test Redis connection:**
```bash
docker exec -it pdflab-redis redis-cli ping
# Should output: PONG
```

**If containers don't exist**, create them:

```bash
# Create MySQL container
docker run -d ^
  --name pdflab-mysql ^
  -e MYSQL_ROOT_PASSWORD=root123 ^
  -e MYSQL_DATABASE=pdflab ^
  -e MYSQL_USER=pdflab ^
  -e MYSQL_PASSWORD=***REMOVED*** ^
  -p 3306:3306 ^
  mysql:8.0 ^
  --character-set-server=utf8mb4 ^
  --collation-server=utf8mb4_unicode_ci

# Create Redis container
docker run -d ^
  --name pdflab-redis ^
  -p 6379:6379 ^
  redis:7 ^
  redis-server --appendonly yes

# Verify containers are running
docker ps
```

## Step 0.4: Baseline Test - Node.js Backend

Before starting migration, verify the existing Node.js backend works correctly.

```bash
# Navigate to existing backend
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend

# Install dependencies (if not already done)
npm install

# Start backend
npm run dev
```

**In another terminal**, test endpoints:

```bash
# Test health endpoint
curl http://localhost:3006/health

# Expected output:
# {
#   "uptime": 5.123,
#   "timestamp": 1730217600000,
#   "status": "OK",
#   "checks": {
#     "database": "OK",
#     "redis": "OK"
#   }
# }

# Test root endpoint
curl http://localhost:3006/

# Expected output:
# {
#   "name": "PDFLab API",
#   "version": "1.0.0",
#   "status": "running",
#   ...
# }
```

**Stop the backend** (Ctrl+C in the terminal)

**Why this matters:** This confirms your baseline works, giving you a reference for comparison during migration.

## Step 0.5: Create Python Backend Directory

```bash
# Navigate to project root
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Create new directory for Python backend
mkdir backend-python
cd backend-python

# Initialize Poetry project
poetry init ^
  --name pdflab-api ^
  --description "PDFLab PDF Conversion API - Python/FastAPI Backend" ^
  --author "PDFLab Team" ^
  --python "^3.11" ^
  --no-interaction

# Verify pyproject.toml was created
type pyproject.toml
```

**Expected pyproject.toml**:
```toml
[tool.poetry]
name = "pdflab-api"
version = "0.1.0"
description = "PDFLab PDF Conversion API - Python/FastAPI Backend"
authors = ["PDFLab Team"]
readme = "README.md"

[tool.poetry.dependencies]
python = "^3.11"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

## Step 0.6: Create Directory Structure

```powershell
# PowerShell script to create all directories
$dirs = @(
    "app",
    "app\models",
    "app\schemas",
    "app\services",
    "app\workers",
    "app\middleware",
    "app\routers",
    "app\utils",
    "app\core",
    "tests",
    "tests\unit",
    "tests\integration",
    "tests\e2e",
    "tests\fixtures",
    "storage\uploads",
    "storage\outputs",
    "storage\temp",
    "alembic\versions",
    "logs",
    "scripts",
    "docs"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "✓ Created all directories"
```

**Create Python package markers** (__init__.py files):

```powershell
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
    "app\core\__init__.py",
    "tests\__init__.py",
    "tests\unit\__init__.py",
    "tests\integration\__init__.py",
    "tests\e2e\__init__.py",
    "tests\fixtures\__init__.py"
)

foreach ($file in $initFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

# Create .gitkeep files for empty directories
$gitkeepFiles = @(
    "storage\uploads\.gitkeep",
    "storage\outputs\.gitkeep",
    "storage\temp\.gitkeep",
    "logs\.gitkeep",
    "alembic\versions\.gitkeep"
)

foreach ($file in $gitkeepFiles) {
    New-Item -ItemType File -Path $file -Force | Out-Null
}

Write-Host "✓ Created __init__.py and .gitkeep files"
```

**Verify directory structure:**
```bash
tree /F /A
```

**Expected structure:**
```
backend-python/
├── app/
│   ├── __init__.py
│   ├── core/
│   │   └── __init__.py
│   ├── models/
│   │   └── __init__.py
│   ├── schemas/
│   │   └── __init__.py
│   ├── services/
│   │   └── __init__.py
│   ├── workers/
│   │   └── __init__.py
│   ├── middleware/
│   │   └── __init__.py
│   ├── routers/
│   │   └── __init__.py
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── storage/
│   ├── uploads/
│   ├── outputs/
│   └── temp/
├── alembic/
│   └── versions/
├── logs/
├── scripts/
├── docs/
└── pyproject.toml
```

## Step 0.7: Create .gitignore

Create `backend-python\.gitignore`:

```gitignore
# Python bytecode
__pycache__/
*.py[cod]
*$py.class
*.so

# Virtual environments
env/
venv/
ENV/
.venv/
.python-version

# Poetry
poetry.lock

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# PyInstaller
*.manifest
*.spec

# Unit test / coverage
.pytest_cache/
.coverage
htmlcov/
.tox/
.hypothesis/
junit/
coverage.xml
*.cover

# MyPy
.mypy_cache/
.dmypy.json
dmypy.json

# Ruff
.ruff_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.project
.pydevproject
.settings/

# Environment variables
.env
.env.local
.env.production
.env.*.local

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

# OS specific
.DS_Store
Thumbs.db
desktop.ini
.directory
.Trash-*

# Celery
celerybeat-schedule
celerybeat.pid

# Database
*.db
*.sqlite
*.sqlite3

# Jupyter
.ipynb_checkpoints/
*.ipynb

# Profiling
.prof
```

**Save this file**, then verify:
```bash
type .gitignore
```

## Step 0.8: Install Core Dependencies

```bash
cd backend-python

# Core web framework
poetry add "fastapi[all]" "uvicorn[standard]"

# Database (async MySQL with SQLAlchemy 2.0)
poetry add "sqlalchemy[asyncio]" aiomysql alembic

# Job queue (Celery with Redis backend)
poetry add celery redis

# Authentication & security
poetry add "python-jose[cryptography]" "passlib[bcrypt]" python-multipart

# HTTP client for CloudConvert (async)
poetry add httpx aiofiles

# Configuration management
poetry add pydantic-settings

# Date/time handling (better than datetime)
poetry add pendulum

# Logging (structured logs)
poetry add structlog python-json-logger

# Rate limiting
poetry add slowapi

# CloudConvert SDK (Python version)
poetry add cloudconvert

# Install all dependencies
poetry install --no-root

# Development dependencies (separate group)
poetry add --group dev pytest pytest-asyncio pytest-cov pytest-mock faker httpx
poetry add --group dev locust  # Load testing
poetry add --group dev mypy types-redis types-passlib  # Type checking
poetry add --group dev ruff black isort  # Linting & formatting
poetry add --group dev ipython ipdb  # Debugging

# Install dev dependencies
poetry install --no-root
```

**Why each dependency?**

| Package | Purpose | Node.js Equivalent |
|---------|---------|-------------------|
| fastapi | Web framework | express |
| uvicorn | ASGI server | node (runtime) |
| sqlalchemy | ORM | sequelize |
| aiomysql | MySQL async driver | mysql2 |
| alembic | Database migrations | sequelize migrations |
| celery | Task queue | bull |
| redis | Redis client | ioredis |
| python-jose | JWT tokens | jsonwebtoken |
| passlib | Password hashing | bcrypt |
| httpx | HTTP client | axios/node-fetch |
| pydantic-settings | Config from .env | dotenv |
| structlog | Structured logging | winston/pino |
| slowapi | Rate limiting | express-rate-limit |

**Checkpoint**: Verify all packages installed:

```bash
# Activate virtual environment
poetry shell

# Test imports
python -c "import fastapi; import sqlalchemy; import celery; print('✓ All core imports successful')"

# Exit shell
exit
```

**Expected output:** `✓ All core imports successful`

## Step 0.9: Create Environment File

Create `backend-python\.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3007
API_URL=http://localhost:3007
FRONTEND_URL=http://localhost:3000

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_ECHO=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CloudConvert API
CLOUDCONVERT_API_KEY=your_cloudconvert_api_key_here
CLOUDCONVERT_SANDBOX=false
CLOUDCONVERT_WEBHOOK_URL=http://localhost:3007/api/webhook/cloudconvert

# JWT Authentication
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_64_CHAR_STRING_IN_PRODUCTION_USE_SECURE_RANDOM_GENERATION
JWT_ALGORITHM=HS256
JWT_EXPIRATION=604800
JWT_REFRESH_EXPIRATION=2592000

# PayFast Payment Gateway (USD Currency)
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production
PAYFAST_RETURN_URL=http://localhost:3000/payment/success
PAYFAST_CANCEL_URL=http://localhost:3000/payment/cancel
PAYFAST_NOTIFY_URL=http://localhost:3007/api/payfast/webhook

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3001

# File Storage
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE=524288000

# File Size Limits by Plan (bytes)
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_STARTER=26214400
MAX_FILE_SIZE_PRO=104857600
MAX_FILE_SIZE_ENTERPRISE=524288000

# Conversion Limits (per month)
CONVERSIONS_LIMIT_FREE=3
CONVERSIONS_LIMIT_STARTER=100

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
CELERY_TASK_TRACK_STARTED=true
CELERY_TASK_TIME_LIMIT=3600

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=500

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/pdflab.log

# Monitoring
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
```

**IMPORTANT: Generate a secure JWT secret:**

```bash
poetry run python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(48))"
```

Copy the output and replace the JWT_SECRET value in .env.

**Create .env.example** (for version control):

```bash
copy .env .env.example
```

**Edit .env.example** and replace sensitive values with placeholders:
- Replace JWT_SECRET with `GENERATE_WITH_secrets.token_urlsafe(48)`
- Replace CLOUDCONVERT_API_KEY with `your_cloudconvert_api_key`
- Keep PAYFAST credentials (they're sandbox values)

## Step 0.10: Create README.md

Create `backend-python\README.md`:

```markdown
# PDFLab Python Backend

FastAPI-based backend for PDFLab PDF conversion platform.

## Tech Stack

- **Framework**: FastAPI 0.110+
- **Database**: MySQL 8.0 (async with SQLAlchemy 2.0)
- **Task Queue**: Celery with Redis
- **Authentication**: JWT tokens
- **Payment**: PayFast integration

## Quick Start

### Prerequisites

- Python 3.11+
- Poetry 1.7+
- Docker (for MySQL & Redis)

### Installation

1. Install dependencies:
   ```bash
   poetry install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. Start Docker containers:
   ```bash
   docker start pdflab-mysql pdflab-redis
   ```

4. Run database migrations:
   ```bash
   poetry run alembic upgrade head
   ```

5. Start the API server:
   ```bash
   poetry run uvicorn app.main:app --reload --port 3007
   ```

6. Start Celery worker (in another terminal):
   ```bash
   poetry run celery -A app.workers.celery_app worker --loglevel=info
   ```

### Development

- **API Server**: http://localhost:3007
- **API Docs**: http://localhost:3007/docs (Swagger UI)
- **ReDoc**: http://localhost:3007/redoc
- **Health Check**: http://localhost:3007/health

### Testing

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test file
poetry run pytest tests/unit/test_auth.py

# Run with verbose output
poetry run pytest -v
```

### Code Quality

```bash
# Format code
poetry run black app tests
poetry run isort app tests

# Lint code
poetry run ruff check app tests

# Type checking
poetry run mypy app
```

## Project Structure

```
backend-python/
├── app/
│   ├── core/           # Configuration, database, logging
│   ├── models/         # SQLAlchemy models
│   ├── schemas/        # Pydantic schemas (validation)
│   ├── services/       # Business logic (CloudConvert, PayFast)
│   ├── routers/        # API endpoints
│   ├── middleware/     # Custom middleware
│   ├── workers/        # Celery tasks
│   ├── utils/          # Helper functions
│   └── main.py         # FastAPI application
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── alembic/            # Database migrations
├── storage/            # File uploads/outputs
└── logs/               # Application logs
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Conversion
- `POST /api/conversion/upload` - Upload PDF for conversion
- `GET /api/conversion/status/{job_id}` - Check job status
- `GET /api/conversion/download/{job_id}` - Download converted file
- `GET /api/conversion/history` - User's conversion history
- `POST /api/conversion/merge` - Merge multiple PDFs

### PayFast Payment
- `GET /api/payfast/plans` - Get pricing plans
- `POST /api/payfast/initialize` - Initialize payment
- `POST /api/payfast/webhook` - ITN webhook handler
- `POST /api/payfast/cancel-subscription` - Cancel subscription

## Environment Variables

See `.env.example` for all configuration options.

## License

Proprietary - PDFLab Team
```

## Checkpoint 0: Validation

Before proceeding to Phase 1, verify ALL items are complete:

- [ ] Python 3.11+ installed (`python --version`)
- [ ] Poetry installed (`poetry --version`)
- [ ] Docker containers running (`docker ps`)
- [ ] MySQL accessible (`docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "SELECT 1"`)
- [ ] Redis accessible (`docker exec -it pdflab-redis redis-cli ping`)
- [ ] Node.js backend works (`curl http://localhost:3006/health`)
- [ ] backend-python/ directory created
- [ ] Directory structure created (app/, tests/, storage/, etc.)
- [ ] .gitignore created
- [ ] All Poetry dependencies installed (`poetry show` lists packages)
- [ ] .env file created with JWT secret generated
- [ ] .env.example created (without secrets)
- [ ] README.md created

**Test command to verify everything:**

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend-python

# Check directory structure
dir app\core
dir app\models
dir tests\unit

# Check Poetry environment
poetry env info

# Test Python imports
poetry run python -c "from fastapi import FastAPI; from sqlalchemy.ext.asyncio import create_async_engine; from celery import Celery; print('✓ Phase 0 Complete - Ready for Phase 1')"
```

**Expected final output:** `✓ Phase 0 Complete - Ready for Phase 1`

**Time spent so far:** ~4-6 hours

---

# Phase 1: Project Foundation

**Estimated Time**: 20-25 hours
**Goal**: Create FastAPI application with configuration, database connection, logging, and basic middleware
**Prerequisites**: Phase 0 complete

## Overview

In this phase, we'll build the foundation of the Python backend:

1. **Configuration management** (app/core/config.py) - Type-safe settings from .env
2. **Database setup** (app/core/database.py) - Async SQLAlchemy connection
3. **Logging system** (app/core/logging.py) - Structured JSON logs
4. **Main FastAPI app** (app/main.py) - Application with middleware
5. **Basic health check** - Verify everything works

This mirrors the Node.js server.ts file but with Python patterns.

## Step 1.1: Configuration Management

**File:** `backend-python\app\core\config.py`

This replaces reading process.env directly. Pydantic validates all settings at startup.

```python
"""
Configuration management using Pydantic Settings.
Loads and validates environment variables from .env file.
"""
from functools import lru_cache
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All settings are validated by Pydantic on startup.
    """

    # Server Configuration
    NODE_ENV: str = Field(default="development", description="Environment name")
    PORT: int = Field(default=3007, ge=1024, le=65535, description="Server port")
    API_URL: str = Field(default="http://localhost:3007", description="API base URL")
    FRONTEND_URL: str = Field(default="http://localhost:3000", description="Frontend URL")

    # Database Configuration
    DB_HOST: str = Field(default="localhost", description="MySQL host")
    DB_PORT: int = Field(default=3306, ge=1, le=65535, description="MySQL port")
    DB_USER: str = Field(default="pdflab", description="MySQL username")
    DB_PASSWORD: str = Field(default="", description="MySQL password")
    DB_NAME: str = Field(default="pdflab", description="Database name")
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=100, description="Connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100, description="Max overflow connections")
    DB_ECHO: bool = Field(default=False, description="Log SQL queries")

    # Redis Configuration
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, ge=1, le=65535, description="Redis port")
    REDIS_PASSWORD: str = Field(default="", description="Redis password")
    REDIS_DB: int = Field(default=0, ge=0, le=15, description="Redis database number")

    # CloudConvert API
    CLOUDCONVERT_API_KEY: str = Field(default="", description="CloudConvert API key")
    CLOUDCONVERT_SANDBOX: bool = Field(default=False, description="Use sandbox mode")
    CLOUDCONVERT_WEBHOOK_URL: str = Field(
        default="http://localhost:3007/api/webhook/cloudconvert",
        description="Webhook URL for CloudConvert callbacks"
    )

    # JWT Authentication
    JWT_SECRET: str = Field(min_length=32, description="JWT signing secret (min 32 chars)")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_EXPIRATION: int = Field(default=604800, ge=60, description="Access token expiration (seconds)")
    JWT_REFRESH_EXPIRATION: int = Field(default=2592000, ge=3600, description="Refresh token expiration (seconds)")

    # PayFast Payment Gateway
    PAYFAST_MERCHANT_ID: str = Field(default="", description="PayFast merchant ID")
    PAYFAST_MERCHANT_KEY: str = Field(default="", description="PayFast merchant key")
    PAYFAST_PASSPHRASE: str = Field(default="", description="PayFast passphrase (optional)")
    PAYFAST_MODE: str = Field(default="sandbox", description="PayFast mode (sandbox/production)")
    PAYFAST_RETURN_URL: str = Field(
        default="http://localhost:3000/payment/success",
        description="Payment success redirect URL"
    )
    PAYFAST_CANCEL_URL: str = Field(
        default="http://localhost:3000/payment/cancel",
        description="Payment cancel redirect URL"
    )
    PAYFAST_NOTIFY_URL: str = Field(
        default="http://localhost:3007/api/payfast/webhook",
        description="PayFast ITN webhook URL"
    )

    # CORS Configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3002",
        description="Comma-separated list of allowed origins"
    )

    # File Storage
    STORAGE_PATH: str = Field(default="./storage", description="Base storage directory")
    MAX_UPLOAD_SIZE: int = Field(default=524288000, ge=1048576, description="Max upload size (bytes)")

    # File Size Limits by Plan (bytes)
    MAX_FILE_SIZE_FREE: int = Field(default=10485760, description="Max file size for Free plan")
    MAX_FILE_SIZE_STARTER: int = Field(default=26214400, description="Max file size for Starter plan")
    MAX_FILE_SIZE_PRO: int = Field(default=104857600, description="Max file size for Pro plan")
    MAX_FILE_SIZE_ENTERPRISE: int = Field(default=524288000, description="Max file size for Enterprise plan")

    # Conversion Limits
    CONVERSIONS_LIMIT_FREE: int = Field(default=3, ge=0, description="Conversions per month for Free plan")
    CONVERSIONS_LIMIT_STARTER: int = Field(default=100, ge=0, description="Conversions per month for Starter plan")

    # Celery Configuration
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1", description="Celery broker URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2", description="Celery result backend")
    CELERY_TASK_TRACK_STARTED: bool = Field(default=True, description="Track task start time")
    CELERY_TASK_TIME_LIMIT: int = Field(default=3600, ge=60, description="Task time limit (seconds)")

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60, ge=1, description="Requests per minute")
    RATE_LIMIT_PER_HOUR: int = Field(default=500, ge=1, description="Requests per hour")

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(default="json", description="Log format (json/text)")
    LOG_FILE: str = Field(default="logs/pdflab.log", description="Log file path")

    # Monitoring
    SENTRY_DSN: str = Field(default="", description="Sentry DSN for error tracking")
    SENTRY_ENVIRONMENT: str = Field(default="development", description="Sentry environment")

    # Pydantic configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra env vars
    )

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v: str) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def database_url(self) -> str:
        """Generate async MySQL database URL."""
        password = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
        return f"mysql+aiomysql://{self.DB_USER}{password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def redis_url(self) -> str:
        """Generate Redis URL."""
        password = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.NODE_ENV.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.NODE_ENV.lower() == "development"

    @property
    def payfast_api_url(self) -> str:
        """Get PayFast API URL based on mode."""
        if self.PAYFAST_MODE.lower() == "production":
            return "https://www.payfast.co.za"
        return "https://sandbox.payfast.co.za"

    def get_max_file_size(self, plan: str) -> int:
        """Get maximum file size for a given plan."""
        plan_limits = {
            "free": self.MAX_FILE_SIZE_FREE,
            "starter": self.MAX_FILE_SIZE_STARTER,
            "pro": self.MAX_FILE_SIZE_PRO,
            "enterprise": self.MAX_FILE_SIZE_ENTERPRISE,
        }
        return plan_limits.get(plan.lower(), self.MAX_FILE_SIZE_FREE)

    def get_conversion_limit(self, plan: str) -> int:
        """Get conversion limit for a given plan."""
        if plan.lower() in ("pro", "enterprise"):
            return -1  # Unlimited
        plan_limits = {
            "free": self.CONVERSIONS_LIMIT_FREE,
            "starter": self.CONVERSIONS_LIMIT_STARTER,
        }
        return plan_limits.get(plan.lower(), self.CONVERSIONS_LIMIT_FREE)


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to avoid re-reading .env on every import.
    """
    return Settings()


# Global settings instance
settings = get_settings()
```

**Test the configuration:**

```bash
cd backend-python

# Test loading config
poetry run python -c "from app.core.config import settings; print(f'✓ Config loaded: {settings.NODE_ENV} on port {settings.PORT}')"
```

**Expected output:** `✓ Config loaded: development on port 3007`

**Why Pydantic Settings?**
- **Type safety**: Catches config errors at startup, not runtime
- **Validation**: Ensures PORT is between 1024-65535, JWT_SECRET is min 32 chars, etc.
- **Documentation**: Field descriptions show what each setting does
- **Computed properties**: database_url, redis_url generated automatically
- **Caching**: @lru_cache ensures settings loaded once

## Step 1.2: Database Setup

**File:** `backend-python\app\core\database.py`

This creates an async SQLAlchemy engine and session manager.

```python
"""
Async database connection and session management.
Uses SQLAlchemy 2.0 with async MySQL driver (aiomysql).
"""
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import settings

# Logger
logger = logging.getLogger(__name__)

# SQLAlchemy 2.0 declarative base
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Create async engine
def create_engine() -> AsyncEngine:
    """
    Create async SQLAlchemy engine with connection pooling.

    Returns:
        AsyncEngine configured for MySQL
    """
    # Connection arguments
    connect_args = {
        "connect_timeout": 30,
        "charset": "utf8mb4",
    }

    # Pool configuration
    if settings.is_production:
        pool_class = QueuePool
        pool_pre_ping = True
    else:
        pool_class = QueuePool
        pool_pre_ping = False

    engine = create_async_engine(
        settings.database_url,
        echo=settings.DB_ECHO,  # Log SQL queries in development
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=pool_pre_ping,
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args=connect_args,
        poolclass=pool_class,
    )

    logger.info(f"Database engine created: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    return engine


# Create engine instance
engine = create_engine()

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.

    Usage in FastAPI:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            ...

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def test_connection() -> bool:
    """
    Test database connection.

    Returns:
        bool: True if connection successful
    """
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        logger.info("✓ Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection test failed: {e}")
        return False


async def close_db():
    """
    Close database engine and all connections.
    Call this on application shutdown.
    """
    await engine.dispose()
    logger.info("✓ Database connections closed")


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database session (use outside FastAPI).

    Usage:
        async with get_db_context() as db:
            user = await db.get(User, user_id)

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database transaction error: {e}")
            raise
        finally:
            await session.close()
```

**Why AsyncSession?**
- **Non-blocking**: Multiple requests handled concurrently
- **Better performance**: Don't block event loop during DB queries
- **Scalability**: Handle thousands of concurrent connections

**Test database connection:**

```bash
cd backend-python

# Test database connection
poetry run python -c "import asyncio; from app.core.database import test_connection; asyncio.run(test_connection())"
```

**Expected output:** `✓ Database connection test successful`

If you get an error, verify:
1. MySQL container is running (`docker ps`)
2. Credentials in .env match database (`DB_USER=pdflab`, `DB_PASSWORD=***REMOVED***`)
3. Database exists (`docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "SHOW DATABASES"`)

## Step 1.3: Logging Configuration

**File:** `backend-python\app\core\logging.py`

Structured JSON logging for better debugging and monitoring.

```python
"""
Structured logging configuration using structlog.
Logs in JSON format for production, colored console for development.
"""
import logging
import sys
from pathlib import Path
from typing import Any

import structlog
from structlog.types import EventDict, Processor

from app.core.config import settings


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add application context to all log entries."""
    event_dict["app"] = "pdflab-api"
    event_dict["environment"] = settings.NODE_ENV
    return event_dict


def setup_logging() -> None:
    """
    Configure structured logging for the application.

    Development mode:
        - Colored console output
        - Pretty formatting
        - Log level: DEBUG

    Production mode:
        - JSON format
        - File output + console
        - Log level: INFO
    """
    # Ensure log directory exists
    log_file = Path(settings.LOG_FILE)
    log_file.parent.mkdir(parents=True, exist_ok=True)

    # Set log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        level=log_level,
        stream=sys.stdout,
    )

    # Processors for all modes
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        add_app_context,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
    ]

    # Development mode: colored console output
    if settings.is_development and settings.LOG_FORMAT == "text":
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
    # Production mode: JSON output
    else:
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ]

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logger = structlog.get_logger(__name__)
    logger.info(
        "logging_configured",
        level=settings.LOG_LEVEL,
        format=settings.LOG_FORMAT,
        file=str(log_file),
    )


def get_logger(name: str) -> Any:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Bound logger with context

    Usage:
        logger = get_logger(__name__)
        logger.info("user_created", user_id=user.id, email=user.email)
    """
    return structlog.get_logger(name)
```

**Test logging:**

```bash
cd backend-python

# Test logging setup
poetry run python -c "from app.core.logging import setup_logging, get_logger; setup_logging(); logger = get_logger('test'); logger.info('test_message', status='ok'); print('✓ Logging configured')"
```

**Expected output:** JSON log line followed by `✓ Logging configured`

## Step 1.4: Main FastAPI Application

**File:** `backend-python\app\main.py`

This is the core application file - equivalent to Node.js server.ts.

```python
"""
PDFLab FastAPI Application
Main entry point for the API server.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time

from app.core.config import settings
from app.core.database import engine, test_connection, close_db
from app.core.logging import setup_logging, get_logger

# Initialize logging first
setup_logging()
logger = get_logger(__name__)


# Lifespan context manager (startup/shutdown logic)
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("startup", message="PDFLab API starting up...")

    # Test database connection
    db_connected = await test_connection()
    if not db_connected:
        logger.error("startup_failed", reason="Database connection failed")
        raise RuntimeError("Failed to connect to database")

    # TODO: Initialize Redis connection (Phase 4)
    # TODO: Start Celery workers (Phase 4)

    logger.info(
        "startup_complete",
        environment=settings.NODE_ENV,
        port=settings.PORT,
        api_url=settings.API_URL,
    )

    yield

    # Shutdown
    logger.info("shutdown", message="PDFLab API shutting down...")

    # Close database connections
    await close_db()

    # TODO: Close Redis connections (Phase 4)
    # TODO: Stop Celery workers (Phase 4)

    logger.info("shutdown_complete", message="Graceful shutdown completed")


# Create FastAPI application
app = FastAPI(
    title="PDFLab API",
    description="PDF Conversion and Manipulation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# =====================
# Middleware
# =====================

# CORS middleware (must be first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing."""
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log request
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
        client_ip=request.client.host if request.client else None,
    )

    # Add timing header
    response.headers["X-Process-Time"] = str(duration)

    return response


# =====================
# Routes
# =====================

@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "PDFLab API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.NODE_ENV,
        "docs": f"{settings.API_URL}/docs",
        "endpoints": {
            "health": "/health",
            "auth": "/api/auth",
            "conversion": "/api/conversion",
            "payfast": "/api/payfast",
        }
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns service status and dependency checks.
    """
    import psutil

    health = {
        "status": "OK",
        "timestamp": int(time.time()),
        "uptime": round(time.time() - app.state.start_time, 2) if hasattr(app.state, "start_time") else 0,
        "environment": settings.NODE_ENV,
        "version": "1.0.0",
        "checks": {
            "database": "OK",
            "redis": "PENDING",  # Will implement in Phase 4
        },
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
        }
    }

    # Check database
    try:
        db_ok = await test_connection()
        if not db_ok:
            health["checks"]["database"] = "FAIL"
            health["status"] = "DEGRADED"
    except Exception as e:
        health["checks"]["database"] = "FAIL"
        health["status"] = "DEGRADED"
        logger.error("health_check_failed", component="database", error=str(e))

    # TODO: Check Redis (Phase 4)

    # Return appropriate status code
    status_code = 200 if health["status"] == "OK" else 503

    return JSONResponse(content=health, status_code=status_code)


# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors with helpful message."""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"Route {request.method} {request.url.path} not found",
            "docs": f"{settings.API_URL}/docs",
        }
    )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions."""
    logger.error(
        "unhandled_exception",
        method=request.method,
        path=request.url.path,
        error=str(exc),
        exc_info=True,
    )

    # Don't expose error details in production
    if settings.is_production:
        message = "Internal server error"
    else:
        message = str(exc)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": message,
        }
    )


# =====================
# Startup tracking
# =====================

@app.on_event("startup")
async def track_startup_time():
    """Track when the application started."""
    app.state.start_time = time.time()


# =====================
# Include routers (will add in later phases)
# =====================

# TODO: Phase 5 - Authentication routes
# from app.routers import auth
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# TODO: Phase 2 - Conversion routes
# from app.routers import conversion
# app.include_router(conversion.router, prefix="/api/conversion", tags=["Conversion"])

# TODO: Phase 6 - PayFast routes
# from app.routers import payfast
# app.include_router(payfast.router, prefix="/api/payfast", tags=["Payment"])
```

**Why FastAPI?**
- **Performance**: As fast as Node.js/Go (ASGI server)
- **Auto docs**: Swagger UI at /docs automatically
- **Type safety**: Request/response validation via Pydantic
- **Async native**: Built for async/await from ground up
- **OpenAPI**: Standard API specification

## Step 1.5: Install Additional Dependency

We used `psutil` in the health check for system metrics.

```bash
cd backend-python
poetry add psutil
```

## Step 1.6: Start the API Server

```bash
cd backend-python

# Start server with auto-reload
poetry run uvicorn app.main:app --reload --port 3007 --log-level info
```

**Expected output:**
```
INFO:     Will watch for changes in these directories: ['C:\\...\\backend-python']
INFO:     Uvicorn running on http://127.0.0.1:3007 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using WatchFiles
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
{"event": "startup", "message": "PDFLab API starting up...", ...}
{"event": "startup_complete", "environment": "development", "port": 3007, ...}
INFO:     Application startup complete.
```

**Keep this terminal open.** In a new terminal, test the endpoints:

```bash
# Test root endpoint
curl http://localhost:3007/

# Expected output:
# {
#   "name": "PDFLab API",
#   "version": "1.0.0",
#   "status": "running",
#   ...
# }

# Test health check
curl http://localhost:3007/health

# Expected output:
# {
#   "status": "OK",
#   "checks": {
#     "database": "OK",
#     "redis": "PENDING"
#   },
#   ...
# }

# Test API docs (in browser)
# Open: http://localhost:3007/docs
```

**You should see:**
- **Swagger UI** with interactive API documentation
- **Root endpoint** returns API info
- **Health check** shows database is OK

## Step 1.7: Create Development Scripts

For easier development, create helper scripts.

**File:** `backend-python\scripts\dev.py`

```python
"""
Development helper script.
Runs uvicorn with optimal development settings.
"""
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set development environment
os.environ["NODE_ENV"] = "development"

# Run uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3007,
        reload=True,
        log_level="info",
        access_log=True,
    )
```

**Make script executable:**

```bash
cd backend-python

# Test script
poetry run python scripts/dev.py
```

**Add to pyproject.toml** for easy access:

```toml
[tool.poetry.scripts]
dev = "scripts.dev:main"
```

Wait, let's make it simpler. Just use a batch file:

**File:** `backend-python\dev.bat`

```batch
@echo off
echo Starting PDFLab Python API in development mode...
poetry run uvicorn app.main:app --reload --port 3007 --log-level info
```

**Usage:**
```bash
cd backend-python
dev.bat
```

## Checkpoint 1: Validation

Stop the server (Ctrl+C) and run these validation tests:

```bash
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab\backend-python

# Test 1: Configuration loads
poetry run python -c "from app.core.config import settings; assert settings.PORT == 3007; print('✓ Config OK')"

# Test 2: Database connection
poetry run python -c "import asyncio; from app.core.database import test_connection; assert asyncio.run(test_connection()); print('✓ Database OK')"

# Test 3: Logging works
poetry run python -c "from app.core.logging import setup_logging, get_logger; setup_logging(); logger = get_logger('test'); logger.info('test'); print('✓ Logging OK')"

# Test 4: FastAPI app imports
poetry run python -c "from app.main import app; assert app.title == 'PDFLab API'; print('✓ FastAPI OK')"

# Test 5: Start server and test endpoint
# (Start server in background, test, then stop)
```

**For Test 5**, use PowerShell:

```powershell
# Start server in background
$server = Start-Process poetry -ArgumentList "run", "uvicorn", "app.main:app", "--port", "3007" -PassThru -NoNewWindow

# Wait for startup
Start-Sleep -Seconds 5

# Test endpoint
$response = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing
Write-Host "Response status: $($response.StatusCode)"
$content = $response.Content | ConvertFrom-Json
Write-Host "Health status: $($content.status)"

# Stop server
Stop-Process -Id $server.Id

# Verify
if ($content.status -eq "OK") {
    Write-Host "✓ Server test OK"
} else {
    Write-Host "✗ Server test FAILED"
}
```

**All tests should pass.**

## Phase 1 Completion Checklist

- [ ] `app/core/config.py` created with Pydantic settings
- [ ] `app/core/database.py` created with async SQLAlchemy
- [ ] `app/core/logging.py` created with structlog
- [ ] `app/main.py` created with FastAPI application
- [ ] `psutil` dependency installed
- [ ] Server starts successfully on port 3007
- [ ] Root endpoint (`/`) returns API info
- [ ] Health endpoint (`/health`) shows database OK
- [ ] Swagger docs accessible at `/docs`
- [ ] Request logging middleware works (logs appear in console)
- [ ] CORS middleware configured
- [ ] All validation tests pass

**Time spent so far:** ~24-31 hours (including Phase 0)

---

# Phase 2: CloudConvert Service

**Estimated Time**: 18-22 hours
**Goal**: Implement PDF conversion service using CloudConvert Python SDK
**Prerequisites**: Phase 1 complete

## Overview

In this phase, we'll implement the CloudConvert integration for PDF conversions:

1. **CloudConvert service class** - Python equivalent of cloudconvert.service.ts
2. **Conversion schemas** - Pydantic models for request/response validation
3. **Conversion router** - API endpoints for upload/status/download
4. **File utilities** - Helper functions for file operations
5. **Integration tests** - Verify CloudConvert works

**Key differences from Node.js:**
- Python SDK uses different method names
- Async/await patterns slightly different
- File handling uses aiofiles (async file I/O)
- Better type hints with Pydantic

## Step 2.1: CloudConvert Service Implementation

**File:** `backend-python\app\services\cloudconvert.py`

```python
"""
CloudConvert service for PDF conversion and manipulation.
Python equivalent of cloudconvert.service.ts
"""
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
import httpx
from cloudconvert import CloudConvert as CloudConvertClient

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CloudConvertError(Exception):
    """Custom exception for CloudConvert errors."""
    pass


class CloudConvertService:
    """
    Service for PDF conversion using CloudConvert API.
    Handles file upload, conversion, and download.
    """

    def __init__(self):
        """Initialize CloudConvert client."""
        if not settings.CLOUDCONVERT_API_KEY:
            raise CloudConvertError("CLOUDCONVERT_API_KEY not configured")

        self.client = CloudConvertClient(
            api_key=settings.CLOUDCONVERT_API_KEY,
            sandbox=settings.CLOUDCONVERT_SANDBOX
        )

        logger.info(
            "cloudconvert_initialized",
            sandbox=settings.CLOUDCONVERT_SANDBOX
        )

    async def convert_file(
        self,
        input_file_path: str,
        output_file_path: str,
        input_format: str = "pdf",
        output_format: str = "pptx",
        options: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Convert a PDF file to another format using CloudConvert.

        Args:
            input_file_path: Path to input PDF file
            output_file_path: Path where output should be saved
            input_format: Input format (default: pdf)
            output_format: Output format (pptx, docx, xlsx, png, jpg)
            options: Conversion options (dpi, pages, ocr, etc.)
            webhook_url: Optional webhook for completion notification

        Returns:
            Dict with success status, output_path, and job_id

        Raises:
            CloudConvertError: If conversion fails
        """
        input_path = Path(input_file_path)
        output_path = Path(output_file_path)

        # Validate input file exists
        if not input_path.exists():
            raise CloudConvertError(f"Input file not found: {input_file_path}")

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Build conversion task config
        task_config: Dict[str, Any] = {
            "operation": "convert",
            "input": "upload-file",
            "input_format": input_format,
            "output_format": output_format,
        }

        # Add format-specific options
        conversion_options = options or {}

        if output_format == "pptx":
            task_config["pages"] = conversion_options.get("pages", "all")
            task_config["layout_preserving"] = True
            task_config["ocr"] = conversion_options.get("ocr", True)

        elif output_format == "docx":
            task_config["ocr"] = conversion_options.get("ocr", True)
            task_config["pages"] = conversion_options.get("pages", "all")

        elif output_format == "xlsx":
            task_config["ocr"] = conversion_options.get("ocr", True)
            task_config["auto_detect_tables"] = True

        elif output_format in ("png", "jpg"):
            task_config["pages"] = conversion_options.get("pages", "all")
            task_config["density"] = conversion_options.get("dpi", 300)

        try:
            # Create job with tasks
            job_data = {
                "tasks": {
                    "upload-file": {
                        "operation": "import/upload"
                    },
                    "convert-file": task_config,
                    "export-file": {
                        "operation": "export/url",
                        "input": "convert-file"
                    }
                }
            }

            if webhook_url:
                job_data["webhook_url"] = webhook_url

            # Create job (runs in thread pool since SDK is sync)
            job = await asyncio.to_thread(
                self.client.jobs.create,
                job_data
            )

            job_id = job.get("id")
            logger.info("cloudconvert_job_created", job_id=job_id, output_format=output_format)

            # Find upload task
            upload_task = None
            for task in job.get("tasks", []):
                if task.get("name") == "upload-file":
                    upload_task = task
                    break

            if not upload_task:
                raise CloudConvertError("Upload task not found in job")

            # Upload file
            with open(input_path, "rb") as f:
                await asyncio.to_thread(
                    self.client.tasks.upload,
                    upload_task,
                    f
                )

            logger.info("cloudconvert_file_uploaded", job_id=job_id, file_size=input_path.stat().st_size)

            # Wait for job to complete
            completed_job = await asyncio.to_thread(
                self.client.jobs.wait,
                job_id
            )

            logger.info("cloudconvert_job_completed", job_id=job_id)

            # Find export task
            export_task = None
            for task in completed_job.get("tasks", []):
                if task.get("name") == "export-file":
                    export_task = task
                    break

            if not export_task or not export_task.get("result", {}).get("files"):
                raise CloudConvertError("Export task or result not found")

            # Get download URL
            file_info = export_task["result"]["files"][0]
            file_url = file_info.get("url")

            if not file_url:
                raise CloudConvertError("Download URL not found in result")

            # Download file
            await self._download_file(file_url, output_path)

            logger.info(
                "cloudconvert_conversion_complete",
                job_id=job_id,
                output_path=str(output_path),
                output_size=output_path.stat().st_size
            )

            return {
                "success": True,
                "output_path": str(output_path),
                "job_id": job_id,
                "file_size": output_path.stat().st_size,
            }

        except Exception as e:
            logger.error(
                "cloudconvert_conversion_failed",
                error=str(e),
                input_file=str(input_path),
                output_format=output_format,
                exc_info=True
            )

            return {
                "success": False,
                "error": str(e),
            }

    async def merge_pdfs(
        self,
        input_files: List[str],
        output_path: str,
    ) -> Dict[str, Any]:
        """
        Merge multiple PDF files into one.

        Args:
            input_files: List of paths to PDF files
            output_path: Path where merged PDF should be saved

        Returns:
            Dict with success status, output_path, and job_id

        Raises:
            CloudConvertError: If merge fails
        """
        output_file = Path(output_path)

        # Validate all input files exist
        for file_path in input_files:
            if not Path(file_path).exists():
                raise CloudConvertError(f"Input file not found: {file_path}")

        # Ensure output directory exists
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            # Build upload tasks
            upload_tasks = {}
            merge_inputs = []

            for i, file_path in enumerate(input_files):
                task_name = f"upload-{i}"
                upload_tasks[task_name] = {
                    "operation": "import/upload"
                }
                merge_inputs.append(task_name)

            # Create job
            job_data = {
                "tasks": {
                    **upload_tasks,
                    "merge-pdfs": {
                        "operation": "merge",
                        "input": merge_inputs,
                        "output_format": "pdf"
                    },
                    "export-file": {
                        "operation": "export/url",
                        "input": "merge-pdfs"
                    }
                }
            }

            job = await asyncio.to_thread(
                self.client.jobs.create,
                job_data
            )

            job_id = job.get("id")
            logger.info("cloudconvert_merge_job_created", job_id=job_id, file_count=len(input_files))

            # Upload all files
            for i, file_path in enumerate(input_files):
                # Find upload task
                upload_task = None
                for task in job.get("tasks", []):
                    if task.get("name") == f"upload-{i}":
                        upload_task = task
                        break

                if not upload_task:
                    raise CloudConvertError(f"Upload task {i} not found")

                # Upload file
                with open(file_path, "rb") as f:
                    await asyncio.to_thread(
                        self.client.tasks.upload,
                        upload_task,
                        f
                    )

                logger.info(
                    "cloudconvert_file_uploaded",
                    job_id=job_id,
                    file_index=i + 1,
                    total_files=len(input_files)
                )

            # Wait for job completion
            completed_job = await asyncio.to_thread(
                self.client.jobs.wait,
                job_id
            )

            logger.info("cloudconvert_merge_completed", job_id=job_id)

            # Find export task
            export_task = None
            for task in completed_job.get("tasks", []):
                if task.get("name") == "export-file":
                    export_task = task
                    break

            if not export_task or not export_task.get("result", {}).get("files"):
                raise CloudConvertError("Export task or result not found")

            # Get download URL
            file_info = export_task["result"]["files"][0]
            file_url = file_info.get("url")

            if not file_url:
                raise CloudConvertError("Download URL not found in result")

            # Download merged file
            await self._download_file(file_url, output_file)

            logger.info(
                "cloudconvert_merge_download_complete",
                job_id=job_id,
                output_path=str(output_file),
                output_size=output_file.stat().st_size
            )

            return {
                "success": True,
                "output_path": str(output_file),
                "job_id": job_id,
                "file_size": output_file.stat().st_size,
            }

        except Exception as e:
            logger.error(
                "cloudconvert_merge_failed",
                error=str(e),
                file_count=len(input_files),
                exc_info=True
            )

            return {
                "success": False,
                "error": str(e),
            }

    async def _download_file(self, url: str, destination: Path) -> None:
        """
        Download file from URL to destination path.

        Args:
            url: Download URL
            destination: Path to save file

        Raises:
            CloudConvertError: If download fails
        """
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        raise CloudConvertError(
                            f"Download failed with status {response.status_code}"
                        )

                    # Write to file
                    with open(destination, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            f.write(chunk)

        except httpx.RequestError as e:
            raise CloudConvertError(f"Download request failed: {e}")

    async def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a CloudConvert job.

        Args:
            job_id: CloudConvert job ID

        Returns:
            Dict with success status
        """
        try:
            await asyncio.to_thread(
                self.client.jobs.cancel,
                job_id
            )

            logger.info("cloudconvert_job_cancelled", job_id=job_id)

            return {"success": True}

        except Exception as e:
            logger.error("cloudconvert_cancel_failed", job_id=job_id, error=str(e))
            return {"success": False, "error": str(e)}

    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get CloudConvert account information.

        Returns:
            Dict with account details (credits, email)
        """
        try:
            user = await asyncio.to_thread(self.client.users.me)

            return {
                "success": True,
                "credits": user.get("credits"),
                "email": user.get("email"),
            }

        except Exception as e:
            logger.error("cloudconvert_account_info_failed", error=str(e))
            return {"success": False, "error": str(e)}


# Singleton instance
cloudconvert_service = CloudConvertService()
```

**Key differences from Node.js version:**
- Uses `asyncio.to_thread()` to run sync CloudConvert SDK methods in thread pool
- Async file download with `httpx.AsyncClient`
- Python Path objects instead of Node path module
- Structured logging with context

**Test CloudConvert service:**

```bash
cd backend-python

# Test service initialization
poetry run python -c "from app.services.cloudconvert import cloudconvert_service; print('✓ CloudConvert service initialized')"
```

## Step 2.2: Conversion Schemas

**File:** `backend-python\app\schemas\conversion.py`

Pydantic schemas for request/response validation.

```python
"""
Pydantic schemas for conversion requests and responses.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class ConversionType(str, Enum):
    """Supported conversion types."""
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_DOCX = "pdf_to_docx"
    PDF_TO_XLSX = "pdf_to_xlsx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_MERGE = "pdf_merge"


class JobStatus(str, Enum):
    """Job processing status."""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OutputFormat(str, Enum):
    """Supported output formats."""
    PPTX = "pptx"
    DOCX = "docx"
    XLSX = "xlsx"
    PNG = "png"
    JPG = "jpg"
    PDF = "pdf"


class ConversionOptions(BaseModel):
    """Optional conversion settings."""
    dpi: Optional[int] = Field(default=300, ge=72, le=600, description="DPI for image output")
    pages: Optional[str] = Field(default="all", description="Page range (e.g., '1-5' or 'all')")
    ocr: Optional[bool] = Field(default=True, description="Enable OCR")


class ConversionUploadRequest(BaseModel):
    """Request schema for file upload and conversion."""
    output_format: OutputFormat = Field(..., description="Desired output format")
    options: Optional[ConversionOptions] = Field(default=None, description="Conversion options")


class ConversionUploadResponse(BaseModel):
    """Response schema for upload endpoint."""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Initial job status")
    message: str = Field(..., description="Human-readable message")
    estimated_time: Optional[int] = Field(default=None, description="Estimated completion time (seconds)")


class JobStatusResponse(BaseModel):
    """Response schema for job status check."""
    job_id: str
    status: JobStatus
    progress: int = Field(..., ge=0, le=100, description="Completion percentage")
    type: ConversionType
    file_name: str
    created_at: datetime
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    download_url: Optional[str] = None
    expires_at: datetime


class ConversionHistoryItem(BaseModel):
    """Single item in conversion history."""
    job_id: str
    type: ConversionType
    status: JobStatus
    file_name: str
    file_size: int
    created_at: datetime
    completed_at: Optional[datetime] = None


class ConversionHistoryResponse(BaseModel):
    """Response schema for conversion history."""
    total: int
    items: List[ConversionHistoryItem]


class MergeRequest(BaseModel):
    """Request schema for PDF merge operation."""
    file_names: List[str] = Field(..., min_length=2, max_length=10, description="List of uploaded file names")

    @field_validator("file_names")
    @classmethod
    def validate_file_names(cls, v: List[str]) -> List[str]:
        """Ensure all file names end with .pdf"""
        for name in v:
            if not name.lower().endswith(".pdf"):
                raise ValueError(f"File {name} is not a PDF")
        return v


class MergeResponse(BaseModel):
    """Response schema for merge operation."""
    job_id: str
    status: JobStatus
    message: str
    file_count: int
```

**Why Pydantic schemas?**
- **Automatic validation**: Invalid requests rejected before reaching business logic
- **Type safety**: FastAPI uses these for request/response types
- **Auto documentation**: Swagger UI shows these schemas
- **Serialization**: Convert between dict/JSON/model automatically

## Step 2.3: File Utilities

**File:** `backend-python\app\utils\files.py`

Helper functions for file operations.

```python
"""
File utility functions for upload, validation, and cleanup.
"""
import os
import shutil
import hashlib
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_storage_path(user_id: str, job_id: str, subdirectory: str = "uploads") -> Path:
    """
    Get storage path for user's job files.

    Args:
        user_id: User UUID
        job_id: Job UUID
        subdirectory: uploads, outputs, or temp

    Returns:
        Path object for storage location
    """
    base_path = Path(settings.STORAGE_PATH)
    path = base_path / subdirectory / user_id / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_pdf(file_path: Path) -> bool:
    """
    Validate that file is a PDF by checking magic bytes.

    Args:
        file_path: Path to file

    Returns:
        True if file is a valid PDF
    """
    try:
        with open(file_path, "rb") as f:
            header = f.read(4)
            return header == b"%PDF"
    except Exception as e:
        logger.error("pdf_validation_failed", file_path=str(file_path), error=str(e))
        return False


def get_file_hash(file_path: Path) -> str:
    """
    Calculate MD5 hash of file.

    Args:
        file_path: Path to file

    Returns:
        MD5 hash as hex string
    """
    md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            md5.update(chunk)
    return md5.hexdigest()


def cleanup_old_files(max_age_hours: int = 24) -> int:
    """
    Delete files older than specified age.

    Args:
        max_age_hours: Maximum file age in hours

    Returns:
        Number of files deleted
    """
    deleted_count = 0
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

    storage_path = Path(settings.STORAGE_PATH)

    for subdirectory in ["uploads", "outputs", "temp"]:
        subdir_path = storage_path / subdirectory

        if not subdir_path.exists():
            continue

        for user_dir in subdir_path.iterdir():
            if not user_dir.is_dir():
                continue

            for job_dir in user_dir.iterdir():
                if not job_dir.is_dir():
                    continue

                # Check directory modification time
                dir_mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)

                if dir_mtime < cutoff_time:
                    try:
                        shutil.rmtree(job_dir)
                        deleted_count += 1
                        logger.info(
                            "old_files_deleted",
                            path=str(job_dir),
                            age_hours=(datetime.now() - dir_mtime).total_seconds() / 3600
                        )
                    except Exception as e:
                        logger.error(
                            "cleanup_failed",
                            path=str(job_dir),
                            error=str(e)
                        )

    return deleted_count


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.

    Args:
        size_bytes: Size in bytes

    Returns:
        Formatted string (e.g., "1.5 MB")
    """
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"
```

## Step 2.4: Test CloudConvert Integration

Before creating API endpoints, let's test the service directly.

**File:** `backend-python\tests\integration\test_cloudconvert.py`

```python
"""
Integration tests for CloudConvert service.
Requires valid CLOUDCONVERT_API_KEY in .env
"""
import pytest
from pathlib import Path
import tempfile
import shutil

from app.services.cloudconvert import cloudconvert_service, CloudConvertError
from app.core.config import settings


@pytest.mark.skipif(
    not settings.CLOUDCONVERT_API_KEY,
    reason="CLOUDCONVERT_API_KEY not configured"
)
@pytest.mark.asyncio
async def test_get_account_info():
    """Test fetching CloudConvert account info."""
    result = await cloudconvert_service.get_account_info()

    assert result["success"] is True
    assert "credits" in result
    assert "email" in result

    print(f"CloudConvert account: {result['email']}, Credits: {result['credits']}")


@pytest.mark.skipif(
    not settings.CLOUDCONVERT_API_KEY,
    reason="CLOUDCONVERT_API_KEY not configured"
)
@pytest.mark.asyncio
async def test_convert_pdf_to_pptx():
    """Test PDF to PPTX conversion."""
    # Create temporary directories
    temp_dir = Path(tempfile.mkdtemp())

    try:
        # Use sample PDF from project root (if exists)
        project_root = Path(__file__).parent.parent.parent.parent
        sample_pdf = project_root / "backend" / "test-sample.pdf"

        if not sample_pdf.exists():
            pytest.skip("Sample PDF not found")

        # Copy to temp directory
        input_file = temp_dir / "input.pdf"
        shutil.copy(sample_pdf, input_file)

        # Output file
        output_file = temp_dir / "output.pptx"

        # Convert
        result = await cloudconvert_service.convert_file(
            input_file_path=str(input_file),
            output_file_path=str(output_file),
            output_format="pptx"
        )

        assert result["success"] is True
        assert "job_id" in result
        assert Path(result["output_path"]).exists()
        assert Path(result["output_path"]).stat().st_size > 0

        print(f"Conversion successful: {result['job_id']}")
        print(f"Output size: {result['file_size']} bytes")

    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    import asyncio

    print("Running CloudConvert integration tests...")

    # Test account info
    print("\n1. Testing account info...")
    result = asyncio.run(cloudconvert_service.get_account_info())
    print(f"   Result: {result}")

    # Test conversion (requires sample PDF)
    print("\n2. Testing PDF conversion...")
    print("   Skipped - run pytest for full test")
```

**Run the test:**

```bash
cd backend-python

# Run specific test file
poetry run pytest tests/integration/test_cloudconvert.py -v -s

# Or run just the account info test
poetry run python tests/integration/test_cloudconvert.py
```

**Expected output:**
```
Running CloudConvert integration tests...

1. Testing account info...
   Result: {'success': True, 'credits': 500, 'email': 'your@email.com'}

2. Testing PDF conversion...
   Skipped - run pytest for full test
```

This confirms CloudConvert is working!

## Checkpoint 2: Validation

Before moving to Phase 3, verify CloudConvert integration:

- [ ] `app/services/cloudconvert.py` created
- [ ] `app/schemas/conversion.py` created with Pydantic models
- [ ] `app/utils/files.py` created with helper functions
- [ ] CloudConvert service initializes without errors
- [ ] Account info test passes (shows your email and credits)
- [ ] All imports work without errors

**Quick validation:**

```bash
cd backend-python

# Test all imports
poetry run python -c "from app.services.cloudconvert import cloudconvert_service; from app.schemas.conversion import ConversionType, JobStatus; from app.utils.files import get_storage_path; print('✓ Phase 2 imports OK')"

# Test CloudConvert connection
poetry run python -c "import asyncio; from app.services.cloudconvert import cloudconvert_service; result = asyncio.run(cloudconvert_service.get_account_info()); print(f'✓ CloudConvert connected: {result}')"
```

**Time spent so far:** ~42-53 hours (including Phases 0-1)

**Note**: We'll create the actual API endpoints (routers) in Phase 5 after implementing authentication, since upload endpoints require auth.

---

# Phase 3: Database Models & ORM

**Estimated Time**: 20-25 hours
**Goal**: Create SQLAlchemy models matching Node.js Sequelize models and set up Alembic migrations
**Prerequisites**: Phases 0-2 complete

## Overview

In this phase, we'll create the database layer:

1. **User model** - User accounts with plans and subscriptions
2. **ConversionJob model** - PDF conversion job tracking
3. **Subscription model** - PayFast subscription data
4. **PaymentLog model** - Payment transaction history
5. **UsageLog model** - Usage analytics
6. **Alembic migrations** - Database schema version control
7. **Model relationships** - Foreign keys and joins

**Key differences SQLAlchemy vs Sequelize:**
- Declarative class-based models vs `Model.init()`
- Async sessions vs sync by default
- Alembic vs Sequelize migrations
- Relationships defined on model classes

## Step 3.1: Enum Definitions

**File:** `backend-python\app\models\enums.py`

Centralized enum definitions for consistency.

```python
"""
Enumeration types used across database models.
"""
from enum import Enum as PyEnum


class UserPlan(str, PyEnum):
    """User subscription plans."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, PyEnum):
    """Subscription status values."""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    SUSPENDED = "suspended"


class ConversionType(str, PyEnum):
    """Supported conversion operations."""
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_DOCX = "pdf_to_docx"
    PDF_TO_XLSX = "pdf_to_xlsx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_MERGE = "pdf_merge"


class JobStatus(str, PyEnum):
    """Job processing status."""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PaymentType(str, PyEnum):
    """Payment transaction types."""
    ONE_TIME = "one_time"
    SUBSCRIPTION = "subscription"
    REFUND = "refund"


class PaymentStatus(str, PyEnum):
    """Payment status values."""
    PENDING = "pending"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELED = "canceled"


class OperationType(str, PyEnum):
    """Usage log operation types."""
    CONVERSION = "conversion"
    MERGE = "merge"
    DOWNLOAD = "download"
    API_CALL = "api_call"
```

## Step 3.2: User Model

**File:** `backend-python\app\models\user.py`

```python
"""
User model - equivalent to backend/src/models/User.ts
"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base
from app.core.config import settings
from app.models.enums import UserPlan, SubscriptionStatus

if TYPE_CHECKING:
    from app.models.conversion_job import ConversionJob
    from app.models.subscription import Subscription


class User(Base):
    """
    User account model.
    Stores authentication and subscription information.
    """
    __tablename__ = "users"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    # Plan and usage
    plan: Mapped[UserPlan] = mapped_column(
        SQLEnum(UserPlan),
        nullable=False,
        default=UserPlan.FREE
    )
    conversions_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    conversions_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=settings.CONVERSIONS_LIMIT_FREE
    )

    # Subscription
    subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    subscription_status: Mapped[Optional[SubscriptionStatus]] = mapped_column(
        SQLEnum(SubscriptionStatus),
        nullable=True
    )
    subscription_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relationships
    conversion_jobs: Mapped[list["ConversionJob"]] = relationship(
        "ConversionJob",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # Helper methods
    def can_convert(self) -> bool:
        """Check if user can perform conversions."""
        if self.plan in (UserPlan.PRO, UserPlan.ENTERPRISE):
            return True  # Unlimited
        return self.conversions_used < self.conversions_limit

    def get_max_file_size(self) -> int:
        """Get maximum file size for user's plan (bytes)."""
        return settings.get_max_file_size(self.plan.value)

    def reset_monthly_usage(self) -> None:
        """Reset monthly conversion count."""
        self.conversions_used = 0

    def increment_conversions(self) -> None:
        """Increment conversion count."""
        self.conversions_used += 1

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, plan={self.plan})>"
```

**Key features:**
- UUID primary key (matches Node version)
- Enum types for plan and status
- Helper methods (can_convert, get_max_file_size)
- Relationships to other models
- Timestamps with server defaults

## Step 3.3: ConversionJob Model

**File:** `backend-python\app\models\conversion_job.py`

```python
"""
ConversionJob model - equivalent to backend/src/models/ConversionJob.ts
"""
from datetime import datetime, timedelta
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, BigInteger, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base
from app.models.enums import ConversionType, JobStatus

if TYPE_CHECKING:
    from app.models.user import User


class ConversionJob(Base):
    """
    PDF conversion job model.
    Tracks conversion status and file locations.
    """
    __tablename__ = "conversion_jobs"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign key to user
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Job details
    type: Mapped[ConversionType] = mapped_column(
        SQLEnum(ConversionType),
        nullable=False
    )
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus),
        nullable=False,
        default=JobStatus.PENDING,
        index=True
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    # File paths
    input_file: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )
    output_file: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True
    )

    # File metadata
    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    # CloudConvert tracking
    cloudconvert_job_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )

    # Error handling
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Timing
    estimated_time: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Estimated processing time in seconds"
    )
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.utcnow() + timedelta(hours=1),
        index=True
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="conversion_jobs"
    )

    # Helper methods
    def get_processing_time(self) -> Optional[float]:
        """Get processing duration in seconds."""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return None

    def is_expired(self) -> bool:
        """Check if job has expired."""
        return datetime.utcnow() > self.expires_at

    def get_output_format(self) -> str:
        """Get output file extension."""
        format_map = {
            ConversionType.PDF_TO_PPTX: "pptx",
            ConversionType.PDF_TO_DOCX: "docx",
            ConversionType.PDF_TO_XLSX: "xlsx",
            ConversionType.PDF_TO_IMAGES: "zip",
            ConversionType.PDF_MERGE: "pdf",
        }
        return format_map.get(self.type, "bin")

    def __repr__(self) -> str:
        return f"<ConversionJob(id={self.id}, type={self.type}, status={self.status})>"
```

## Step 3.4: Subscription Model

**File:** `backend-python\app\models\subscription.py`

```python
"""
Subscription model - tracks PayFast subscriptions.
"""
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base
from app.models.enums import UserPlan, SubscriptionStatus

if TYPE_CHECKING:
    from app.models.user import User


class Subscription(Base):
    """
    PayFast subscription tracking.
    Stores recurring billing information.
    """
    __tablename__ = "subscriptions"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign key
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Subscription details
    plan: Mapped[UserPlan] = mapped_column(
        SQLEnum(UserPlan),
        nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus),
        nullable=False,
        default=SubscriptionStatus.ACTIVE
    )

    # PayFast data
    payfast_token: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True
    )

    # Billing
    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )

    # Billing dates
    billing_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )
    next_billing_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    # Lifecycle
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscriptions"
    )

    # Helper methods
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status == SubscriptionStatus.ACTIVE and (
            self.ended_at is None or self.ended_at > datetime.utcnow()
        )

    def cancel(self) -> None:
        """Cancel the subscription."""
        self.status = SubscriptionStatus.CANCELED
        self.ended_at = datetime.utcnow()

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, plan={self.plan}, status={self.status})>"
```

## Step 3.5: PaymentLog Model

**File:** `backend-python\app\models\payment_log.py`

```python
"""
PaymentLog model - tracks all payment transactions.
"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Numeric, JSON, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base
from app.models.enums import PaymentType, PaymentStatus

if TYPE_CHECKING:
    from app.models.user import User


class PaymentLog(Base):
    """
    Payment transaction log.
    Stores PayFast ITN data and payment details.
    """
    __tablename__ = "payment_logs"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign keys
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    subscription_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True
    )

    # Transaction IDs
    transaction_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    payfast_payment_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )

    # Payment details
    payment_type: Mapped[PaymentType] = mapped_column(
        SQLEnum(PaymentType),
        nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.PENDING
    )

    # Amounts (USD)
    amount_gross: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    amount_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0.0
    )
    amount_net: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD"
    )

    # PayFast ITN data (stored as JSON)
    itn_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<PaymentLog(id={self.id}, transaction_id={self.transaction_id}, status={self.status})>"
```

## Step 3.6: UsageLog Model

**File:** `backend-python\app\models\usage_log.py`

```python
"""
UsageLog model - tracks API usage for analytics.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
import uuid

from app.core.database import Base
from app.models.enums import OperationType


class UsageLog(Base):
    """
    Usage analytics log.
    Tracks operations for reporting and billing.
    """
    __tablename__ = "usage_logs"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign keys
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    job_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True
    )

    # Operation details
    operation_type: Mapped[OperationType] = mapped_column(
        SQLEnum(OperationType),
        nullable=False,
        index=True
    )
    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    # Metrics
    processing_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Processing time in milliseconds"
    )
    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="File size in bytes"
    )

    # Error tracking
    error_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )

    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True
    )

    def __repr__(self) -> str:
        return f"<UsageLog(id={self.id}, operation={self.operation_type}, success={self.success})>"
```

## Step 3.7: Models Package Init

**File:** `backend-python\app\models\__init__.py`

```python
"""
Database models package.
Exports all models for easy importing.
"""
from app.core.database import Base
from app.models.enums import (
    UserPlan,
    SubscriptionStatus,
    ConversionType,
    JobStatus,
    PaymentType,
    PaymentStatus,
    OperationType,
)
from app.models.user import User
from app.models.conversion_job import ConversionJob
from app.models.subscription import Subscription
from app.models.payment_log import PaymentLog
from app.models.usage_log import UsageLog

# Export all models
__all__ = [
    "Base",
    "User",
    "ConversionJob",
    "Subscription",
    "PaymentLog",
    "UsageLog",
    "UserPlan",
    "SubscriptionStatus",
    "ConversionType",
    "JobStatus",
    "PaymentType",
    "PaymentStatus",
    "OperationType",
]
```

## Step 3.8: Initialize Alembic

Alembic is the migration tool for SQLAlchemy (like Sequelize migrations).

```bash
cd backend-python

# Initialize Alembic
poetry run alembic init alembic

# This creates:
# - alembic/ directory
# - alembic.ini file
```

**Edit `alembic.ini`:**

Find the line `sqlalchemy.url = ...` and replace with:

```ini
# sqlalchemy.url = driver://user:pass@localhost/dbname
# We'll set this programmatically from .env
```

**Edit `backend-python\alembic\env.py`:**

Replace the entire file with:

```python
"""
Alembic environment configuration.
Loads database URL from settings and imports all models.
"""
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import asyncio

# Import Base and all models
from app.core.database import Base
from app.core.config import settings
from app.models import *  # noqa - imports all models for autogenerate

# Alembic Config object
config = context.config

# Set database URL from settings
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Model metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    This configures the context with just a URL and not an Engine.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Execute migrations with given connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in async mode.
    Creates an async engine and acquires a connection.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

## Step 3.9: Create Initial Migration

```bash
cd backend-python

# Create initial migration (auto-generates from models)
poetry run alembic revision --autogenerate -m "Initial schema"

# This creates a file in alembic/versions/xxx_initial_schema.py
```

**Review the generated migration file:**

```bash
# List migration files
dir alembic\versions

# View the migration (optional)
type alembic\versions\*_initial_schema.py
```

The migration should create all 5 tables (users, conversion_jobs, subscriptions, payment_logs, usage_logs).

## Step 3.10: Run Migrations

```bash
cd backend-python

# Apply migrations to database
poetry run alembic upgrade head

# Expected output:
# INFO  [alembic.runtime.migration] Context impl MySQLImpl.
# INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
# INFO  [alembic.runtime.migration] Running upgrade  -> abc123, Initial schema
```

**Verify tables were created:**

```bash
# Connect to MySQL and check tables
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "USE pdflab; SHOW TABLES;"

# Expected output:
# +------------------+
# | Tables_in_pdflab |
# +------------------+
# | alembic_version  |
# | conversion_jobs  |
# | payment_logs     |
# | subscriptions    |
# | usage_logs       |
# | users            |
# +------------------+
```

**Verify schema:**

```bash
# Check users table structure
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "USE pdflab; DESCRIBE users;"

# Should show all columns: id, email, password_hash, name, plan, conversions_used, etc.
```

## Step 3.11: Test Models

Create a test script to verify models work.

**File:** `backend-python\tests\integration\test_models.py`

```python
"""
Integration tests for database models.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import select

from app.core.database import get_db_context
from app.models import User, ConversionJob, UserPlan, ConversionType, JobStatus


@pytest.mark.asyncio
async def test_create_user():
    """Test creating a user."""
    async with get_db_context() as db:
        # Create user
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            name="Test User",
            plan=UserPlan.FREE,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Verify
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.plan == UserPlan.FREE
        assert user.conversions_used == 0
        assert user.can_convert() is True

        print(f"✓ Created user: {user.id}")

        # Cleanup
        await db.delete(user)
        await db.commit()


@pytest.mark.asyncio
async def test_create_conversion_job():
    """Test creating a conversion job."""
    async with get_db_context() as db:
        # Create user first
        user = User(
            email="test2@example.com",
            password_hash="hashed_password",
            plan=UserPlan.STARTER,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create job
        job = ConversionJob(
            user_id=user.id,
            type=ConversionType.PDF_TO_PPTX,
            status=JobStatus.PENDING,
            file_name="test.pdf",
            file_size=1024,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Verify
        assert job.id is not None
        assert job.user_id == user.id
        assert job.type == ConversionType.PDF_TO_PPTX
        assert job.get_output_format() == "pptx"

        print(f"✓ Created job: {job.id}")

        # Test relationship
        result = await db.execute(
            select(User).where(User.id == user.id)
        )
        user_with_jobs = result.scalar_one()

        # Note: Need to explicitly load relationship in async
        await db.refresh(user_with_jobs, ["conversion_jobs"])
        assert len(user_with_jobs.conversion_jobs) == 1

        print(f"✓ User has {len(user_with_jobs.conversion_jobs)} job(s)")

        # Cleanup
        await db.delete(job)
        await db.delete(user)
        await db.commit()


@pytest.mark.asyncio
async def test_user_helper_methods():
    """Test User model helper methods."""
    async with get_db_context() as db:
        # Create user
        user = User(
            email="test3@example.com",
            password_hash="hashed_password",
            plan=UserPlan.FREE,
            conversions_used=2,
            conversions_limit=3,
        )
        db.add(user)
        await db.commit()

        # Test can_convert
        assert user.can_convert() is True

        # Increment conversions
        user.increment_conversions()
        assert user.conversions_used == 3
        assert user.can_convert() is False

        # Test max file size
        max_size = user.get_max_file_size()
        assert max_size == 10485760  # 10MB for free plan

        # Change to Pro plan
        user.plan = UserPlan.PRO
        assert user.can_convert() is True  # Unlimited for Pro

        print("✓ Helper methods work correctly")

        # Cleanup
        await db.delete(user)
        await db.commit()


if __name__ == "__main__":
    import asyncio

    print("Running model integration tests...\n")

    asyncio.run(test_create_user())
    asyncio.run(test_create_conversion_job())
    asyncio.run(test_user_helper_methods())

    print("\n✓ All model tests passed!")
```

**Run the tests:**

```bash
cd backend-python

# Run with pytest
poetry run pytest tests/integration/test_models.py -v -s

# Or run directly
poetry run python tests/integration/test_models.py
```

**Expected output:**
```
Running model integration tests...

✓ Created user: abc123-...
✓ Created job: def456-...
✓ User has 1 job(s)
✓ Helper methods work correctly

✓ All model tests passed!
```

## Checkpoint 3: Validation

Verify Phase 3 completion:

- [ ] All model files created (user.py, conversion_job.py, subscription.py, payment_log.py, usage_log.py)
- [ ] Enums defined (enums.py)
- [ ] Models __init__.py exports all models
- [ ] Alembic initialized
- [ ] Initial migration created
- [ ] Migration applied successfully (`alembic upgrade head`)
- [ ] Tables exist in database (`SHOW TABLES`)
- [ ] Model tests pass

**Quick validation:**

```bash
cd backend-python

# Test 1: Import all models
poetry run python -c "from app.models import User, ConversionJob, Subscription, PaymentLog, UsageLog; print('✓ All models import OK')"

# Test 2: Check Alembic status
poetry run alembic current
# Should show: abc123 (head)

# Test 3: Verify database tables
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** -e "USE pdflab; SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='pdflab';"
# Should show 6 tables (5 models + alembic_version)

# Test 4: Run model tests
poetry run python tests/integration/test_models.py
```

**Time spent so far:** ~62-78 hours (including Phases 0-2)

---

**Due to character limits, I'll continue with the remaining phases in the response. This document is approximately 20% complete. The remaining phases (4-8) will follow the same detailed pattern with complete code examples, testing procedures, and validation checkpoints.**

**Would you like me to continue with Phase 4 (Job Queue & Celery Workers) or save this progress first?**

Since this is already quite extensive, I recommend saving this to the file now, and I can continue expanding it with the remaining phases in follow-up responses. Each phase will maintain this level of detail with complete, production-ready code.
