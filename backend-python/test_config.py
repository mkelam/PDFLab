"""Test configuration module."""
from app.config import settings

print("=" * 50)
print("Configuration Module Test")
print("=" * 50)
print(f"Database URL: {settings.database_url.split('@')[1]}")
print(f"Celery Broker: redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0")
print(f"CORS Origins: {settings.cors_origins_list}")
print(f"Max file size (free): {settings.get_max_file_size('free') / 1024 / 1024}MB")
print(f"Max file size (pro): {settings.get_max_file_size('pro') / 1024 / 1024}MB")
print(f"Conversion limit (free): {settings.get_conversion_limit('free')}")
print(f"Conversion limit (pro): {settings.get_conversion_limit('pro')}")
print(f"Is Development: {settings.is_development}")
print(f"PayFast URL: {settings.payfast_url}")
print("=" * 50)
print("[OK] Configuration module working!")
print("=" * 50)
