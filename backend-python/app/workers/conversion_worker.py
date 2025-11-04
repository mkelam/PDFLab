"""Celery worker for PDF conversion tasks."""
import asyncio
from pathlib import Path
from typing import Dict, Any

from celery import current_task
from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.workers.base import ConversionTask, run_async
from app.models import JobStatus, ConversionType
from app.services.cloudconvert import CloudConvertService
from app.utils.logger import get_logger

logger = get_task_logger(__name__)
app_logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    base=ConversionTask,
    name="app.workers.conversion_worker.convert_pdf_task",
    max_retries=3,
    default_retry_delay=60,
)
def convert_pdf_task(
    self,
    job_id: str,
    input_file_path: str,
    output_format: str,
    conversion_type: str
) -> Dict[str, Any]:
    """
    Convert PDF file to specified format using CloudConvert.

    Args:
        job_id: Conversion job UUID
        input_file_path: Path to input PDF file
        output_format: Target format (pptx, docx, xlsx, png)
        conversion_type: ConversionType enum value

    Returns:
        Dict with conversion results
    """
    logger.info(
        f"Starting PDF conversion task - Job: {job_id}, "
        f"Format: {output_format}, File: {input_file_path}"
    )

    try:
        # Run async conversion
        result = run_async(
            _convert_pdf_async(
                self,
                job_id,
                input_file_path,
                output_format,
                conversion_type
            )
        )
        return result
    except Exception as e:
        logger.error(f"Conversion task failed: {e}", exc_info=True)
        # Retry task
        raise self.retry(exc=e, countdown=60)


async def _convert_pdf_async(
    task: ConversionTask,
    job_id: str,
    input_file_path: str,
    output_format: str,
    conversion_type: str
) -> Dict[str, Any]:
    """
    Async implementation of PDF conversion.

    Args:
        task: Celery task instance
        job_id: Conversion job UUID
        input_file_path: Path to input PDF file
        output_format: Target format
        conversion_type: ConversionType enum value

    Returns:
        Dict with conversion results including output_path
    """
    # Update job status to processing
    await task.update_job_status(job_id, JobStatus.PROCESSING, progress=10)

    # Get job details
    job = await task.get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    app_logger.info(
        "conversion_started",
        job_id=job_id,
        input_file=input_file_path,
        output_format=output_format
    )

    try:
        # Initialize CloudConvert service
        cloudconvert = CloudConvertService()

        # Progress callback
        async def progress_callback(progress: int):
            """Update job progress in database."""
            await task.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)
            app_logger.info("conversion_progress", job_id=job_id, progress=progress)

        # Perform conversion
        await task.update_job_status(job_id, JobStatus.PROCESSING, progress=20)

        output_path = await cloudconvert.convert_file(
            input_path=input_file_path,
            output_format=output_format,
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
            "conversion_completed",
            job_id=job_id,
            output_file=str(output_path)
        )

        return {
            "status": "success",
            "job_id": job_id,
            "output_path": str(output_path),
            "format": output_format
        }

    except Exception as e:
        app_logger.error(
            "conversion_failed",
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


@celery_app.task(
    bind=True,
    base=ConversionTask,
    name="app.workers.conversion_worker.convert_pdf_to_images_task",
    max_retries=3,
)
def convert_pdf_to_images_task(
    self,
    job_id: str,
    input_file_path: str
) -> Dict[str, Any]:
    """
    Convert PDF to PNG images (one per page).

    Args:
        job_id: Conversion job UUID
        input_file_path: Path to input PDF file

    Returns:
        Dict with conversion results including list of image paths
    """
    logger.info(f"Starting PDF to images conversion - Job: {job_id}")

    try:
        result = run_async(
            _convert_pdf_to_images_async(self, job_id, input_file_path)
        )
        return result
    except Exception as e:
        logger.error(f"PDF to images conversion failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=60)


async def _convert_pdf_to_images_async(
    task: ConversionTask,
    job_id: str,
    input_file_path: str
) -> Dict[str, Any]:
    """
    Async implementation of PDF to images conversion.

    Args:
        task: Celery task instance
        job_id: Conversion job UUID
        input_file_path: Path to input PDF file

    Returns:
        Dict with conversion results including list of image paths
    """
    await task.update_job_status(job_id, JobStatus.PROCESSING, progress=10)

    job = await task.get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    app_logger.info("pdf_to_images_started", job_id=job_id)

    try:
        cloudconvert = CloudConvertService()

        # Progress callback
        async def progress_callback(progress: int):
            await task.update_job_status(job_id, JobStatus.PROCESSING, progress=progress)

        await task.update_job_status(job_id, JobStatus.PROCESSING, progress=20)

        # Convert to images (CloudConvert returns ZIP file with images)
        output_path = await cloudconvert.convert_file(
            input_path=input_file_path,
            output_format="png",
            job_id=job_id,
            progress_callback=progress_callback
        )

        await task.update_job_status(job_id, JobStatus.PROCESSING, progress=90)

        # Update job with output file (ZIP containing images)
        job = await task.get_job(job_id)
        if job:
            job.output_file = str(output_path)
            session = task.get_db_session()
            await session.commit()

        await task.update_job_status(job_id, JobStatus.COMPLETED, progress=100)

        app_logger.info(
            "pdf_to_images_completed",
            job_id=job_id,
            output_file=str(output_path)
        )

        return {
            "status": "success",
            "job_id": job_id,
            "output_path": str(output_path),
            "format": "png"
        }

    except Exception as e:
        app_logger.error(
            "pdf_to_images_failed",
            job_id=job_id,
            error=str(e),
            exc_info=True
        )

        await task.update_job_status(
            job_id,
            JobStatus.FAILED,
            error_message=str(e)
        )

        raise
