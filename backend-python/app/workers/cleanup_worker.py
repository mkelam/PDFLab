"""Celery worker for cleanup and maintenance tasks."""
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from celery.utils.log import get_task_logger
from sqlalchemy import select, and_

from app.celery_app import celery_app
from app.workers.base import DatabaseTask, run_async
from app.models import ConversionJob, JobStatus
from app.utils.logger import get_logger

logger = get_task_logger(__name__)
app_logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.workers.cleanup_worker.cleanup_expired_jobs",
)
def cleanup_expired_jobs(self) -> Dict[str, Any]:
    """
    Clean up expired conversion jobs and their files.

    Runs periodically (via Celery Beat) to:
    - Delete expired job files from storage
    - Mark expired jobs as failed
    - Clean up old completed jobs (optional)

    Returns:
        Dict with cleanup statistics
    """
    logger.info("Starting cleanup of expired jobs")

    try:
        result = run_async(_cleanup_expired_jobs_async(self))
        return result
    except Exception as e:
        logger.error(f"Cleanup task failed: {e}", exc_info=True)
        raise


async def _cleanup_expired_jobs_async(task: DatabaseTask) -> Dict[str, Any]:
    """
    Async implementation of job cleanup.

    Args:
        task: Celery task instance

    Returns:
        Dict with cleanup statistics
    """
    session = task.get_db_session()
    now = datetime.utcnow()

    app_logger.info("cleanup_started", timestamp=now.isoformat())

    files_deleted = 0
    jobs_cleaned = 0

    try:
        # Find expired jobs
        result = await session.execute(
            select(ConversionJob).where(
                and_(
                    ConversionJob.expires_at < now,
                    ConversionJob.status.in_([JobStatus.COMPLETED, JobStatus.FAILED])
                )
            )
        )
        expired_jobs = result.scalars().all()

        app_logger.info("expired_jobs_found", count=len(expired_jobs))

        for job in expired_jobs:
            try:
                # Delete input file if exists
                if job.input_file:
                    input_path = Path(job.input_file)
                    if input_path.exists():
                        input_path.unlink()
                        files_deleted += 1
                        app_logger.info("file_deleted", path=str(input_path), job_id=job.id)

                # Delete output file if exists
                if job.output_file:
                    output_path = Path(job.output_file)
                    if output_path.exists():
                        output_path.unlink()
                        files_deleted += 1
                        app_logger.info("file_deleted", path=str(output_path), job_id=job.id)

                # Delete the job record (or mark as cleaned)
                await session.delete(job)
                jobs_cleaned += 1

            except Exception as e:
                app_logger.error(
                    "job_cleanup_failed",
                    job_id=job.id,
                    error=str(e)
                )
                continue

        # Commit all deletions
        await session.commit()

        app_logger.info(
            "cleanup_completed",
            jobs_cleaned=jobs_cleaned,
            files_deleted=files_deleted
        )

        return {
            "status": "success",
            "jobs_cleaned": jobs_cleaned,
            "files_deleted": files_deleted,
            "timestamp": now.isoformat()
        }

    except Exception as e:
        app_logger.error("cleanup_failed", error=str(e), exc_info=True)
        await session.rollback()
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="app.workers.cleanup_worker.cleanup_orphaned_files",
)
def cleanup_orphaned_files(self, storage_path: str) -> Dict[str, Any]:
    """
    Clean up orphaned files in storage directory.

    Files that exist in storage but have no corresponding job record.

    Args:
        storage_path: Path to storage directory

    Returns:
        Dict with cleanup statistics
    """
    logger.info(f"Starting cleanup of orphaned files in {storage_path}")

    try:
        result = run_async(_cleanup_orphaned_files_async(self, storage_path))
        return result
    except Exception as e:
        logger.error(f"Orphaned files cleanup failed: {e}", exc_info=True)
        raise


async def _cleanup_orphaned_files_async(
    task: DatabaseTask,
    storage_path: str
) -> Dict[str, Any]:
    """
    Async implementation of orphaned files cleanup.

    Args:
        task: Celery task instance
        storage_path: Path to storage directory

    Returns:
        Dict with cleanup statistics
    """
    session = task.get_db_session()
    storage_dir = Path(storage_path)

    if not storage_dir.exists():
        app_logger.warning("storage_dir_not_found", path=storage_path)
        return {"status": "skipped", "reason": "storage directory not found"}

    app_logger.info("orphaned_files_cleanup_started", storage_path=storage_path)

    files_deleted = 0
    files_checked = 0

    try:
        # Get all job IDs from database
        result = await session.execute(select(ConversionJob.id))
        valid_job_ids = {job_id for (job_id,) in result.all()}

        # Scan storage directory
        for user_dir in storage_dir.iterdir():
            if not user_dir.is_dir():
                continue

            for job_dir in user_dir.iterdir():
                if not job_dir.is_dir():
                    continue

                files_checked += 1
                job_id = job_dir.name

                # Check if job exists in database
                if job_id not in valid_job_ids:
                    # Orphaned directory - delete it
                    try:
                        for file in job_dir.iterdir():
                            file.unlink()
                            files_deleted += 1
                        job_dir.rmdir()
                        app_logger.info("orphaned_directory_deleted", path=str(job_dir))
                    except Exception as e:
                        app_logger.error(
                            "orphaned_directory_deletion_failed",
                            path=str(job_dir),
                            error=str(e)
                        )

        app_logger.info(
            "orphaned_files_cleanup_completed",
            files_checked=files_checked,
            files_deleted=files_deleted
        )

        return {
            "status": "success",
            "files_checked": files_checked,
            "files_deleted": files_deleted
        }

    except Exception as e:
        app_logger.error("orphaned_files_cleanup_failed", error=str(e), exc_info=True)
        raise
