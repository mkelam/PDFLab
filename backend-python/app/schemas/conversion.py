"""Pydantic schemas for PDF conversion."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OutputFormat(str, Enum):
    """Supported output formats for PDF conversion."""
    PPTX = "pptx"
    DOCX = "docx"
    XLSX = "xlsx"
    PNG = "png"
    JPG = "jpg"


class ConversionType(str, Enum):
    """Types of conversions supported."""
    PDF_TO_PPTX = "pdf_to_pptx"
    PDF_TO_DOCX = "pdf_to_docx"
    PDF_TO_XLSX = "pdf_to_xlsx"
    PDF_TO_IMAGES = "pdf_to_images"
    PDF_TO_PNG = "pdf_to_png"
    PDF_TO_JPG = "pdf_to_jpg"
    PDF_MERGE = "pdf_merge"


class JobStatus(str, Enum):
    """Status of a conversion job."""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConversionRequest(BaseModel):
    """Request schema for PDF conversion."""

    conversion_type: ConversionType = Field(..., description="Type of conversion to perform")
    dpi: Optional[int] = Field(300, ge=72, le=600, description="DPI for image conversions")
    pages: Optional[str] = Field("all", description="Pages to convert (e.g., '1-5' or 'all')")
    ocr: bool = Field(True, description="Enable OCR for text extraction")

    @field_validator("pages")
    @classmethod
    def validate_pages(cls, v: str) -> str:
        """Validate pages format."""
        if v.lower() == "all":
            return v

        # Validate format like "1-5" or "1,3,5-7"
        if not v:
            return "all"

        # Simple validation - could be more comprehensive
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "conversion_type": "pdf_to_pptx",
                "dpi": 300,
                "pages": "all",
                "ocr": True
            }
        }


class ConversionResponse(BaseModel):
    """Response schema for conversion initiation."""

    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    progress: int = Field(0, ge=0, le=100, description="Conversion progress percentage")
    estimated_time: Optional[int] = Field(None, description="Estimated time remaining in seconds")
    file_name: Optional[str] = Field(None, description="Original file name")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "pending",
                "progress": 0,
                "estimated_time": 30,
                "file_name": "document.pdf"
            }
        }


class JobStatusResponse(BaseModel):
    """Response schema for job status check."""

    job_id: str
    status: JobStatus
    progress: int = Field(0, ge=0, le=100)
    estimated_time_remaining: Optional[int] = None
    output_file: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "completed",
                "progress": 100,
                "output_file": "/api/download/550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2025-10-30T10:00:00Z",
                "completed_at": "2025-10-30T10:00:35Z"
            }
        }


class MergeRequest(BaseModel):
    """Request schema for PDF merge."""

    file_count: int = Field(..., ge=2, le=10, description="Number of files to merge")

    @field_validator("file_count")
    @classmethod
    def validate_file_count(cls, v: int) -> int:
        """Validate file count is between 2 and 10."""
        if v < 2:
            raise ValueError("At least 2 files are required for merge")
        if v > 10:
            raise ValueError("Maximum 10 files can be merged at once")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "file_count": 3
            }
        }


class MergeResponse(BaseModel):
    """Response schema for PDF merge."""

    job_id: str
    status: JobStatus
    file_count: int
    progress: int = Field(0, ge=0, le=100)
    estimated_time: Optional[int] = None
    output_filename: str

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "660e8400-e29b-41d4-a716-446655440000",
                "status": "processing",
                "file_count": 3,
                "progress": 50,
                "estimated_time": 15
            }
        }


class JobHistoryResponse(BaseModel):
    """Schema for a single conversion history item (alias for compatibility)."""

    job_id: str
    conversion_type: ConversionType
    status: JobStatus
    file_name: str
    file_size: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "conversion_type": "pdf_to_pptx",
                "status": "completed",
                "file_name": "presentation.pdf",
                "file_size": 2048576,
                "created_at": "2025-10-30T10:00:00Z",
                "completed_at": "2025-10-30T10:00:35Z",
                "download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000"
            }
        }


class ConversionHistoryItem(BaseModel):
    """Schema for a single conversion history item."""

    job_id: str
    conversion_type: ConversionType
    status: JobStatus
    file_name: str
    file_size: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "conversion_type": "pdf_to_pptx",
                "status": "completed",
                "file_name": "presentation.pdf",
                "file_size": 2048576,
                "created_at": "2025-10-30T10:00:00Z",
                "completed_at": "2025-10-30T10:00:35Z",
                "download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000"
            }
        }


class ConversionHistoryResponse(BaseModel):
    """Response schema for conversion history."""

    total: int = Field(..., description="Total number of conversions")
    items: List[ConversionHistoryItem] = Field(..., description="List of conversion history items")
    page: int = Field(1, ge=1, description="Current page number")
    per_page: int = Field(20, ge=1, le=100, description="Items per page")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 42,
                "items": [
                    {
                        "job_id": "550e8400-e29b-41d4-a716-446655440000",
                        "conversion_type": "pdf_to_pptx",
                        "status": "completed",
                        "file_name": "presentation.pdf",
                        "file_size": 2048576,
                        "created_at": "2025-10-30T10:00:00Z",
                        "completed_at": "2025-10-30T10:00:35Z",
                        "download_url": "/api/download/550e8400-e29b-41d4-a716-446655440000"
                    }
                ],
                "page": 1,
                "per_page": 20
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response schema."""

    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")

    class Config:
        json_schema_extra = {
            "example": {
                "detail": "File size exceeds plan limit",
                "error_code": "FILE_SIZE_EXCEEDED",
                "request_id": "req_abc123"
            }
        }
