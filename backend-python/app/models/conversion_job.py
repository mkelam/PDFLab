"""ConversionJob database model."""
from sqlalchemy import Column, String, Integer, BigInteger, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid
import enum

from app.database import Base


class ConversionType(str, enum.Enum):
    """Types of PDF conversions."""
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_DOCX = "pdf_to_docx"
    PDF_TO_XLSX = "pdf_to_xlsx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_MERGE = "pdf_merge"


class JobStatus(str, enum.Enum):
    """Status of a conversion job."""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ConversionJob(Base):
    """
    Conversion job model for tracking PDF conversions.

    Attributes:
        id: Unique job identifier (UUID)
        user_id: Foreign key to users table
        type: Type of conversion (pdf_to_pptx, etc.)
        status: Current job status
        progress: Conversion progress (0-100)
        input_file: Path to input PDF file
        output_file: Path to output file
        file_name: Original filename
        file_size: File size in bytes
        cloudconvert_job_id: CloudConvert job ID
        error_message: Error message if failed
        estimated_time: Estimated processing time in seconds
        processing_started_at: When processing started
        processing_completed_at: When processing completed
        created_at: Job creation timestamp
        updated_at: Last update timestamp
        expires_at: When job files expire (default: 1 hour)
    """

    __tablename__ = "conversion_jobs"

    # Primary Key
    id = Column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="Unique job identifier (UUID)"
    )

    # Foreign Keys
    user_id = Column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who created this job"
    )

    # Job Details
    type = Column(
        SQLEnum(ConversionType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        comment="Type of conversion"
    )
    status = Column(
        SQLEnum(JobStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=JobStatus.PENDING,
        index=True,
        comment="Current job status"
    )
    progress = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Conversion progress (0-100)"
    )

    # Files
    input_file = Column(
        String(500),
        nullable=True,
        comment="Path to input PDF file"
    )
    output_file = Column(
        String(500),
        nullable=True,
        comment="Path to output file"
    )
    file_name = Column(
        String(255),
        nullable=False,
        comment="Original filename"
    )
    file_size = Column(
        BigInteger,
        nullable=False,
        comment="File size in bytes"
    )

    # CloudConvert Integration
    cloudconvert_job_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="CloudConvert job ID"
    )

    # Error Handling
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if job failed"
    )

    # Timing
    estimated_time = Column(
        Integer,
        nullable=True,
        comment="Estimated processing time in seconds"
    )
    processing_started_at = Column(
        DateTime,
        nullable=True,
        comment="When processing started"
    )
    processing_completed_at = Column(
        DateTime,
        nullable=True,
        comment="When processing completed"
    )

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
        comment="Job creation timestamp"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )
    expires_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.utcnow() + timedelta(hours=1),
        index=True,
        comment="When job files expire"
    )

    # Relationships
    user = relationship("User", back_populates="conversion_jobs")

    def __repr__(self) -> str:
        """String representation of ConversionJob."""
        return f"<ConversionJob(id={self.id}, type={self.type}, status={self.status})>"

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def get_processing_time(self) -> float | None:
        """
        Get processing time in seconds.

        Returns:
            Processing time in seconds, or None if not completed
        """
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return None

    def is_expired(self) -> bool:
        """
        Check if job has expired.

        Returns:
            True if job has expired, False otherwise
        """
        return datetime.utcnow() > self.expires_at

    def get_output_format(self) -> str:
        """
        Get output file format based on conversion type.

        Returns:
            File extension (pptx, docx, xlsx, zip, pdf, bin)
        """
        format_map = {
            ConversionType.PDF_TO_PPTX: "pptx",
            ConversionType.PDF_TO_DOCX: "docx",
            ConversionType.PDF_TO_XLSX: "xlsx",
            ConversionType.PDF_TO_IMAGES: "zip",
            ConversionType.PDF_MERGE: "pdf"
        }
        return format_map.get(self.type, "bin")

    def start_processing(self) -> None:
        """Mark job as processing and set start time."""
        self.status = JobStatus.PROCESSING
        self.processing_started_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def complete_processing(self) -> None:
        """Mark job as completed and set completion time."""
        self.status = JobStatus.COMPLETED
        self.progress = 100
        self.processing_completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def fail_processing(self, error_message: str) -> None:
        """
        Mark job as failed with error message.

        Args:
            error_message: Description of the error
        """
        self.status = JobStatus.FAILED
        self.error_message = error_message
        self.processing_completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def update_progress(self, progress: int) -> None:
        """
        Update job progress.

        Args:
            progress: Progress percentage (0-100)

        Raises:
            ValueError: If progress is out of range
        """
        if not 0 <= progress <= 100:
            raise ValueError(f"Progress must be between 0 and 100, got {progress}")

        self.progress = progress
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """
        Convert job to dictionary (for API responses).

        Returns:
            Dictionary representation of job
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type.value,
            "status": self.status.value,
            "progress": self.progress,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "cloudconvert_job_id": self.cloudconvert_job_id,
            "error_message": self.error_message,
            "estimated_time": self.estimated_time,
            "processing_time": self.get_processing_time(),
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "output_format": self.get_output_format()
        }
