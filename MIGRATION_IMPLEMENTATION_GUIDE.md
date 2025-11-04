# PDFLab Backend Migration Implementation Guide
## Node.js/Express → Python/FastAPI

**Version**: 1.0
**Created**: 2025-10-30
**Estimated Total Time**: 180-240 hours (4.5-6 weeks)
**Agent**: Backend Migration Expert

---

## Table of Contents

1. [Prerequisites & Environment Setup](#phase-0-prerequisites--environment-setup)
2. [Phase 1: Project Foundation (20-25 hours)](#phase-1-project-foundation)
3. [Phase 2: CloudConvert Service Migration (18-22 hours)](#phase-2-cloudconvert-service-migration)
4. [Phase 3: Database Models & ORM (20-25 hours)](#phase-3-database-models--orm)
5. [Phase 4: Job Queue & Celery Workers (30-40 hours)](#phase-4-job-queue--celery-workers)
6. [Phase 5: Authentication & Middleware (40-50 hours)](#phase-5-authentication--middleware)
7. [Phase 6: PayFast Payment Integration (50-60 hours)](#phase-6-payfast-payment-integration)
8. [Phase 7: Testing & Validation (30-50 hours)](#phase-7-testing--validation)
9. [Phase 8: Deployment & Monitoring (15-20 hours)](#phase-8-deployment--monitoring)
10. [Appendix: Troubleshooting & Best Practices](#appendix-troubleshooting--best-practices)

---

## Phase 0: Prerequisites & Environment Setup

### Required Software

Before starting, ensure you have:

```bash
# Check versions
python --version          # Python 3.11+ required
node --version            # Node 20+ (for comparison testing)
docker --version          # Docker 24+ for MySQL/Redis
git --version             # Git for version control

# Install Poetry (Python package manager)
curl -sSL https://install.python-poetry.org | python3 -

# Verify Poetry installation
poetry --version          # Should be 1.7+
```

### Environment Setup

```bash
# Navigate to project root
cd C:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Ensure Docker containers are running
docker ps | findstr pdflab-mysql
docker ps | findstr pdflab-redis

# If not running, start them
docker start pdflab-mysql pdflab-redis

# Verify Node.js backend is working (baseline comparison)
cd backend
npm run dev
# Test: curl http://localhost:3006/health

# Stop Node.js backend (we'll run both later)
# Ctrl+C
```

### Create Python Project Structure

```bash
# From PDFLab root directory
mkdir backend-python
cd backend-python

# Initialize Poetry project
poetry init --name pdflab-api --python "^3.11" --no-interaction

# Create directory structure
mkdir -p app/{models,schemas,services,workers,middleware,routers,utils}
mkdir -p tests/{unit,integration,e2e}
mkdir -p storage/{uploads,outputs,temp}
mkdir -p alembic/versions
mkdir -p logs
mkdir -p scripts

# Create __init__.py files
New-Item -ItemType File -Path app/__init__.py
New-Item -ItemType File -Path app/models/__init__.py
New-Item -ItemType File -Path app/schemas/__init__.py
New-Item -ItemType File -Path app/services/__init__.py
New-Item -ItemType File -Path app/workers/__init__.py
New-Item -ItemType File -Path app/middleware/__init__.py
New-Item -ItemType File -Path app/routers/__init__.py
New-Item -ItemType File -Path app/utils/__init__.py
New-Item -ItemType File -Path tests/__init__.py

# Create .gitignore
@"
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
pip-delete-this-directory.txt
.pytest_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# Storage
storage/uploads/*
storage/outputs/*
storage/temp/*
!storage/.gitkeep

# Logs
logs/*.log
*.log

# Alembic
alembic.ini

# OS
.DS_Store
Thumbs.db
"@ | Out-File -FilePath .gitignore -Encoding UTF8

# Create storage .gitkeep files
New-Item -ItemType File -Path storage/uploads/.gitkeep
New-Item -ItemType File -Path storage/outputs/.gitkeep
New-Item -ItemType File -Path storage/temp/.gitkeep
```

### Install Core Dependencies

```bash
# Core framework
poetry add fastapi uvicorn[standard]

# Database
poetry add sqlalchemy[asyncio] aiomysql alembic

# Job Queue
poetry add celery redis

# Authentication
poetry add python-jose[cryptography] passlib[bcrypt] python-multipart

# HTTP Client & File Operations
poetry add httpx aiofiles

# Configuration & Utilities
poetry add pydantic-settings python-decouple pendulum

# Logging
poetry add structlog python-json-logger

# CloudConvert (if official SDK exists, otherwise we'll use httpx)
# poetry add cloudconvert  # Check if available

# Development dependencies
poetry add --group dev pytest pytest-asyncio pytest-cov pytest-mock httpx faker locust mypy ruff black isort

# Rate limiting
poetry add slowapi

# Install all dependencies
poetry install
```

### Create .env File

```bash
# backend-python/.env
@"
# Server
NODE_ENV=development
PORT=3007
API_URL=http://localhost:3007

# Database (same as Node.js backend)
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CloudConvert
CLOUDCONVERT_API_KEY=your_api_key_here
CLOUDCONVERT_SANDBOX=false

# JWT (use NEW secret - users will need to re-login)
JWT_SECRET=your_new_jwt_secret_here_generate_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRATION=604800

# PayFast
PAYFAST_MERCHANT_ID=25263515
PAYFAST_MERCHANT_KEY=***REMOVED***
PAYFAST_PASSPHRASE=
PAYFAST_MODE=production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3002

# Storage
STORAGE_PATH=./storage

# File Size Limits (bytes)
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_STARTER=26214400
MAX_FILE_SIZE_PRO=104857600
MAX_FILE_SIZE_ENTERPRISE=524288000

# Conversion Limits
CONVERSIONS_LIMIT_FREE=3
CONVERSIONS_LIMIT_STARTER=100
"@ | Out-File -FilePath .env -Encoding UTF8

# Copy .env to .env.example (without secrets)
Copy-Item .env .env.example
```

---

## Phase 1: Project Foundation

**Estimated Time**: 20-25 hours
**Goal**: Set up FastAPI app, configuration, database connection, and basic structure

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive migration implementation guide", "activeForm": "Creating comprehensive migration implementation guide", "status": "completed"}, {"content": "Document Phase 1: Project setup and infrastructure", "activeForm": "Documenting Phase 1: Project setup and infrastructure", "status": "in_progress"}, {"content": "Document Phase 2: CloudConvert service migration", "activeForm": "Documenting Phase 2: CloudConvert service migration", "status": "pending"}, {"content": "Document Phase 3: Database models and ORM setup", "activeForm": "Documenting Phase 3: Database models and ORM setup", "status": "pending"}, {"content": "Document Phase 4: Job queue and Celery workers", "activeForm": "Documenting Phase 4: Job queue and Celery workers", "status": "pending"}, {"content": "Document Phase 5: Authentication and middleware", "activeForm": "Documenting Phase 5: Authentication and middleware", "status": "pending"}, {"content": "Document Phase 6: PayFast payment integration", "activeForm": "Documenting Phase 6: PayFast payment integration", "status": "pending"}, {"content": "Document Phase 7: Testing and validation", "activeForm": "Documenting Phase 7: Testing and validation", "status": "pending"}, {"content": "Document Phase 8: Deployment and monitoring", "activeForm": "Documenting Phase 8: Deployment and monitoring", "status": "pending"}, {"content": "Create implementation timeline and milestones", "activeForm": "Creating implementation timeline and milestones", "status": "pending"}]