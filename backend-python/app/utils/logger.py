"""Structured logging configuration with structlog."""
import structlog
import logging
import sys
from typing import Any
from pathlib import Path

from app.config import settings


def setup_logging() -> None:
    """
    Configure structlog for structured logging.

    Sets up different logging formats for development and production:
    - Development: Colorized console output
    - Production: JSON-formatted logs
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO if settings.is_production else logging.DEBUG
    )

    # Create logs directory if it doesn't exist
    Path("./logs").mkdir(exist_ok=True)

    # Configure structlog processors
    processors = [
        # Add log level to event dict
        structlog.processors.add_log_level,
        # Add timestamp in ISO format
        structlog.processors.TimeStamper(fmt="iso"),
        # Add source location (file, function, line)
        structlog.processors.CallsiteParameterAdder(
            [
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            ]
        ),
        # Add stack info for exceptions
        structlog.processors.StackInfoRenderer(),
        # Format exception tracebacks
        structlog.processors.format_exc_info,
        # Ensure strings are unicode
        structlog.processors.UnicodeDecoder(),
    ]

    # Add appropriate renderer based on environment
    if settings.is_production:
        # JSON output for production (easy parsing)
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Colorized console output for development
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback
            )
        )

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.INFO if settings.is_production else logging.DEBUG
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True
    )


def get_logger(name: str | None = None) -> Any:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__ of the calling module)

    Returns:
        Structured logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("user_created", user_id=user.id, email=user.email)
    """
    return structlog.get_logger(name)


# Initialize logging on module import
setup_logging()
