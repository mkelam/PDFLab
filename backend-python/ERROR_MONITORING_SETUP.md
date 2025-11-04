# Error Monitoring & Logging Setup Guide

## Overview

PDFLab uses a comprehensive logging and error monitoring system with:
- **Structlog** for structured JSON logging
- **Sentry** for error tracking (optional)
- **Log rotation** for production
- **Request ID tracking** for debugging

---

## Current Logging Implementation

### ✅ Already Configured

**Logger:** `app/utils/logger.py`
- Structured JSON logging with structlog
- Automatic context enrichment (timestamp, level, module)
- Request ID tracking in middleware
- Console output for development

**Middleware:** `app/main.py`
- Request/response logging
- Execution time tracking
- Request ID generation (UUID)
- Error capturing

**Log Locations:**
- Development: Console output
- Production: `/var/log/pdflab/` (needs configuration)

---

## Sentry Integration (Recommended)

### Step 1: Install Sentry SDK

```bash
cd backend-python
poetry add sentry-sdk[fastapi]
```

### Step 2: Add to Environment Variables

Add to `backend-python/.env`:
```bash
# Sentry Error Tracking (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

### Step 3: Update config.py

Add to `backend-python/app/config.py`:
```python
# Sentry Configuration
SENTRY_DSN: Optional[str] = None
SENTRY_ENVIRONMENT: str = "production"
SENTRY_TRACES_SAMPLE_RATE: float = 0.1
```

### Step 4: Initialize Sentry in main.py

Add to `backend-python/app/main.py` (after imports):
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

# Initialize Sentry if DSN is configured
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        # Send PII (Personally Identifiable Information)
        send_default_pii=False,
        # Release tracking
        release=f"pdflab@{app.version}",
    )
    logger.info("sentry_initialized", environment=settings.SENTRY_ENVIRONMENT)
```

---

## Log Rotation (Production)

### Using logrotate (Linux)

Create `/etc/logrotate.d/pdflab`:
```
/var/log/pdflab/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload pdflab-api > /dev/null 2>&1 || true
    endscript
}
```

### File Logging Configuration

Update `app/utils/logger.py` to add file handler:
```python
import logging.handlers

def get_logger(name: str):
    logger = structlog.get_logger(name)

    # Add file handler for production
    if settings.NODE_ENV == "production":
        file_handler = logging.handlers.RotatingFileHandler(
            "/var/log/pdflab/api.log",
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(
            logging.Formatter('%(message)s')
        )
        logging.root.addHandler(file_handler)

    return logger
```

---

## Error Tracking Best Practices

### 1. Log Levels

Use appropriate log levels:
```python
logger.debug("detailed_debug_info", user_id=user_id)
logger.info("normal_operation", action="user_login")
logger.warning("potential_issue", attempt=3)
logger.error("error_occurred", error=str(e))
logger.critical("system_failure", service="database")
```

### 2. Context Enrichment

Add context to logs:
```python
logger.info(
    "conversion_started",
    user_id=user.id,
    job_id=job_id,
    conversion_type="pptx",
    file_size=file_size,
    request_id=request.state.request_id
)
```

### 3. Error Capture

Capture exceptions with context:
```python
try:
    result = process_conversion(file)
except Exception as e:
    logger.error(
        "conversion_failed",
        error=str(e),
        error_type=type(e).__name__,
        user_id=user.id,
        job_id=job_id,
        exc_info=True  # Include stack trace
    )
    raise
```

### 4. Performance Monitoring

Track slow operations:
```python
import time

start_time = time.time()
result = expensive_operation()
duration = time.time() - start_time

if duration > 1.0:  # Slow operation warning
    logger.warning(
        "slow_operation",
        operation="pdf_conversion",
        duration_seconds=duration,
        job_id=job_id
    )
```

---

## Monitoring Dashboard Setup

### Sentry Dashboard

**Key Metrics to Monitor:**
1. Error rate (errors/minute)
2. Response time (p50, p95, p99)
3. User affected count
4. Error frequency by endpoint
5. Database query performance

**Alerts to Configure:**
- Error rate > 10/minute
- Response time p95 > 2 seconds
- Critical errors immediately
- Database connection failures

### Custom Metrics

Add to `app/main.py`:
```python
from prometheus_client import Counter, Histogram

# Request metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)
```

---

## Log Queries for Analysis

### Common Log Queries

**Failed Logins:**
```python
# Search logs for: login_failed_invalid_credentials
```

**Conversion Errors:**
```python
# Search logs for: conversion_failed
```

**Slow Endpoints:**
```python
# Search logs where: duration_ms > 2000
```

**User Activity:**
```python
# Search logs for user_id: "specific-user-id"
```

---

## Testing Error Monitoring

### 1. Test Sentry Integration

Add test endpoint in `app/main.py`:
```python
@app.get("/sentry-test")
async def sentry_test():
    """Test endpoint to trigger Sentry error."""
    if settings.is_development:
        raise Exception("This is a test error for Sentry")
    raise HTTPException(status_code=403, detail="Not available")
```

### 2. Verify Logging

```bash
# Generate test logs
curl http://localhost:3007/api/auth/profile

# Check logs
tail -f /var/log/pdflab/api.log
```

### 3. Test Error Capture

```python
# Trigger a 500 error
curl -X POST http://localhost:3007/api/upload \
  -H "Authorization: Bearer invalid_token"
```

---

## Log Analysis Tools

### Recommended Tools

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - Full-text search
   - Real-time dashboards
   - Alerting

2. **Papertrail**
   - Cloud-based log aggregation
   - Easy setup
   - Free tier available

3. **Datadog**
   - Application performance monitoring
   - Infrastructure monitoring
   - Log management

4. **Grafana + Loki**
   - Open-source
   - Powerful querying
   - Custom dashboards

---

## Production Checklist

- [ ] Sentry configured with DSN
- [ ] Log rotation enabled
- [ ] File logging configured
- [ ] Error alerts set up
- [ ] Performance monitoring active
- [ ] Log retention policy (30-90 days)
- [ ] Access logs separated from error logs
- [ ] PII data scrubbed from logs
- [ ] Monitoring dashboard accessible
- [ ] Alert channels configured (email/Slack)

---

## Example Log Outputs

### Successful Request
```json
{
  "event": "request_completed",
  "timestamp": "2025-10-30T10:30:00Z",
  "level": "info",
  "method": "POST",
  "path": "/api/auth/login",
  "status_code": 200,
  "duration_ms": 245,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123"
}
```

### Error Log
```json
{
  "event": "conversion_failed",
  "timestamp": "2025-10-30T10:31:00Z",
  "level": "error",
  "error": "CloudConvert API timeout",
  "error_type": "TimeoutError",
  "job_id": "job-456",
  "user_id": "user-123",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "stack_trace": "..."
}
```

---

## Support & Resources

**Sentry Documentation:** https://docs.sentry.io/platforms/python/guides/fastapi/
**Structlog Documentation:** https://www.structlog.org/
**FastAPI Logging:** https://fastapi.tiangolo.com/tutorial/handling-errors/

---

**Last Updated:** 2025-10-30
**Version:** 1.0
