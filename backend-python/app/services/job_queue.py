"""Job queue service for managing Celery tasks."""
from typing import Optional, List, Dict, Any
from celery.result import AsyncResult

from app.celery_app import celery_app
from app.models import ConversionJob, ConversionType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class JobQueueService:
    """Service for queuing and managing background jobs."""

    @staticmethod
    def queue_conversion_job(
        job_id: str,
        input_file_path: str,
        output_format: str,
        conversion_type: ConversionType
    ) -> str:
        """
        Queue a PDF conversion job.

        Args:
            job_id: Conversion job UUID
            input_file_path: Path to input PDF file
            output_format: Target format (pptx, docx, xlsx, png)
            conversion_type: Type of conversion

        Returns:
            Celery task ID
        """
        from app.workers.conversion_worker import convert_pdf_task, convert_pdf_to_images_task

        logger.info(
            "queueing_conversion_job",
            job_id=job_id,
            format=output_format,
            type=conversion_type.value
        )

        # Choose appropriate worker task
        if conversion_type == ConversionType.PDF_TO_IMAGES:
            task = convert_pdf_to_images_task.apply_async(
                kwargs={
                    "job_id": job_id,
                    "input_file_path": input_file_path
                },
                task_id=f"convert_images_{job_id}"
            )
        else:
            task = convert_pdf_task.apply_async(
                kwargs={
                    "job_id": job_id,
                    "input_file_path": input_file_path,
                    "output_format": output_format,
                    "conversion_type": conversion_type.value
                },
                task_id=f"convert_{job_id}"
            )

        logger.info(
            "conversion_job_queued",
            job_id=job_id,
            task_id=task.id
        )

        return task.id

    @staticmethod
    def queue_merge_job(
        job_id: str,
        input_file_paths: List[str],
        output_file_name: str
    ) -> str:
        """
        Queue a PDF merge job.

        Args:
            job_id: Conversion job UUID
            input_file_paths: List of paths to input PDF files
            output_file_name: Name for merged output file

        Returns:
            Celery task ID
        """
        from app.workers.merge_worker import merge_pdfs_task

        logger.info(
            "queueing_merge_job",
            job_id=job_id,
            file_count=len(input_file_paths),
            output_name=output_file_name
        )

        task = merge_pdfs_task.apply_async(
            kwargs={
                "job_id": job_id,
                "input_file_paths": input_file_paths,
                "output_file_name": output_file_name
            },
            task_id=f"merge_{job_id}"
        )

        logger.info(
            "merge_job_queued",
            job_id=job_id,
            task_id=task.id
        )

        return task.id

    @staticmethod
    def get_task_status(task_id: str) -> Dict[str, Any]:
        """
        Get status of a Celery task.

        Args:
            task_id: Celery task ID

        Returns:
            Dict with task status information
        """
        result = AsyncResult(task_id, app=celery_app)

        status = {
            "task_id": task_id,
            "state": result.state,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
            "failed": result.failed() if result.ready() else None
        }

        # Add result if task completed
        if result.ready():
            if result.successful():
                status["result"] = result.result
            elif result.failed():
                status["error"] = str(result.info)

        return status

    @staticmethod
    def revoke_task(task_id: str, terminate: bool = False) -> bool:
        """
        Revoke (cancel) a Celery task.

        Args:
            task_id: Celery task ID
            terminate: If True, terminate task even if started

        Returns:
            True if revoked successfully
        """
        logger.info("revoking_task", task_id=task_id, terminate=terminate)

        try:
            celery_app.control.revoke(task_id, terminate=terminate)
            logger.info("task_revoked", task_id=task_id)
            return True
        except Exception as e:
            logger.error("task_revoke_failed", task_id=task_id, error=str(e))
            return False

    @staticmethod
    def get_worker_stats() -> Dict[str, Any]:
        """
        Get Celery worker statistics.

        Returns:
            Dict with worker stats
        """
        try:
            # Get active tasks
            active = celery_app.control.inspect().active()

            # Get registered tasks
            registered = celery_app.control.inspect().registered()

            # Get stats
            stats = celery_app.control.inspect().stats()

            return {
                "active_tasks": active,
                "registered_tasks": registered,
                "stats": stats
            }
        except Exception as e:
            logger.error("worker_stats_failed", error=str(e))
            return {"error": str(e)}

    @staticmethod
    def purge_queue(queue_name: str = "default") -> int:
        """
        Purge (clear) a Celery queue.

        Args:
            queue_name: Name of queue to purge

        Returns:
            Number of tasks purged
        """
        logger.warning("purging_queue", queue=queue_name)

        try:
            count = celery_app.control.purge()
            logger.info("queue_purged", queue=queue_name, count=count)
            return count
        except Exception as e:
            logger.error("queue_purge_failed", queue=queue_name, error=str(e))
            return 0
