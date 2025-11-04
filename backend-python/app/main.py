"""Main FastAPI application."""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import uuid

from app.config import settings
from app.database import init_db, close_db
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.

    Handles startup and shutdown tasks:
    - Startup: Initialize database connection
    - Shutdown: Close database connection
    """
    # Startup
    logger.info(
        "application_startup",
        version="2.0.1",
        environment=settings.NODE_ENV,
        port=settings.PORT,
        python_backend=True
    )

    try:
        await init_db()
        logger.info("application_ready", port=settings.PORT)
    except Exception as e:
        logger.error("application_startup_failed", error=str(e), exc_info=True)
        raise

    yield

    # Shutdown
    logger.info("application_shutdown")
    try:
        await close_db()
    except Exception as e:
        logger.error("application_shutdown_error", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="PDFLab API",
    version="2.0.1",
    description="PDF conversion and manipulation platform (Python/FastAPI)",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ============================================================================
# MIDDLEWARE
# ============================================================================

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to all requests for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing information."""
    start_time = time.time()
    request_id = getattr(request.state, "request_id", "unknown")

    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        request_id=request_id,
        client_host=request.client.host if request.client else "unknown"
    )

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
            request_id=request_id
        )

        return response

    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "request_failed",
            method=request.method,
            path=request.url.path,
            duration_ms=round(duration * 1000, 2),
            error=str(e),
            request_id=request_id,
            exc_info=True
        )
        raise


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"]
)

# Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.warning(
        "validation_error",
        errors=exc.errors(),
        body=exc.body,
        request_id=request_id,
        path=request.url.path
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "body": exc.body,
            "request_id": request_id
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.error(
        "unhandled_exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        request_id=request_id,
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "request_id": request_id
        }
    )


# ============================================================================
# ROUTES
# ============================================================================

@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PDFLab API (Python)",
        "version": "2.0.1",
        "framework": "FastAPI",
        "status": "running",
        "environment": settings.NODE_ENV,
        "endpoints": {
            "health": "/health",
            "auth": "/api/auth",
            "user_management": "/api/admin",  # Admin panel for managing users
            "payfast": "/api/payfast",
            "conversion": "/api"
        },
        "documentation": {
            "swagger": "/docs" if settings.is_development else "disabled",
            "redoc": "/redoc" if settings.is_development else "disabled"
        }
    }


@app.get("/health", tags=["health"])
@limiter.limit("10/minute")
async def health_check(request: Request):
    """
    Health check endpoint.

    Returns application status and version information.
    Rate limited to 10 requests per minute.
    """
    return {
        "status": "OK",
        "version": "2.0.0",
        "python": "3.11+",
        "framework": "FastAPI",
        "environment": settings.NODE_ENV,
        "database": "MySQL 8.0",
        "cache": "Redis 7"
    }


# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

from app.routers import conversion, auth, payfast, admin

app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(conversion.router, prefix="/api", tags=["conversion"])
app.include_router(payfast.router, prefix="/api/payfast", tags=["payment"])


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.is_development,
        log_level="info" if settings.is_production else "debug",
        access_log=True
    )
