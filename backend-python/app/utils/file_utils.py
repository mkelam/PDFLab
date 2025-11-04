"""File handling utilities."""
from pathlib import Path
from typing import Optional
import mimetypes
import uuid
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

# Allowed MIME types for PDF uploads
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/x-pdf",
]

# Allowed file extensions
ALLOWED_EXTENSIONS = [".pdf"]


def validate_pdf_file(filename: str, file_size: int, user_plan: str) -> tuple[bool, Optional[str]]:
    """
    Validate uploaded PDF file.

    Args:
        filename: Name of the uploaded file
        file_size: Size of the file in bytes
        user_plan: User's subscription plan

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file extension
    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Only PDF files are allowed. Got: {file_ext}"

    # Check MIME type
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        return False, f"Invalid MIME type. Expected PDF, got: {mime_type}"

    # Check file size based on plan
    max_size = settings.get_max_file_size(user_plan)
    if file_size > max_size:
        max_size_mb = max_size / (1024 * 1024)
        actual_size_mb = file_size / (1024 * 1024)
        return False, (
            f"File size ({actual_size_mb:.2f}MB) exceeds plan limit ({max_size_mb:.0f}MB). "
            f"Upgrade your plan for larger files."
        )

    return True, None


def get_storage_path(user_id: str, job_id: str, filename: str, upload: bool = True) -> Path:
    """
    Get storage path for uploaded or converted file.

    Args:
        user_id: User's unique ID
        job_id: Job's unique ID
        filename: Original filename
        upload: True for uploads directory, False for outputs

    Returns:
        Path object for file storage
    """
    storage_base = Path(settings.STORAGE_PATH)
    subdirectory = "uploads" if upload else "outputs"

    file_path = storage_base / subdirectory / user_id / job_id / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)

    return file_path


def generate_job_id() -> str:
    """
    Generate a unique job ID.

    Returns:
        UUID string
    """
    return str(uuid.uuid4())


def get_output_filename(original_filename: str, output_format: str) -> str:
    """
    Generate output filename based on original name and output format.

    Args:
        original_filename: Original PDF filename
        output_format: Desired output format (pptx, docx, etc.)

    Returns:
        New filename with appropriate extension
    """
    stem = Path(original_filename).stem
    return f"{stem}.{output_format}"


def cleanup_job_files(user_id: str, job_id: str) -> None:
    """
    Delete all files associated with a job.

    Args:
        user_id: User's unique ID
        job_id: Job's unique ID
    """
    try:
        storage_base = Path(settings.STORAGE_PATH)

        # Delete upload files
        upload_dir = storage_base / "uploads" / user_id / job_id
        if upload_dir.exists():
            for file in upload_dir.glob("*"):
                file.unlink()
            upload_dir.rmdir()
            logger.info("upload_files_cleaned", user_id=user_id, job_id=job_id)

        # Delete output files
        output_dir = storage_base / "outputs" / user_id / job_id
        if output_dir.exists():
            for file in output_dir.glob("*"):
                file.unlink()
            output_dir.rmdir()
            logger.info("output_files_cleaned", user_id=user_id, job_id=job_id)

    except Exception as e:
        logger.error("file_cleanup_error", user_id=user_id, job_id=job_id, error=str(e))


def get_file_size_mb(file_path: Path) -> float:
    """
    Get file size in megabytes.

    Args:
        file_path: Path to file

    Returns:
        File size in MB
    """
    if not file_path.exists():
        return 0.0

    size_bytes = file_path.stat().st_size
    return size_bytes / (1024 * 1024)


def is_pdf(filename: str) -> bool:
    """
    Check if filename is a PDF.

    Args:
        filename: Filename to check

    Returns:
        True if filename ends with .pdf
    """
    return Path(filename).suffix.lower() == ".pdf"


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Get just the filename without any path components
    safe_name = Path(filename).name

    # Remove any potentially dangerous characters
    safe_name = "".join(c for c in safe_name if c.isalnum() or c in "._- ")

    # Ensure it's not empty
    if not safe_name:
        safe_name = "file.pdf"

    return safe_name
