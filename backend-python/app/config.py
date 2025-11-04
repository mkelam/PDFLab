"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    # Server Configuration
    NODE_ENV: str = "development"
    PORT: int = 3007
    API_URL: str = "http://localhost:3007"

    # Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "pdflab"
    DB_PASSWORD: str = "***REMOVED***"
    DB_NAME: str = "pdflab"

    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""

    # CloudConvert API
    CLOUDCONVERT_API_KEY: str
    CLOUDCONVERT_SANDBOX: bool = False

    # JWT Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 604800  # 7 days in seconds

    # PayFast Payment Gateway
    PAYFAST_MERCHANT_ID: str
    PAYFAST_MERCHANT_KEY: str
    PAYFAST_PASSPHRASE: str = ""
    PAYFAST_MODE: str = "production"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3002"

    # Email Configuration (Hostinger SMTP)
    SMTP_HOST: str = "smtp.hostinger.com"
    SMTP_PORT: int = 465
    SMTP_USER: str  # Your Hostinger email address
    SMTP_PASSWORD: str  # Your Hostinger email password
    SMTP_FROM_EMAIL: str  # Email address to send from
    SMTP_FROM_NAME: str = "PDFLab"
    SMTP_USE_TLS: bool = True

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:3000"

    # Storage
    STORAGE_PATH: str = "./storage"

    # File Size Limits (bytes)
    MAX_FILE_SIZE_FREE: int = 10485760        # 10MB
    MAX_FILE_SIZE_STARTER: int = 26214400     # 25MB
    MAX_FILE_SIZE_PRO: int = 104857600        # 100MB
    MAX_FILE_SIZE_ENTERPRISE: int = 524288000 # 500MB

    # Conversion Limits
    CONVERSIONS_LIMIT_FREE: int = 3
    CONVERSIONS_LIMIT_STARTER: int = 100

    @property
    def database_url(self) -> str:
        """Construct async database URL for MySQL."""
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def celery_broker_url(self) -> str:
        """Construct Celery broker URL."""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def celery_result_backend(self) -> str:
        """Construct Celery result backend URL."""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/1"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/1"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.NODE_ENV == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.NODE_ENV == "production"

    @property
    def payfast_url(self) -> str:
        """Get PayFast API URL based on mode."""
        if self.PAYFAST_MODE == "sandbox":
            return "https://sandbox.payfast.co.za"
        return "https://www.payfast.co.za"

    def get_max_file_size(self, plan: str) -> int:
        """
        Get maximum file size for a given plan.

        Args:
            plan: User's subscription plan (free, starter, pro, enterprise)

        Returns:
            Maximum file size in bytes
        """
        plan_limits = {
            "free": self.MAX_FILE_SIZE_FREE,
            "starter": self.MAX_FILE_SIZE_STARTER,
            "pro": self.MAX_FILE_SIZE_PRO,
            "enterprise": self.MAX_FILE_SIZE_ENTERPRISE
        }
        return plan_limits.get(plan.lower(), self.MAX_FILE_SIZE_FREE)

    def get_conversion_limit(self, plan: str) -> int:
        """
        Get monthly conversion limit for a given plan.

        Args:
            plan: User's subscription plan

        Returns:
            Monthly conversion limit (-1 = unlimited)
        """
        plan_limits = {
            "free": self.CONVERSIONS_LIMIT_FREE,
            "starter": self.CONVERSIONS_LIMIT_STARTER,
            "pro": -1,  # Unlimited
            "enterprise": -1  # Unlimited
        }
        return plan_limits.get(plan.lower(), self.CONVERSIONS_LIMIT_FREE)


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns:
        Singleton Settings instance
    """
    return Settings()


# Global settings instance
settings = get_settings()
