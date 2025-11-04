"""Database configuration and session management."""
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# Create async engine for MySQL
if settings.is_development:
    # Development: No connection pooling
    engine: AsyncEngine = create_async_engine(
        settings.database_url,
        echo=True,  # Log SQL queries
        poolclass=NullPool
    )
else:
    # Production: Use connection pooling
    engine: AsyncEngine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_size=10,  # Number of connections to maintain
        max_overflow=20  # Max additional connections
    )

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for all models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session.

    This is used as a FastAPI dependency to provide database sessions
    to route handlers. The session is automatically committed on success
    or rolled back on error.

    Yields:
        AsyncSession: Database session

    Example:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("database_session_error", error=str(e))
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database connection.

    Tests the database connection on application startup.

    Raises:
        Exception: If database connection fails
    """
    try:
        async with engine.begin() as conn:
            # Test connection
            await conn.run_sync(lambda _: None)

        logger.info(
            "database_connected",
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            database=settings.DB_NAME
        )
    except Exception as e:
        logger.error(
            "database_connection_failed",
            error=str(e),
            host=settings.DB_HOST,
            port=settings.DB_PORT
        )
        raise


async def close_db() -> None:
    """Close database connection."""
    await engine.dispose()
    logger.info("database_closed")


async def create_tables() -> None:
    """
    Create all tables in the database.

    This should only be used in development. In production,
    use Alembic migrations instead.

    Raises:
        RuntimeError: If called in production
    """
    if not settings.is_development:
        raise RuntimeError(
            "create_tables() should only be used in development. "
            "Use Alembic migrations in production."
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("database_tables_created")


async def drop_tables() -> None:
    """
    Drop all tables in the database.

    WARNING: This will delete all data!
    This should only be used in development/testing.

    Raises:
        RuntimeError: If called in production
    """
    if not settings.is_development:
        raise RuntimeError(
            "drop_tables() should never be used in production!"
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    logger.warning("database_tables_dropped")
