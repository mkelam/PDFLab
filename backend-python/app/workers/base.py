"""Base task class and utilities for Celery workers."""
import asyncio
from typing import Any, Callable, Optional
from celery import Task
from celery.utils.log import get_task_logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import ConversionJob, JobStatus
from app.utils.logger import get_logger

logger = get_task_logger(__name__)
app_logger = get_logger(__name__)


class DatabaseTask(Task):
    """
    Base task class with database session management.

    Provides:
    - Async database session handling
    - Automatic session cleanup
    - Error handling with logging
    """

    _db: Optional[AsyncSession] = None

    def get_db_session(self) -> AsyncSession:
        """Get or create database session."""
        if self._db is None:
            self._db = AsyncSessionLocal()
        return self._db

    async def close_db_session(self):
        """Close database session if open."""
        if self._db is not None:
            await self._db.close()
            self._db = None

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """Called after task returns (success or failure)."""
        # Run async cleanup in event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, schedule cleanup
                asyncio.create_task(self.close_db_session())
            else:
                # If no loop, run cleanup directly
                loop.run_until_complete(self.close_db_session())
        except RuntimeError:
            # No event loop, create one
            asyncio.run(self.close_db_session())


class ConversionTask(DatabaseTask):
    """
    Base task for PDF conversion jobs.

    Provides:
    - Job status tracking in database
    - Progress updates
    - Error handling with job failure tracking
    """

    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """
        Update conversion job status in database.

        Args:
            job_id: Job UUID
            status: New job status
            progress: Progress percentage (0-100)
            error_message: Error message if status is FAILED
        """
        session = self.get_db_session()
        try:
            job = await session.get(ConversionJob, job_id)
            if job:
                job.status = status
                if progress is not None:
                    job.progress = progress
                if error_message:
                    job.error_message = error_message

                # Call helper methods based on status
                if status == JobStatus.PROCESSING:
                    job.start_processing()
                elif status == JobStatus.COMPLETED:
                    job.complete_processing()
                elif status == JobStatus.FAILED:
                    job.fail_processing(error_message or "Unknown error")

                await session.commit()
                await session.refresh(job)

                app_logger.info(
                    "job_status_updated",
                    job_id=job_id,
                    status=status.value,
                    progress=progress
                )
            else:
                app_logger.error("job_not_found", job_id=job_id)
        except Exception as e:
            app_logger.error("job_status_update_failed", job_id=job_id, error=str(e))
            await session.rollback()
            raise

    async def get_job(self, job_id: str) -> Optional[ConversionJob]:
        """
        Get conversion job from database.

        Args:
            job_id: Job UUID

        Returns:
            ConversionJob or None if not found
        """
        session = self.get_db_session()
        try:
            job = await session.get(ConversionJob, job_id)
            if job:
                await session.refresh(job)
            return job
        except Exception as e:
            app_logger.error("job_fetch_failed", job_id=job_id, error=str(e))
            return None

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails."""
        logger.error(
            f"Task {self.name}[{task_id}] failed: {exc}",
            exc_info=einfo
        )

        # Update job status to failed
        job_id = kwargs.get("job_id") or (args[0] if args else None)
        if job_id:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(
                        self.update_job_status(
                            job_id,
                            JobStatus.FAILED,
                            error_message=str(exc)
                        )
                    )
                else:
                    loop.run_until_complete(
                        self.update_job_status(
                            job_id,
                            JobStatus.FAILED,
                            error_message=str(exc)
                        )
                    )
            except Exception as e:
                logger.error(f"Failed to update job status: {e}")

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried."""
        logger.warning(
            f"Task {self.name}[{task_id}] retry: {exc}",
            exc_info=einfo
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds."""
        logger.info(f"Task {self.name}[{task_id}] succeeded")


def run_async(coro: Callable) -> Any:
    """
    Run async function in synchronous context.

    Helper for running async code in Celery tasks.

    Args:
        coro: Coroutine to run

    Returns:
        Result of coroutine execution
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, create task
            return asyncio.create_task(coro)
        else:
            # Run coroutine in existing loop
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No event loop, create new one
        return asyncio.run(coro)
