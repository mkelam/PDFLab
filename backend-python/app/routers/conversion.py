"""Conversion API routes - Integrated with Database and Celery."""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional, List
from sqlalchemy import select, desc
from datetime import datetime
import structlog

from app.schemas.conversion import (
    ConversionResponse,
    JobStatusResponse,
    JobHistoryResponse,
    MergeRequest,
    MergeResponse
)
from app.models import ConversionJob, ConversionType as DBConversionType, JobStatus as DBJobStatus, User
from app.database import AsyncSessionLocal
from app.services.job_queue import JobQueueService
from app.middleware.auth import get_current_user, check_conversion_quota
from app.utils.file_utils import (
    validate_pdf_file,
    get_storage_path,
    generate_job_id,
    get_output_filename,
    sanitize_filename
)
from app.schemas.conversion import JobStatus, ConversionType, OutputFormat

logger = structlog.get_logger(__name__)

router = APIRouter()


# Dependency to get database session
async def get_db():
    """Database session dependency."""
    async with AsyncSessionLocal() as session:
        yield session


@router.post("/upload", response_model=ConversionResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_and_convert(
    file: UploadFile = File(...),
    conversion_type: str = Form(...),
    dpi: Optional[int] = Form(300),
    pages: Optional[str] = Form("all"),
    ocr: bool = Form(True),
    current_user: User = Depends(check_conversion_quota)
):
    """
    Upload PDF and queue conversion job.

    This endpoint accepts a PDF file and conversion parameters,
    creates a database record, and queues the job for background processing.

    Requires authentication and available conversion quota.

    Args:
        file: PDF file to convert
        conversion_type: Type of conversion (pdf_to_pptx, pdf_to_docx, etc.)
        dpi: DPI for image conversions (72-600)
        pages: Pages to convert ("all" or "1-5")
        ocr: Enable OCR for text extraction
        current_user: Authenticated user (from JWT token)

    Returns:
        Conversion job details with job ID and queued status
    """
    try:
        # Validate conversion type
        try:
            conv_type = ConversionType(conversion_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid conversion type: {conversion_type}"
            )

        # Map schema ConversionType to DB ConversionType
        db_conv_type_map = {
            ConversionType.PDF_TO_PPTX: DBConversionType.PDF_TO_PPTX,
            ConversionType.PDF_TO_DOCX: DBConversionType.PDF_TO_DOCX,
            ConversionType.PDF_TO_XLSX: DBConversionType.PDF_TO_XLSX,
            ConversionType.PDF_TO_IMAGES: DBConversionType.PDF_TO_IMAGES,
        }
        db_conv_type = db_conv_type_map[conv_type]

        # Extract output format from conversion type
        output_format = conversion_type.split("_to_")[1]  # pdf_to_pptx -> pptx

        # Sanitize filename
        safe_filename = sanitize_filename(file.filename or "document.pdf")

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file based on user's plan
        is_valid, error_msg = validate_pdf_file(safe_filename, file_size, current_user.plan.value)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Generate job ID and use authenticated user
        job_id = generate_job_id()
        user_id = current_user.id

        # Save uploaded file
        input_path = get_storage_path(user_id, job_id, safe_filename, upload=True)
        output_filename = get_output_filename(safe_filename, output_format)

        # Write uploaded file
        input_path.write_bytes(file_content)

        logger.info(
            "file_uploaded",
            job_id=job_id,
            filename=safe_filename,
            size_mb=file_size / (1024 * 1024),
            conversion_type=conversion_type
        )

        # Create job in database
        async with AsyncSessionLocal() as session:
            job = ConversionJob(
                id=job_id,
                user_id=user_id,
                type=db_conv_type,
                status=DBJobStatus.PENDING,
                file_name=safe_filename,
                file_size=file_size,
                input_file=str(input_path),
                progress=0
            )
            session.add(job)
            await session.commit()
            await session.refresh(job)

            logger.info(
                "job_created_in_database",
                job_id=job_id,
                status=job.status.value
            )

        # Queue job with Celery
        task_id = JobQueueService.queue_conversion_job(
            job_id=job_id,
            input_file_path=str(input_path),
            output_format=output_format,
            conversion_type=db_conv_type
        )

        # Update job status to queued and increment user's conversion count
        async with AsyncSessionLocal() as session:
            job = await session.get(ConversionJob, job_id)
            if job:
                job.status = DBJobStatus.QUEUED
                await session.commit()

            # Increment user's conversion usage
            user = await session.get(User, user_id)
            if user:
                user.increment_conversions()
                await session.commit()

        logger.info(
            "job_queued",
            job_id=job_id,
            task_id=task_id,
            conversions_used=current_user.conversions_used + 1,
            conversions_limit=current_user.conversions_limit
        )

        return ConversionResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            progress=0,
            estimated_time=30,
            file_name=safe_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("upload_conversion_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process upload: {str(e)}"
        )


@router.post("/merge", response_model=MergeResponse, status_code=status.HTTP_202_ACCEPTED)
async def merge_pdfs(
    files: List[UploadFile] = File(...),
    output_filename: Optional[str] = Form("merged.pdf"),
    current_user: User = Depends(check_conversion_quota)
):
    """
    Merge multiple PDF files into one.

    Requires authentication and available conversion quota.

    Args:
        files: List of PDF files to merge (max 10)
        output_filename: Name for the merged PDF file
        current_user: Authenticated user (from JWT token)

    Returns:
        Merge job details with job ID and queued status
    """
    try:
        # Validate file count
        if len(files) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 PDF files required for merging"
            )
        if len(files) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 10 PDF files allowed for merging"
            )

        # Generate job ID and use authenticated user
        job_id = generate_job_id()
        user_id = current_user.id

        # Save all uploaded files
        input_file_paths = []
        total_size = 0

        for idx, file in enumerate(files):
            # Sanitize filename
            safe_filename = sanitize_filename(file.filename or f"document_{idx}.pdf")

            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            total_size += file_size

            # Validate individual file based on user's plan
            is_valid, error_msg = validate_pdf_file(safe_filename, file_size, current_user.plan.value)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {safe_filename}: {error_msg}"
                )

            # Save file
            input_path = get_storage_path(user_id, job_id, f"{idx}_{safe_filename}", upload=True)
            input_path.write_bytes(file_content)
            input_file_paths.append(str(input_path))

        logger.info(
            "merge_files_uploaded",
            job_id=job_id,
            file_count=len(files),
            total_size_mb=total_size / (1024 * 1024)
        )

        # Sanitize output filename
        safe_output_filename = sanitize_filename(output_filename or "merged.pdf")
        if not safe_output_filename.endswith('.pdf'):
            safe_output_filename += '.pdf'

        # Create merge job in database
        async with AsyncSessionLocal() as session:
            # Store file names for display
            file_names = ", ".join([f.filename or f"file_{i}" for i, f in enumerate(files)])

            job = ConversionJob(
                id=job_id,
                user_id=user_id,
                type=DBConversionType.PDF_MERGE,
                status=DBJobStatus.PENDING,
                file_name=f"Merge: {file_names}",
                file_size=total_size,
                input_file=input_file_paths[0],  # Store first file path
                progress=0
            )
            session.add(job)
            await session.commit()
            await session.refresh(job)

        # Queue merge job with Celery
        task_id = JobQueueService.queue_merge_job(
            job_id=job_id,
            input_file_paths=input_file_paths,
            output_file_name=safe_output_filename
        )

        # Update job status to queued and increment user's conversion count
        async with AsyncSessionLocal() as session:
            job = await session.get(ConversionJob, job_id)
            if job:
                job.status = DBJobStatus.QUEUED
                await session.commit()

            # Increment user's conversion usage
            user = await session.get(User, user_id)
            if user:
                user.increment_conversions()
                await session.commit()

        logger.info(
            "merge_job_queued",
            job_id=job_id,
            task_id=task_id,
            conversions_used=current_user.conversions_used + 1,
            conversions_limit=current_user.conversions_limit
        )

        return MergeResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            progress=0,
            estimated_time=20,
            file_count=len(files),
            output_filename=safe_output_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("merge_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge PDFs: {str(e)}"
        )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get conversion job status from database.

    Requires authentication and job must belong to the authenticated user.

    Args:
        job_id: Unique job identifier
        current_user: Authenticated user (from JWT token)

    Returns:
        Job status details including progress and output file
    """
    async with AsyncSessionLocal() as session:
        job = await session.get(ConversionJob, job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )

        # Verify job belongs to current user
        if job.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this job"
            )

        # Map DB JobStatus to schema JobStatus
        status_map = {
            DBJobStatus.PENDING: JobStatus.PENDING,
            DBJobStatus.QUEUED: JobStatus.QUEUED,
            DBJobStatus.PROCESSING: JobStatus.PROCESSING,
            DBJobStatus.COMPLETED: JobStatus.COMPLETED,
            DBJobStatus.FAILED: JobStatus.FAILED,
        }

        return JobStatusResponse(
            job_id=job_id,
            status=status_map[job.status],
            progress=job.progress,
            estimated_time_remaining=None if job.status == DBJobStatus.COMPLETED else 15,
            output_file=f"/api/download/{job_id}" if job.status == DBJobStatus.COMPLETED else None,
            error=job.error_message,
            created_at=job.created_at,
            completed_at=job.processing_completed_at
        )


@router.get("/history", response_model=List[JobHistoryResponse])
async def get_conversion_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get conversion job history for current user.

    Requires authentication.

    Args:
        limit: Maximum number of jobs to return (default 50)
        offset: Number of jobs to skip (for pagination)
        current_user: Authenticated user (from JWT token)

    Returns:
        List of conversion jobs ordered by creation date (newest first)
    """
    user_id = current_user.id

    async with AsyncSessionLocal() as session:
        # Query jobs for this user
        result = await session.execute(
            select(ConversionJob)
            .where(ConversionJob.user_id == user_id)
            .order_by(desc(ConversionJob.created_at))
            .limit(limit)
            .offset(offset)
        )
        jobs = result.scalars().all()

        # Map DB JobStatus to schema JobStatus
        status_map = {
            DBJobStatus.PENDING: JobStatus.PENDING,
            DBJobStatus.QUEUED: JobStatus.QUEUED,
            DBJobStatus.PROCESSING: JobStatus.PROCESSING,
            DBJobStatus.COMPLETED: JobStatus.COMPLETED,
            DBJobStatus.FAILED: JobStatus.FAILED,
        }

        # Map ConversionType to schema ConversionType
        type_map = {
            DBConversionType.PDF_TO_PPTX: ConversionType.PDF_TO_PPTX,
            DBConversionType.PDF_TO_DOCX: ConversionType.PDF_TO_DOCX,
            DBConversionType.PDF_TO_XLSX: ConversionType.PDF_TO_XLSX,
            DBConversionType.PDF_TO_IMAGES: ConversionType.PDF_TO_IMAGES,
            DBConversionType.PDF_MERGE: ConversionType.PDF_MERGE,
        }

        return [
            JobHistoryResponse(
                job_id=job.id,
                file_name=job.file_name,
                conversion_type=type_map[job.type],
                status=status_map[job.status],
                created_at=job.created_at,
                completed_at=job.processing_completed_at,
                file_size=job.file_size,
                download_url=f"/api/download/{job.id}" if job.status == DBJobStatus.COMPLETED else None
            )
            for job in jobs
        ]


@router.get("/download/{job_id}")
async def download_converted_file(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download converted file.

    Requires authentication and job must belong to the authenticated user.

    Args:
        job_id: Unique job identifier
        current_user: Authenticated user (from JWT token)

    Returns:
        File download response
    """
    async with AsyncSessionLocal() as session:
        job = await session.get(ConversionJob, job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )

        # Verify job belongs to current user
        if job.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download this file"
            )

        if job.status != DBJobStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job not completed. Current status: {job.status.value}"
            )

        if not job.output_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Output file path not set"
            )

        output_path = Path(job.output_file)
        if not output_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Output file not found on server"
            )

        logger.info("file_downloaded", job_id=job_id, filename=output_path.name)

        return FileResponse(
            path=output_path,
            filename=output_path.name,
            media_type="application/octet-stream"
        )
