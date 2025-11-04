# PDFLab Python Backend

FastAPI-based backend service for PDF conversion and manipulation platform. Migrated from Node.js/Express to Python/FastAPI.

## 🚀 Features

- **PDF Conversion**: Convert PDFs to PPTX, DOCX, XLSX, PNG formats
- **PDF Merging**: Combine multiple PDF files into one
- **Authentication**: JWT-based authentication with access and refresh tokens
- **Payment Integration**: PayFast payment gateway with subscription management
- **Background Jobs**: Celery-based async job processing with Redis
- **Database**: MySQL 8.0 with Alembic migrations
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## 📋 Tech Stack

- **Framework**: FastAPI 0.104+
- **Python**: 3.11+
- **Database**: MySQL 8.0 (via aiomysql)
- **Cache/Queue**: Redis 7.0
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Task Queue**: Celery with Redis broker
- **PDF Processing**: CloudConvert API v3
- **Payment**: PayFast (USD)
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)

## 🏗️ Project Structure

```
backend-python/
├── app/
│   ├── config.py                 # Application configuration
│   ├── database.py               # Database connection & session
│   ├── main.py                   # FastAPI application entry
│   │
│   ├── models/                   # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py               # User, UserPlan, SubscriptionStatus
│   │   ├── conversion_job.py     # ConversionJob, JobStatus, ConversionType
│   │   ├── subscription.py       # Subscription, PlanType
│   │   └── payment_log.py        # PaymentLog, PaymentStatus, PaymentType
│   │
│   ├── schemas/                  # Pydantic schemas (request/response)
│   │   ├── conversion.py         # Conversion API schemas
│   │   ├── auth.py               # Authentication schemas
│   │   └── payfast.py            # PayFast payment schemas
│   │
│   ├── routers/                  # API endpoints
│   │   ├── conversion.py         # PDF conversion & merge
│   │   ├── auth.py               # Register, login, profile
│   │   └── payfast.py            # Payment, subscriptions
│   │
│   ├── services/                 # Business logic
│   │   ├── cloudconvert_service.py  # CloudConvert integration
│   │   ├── payfast_service.py       # PayFast payment processing
│   │   └── job_queue.py             # Celery job queueing
│   │
│   ├── middleware/               # Authentication & authorization
│   │   └── auth.py               # JWT validation, quota checks
│   │
│   ├── jobs/                     # Celery background workers
│   │   ├── celery_app.py         # Celery configuration
│   │   └── conversion_job.py     # PDF conversion worker
│   │
│   ├── utils/                    # Utilities
│   │   ├── auth.py               # JWT & password utilities
│   │   ├── file_utils.py         # File validation & storage
│   │   └── logger.py             # Structured logging
│   │
│   └── workers/                  # Celery worker entrypoint
│       └── conversion.py
│
├── alembic/                      # Database migrations
│   ├── versions/                 # Migration scripts
│   ├── env.py                    # Alembic environment
│   └── script.py.mako            # Migration template
│
├── storage/                      # File uploads (gitignored)
│   └── uploads/
│
├── pyproject.toml                # Poetry dependencies
├── poetry.lock                   # Locked dependencies
├── alembic.ini                   # Alembic configuration
└── .env                          # Environment variables
```

## 🔧 Installation

### Prerequisites

- Python 3.11+
- Poetry (dependency management)
- Docker Desktop (for MySQL & Redis)
- CloudConvert API key
- PayFast merchant credentials

### 1. Clone Repository

```bash
cd backend-python
```

### 2. Install Dependencies

```bash
poetry install
```

### 3. Start Database Services

```bash
# Start MySQL
docker run -d \
  --name pdflab-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=pdflab \
  -e MYSQL_USER=pdflab \
  -e MYSQL_PASSWORD=***REMOVED*** \
  -p 3306:3306 \
  mysql:8.0

# Start Redis
docker run -d \
  --name pdflab-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
PORT=3007
API_URL=http://localhost:3007

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=***REMOVED***
DB_NAME=pdflab

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CloudConvert
CLOUDCONVERT_API_KEY=your_api_key_here
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRATION=604800

# PayFast
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3002
```

### 5. Run Database Migrations

```bash
poetry run alembic upgrade head
```

### 6. Start Application

```bash
# Start API server
poetry run uvicorn app.main:app --host 0.0.0.0 --port 3007 --reload

# Start Celery worker (in separate terminal)
poetry run celery -A app.jobs.celery_app worker --loglevel=info
```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login and get tokens | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| GET | `/api/auth/profile` | Get user profile | Yes |

### PDF Conversion

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/upload` | Upload and convert PDF | Yes |
| GET | `/api/status/{job_id}` | Check job status | Yes |
| GET | `/api/download/{job_id}` | Download converted file | Yes |
| GET | `/api/history` | Get conversion history | Yes |
| POST | `/api/merge` | Merge multiple PDFs | Yes |

### Payment (PayFast)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/payfast/plans` | Get pricing plans | No |
| POST | `/api/payfast/initialize` | Initialize payment | Yes |
| POST | `/api/payfast/webhook` | ITN webhook (PayFast) | No |
| GET | `/api/payfast/return` | Payment success page | No |
| GET | `/api/payfast/cancel` | Payment cancel page | No |
| GET | `/api/payfast/subscription/{id}` | Get subscription | Yes |
| POST | `/api/payfast/cancel-subscription` | Cancel subscription | Yes |

### Health & Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |
| GET | `/redoc` | ReDoc UI |

## 🧪 Testing Examples

### 1. Register User

```bash
curl -X POST http://localhost:3007/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@pdflab.com",
    "password": "TestPass123",
    "name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@pdflab.com",
    "password": "TestPass123"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

### 3. Upload PDF for Conversion

```bash
curl -X POST http://localhost:3007/api/upload \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@document.pdf" \
  -F "conversion_type=pdf_to_pptx" \
  -F "dpi=300" \
  -F "pages=all" \
  -F "ocr=true"
```

### 4. Check Job Status

```bash
curl http://localhost:3007/api/status/<job_id> \
  -H "Authorization: Bearer <access_token>"
```

### 5. Download Converted File

```bash
curl http://localhost:3007/api/download/<job_id> \
  -H "Authorization: Bearer <access_token>" \
  -o converted.pptx
```

### 6. Initialize Payment

```bash
curl -X POST http://localhost:3007/api/payfast/initialize \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "subscription": true
  }'
```

## 🗄️ Database Migrations

### Create New Migration

```bash
poetry run alembic revision --autogenerate -m "Description"
```

### Apply Migrations

```bash
# Apply all pending migrations
poetry run alembic upgrade head

# Apply specific migration
poetry run alembic upgrade <revision_id>

# Apply next migration
poetry run alembic upgrade +1
```

### Rollback Migrations

```bash
# Rollback one migration
poetry run alembic downgrade -1

# Rollback to specific revision
poetry run alembic downgrade <revision_id>

# Rollback all
poetry run alembic downgrade base
```

### View Migration History

```bash
poetry run alembic history
poetry run alembic current
```

## 🔐 Authentication Flow

1. **Register**: POST `/api/auth/register`
   - User provides email, password, name
   - Password validated (min 8 chars, uppercase, lowercase, digit)
   - Password hashed with bcrypt
   - User created with FREE plan

2. **Login**: POST `/api/auth/login`
   - User provides email, password
   - Password verified
   - Access token (7 days) and refresh token (30 days) generated
   - Returns JWT tokens

3. **Protected Requests**:
   - Include `Authorization: Bearer <access_token>` header
   - Token validated by `get_current_user` middleware
   - User object injected into endpoint

4. **Refresh Token**: POST `/api/auth/refresh`
   - Send refresh token
   - Get new access and refresh tokens

## 💳 Payment Flow (PayFast)

1. **Initialize Payment**: POST `/api/payfast/initialize`
   - User selects plan (starter/pro/enterprise)
   - System creates PaymentLog (PENDING)
   - Returns PayFast form data with signature

2. **PayFast Payment**:
   - User redirected to PayFast
   - Completes payment on PayFast site

3. **ITN Webhook**: POST `/api/payfast/webhook`
   - PayFast sends Instant Transaction Notification
   - 3-step validation:
     - Host validation (PayFast servers only)
     - Signature validation (MD5 with passphrase)
     - Server verification (HTTPS to PayFast)
   - On success:
     - PaymentLog updated (COMPLETE)
     - Subscription created (ACTIVE)
     - User plan upgraded
     - Conversion quota reset

4. **Return**: GET `/api/payfast/return`
   - User redirected back after payment
   - Success page displayed

## 📊 Pricing Plans

| Plan | Price/Month | Conversions | File Size | Features |
|------|-------------|-------------|-----------|----------|
| **Free** | $0.00 | 3 | 10MB | Basic conversions |
| **Starter** | $9.99 | 100 | 25MB | Priority processing |
| **Pro** | $29.99 | Unlimited | 100MB | OCR, Batch processing |
| **Enterprise** | $99.99 | Unlimited | 500MB | API access, SLA |

## 🔄 Background Job Processing

### Celery Workers

The application uses Celery for async PDF processing:

```bash
# Start worker
poetry run celery -A app.jobs.celery_app worker --loglevel=info

# Monitor tasks
poetry run celery -A app.jobs.celery_app inspect active
poetry run celery -A app.jobs.celery_app inspect stats
```

### Job Flow

1. User uploads PDF via `/api/upload`
2. File saved to `storage/uploads/{user_id}/{job_id}/`
3. Job record created in database (PENDING)
4. Job queued to Celery (QUEUED)
5. Celery worker picks up job (PROCESSING)
6. CloudConvert processes PDF
7. Output file downloaded
8. Job marked complete (COMPLETED)
9. User can download via `/api/download/{job_id}`

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
netstat -ano | findstr :3007

# Kill process (Windows)
taskkill /PID <process_id> /F

# Check database connection
docker exec pdflab-mysql mysql -updflab -p***REMOVED*** -e "SELECT 1"
```

### Database Issues

```bash
# Reset migrations
poetry run alembic downgrade base
poetry run alembic upgrade head

# Check database
docker exec -it pdflab-mysql mysql -updflab -p***REMOVED*** pdflab
```

### Celery Not Processing Jobs

```bash
# Check Redis
docker exec -it pdflab-redis redis-cli PING

# Check Celery worker logs
poetry run celery -A app.jobs.celery_app inspect active

# Purge queue
poetry run celery -A app.jobs.celery_app purge
```

### CloudConvert Errors

- **401 Unauthorized**: Check `CLOUDCONVERT_API_KEY` in `.env`
- **Sandbox Mode**: Set `CLOUDCONVERT_SANDBOX=false` for production
- **Quota Exceeded**: Check CloudConvert dashboard

## 📝 Development

### Code Style

```bash
# Format code (if black installed)
black app/

# Lint code (if ruff installed)
ruff check app/

# Type checking (if mypy installed)
mypy app/
```

### Running Tests

```bash
# Install test dependencies
poetry add --group dev pytest pytest-asyncio httpx

# Run tests
poetry run pytest

# With coverage
poetry run pytest --cov=app --cov-report=html
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Set `CLOUDCONVERT_SANDBOX=false`
- [ ] Configure `PAYFAST_MODE=production`
- [ ] Use managed MySQL (not Docker)
- [ ] Use managed Redis (not Docker)
- [ ] Set proper `CORS_ORIGINS`
- [ ] Use reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up process manager (systemd/supervisor)
- [ ] Configure log rotation
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Configure backups

### Systemd Service (Linux)

```ini
[Unit]
Description=PDFLab API Server
After=network.target

[Service]
Type=notify
User=pdflab
Group=pdflab
WorkingDirectory=/opt/pdflab/backend-python
Environment="PATH=/opt/pdflab/.venv/bin"
ExecStart=/opt/pdflab/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3007
Restart=always

[Install]
WantedBy=multi-user.target
```

### Celery Service

```ini
[Unit]
Description=PDFLab Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=pdflab
Group=pdflab
WorkingDirectory=/opt/pdflab/backend-python
Environment="PATH=/opt/pdflab/.venv/bin"
ExecStart=/opt/pdflab/.venv/bin/celery -A app.jobs.celery_app worker --loglevel=info --detach
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

---

**Version**: 2.0.1 (Python/FastAPI)
**Last Updated**: 2025-10-30
**Status**: Production Ready
