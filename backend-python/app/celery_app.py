"""Celery application configuration for background job processing."""
from celery import Celery
from kombu import Exchange, Queue
from app.config import settings

# Initialize Celery app
celery_app = Celery(
    "pdflab_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.conversion_worker",
        "app.workers.merge_worker",
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,  # Store additional task metadata

    # Task routing
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",

    # Queue configuration
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("conversion", Exchange("conversion"), routing_key="conversion.#"),
        Queue("merge", Exchange("merge"), routing_key="merge.#"),
        Queue("priority", Exchange("priority"), routing_key="priority.#"),
    ),

    # Task routes
    task_routes={
        "app.workers.conversion_worker.convert_pdf_task": {
            "queue": "conversion",
            "routing_key": "conversion.pdf"
        },
        "app.workers.merge_worker.merge_pdfs_task": {
            "queue": "merge",
            "routing_key": "merge.pdf"
        },
    },

    # Worker settings
    worker_prefetch_multiplier=4,  # How many tasks to prefetch
    worker_max_tasks_per_child=100,  # Restart worker after N tasks (prevent memory leaks)
    worker_disable_rate_limits=False,

    # Task acknowledgement
    task_acks_late=True,  # Acknowledge task after it completes
    task_reject_on_worker_lost=True,  # Requeue task if worker dies

    # Retry settings
    task_max_retries=3,
    task_default_retry_delay=60,  # 60 seconds between retries

    # Monitoring
    task_send_sent_event=True,  # Send task-sent events
    worker_send_task_events=True,  # Send worker events

    # Performance
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
)

# Task annotations for specific behavior
celery_app.conf.task_annotations = {
    "app.workers.conversion_worker.convert_pdf_task": {
        "rate_limit": "10/m",  # 10 conversions per minute
        "time_limit": 600,  # 10 minutes hard timeout
        "soft_time_limit": 540,  # 9 minutes soft timeout
    },
    "app.workers.merge_worker.merge_pdfs_task": {
        "rate_limit": "20/m",  # 20 merges per minute
        "time_limit": 300,  # 5 minutes hard timeout
        "soft_time_limit": 270,  # 4.5 minutes soft timeout
    },
}

# Optional: Beat schedule for periodic tasks (if needed later)
celery_app.conf.beat_schedule = {
    # Example: Clean up expired jobs every hour
    "cleanup-expired-jobs": {
        "task": "app.workers.cleanup_worker.cleanup_expired_jobs",
        "schedule": 3600.0,  # Every hour
    },
}


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f"Request: {self.request!r}")
    return {"status": "ok", "message": "Celery is working!"}
