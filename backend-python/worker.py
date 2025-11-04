"""Celery worker entry point."""
from app.celery_app import celery_app

# Import workers to register tasks
from app.workers import conversion_worker, merge_worker, cleanup_worker

if __name__ == "__main__":
    celery_app.start()
