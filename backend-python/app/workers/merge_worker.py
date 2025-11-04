"""Celery worker for PDF merge tasks."""
import asyncio
from pathlib import Path
from typing import Dict, Any, List

from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.workers.base import ConversionTask, run_async
from app.models import JobStatus
from app.services.cloudconvert import CloudConvertService
from app.utils.logger import get_logger

logger = get_task_logger(__name__)
app_logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    base=ConversionTask,
    name="app.workers.merge_worker.merge_pdfs_task",
    max_retries=3,
    default_retry_delay=60,
)
def merge_pdfs_task(
    self,
    job_id: str,
    input_file_paths: List[str],
    output_file_name: str
) -> Dict[str, Any]:
    """
    Merge multiple PDF files into one using CloudConvert.

    Args:
        job_id: Conversion job UUID
        input_file_paths: List of paths to input PDF files
        output_file_name: Name for merged output file

    Returns:
        Dict with merge results
    """
    logger.info(
        f"Starting PDF merge task - Job: {job_id}, "
        f"Files: {len(input_file_paths)}, Output: {output_file_name}"
    )

    try:
        result = run_async(
            _merge_pdfs_async(
                self,
                job_id,
                input_file_paths,
                output_file_name
            )
        )
        return result
    except Exception as e:
        logger.error(f"Merge task failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=60)


async def _merge_pdfs_async(
    task: ConversionTask,
    job_id: str,
    input_file_paths: List[str],
    output_file_name: str
) -> Dict[str, Any]:
    """
    Async implementation of PDF merge.

    Args:
        task: Celery task instance
        job_id: Conversion job UUID
        input_file_paths: List of paths to input PDF files
        output_file_name: Name for merged output file

    Returns:
        Dict with merge results including output_path
    """
    # Update job status to processing
    await task.update_job_status(job_id, JobStatus.PROCESSING, progress=10)

    # Get job details
    job = await task.get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    app_logger.info(
        "merge_started",
        job_id=job_id,
        file_count=len(input_file_paths),
        output_name=output_file_name
    )

    try:
        # Initialize CloudConvert service
        cloudconvert = CloudConvertService()

        # Progress callback
        async def progress_callback(progress: int):
            """Update job progress in database."""
            await task.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)
            app_logger.info("merge_progress", job_id=job_id, progress=progress)

        # Perform merge
        await task.update_job_status(job_id, JobStatus.PROCESSING, progress=20)

        output_path = await cloudconvert.merge_pdfs(
            input_paths=input_file_paths,
            output_filename=output_file_name,
            job_id=job_id,
            progress_callback=progress_callback
        )

        # Update job with output file
        await task.update_job_status(job_id, JobStatus.PROCESSING, progress=90)

        job = await task.get_job(job_id)
        if job:
            job.output_file = str(output_path)
            session = task.get_db_session()
            await session.commit()

        # Mark as completed
        await task.update_job_status(job_id, JobStatus.COMPLETED, progress=100)

        app_logger.info(
            "merge_completed",
            job_id=job_id,
            output_file=str(output_path),
            file_count=len(input_file_paths)
        )

        return {
            "status": "success",
            "job_id": job_id,
            "output_path": str(output_path),
            "merged_files_count": len(input_file_paths)
        }

    except Exception as e:
        app_logger.error(
            "merge_failed",
            job_id=job_id,
            error=str(e),
            exc_info=True
        )

        # Update job status to failed
        await task.update_job_status(
            job_id,
            JobStatus.FAILED,
            error_message=str(e)
        )

        raise
